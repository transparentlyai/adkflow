"""Tests for AgentFactory - creates ADK agents from IR."""

from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from adkflow_runner.ir import AgentIR, WorkflowIR
from adkflow_runner.runner.agent_factory import AgentFactory


class TestAgentFactoryCreation:
    """Tests for AgentFactory initialization."""

    def test_factory_creation(self):
        """Create factory with defaults."""
        factory = AgentFactory()
        assert factory.project_path is None
        assert factory.emit is None

    def test_factory_with_project_path(self, tmp_path):
        """Create factory with project path."""
        factory = AgentFactory(project_path=tmp_path)
        assert factory.project_path == tmp_path

    def test_factory_with_emit(self):
        """Create factory with emit function."""
        emit = MagicMock()
        factory = AgentFactory(emit=emit)
        assert factory.emit == emit


class TestAgentCreation:
    """Tests for agent creation methods."""

    @patch("adkflow_runner.runner.agent_factory.Agent")
    def test_create_llm_agent(self, mock_agent_cls):
        """Create LLM agent from IR."""
        mock_agent_cls.return_value = MagicMock()

        factory = AgentFactory()
        agent_ir = AgentIR(
            id="agent_1",
            name="TestAgent",
            type="llm",
            model="gemini-2.0-flash",
            description="Test description",
        )

        agent = factory.create(agent_ir)
        assert agent is not None

    @patch("adkflow_runner.runner.agent_factory.SequentialAgent")
    def test_create_sequential_agent(self, mock_seq_cls):
        """Create sequential agent from IR."""
        mock_seq_cls.return_value = MagicMock()

        factory = AgentFactory()
        sub1 = AgentIR(id="s1", name="Sub1", type="llm", model="gemini-2.0-flash")
        sub2 = AgentIR(id="s2", name="Sub2", type="llm", model="gemini-2.0-flash")
        agent_ir = AgentIR(
            id="seq_1",
            name="SeqAgent",
            type="sequential",
            subagents=[sub1, sub2],
        )

        with patch.object(factory, "_create_llm_agent", return_value=MagicMock()):
            agent = factory.create(agent_ir)
            assert agent is not None

    @patch("adkflow_runner.runner.agent_factory.ParallelAgent")
    def test_create_parallel_agent(self, mock_par_cls):
        """Create parallel agent from IR."""
        mock_par_cls.return_value = MagicMock()

        factory = AgentFactory()
        sub1 = AgentIR(id="s1", name="Sub1", type="llm", model="gemini-2.0-flash")
        agent_ir = AgentIR(
            id="par_1",
            name="ParAgent",
            type="parallel",
            subagents=[sub1],
        )

        with patch.object(factory, "_create_llm_agent", return_value=MagicMock()):
            agent = factory.create(agent_ir)
            assert agent is not None

    @patch("adkflow_runner.runner.agent_factory.LoopAgent")
    def test_create_loop_agent(self, mock_loop_cls):
        """Create loop agent from IR."""
        mock_loop_cls.return_value = MagicMock()

        factory = AgentFactory()
        sub = AgentIR(id="s1", name="Sub1", type="llm", model="gemini-2.0-flash")
        agent_ir = AgentIR(
            id="loop_1",
            name="LoopAgent",
            type="loop",
            subagents=[sub],
            max_iterations=5,
        )

        with patch.object(factory, "_create_llm_agent", return_value=MagicMock()):
            agent = factory.create(agent_ir)
            assert agent is not None


class TestAgentCaching:
    """Tests for agent caching behavior."""

    @patch("adkflow_runner.runner.agent_factory.Agent")
    def test_agent_is_cached(self, mock_agent_cls):
        """Created agents are cached."""
        mock_agent = MagicMock()
        mock_agent_cls.return_value = mock_agent

        factory = AgentFactory()
        agent_ir = AgentIR(
            id="agent_1",
            name="TestAgent",
            type="llm",
            model="gemini-2.0-flash",
        )

        agent1 = factory.create(agent_ir)
        agent2 = factory.create(agent_ir)

        # Should return cached agent
        assert agent1 is agent2


class TestCreateFromWorkflow:
    """Tests for create_from_workflow method."""

    @patch("adkflow_runner.runner.agent_factory.Agent")
    def test_create_from_workflow(self, mock_agent_cls):
        """Create agent tree from workflow IR."""
        mock_agent_cls.return_value = MagicMock()

        root = AgentIR(
            id="root",
            name="RootAgent",
            type="llm",
            model="gemini-2.0-flash",
        )
        ir = WorkflowIR(
            project_path="/test/project",
            root_agent=root,
            all_agents={"root": root},
            custom_nodes=[],
        )

        factory = AgentFactory()
        agent = factory.create_from_workflow(ir)

        assert agent is not None
        assert factory.project_path == Path("/test/project")


class TestAgentFactoryErrors:
    """Tests for error handling."""

    def test_unknown_agent_type_raises(self):
        """Unknown agent type raises ExecutionError."""
        from adkflow_runner.errors import ExecutionError

        factory = AgentFactory()
        agent_ir = AgentIR(
            id="agent_1",
            name="TestAgent",
            type="unknown_type",  # type: ignore[arg-type]
            model="gemini-2.0-flash",
        )

        with pytest.raises(ExecutionError):
            factory.create(agent_ir)


class TestAgentCacheClearing:
    """Tests for cache clearing."""

    @patch("adkflow_runner.runner.agent_factory.Agent")
    def test_clear_cache(self, mock_agent_cls):
        """Cache can be cleared."""
        mock_agent_cls.return_value = MagicMock()

        factory = AgentFactory()
        agent_ir = AgentIR(
            id="agent_1",
            name="TestAgent",
            type="llm",
            model="gemini-2.0-flash",
        )

        # Create and cache agent
        factory.create(agent_ir)
        assert "agent_1" in factory._agent_cache

        # Clear cache
        factory.clear_cache()
        assert len(factory._agent_cache) == 0


class TestAdvancedAgentFeatures:
    """Tests for advanced agent features like planner, code executor, etc."""

    @patch("adkflow_runner.runner.agent_factory.Agent")
    @patch("adkflow_runner.runner.agent_factory.BuiltInPlanner")
    def test_create_agent_with_thinking_budget(self, mock_planner_cls, mock_agent_cls):
        """Create agent with thinking budget planner."""
        mock_agent_cls.return_value = MagicMock()
        mock_planner_cls.return_value = MagicMock()

        factory = AgentFactory()
        agent_ir = AgentIR(
            id="agent_1",
            name="TestAgent",
            type="llm",
            model="gemini-2.0-flash",
        )
        agent_ir.planner.type = "builtin"
        agent_ir.planner.thinking_budget = 5000
        agent_ir.planner.include_thoughts = True

        factory.create(agent_ir)
        mock_planner_cls.assert_called_once()

    @patch("adkflow_runner.runner.agent_factory.Agent")
    @patch("adkflow_runner.runner.agent_factory.BuiltInCodeExecutor")
    def test_create_agent_with_code_executor(self, mock_executor_cls, mock_agent_cls):
        """Create agent with code executor enabled."""
        mock_agent_cls.return_value = MagicMock()
        mock_executor_cls.return_value = MagicMock()

        factory = AgentFactory()
        agent_ir = AgentIR(
            id="agent_1",
            name="TestAgent",
            type="llm",
            model="gemini-2.0-flash",
        )
        agent_ir.code_executor.enabled = True
        agent_ir.code_executor.stateful = True

        factory.create(agent_ir)
        mock_executor_cls.assert_called_once()

    @patch("adkflow_runner.runner.agent_factory.Agent")
    def test_create_agent_with_strip_contents(self, mock_agent_cls):
        """Create agent with strip_contents callback chain."""
        mock_agent_instance = MagicMock()
        mock_agent_cls.return_value = mock_agent_instance

        factory = AgentFactory()
        agent_ir = AgentIR(
            id="agent_1",
            name="TestAgent",
            type="llm",
            model="gemini-2.0-flash",
        )
        agent_ir.strip_contents = True

        agent = factory.create(agent_ir)
        assert agent is not None

        # Verify agent was created with callbacks
        assert mock_agent_cls.call_count >= 1

    @patch("adkflow_runner.runner.agent_factory.Agent")
    def test_callback_registry_with_strip_contents(self, mock_agent_cls):
        """Test callback registry includes strip_contents handler when enabled."""
        mock_agent_cls.return_value = MagicMock()

        factory = AgentFactory()
        agent_ir = AgentIR(
            id="agent_1",
            name="TestAgent",
            type="llm",
            model="gemini-2.0-flash",
        )
        agent_ir.strip_contents = True

        factory.create(agent_ir)

        # Get the before_model_callback that was passed to Agent
        agent_call_kwargs = mock_agent_cls.call_args[1]
        before_model_callback = agent_call_kwargs.get("before_model_callback")

        # Verify the callback exists
        assert before_model_callback is not None

        # Test that callback accepts keyword arguments with correct names
        mock_context = MagicMock()
        mock_request = MagicMock()
        mock_request.contents = []  # Prevent StripContentsHandler from processing

        # Call with keyword arguments (as ADK does)
        result = before_model_callback(
            callback_context=mock_context, llm_request=mock_request
        )

        # Should return None (handlers run in chain)
        assert result is None

    @patch("adkflow_runner.runner.agent_factory.Agent")
    def test_create_agent_with_subagents(self, mock_agent_cls):
        """Create LLM agent with subagents for dynamic routing."""
        mock_agent_cls.return_value = MagicMock()

        factory = AgentFactory()
        sub1 = AgentIR(id="s1", name="Sub1", type="llm", model="gemini-2.0-flash")
        sub2 = AgentIR(id="s2", name="Sub2", type="llm", model="gemini-2.0-flash")
        agent_ir = AgentIR(
            id="agent_1",
            name="TestAgent",
            type="llm",
            model="gemini-2.0-flash",
            subagents=[sub1, sub2],
        )

        agent = factory.create(agent_ir)
        assert agent is not None
        # Agent should be created twice - once without subagents, once with
        assert mock_agent_cls.call_count >= 2


class TestToolLoading:
    """Tests for tool loading behavior."""

    @patch("adkflow_runner.runner.agent_factory.Agent")
    def test_load_google_search_tool(self, mock_agent_cls):
        """Load built-in google_search tool."""
        mock_agent_cls.return_value = MagicMock()

        factory = AgentFactory()
        agent_ir = AgentIR(
            id="agent_1",
            name="TestAgent",
            type="llm",
            model="gemini-2.0-flash",
        )

        # Add google_search tool
        from adkflow_runner.ir import ToolIR

        tool_ir = ToolIR(
            name="google_search",
            file_path="builtin://google_search",
            error_behavior="continue",
        )
        agent_ir.tools = [tool_ir]

        with patch.object(
            factory.tool_loader, "load", return_value="google_search"
        ) as mock_load:
            agent = factory.create(agent_ir)
            assert agent is not None
            mock_load.assert_called_once()

    @patch("adkflow_runner.runner.agent_factory.Agent")
    def test_load_code_execution_tool(self, mock_agent_cls):
        """Load built-in code_execution tool."""
        mock_agent_cls.return_value = MagicMock()

        factory = AgentFactory()
        agent_ir = AgentIR(
            id="agent_1",
            name="TestAgent",
            type="llm",
            model="gemini-2.0-flash",
        )

        # Add code_execution tool
        from adkflow_runner.ir import ToolIR

        tool_ir = ToolIR(
            name="code_execution",
            file_path="builtin://code_execution",
            error_behavior="continue",
        )
        agent_ir.tools = [tool_ir]

        with patch.object(
            factory.tool_loader, "load", return_value="code_execution"
        ) as mock_load:
            agent = factory.create(agent_ir)
            assert agent is not None
            mock_load.assert_called_once()

    @patch("adkflow_runner.runner.agent_factory.Agent")
    def test_tool_load_fail_fast(self, mock_agent_cls):
        """Tool loading with fail_fast raises exception."""
        factory = AgentFactory()
        agent_ir = AgentIR(
            id="agent_1",
            name="TestAgent",
            type="llm",
            model="gemini-2.0-flash",
        )

        # Add tool with fail_fast
        from adkflow_runner.ir import ToolIR

        tool_ir = ToolIR(
            name="bad_tool",
            file_path="/nonexistent/tool.py",
            error_behavior="fail_fast",
        )
        agent_ir.tools = [tool_ir]

        with patch.object(
            factory.tool_loader, "load", side_effect=Exception("Tool not found")
        ):
            with pytest.raises(Exception, match="Tool not found"):
                factory.create(agent_ir)

    @patch("adkflow_runner.runner.agent_factory.Agent")
    def test_tool_load_continue_on_error(self, mock_agent_cls):
        """Tool loading with continue error_behavior logs warning but continues."""
        mock_agent_cls.return_value = MagicMock()

        factory = AgentFactory()
        agent_ir = AgentIR(
            id="agent_1",
            name="TestAgent",
            type="llm",
            model="gemini-2.0-flash",
        )

        # Add tool with continue behavior
        from adkflow_runner.ir import ToolIR

        tool_ir = ToolIR(
            name="bad_tool",
            file_path="/nonexistent/tool.py",
            error_behavior="continue",
        )
        agent_ir.tools = [tool_ir]

        with patch.object(
            factory.tool_loader, "load", side_effect=Exception("Tool not found")
        ):
            # Should not raise, just log warning
            agent = factory.create(agent_ir)
            assert agent is not None


class TestSubstituteVariables:
    """Tests for _substitute_variables method."""

    def test_substitute_context_vars(self):
        """Context variables are substituted in text."""
        factory = AgentFactory()
        text = "Hello {name}, your age is {age}."
        context_vars = {"name": "Alice", "age": "30"}

        result = factory._substitute_variables(text, context_vars, "TestAgent")
        assert result == "Hello Alice, your age is 30."

    def test_skip_upstream_output_keys(self):
        """Upstream output_keys are not substituted - left for ADK."""
        factory = AgentFactory()
        text = "Previous output: {poem}. Context: {topic}."
        context_vars = {"topic": "nature"}
        upstream_output_keys = ["poem"]

        result = factory._substitute_variables(
            text, context_vars, "TestAgent", upstream_output_keys
        )
        # {poem} should be preserved for ADK, {topic} should be substituted
        assert result == "Previous output: {poem}. Context: nature."

    def test_error_on_missing_vars(self):
        """Error when variable is missing from both context_vars and upstream_output_keys."""
        from adkflow_runner.errors import ExecutionError

        factory = AgentFactory()
        text = "Hello {name}, your {missing} is here."
        context_vars = {"name": "Alice"}
        upstream_output_keys = ["poem"]

        with pytest.raises(ExecutionError) as exc_info:
            factory._substitute_variables(
                text, context_vars, "TestAgent", upstream_output_keys
            )
        assert "missing" in str(exc_info.value)

    def test_no_error_for_upstream_only_placeholders(self):
        """No error when all placeholders are upstream_output_keys."""
        factory = AgentFactory()
        text = "Poem: {poem}. Story: {story}."
        context_vars: dict[str, str] = {}
        upstream_output_keys = ["poem", "story"]

        result = factory._substitute_variables(
            text, context_vars, "TestAgent", upstream_output_keys
        )
        # Both placeholders should be preserved
        assert result == text

    def test_empty_text_returns_empty(self):
        """Empty text returns empty string."""
        factory = AgentFactory()
        result = factory._substitute_variables("", {"var": "value"}, "TestAgent")
        assert result == ""

    def test_no_placeholders_returns_text(self):
        """Text without placeholders is returned as-is."""
        factory = AgentFactory()
        text = "No placeholders here."
        result = factory._substitute_variables(text, {"var": "value"}, "TestAgent")
        assert result == text

    def test_error_message_with_upstream_keys(self):
        """Error message shows upstream keys when no context_vars available."""
        from adkflow_runner.errors import ExecutionError

        factory = AgentFactory()
        text = "Hello {name}, your {missing} is here."
        context_vars: dict[str, str] = {}
        upstream_output_keys = ["poem", "story"]

        with pytest.raises(ExecutionError) as exc_info:
            factory._substitute_variables(
                text, context_vars, "TestAgent", upstream_output_keys
            )
        error_msg = str(exc_info.value)
        assert "missing" in error_msg
        assert "upstream:" in error_msg
        assert "poem" in error_msg
