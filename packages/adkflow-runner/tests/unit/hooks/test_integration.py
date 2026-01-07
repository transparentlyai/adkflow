"""Tests for integration helpers for adding hooks to runner components."""

from unittest.mock import MagicMock

import pytest

from adkflow_runner.hooks.integration import HooksIntegration, create_hooks_integration
from adkflow_runner.hooks.types import HookAction, HookContext, HookResult, HookSpec


class TestHooksIntegrationInit:
    """Tests for HooksIntegration initialization."""

    def test_creates_with_required_params(self, tmp_path):
        """Create integration with required parameters."""
        integration = HooksIntegration(
            run_id="run-123",
            session_id="session-456",
            project_path=tmp_path,
        )

        assert integration.run_id == "run-123"
        assert integration.session_id == "session-456"
        assert integration.project_path == tmp_path
        assert integration.state is None
        assert integration.emit is None
        assert integration.executor is not None

    def test_creates_with_optional_params(self, tmp_path):
        """Create integration with optional state and emit."""
        mock_state = MagicMock()
        mock_emit = MagicMock()

        integration = HooksIntegration(
            run_id="run-123",
            session_id="session-456",
            project_path=tmp_path,
            state=mock_state,
            emit=mock_emit,
        )

        assert integration.state is mock_state
        assert integration.emit is mock_emit


class TestHooksIntegrationRunLifecycle:
    """Tests for run lifecycle hooks."""

    @pytest.fixture
    def registry(self):
        """Create fresh registry for test isolation."""
        from adkflow_runner.hooks.registry import HooksRegistry

        return HooksRegistry()

    @pytest.fixture
    def integration(self, tmp_path, registry):
        """Create integration instance with fresh registry."""
        from adkflow_runner.hooks.executor import HookExecutor

        integration = HooksIntegration(
            run_id="run-123",
            session_id="session-456",
            project_path=tmp_path,
        )
        # Replace executor with one using fresh registry
        integration.executor = HookExecutor(registry=registry)
        return integration

    async def test_before_run_no_hooks(self, integration):
        """Return unchanged data when no hooks registered."""
        result, inputs, config = await integration.before_run(
            inputs={"test": "input"},
            config={"param": "value"},
        )

        assert result.action == HookAction.CONTINUE
        assert inputs == {"test": "input"}
        assert config == {"param": "value"}

    async def test_before_run_with_hook(self, integration, registry):
        """Execute before_run hook."""
        executed = []

        async def hook(ctx: HookContext) -> HookResult:
            executed.append(ctx.data)
            return HookResult.continue_()

        registry.register_spec(HookSpec(hook_name="before_run", handler=hook))

        result, inputs, config = await integration.before_run(
            inputs={"test": "input"},
            config={"param": "value"},
        )

        assert len(executed) == 1
        assert executed[0]["inputs"] == {"test": "input"}
        assert executed[0]["config"] == {"param": "value"}

    async def test_before_run_replaces_data(self, integration, registry):
        """Replace inputs and config via hook."""

        async def hook(ctx: HookContext) -> HookResult:
            return HookResult.replace(
                {"inputs": {"modified": "input"}, "config": {"new": "config"}}
            )

        registry.register_spec(HookSpec(hook_name="before_run", handler=hook))

        result, inputs, config = await integration.before_run(
            inputs={"test": "input"},
            config={"param": "value"},
        )

        assert result.action == HookAction.CONTINUE
        assert inputs == {"modified": "input"}
        assert config == {"new": "config"}

    async def test_after_run_no_hooks(self, integration):
        """Return unchanged output when no hooks."""
        result, output = await integration.after_run(
            output="test output",
            status="completed",
        )

        assert result.action == HookAction.CONTINUE
        assert output == "test output"

    async def test_after_run_with_hook(self, integration, registry):
        """Execute after_run hook."""
        executed = []

        async def hook(ctx: HookContext) -> HookResult:
            executed.append(ctx.data)
            return HookResult.continue_()

        registry.register_spec(HookSpec(hook_name="after_run", handler=hook))

        await integration.after_run(output="test output", status="completed")

        assert len(executed) == 1
        assert executed[0]["output"] == "test output"
        assert executed[0]["status"] == "completed"

    async def test_after_run_replaces_output(self, integration, registry):
        """Replace output via hook."""

        async def hook(ctx: HookContext) -> HookResult:
            return HookResult.replace("modified output")

        registry.register_spec(HookSpec(hook_name="after_run", handler=hook))

        result, output = await integration.after_run(
            output="original output",
            status="completed",
        )

        # Integration methods pass through executor results
        # When hook returns REPLACE and continues, final action is CONTINUE
        assert result.action == HookAction.CONTINUE
        assert output == "modified output"

    async def test_on_run_error_no_hooks(self, integration):
        """Return error unchanged when no hooks."""
        error = ValueError("Test error")
        result, returned_error = await integration.on_run_error(error)

        assert result.action == HookAction.CONTINUE
        assert returned_error is error

    async def test_on_run_error_suppresses_via_skip(self, integration, registry):
        """Suppress error when hook returns SKIP."""

        async def hook(ctx: HookContext) -> HookResult:
            return HookResult.skip()

        registry.register_spec(HookSpec(hook_name="on_run_error", handler=hook))

        error = ValueError("Test error")
        result, returned_error = await integration.on_run_error(error)

        assert result.action == HookAction.SKIP
        assert returned_error is None

    async def test_on_run_error_replaces_error(self, integration, registry):
        """Replace error message via hook."""

        async def hook(ctx: HookContext) -> HookResult:
            return HookResult.replace("New error message")

        registry.register_spec(HookSpec(hook_name="on_run_error", handler=hook))

        error = ValueError("Original error")
        result, returned_error = await integration.on_run_error(error)

        # Integration methods pass through executor results
        # When hook returns REPLACE and continues, final action is CONTINUE
        assert result.action == HookAction.CONTINUE
        assert isinstance(returned_error, RuntimeError)
        assert str(returned_error) == "New error message"

    async def test_on_run_cancel_no_hooks(self, integration):
        """Execute on_run_cancel with no hooks."""
        result = await integration.on_run_cancel()
        assert result.action == HookAction.CONTINUE

    async def test_on_run_cancel_with_hook(self, integration, registry):
        """Execute on_run_cancel hook."""
        executed = []

        async def hook(ctx: HookContext) -> HookResult:
            executed.append(True)
            return HookResult.continue_()

        registry.register_spec(HookSpec(hook_name="on_run_cancel", handler=hook))

        await integration.on_run_cancel()
        assert len(executed) == 1


class TestHooksIntegrationNodeHooks:
    """Tests for custom node lifecycle hooks."""

    @pytest.fixture
    def integration(self, tmp_path):
        """Create integration instance."""
        return HooksIntegration(
            run_id="run-123",
            session_id="session-456",
            project_path=tmp_path,
        )

    @pytest.fixture
    def registry(self, integration):
        """Get the executor's registry."""
        return integration.executor.registry

    async def test_before_node_execute_no_hooks(self, integration):
        """Return unchanged data when no hooks."""
        result, inputs, config = await integration.before_node_execute(
            node_id="node-1",
            node_name="TestNode",
            unit_id="unit-123",
            inputs={"in": "data"},
            config={"cfg": "val"},
        )

        assert result.action == HookAction.CONTINUE
        assert inputs == {"in": "data"}
        assert config == {"cfg": "val"}

    async def test_before_node_execute_with_hook(self, integration, registry):
        """Execute before_node_execute hook."""
        executed = []

        async def hook(ctx: HookContext) -> HookResult:
            executed.append(ctx)
            return HookResult.continue_()

        registry.register_spec(HookSpec(hook_name="before_node_execute", handler=hook))

        await integration.before_node_execute(
            node_id="node-1",
            node_name="TestNode",
            unit_id="unit-123",
            inputs={"in": "data"},
            config={"cfg": "val"},
        )

        assert len(executed) == 1
        assert executed[0].node_id == "node-1"
        assert executed[0].node_name == "TestNode"
        assert executed[0].data["unit_id"] == "unit-123"

    async def test_after_node_execute_no_hooks(self, integration):
        """Return unchanged outputs when no hooks."""
        result, outputs = await integration.after_node_execute(
            node_id="node-1",
            node_name="TestNode",
            unit_id="unit-123",
            outputs={"out": "data"},
        )

        assert result.action == HookAction.CONTINUE
        assert outputs == {"out": "data"}

    async def test_after_node_execute_replaces_outputs(self, integration, registry):
        """Replace outputs via hook."""

        async def hook(ctx: HookContext) -> HookResult:
            return HookResult.replace({"modified": "output"})

        registry.register_spec(HookSpec(hook_name="after_node_execute", handler=hook))

        result, outputs = await integration.after_node_execute(
            node_id="node-1",
            node_name="TestNode",
            unit_id="unit-123",
            outputs={"out": "data"},
        )

        # Integration methods pass through executor results
        # When hook returns REPLACE and continues, final action is CONTINUE
        assert result.action == HookAction.CONTINUE
        assert outputs == {"modified": "output"}

    async def test_on_node_error_no_hooks(self, integration):
        """Return None when no hooks."""
        error = ValueError("Node error")
        result, fallback = await integration.on_node_error(
            node_id="node-1",
            node_name="TestNode",
            unit_id="unit-123",
            error=error,
        )

        assert result.action == HookAction.CONTINUE
        assert fallback is None

    async def test_on_node_error_provides_fallback(self, integration, registry):
        """Provide fallback output via hook."""

        async def hook(ctx: HookContext) -> HookResult:
            return HookResult.replace({"fallback": "data"})

        registry.register_spec(HookSpec(hook_name="on_node_error", handler=hook))

        error = ValueError("Node error")
        result, fallback = await integration.on_node_error(
            node_id="node-1",
            node_name="TestNode",
            unit_id="unit-123",
            error=error,
        )

        # Integration methods pass through executor results
        # When hook returns REPLACE and continues, final action is CONTINUE
        assert result.action == HookAction.CONTINUE
        assert fallback == {"fallback": "data"}


class TestHooksIntegrationAgentHooks:
    """Tests for agent lifecycle hooks."""

    @pytest.fixture
    def integration(self, tmp_path):
        """Create integration instance."""
        return HooksIntegration(
            run_id="run-123",
            session_id="session-456",
            project_path=tmp_path,
        )

    @pytest.fixture
    def registry(self, integration):
        """Get the executor's registry."""
        return integration.executor.registry

    async def test_before_agent_execute_no_hooks(self, integration):
        """Return unchanged data when no hooks."""
        result, prompt, config = await integration.before_agent_execute(
            agent_name="TestAgent",
            agent_id="agent-1",
            prompt="Test prompt",
            config={"model": "gpt-4"},
        )

        assert result.action == HookAction.CONTINUE
        assert prompt == "Test prompt"
        assert config == {"model": "gpt-4"}

    async def test_before_agent_execute_modifies_prompt(self, integration, registry):
        """Modify prompt via hook."""

        async def hook(ctx: HookContext) -> HookResult:
            return HookResult.replace(
                {"prompt": "Modified prompt", "config": ctx.data["config"]}
            )

        registry.register_spec(HookSpec(hook_name="before_agent_execute", handler=hook))

        result, prompt, config = await integration.before_agent_execute(
            agent_name="TestAgent",
            agent_id="agent-1",
            prompt="Original prompt",
            config={"model": "gpt-4"},
        )

        # Integration methods pass through executor results
        # When hook returns REPLACE and continues, final action is CONTINUE
        assert result.action == HookAction.CONTINUE
        assert prompt == "Modified prompt"

    async def test_after_agent_execute_no_hooks(self, integration):
        """Return unchanged output when no hooks."""
        result, output = await integration.after_agent_execute(
            agent_name="TestAgent",
            agent_id="agent-1",
            output="Agent response",
        )

        assert result.action == HookAction.CONTINUE
        assert output == "Agent response"

    async def test_after_agent_execute_modifies_output(self, integration, registry):
        """Modify output via hook."""

        async def hook(ctx: HookContext) -> HookResult:
            return HookResult.replace("Modified response")

        registry.register_spec(HookSpec(hook_name="after_agent_execute", handler=hook))

        result, output = await integration.after_agent_execute(
            agent_name="TestAgent",
            agent_id="agent-1",
            output="Original response",
        )

        # Integration methods pass through executor results
        # When hook returns REPLACE and continues, final action is CONTINUE
        assert result.action == HookAction.CONTINUE
        assert output == "Modified response"

    async def test_on_agent_error_no_hooks(self, integration):
        """Return None when no hooks."""
        error = ValueError("Agent error")
        result, fallback = await integration.on_agent_error(
            agent_name="TestAgent",
            agent_id="agent-1",
            error=error,
        )

        assert result.action == HookAction.CONTINUE
        assert fallback is None

    async def test_on_agent_transfer_no_hooks(self, integration):
        """Return unchanged data when no hooks."""
        result, to_agent, context_data = await integration.on_agent_transfer(
            from_agent="Agent1",
            to_agent="Agent2",
            context_data={"key": "value"},
        )

        assert result.action == HookAction.CONTINUE
        assert to_agent == "Agent2"
        assert context_data == {"key": "value"}

    async def test_on_agent_transfer_modifies_target(self, integration, registry):
        """Modify transfer target via hook."""

        async def hook(ctx: HookContext) -> HookResult:
            return HookResult.replace(
                {"to_agent": "Agent3", "context_data": {"modified": True}}
            )

        registry.register_spec(HookSpec(hook_name="on_agent_transfer", handler=hook))

        result, to_agent, context_data = await integration.on_agent_transfer(
            from_agent="Agent1",
            to_agent="Agent2",
            context_data={"key": "value"},
        )

        # Integration methods pass through executor results
        # When hook returns REPLACE and continues, final action is CONTINUE
        assert result.action == HookAction.CONTINUE
        assert to_agent == "Agent3"
        assert context_data == {"modified": True}


class TestHooksIntegrationToolHooks:
    """Tests for tool lifecycle hooks."""

    @pytest.fixture
    def integration(self, tmp_path):
        """Create integration instance."""
        return HooksIntegration(
            run_id="run-123",
            session_id="session-456",
            project_path=tmp_path,
        )

    @pytest.fixture
    def registry(self, integration):
        """Get the executor's registry."""
        return integration.executor.registry

    async def test_before_tool_call_no_hooks(self, integration):
        """Return unchanged arguments when no hooks."""
        result, arguments = await integration.before_tool_call(
            tool_name="search",
            arguments={"query": "test"},
        )

        assert result.action == HookAction.CONTINUE
        assert arguments == {"query": "test"}

    async def test_before_tool_call_modifies_args(self, integration, registry):
        """Modify tool arguments via hook."""

        async def hook(ctx: HookContext) -> HookResult:
            return HookResult.replace({"query": "modified"})

        registry.register_spec(HookSpec(hook_name="before_tool_call", handler=hook))

        result, arguments = await integration.before_tool_call(
            tool_name="search",
            arguments={"query": "original"},
        )

        # Integration methods pass through executor results
        # When hook returns REPLACE and continues, final action is CONTINUE
        assert result.action == HookAction.CONTINUE
        assert arguments == {"query": "modified"}

    async def test_after_tool_result_no_hooks(self, integration):
        """Return unchanged result when no hooks."""
        result, result_data = await integration.after_tool_result(
            tool_name="search",
            arguments={"query": "test"},
            result_data={"results": []},
        )

        assert result.action == HookAction.CONTINUE
        assert result_data == {"results": []}

    async def test_after_tool_result_modifies_data(self, integration, registry):
        """Modify tool result via hook."""

        async def hook(ctx: HookContext) -> HookResult:
            return HookResult.replace({"modified": True})

        registry.register_spec(HookSpec(hook_name="after_tool_result", handler=hook))

        result, result_data = await integration.after_tool_result(
            tool_name="search",
            arguments={"query": "test"},
            result_data={"results": []},
        )

        # Integration methods pass through executor results
        # When hook returns REPLACE and continues, final action is CONTINUE
        assert result.action == HookAction.CONTINUE
        assert result_data == {"modified": True}

    async def test_on_tool_error_no_hooks(self, integration):
        """Return None when no hooks."""
        error = ValueError("Tool error")
        result, fallback = await integration.on_tool_error(
            tool_name="search",
            arguments={"query": "test"},
            error=error,
        )

        assert result.action == HookAction.CONTINUE
        assert fallback is None

    async def test_on_tool_error_provides_fallback(self, integration, registry):
        """Provide fallback result via hook."""

        async def hook(ctx: HookContext) -> HookResult:
            return HookResult.replace({"fallback": "result"})

        registry.register_spec(HookSpec(hook_name="on_tool_error", handler=hook))

        error = ValueError("Tool error")
        result, fallback = await integration.on_tool_error(
            tool_name="search",
            arguments={"query": "test"},
            error=error,
        )

        # Integration methods pass through executor results
        # When hook returns REPLACE and continues, final action is CONTINUE
        assert result.action == HookAction.CONTINUE
        assert fallback == {"fallback": "result"}


class TestHooksIntegrationLLMHooks:
    """Tests for LLM interaction hooks."""

    @pytest.fixture
    def integration(self, tmp_path):
        """Create integration instance."""
        return HooksIntegration(
            run_id="run-123",
            session_id="session-456",
            project_path=tmp_path,
        )

    @pytest.fixture
    def registry(self, integration):
        """Get the executor's registry."""
        return integration.executor.registry

    async def test_before_llm_request_no_hooks(self, integration):
        """Return unchanged data when no hooks."""
        messages = [{"role": "user", "content": "Hello"}]
        config = {"temperature": 0.7}

        result, ret_messages, ret_config = await integration.before_llm_request(
            messages=messages,
            config=config,
        )

        assert result.action == HookAction.CONTINUE
        assert ret_messages == messages
        assert ret_config == config

    async def test_before_llm_request_modifies_messages(self, integration, registry):
        """Modify messages via hook."""

        async def hook(ctx: HookContext) -> HookResult:
            return HookResult.replace(
                {
                    "messages": [{"role": "system", "content": "Modified"}],
                    "config": ctx.data["config"],
                }
            )

        registry.register_spec(HookSpec(hook_name="before_llm_request", handler=hook))

        messages = [{"role": "user", "content": "Hello"}]
        result, ret_messages, ret_config = await integration.before_llm_request(
            messages=messages,
            config={"temperature": 0.7},
        )

        # Integration methods pass through executor results
        # When hook returns REPLACE and continues, final action is CONTINUE
        assert result.action == HookAction.CONTINUE
        assert ret_messages == [{"role": "system", "content": "Modified"}]

    async def test_after_llm_response_no_hooks(self, integration):
        """Return unchanged response when no hooks."""
        response = {"content": "LLM response"}

        result, ret_response = await integration.after_llm_response(
            response=response,
        )

        assert result.action == HookAction.CONTINUE
        assert ret_response == response

    async def test_after_llm_response_modifies_response(self, integration, registry):
        """Modify response via hook."""

        async def hook(ctx: HookContext) -> HookResult:
            return HookResult.replace({"modified": "response"})

        registry.register_spec(HookSpec(hook_name="after_llm_response", handler=hook))

        result, ret_response = await integration.after_llm_response(
            response={"content": "Original"},
        )

        # Integration methods pass through executor results
        # When hook returns REPLACE and continues, final action is CONTINUE
        assert result.action == HookAction.CONTINUE
        assert ret_response == {"modified": "response"}


class TestHooksIntegrationUserInputHooks:
    """Tests for user input hooks."""

    @pytest.fixture
    def integration(self, tmp_path):
        """Create integration instance."""
        return HooksIntegration(
            run_id="run-123",
            session_id="session-456",
            project_path=tmp_path,
        )

    @pytest.fixture
    def registry(self, integration):
        """Get the executor's registry."""
        return integration.executor.registry

    async def test_before_user_input_no_hooks(self, integration):
        """Return unchanged prompt when no hooks."""
        result, prompt = await integration.before_user_input(
            prompt="Enter value:",
            variable_name="user_input",
            node_id="node-1",
            node_name="InputNode",
        )

        assert result.action == HookAction.CONTINUE
        assert prompt == "Enter value:"

    async def test_before_user_input_modifies_prompt(self, integration, registry):
        """Modify prompt via hook."""

        async def hook(ctx: HookContext) -> HookResult:
            return HookResult.replace("Modified prompt")

        registry.register_spec(HookSpec(hook_name="before_user_input", handler=hook))

        result, prompt = await integration.before_user_input(
            prompt="Original prompt",
            variable_name="user_input",
            node_id="node-1",
            node_name="InputNode",
        )

        # Integration methods pass through executor results
        # When hook returns REPLACE and continues, final action is CONTINUE
        assert result.action == HookAction.CONTINUE
        assert prompt == "Modified prompt"

    async def test_after_user_input_no_hooks(self, integration):
        """Return unchanged response when no hooks."""
        result, response = await integration.after_user_input(
            response="user value",
            variable_name="user_input",
            node_id="node-1",
            node_name="InputNode",
        )

        assert result.action == HookAction.CONTINUE
        assert response == "user value"

    async def test_after_user_input_modifies_response(self, integration, registry):
        """Modify response via hook."""

        async def hook(ctx: HookContext) -> HookResult:
            return HookResult.replace("modified value")

        registry.register_spec(HookSpec(hook_name="after_user_input", handler=hook))

        result, response = await integration.after_user_input(
            response="original value",
            variable_name="user_input",
            node_id="node-1",
            node_name="InputNode",
        )

        # Integration methods pass through executor results
        # When hook returns REPLACE and continues, final action is CONTINUE
        assert result.action == HookAction.CONTINUE
        assert response == "modified value"


class TestHooksIntegrationGraphHooks:
    """Tests for graph execution hooks."""

    @pytest.fixture
    def integration(self, tmp_path):
        """Create integration instance."""
        return HooksIntegration(
            run_id="run-123",
            session_id="session-456",
            project_path=tmp_path,
        )

    @pytest.fixture
    def registry(self, integration):
        """Get the executor's registry."""
        return integration.executor.registry

    async def test_on_execution_plan_no_hooks(self, integration):
        """Return unchanged layers when no hooks."""
        layers = [["node-1"], ["node-2", "node-3"]]

        result, ret_layers = await integration.on_execution_plan(layers=layers)

        assert result.action == HookAction.CONTINUE
        assert ret_layers == layers

    async def test_on_execution_plan_modifies_layers(self, integration, registry):
        """Modify execution plan via hook."""

        async def hook(ctx: HookContext) -> HookResult:
            return HookResult.replace([["modified-1"], ["modified-2"]])

        registry.register_spec(HookSpec(hook_name="on_execution_plan", handler=hook))

        result, ret_layers = await integration.on_execution_plan(
            layers=[["node-1"], ["node-2"]]
        )

        # Integration methods pass through executor results
        # When hook returns REPLACE and continues, final action is CONTINUE
        assert result.action == HookAction.CONTINUE
        assert ret_layers == [["modified-1"], ["modified-2"]]

    async def test_before_layer_execute_no_hooks(self, integration):
        """Return unchanged node_ids when no hooks."""
        result, node_ids = await integration.before_layer_execute(
            layer_index=0,
            node_ids=["node-1", "node-2"],
        )

        assert result.action == HookAction.CONTINUE
        assert node_ids == ["node-1", "node-2"]

    async def test_before_layer_execute_modifies_nodes(self, integration, registry):
        """Modify layer nodes via hook."""

        async def hook(ctx: HookContext) -> HookResult:
            return HookResult.replace(["modified-node"])

        registry.register_spec(HookSpec(hook_name="before_layer_execute", handler=hook))

        result, node_ids = await integration.before_layer_execute(
            layer_index=0,
            node_ids=["node-1", "node-2"],
        )

        # Integration methods pass through executor results
        # When hook returns REPLACE and continues, final action is CONTINUE
        assert result.action == HookAction.CONTINUE
        assert node_ids == ["modified-node"]

    async def test_after_layer_execute_no_hooks(self, integration):
        """Return unchanged results when no hooks."""
        results = {"node-1": "output1"}

        result, ret_results = await integration.after_layer_execute(
            layer_index=0,
            results=results,
        )

        assert result.action == HookAction.CONTINUE
        assert ret_results == results

    async def test_after_layer_execute_modifies_results(self, integration, registry):
        """Modify layer results via hook."""

        async def hook(ctx: HookContext) -> HookResult:
            return HookResult.replace({"modified": "result"})

        registry.register_spec(HookSpec(hook_name="after_layer_execute", handler=hook))

        result, ret_results = await integration.after_layer_execute(
            layer_index=0,
            results={"node-1": "output1"},
        )

        # Integration methods pass through executor results
        # When hook returns REPLACE and continues, final action is CONTINUE
        assert result.action == HookAction.CONTINUE
        assert ret_results == {"modified": "result"}


class TestCreateHooksIntegration:
    """Tests for create_hooks_integration factory function."""

    def test_creates_integration_instance(self, tmp_path):
        """Create HooksIntegration via factory."""
        mock_state = MagicMock()
        mock_emit = MagicMock()

        integration = create_hooks_integration(
            run_id="run-123",
            session_id="session-456",
            project_path=tmp_path,
            state=mock_state,
            emit=mock_emit,
        )

        assert isinstance(integration, HooksIntegration)
        assert integration.run_id == "run-123"
        assert integration.session_id == "session-456"
        assert integration.project_path == tmp_path
        assert integration.state is mock_state
        assert integration.emit is mock_emit
