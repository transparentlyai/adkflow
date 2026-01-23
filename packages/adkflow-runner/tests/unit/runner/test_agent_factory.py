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
    """Tests for _substitute_variables method.

    NOTE: _substitute_variables now only validates - it does NOT substitute.
    ADK handles all substitution via session state at runtime.
    """

    def test_validates_context_vars_but_does_not_substitute(self):
        """Context variables are validated but text is returned unchanged."""
        factory = AgentFactory()
        text = "Hello {name}, your age is {age}."
        context_vars = {"name": "Alice", "age": "30"}

        result = factory._substitute_variables(text, context_vars, "TestAgent")
        # Text should be unchanged - ADK substitutes at runtime
        assert result == "Hello {name}, your age is {age}."

    def test_preserves_upstream_output_keys(self):
        """Upstream output_keys are preserved for ADK."""
        factory = AgentFactory()
        text = "Previous output: {poem}. Context: {topic}."
        context_vars = {"topic": "nature"}
        upstream_output_keys = ["poem"]

        result = factory._substitute_variables(
            text, context_vars, "TestAgent", upstream_output_keys
        )
        # All placeholders should be preserved - ADK substitutes at runtime
        assert result == "Previous output: {poem}. Context: {topic}."

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
        # Text should be unchanged - ADK substitutes at runtime
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

    def test_mixed_context_and_upstream_vars_preserved(self):
        """Both context vars and upstream vars are preserved for ADK."""
        factory = AgentFactory()
        text = "Topic: {topic}. Info: {info}."
        context_vars = {"topic": "nature"}
        upstream_output_keys = ["info"]

        result = factory._substitute_variables(
            text, context_vars, "TestAgent", upstream_output_keys
        )
        # Text unchanged - ADK substitutes both at runtime
        assert result == "Topic: {topic}. Info: {info}."

    def test_validates_against_global_variables(self):
        """Validates placeholders against global variables."""
        factory = AgentFactory()
        factory._global_variables = {"director": "John Smith"}
        text = "Director: {director}."
        context_vars: dict[str, str] = {}  # No agent-specific context vars

        # Should not raise - director is in global_variables
        result = factory._substitute_variables(text, context_vars, "TestAgent")
        assert result == "Director: {director}."

    def test_error_shows_both_context_and_global_vars(self):
        """Error message includes both context and global variables."""
        from adkflow_runner.errors import ExecutionError

        factory = AgentFactory()
        factory._global_variables = {"director": "John Smith"}
        text = "Missing: {unknown}."
        context_vars = {"topic": "nature"}

        with pytest.raises(ExecutionError) as exc_info:
            factory._substitute_variables(text, context_vars, "TestAgent")

        error_msg = str(exc_info.value)
        assert "unknown" in error_msg
        # Should show both context_vars and global_variables as available
        assert "director" in error_msg
        assert "topic" in error_msg


class TestBuildSafetySettings:
    """Tests for _build_safety_settings method."""

    def test_all_default_returns_none(self):
        """All default safety settings returns None."""
        factory = AgentFactory()
        agent_ir = AgentIR(
            id="agent_1",
            name="TestAgent",
            type="llm",
            model="gemini-2.0-flash",
        )
        # Default SafetyConfig has all fields set to "default"

        result = factory._build_safety_settings(agent_ir)
        assert result is None

    def test_custom_safety_settings(self):
        """Custom safety settings are converted to SafetySetting list."""
        from google.genai import types

        factory = AgentFactory()
        agent_ir = AgentIR(
            id="agent_1",
            name="TestAgent",
            type="llm",
            model="gemini-2.0-flash",
        )
        agent_ir.safety.harassment = "block_low"
        agent_ir.safety.hate_speech = "block_medium"
        agent_ir.safety.sexually_explicit = "block_high"
        agent_ir.safety.dangerous_content = "off"

        result = factory._build_safety_settings(agent_ir)

        assert result is not None
        assert len(result) == 4

        # Verify each setting is correctly mapped
        harassment_setting = next(
            s
            for s in result
            if s.category == types.HarmCategory.HARM_CATEGORY_HARASSMENT
        )
        assert (
            harassment_setting.threshold == types.HarmBlockThreshold.BLOCK_LOW_AND_ABOVE
        )

        hate_setting = next(
            s
            for s in result
            if s.category == types.HarmCategory.HARM_CATEGORY_HATE_SPEECH
        )
        assert hate_setting.threshold == types.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE

        explicit_setting = next(
            s
            for s in result
            if s.category == types.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT
        )
        assert explicit_setting.threshold == types.HarmBlockThreshold.BLOCK_ONLY_HIGH

        dangerous_setting = next(
            s
            for s in result
            if s.category == types.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT
        )
        assert dangerous_setting.threshold == types.HarmBlockThreshold.OFF

    def test_mixed_default_and_custom(self):
        """Mixed default and custom settings only includes custom ones."""
        from google.genai import types

        factory = AgentFactory()
        agent_ir = AgentIR(
            id="agent_1",
            name="TestAgent",
            type="llm",
            model="gemini-2.0-flash",
        )
        agent_ir.safety.harassment = "block_low"
        agent_ir.safety.hate_speech = "default"  # Keep default
        agent_ir.safety.sexually_explicit = "default"  # Keep default
        agent_ir.safety.dangerous_content = "block_none"

        result = factory._build_safety_settings(agent_ir)

        assert result is not None
        assert len(result) == 2  # Only harassment and dangerous_content

        categories = [s.category for s in result]
        assert types.HarmCategory.HARM_CATEGORY_HARASSMENT in categories
        assert types.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT in categories
        assert types.HarmCategory.HARM_CATEGORY_HATE_SPEECH not in categories
        assert types.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT not in categories

    def test_block_none_threshold(self):
        """block_none threshold is correctly mapped."""
        from google.genai import types

        factory = AgentFactory()
        agent_ir = AgentIR(
            id="agent_1",
            name="TestAgent",
            type="llm",
            model="gemini-2.0-flash",
        )
        agent_ir.safety.harassment = "block_none"

        result = factory._build_safety_settings(agent_ir)

        assert result is not None
        assert len(result) == 1
        assert result[0].threshold == types.HarmBlockThreshold.BLOCK_NONE

    def test_off_threshold(self):
        """off threshold is correctly mapped."""
        from google.genai import types

        factory = AgentFactory()
        agent_ir = AgentIR(
            id="agent_1",
            name="TestAgent",
            type="llm",
            model="gemini-2.0-flash",
        )
        agent_ir.safety.hate_speech = "off"

        result = factory._build_safety_settings(agent_ir)

        assert result is not None
        assert len(result) == 1
        assert result[0].threshold == types.HarmBlockThreshold.OFF


class TestGetFinishReason:
    """Tests for get_finish_reason method."""

    @patch("adkflow_runner.runner.agent_factory.Agent")
    def test_get_finish_reason_returns_none_when_not_available(self, mock_agent_cls):
        """get_finish_reason returns None when handler not registered."""
        mock_agent_cls.return_value = MagicMock()

        factory = AgentFactory()
        agent_ir = AgentIR(
            id="agent_1",
            name="TestAgent",
            type="llm",
            model="gemini-2.0-flash",
        )

        factory.create(agent_ir)

        # Before any execution, finish reason should be None
        result = factory.get_finish_reason("agent_1")
        assert result is None

    @patch("adkflow_runner.runner.agent_factory.Agent")
    def test_get_finish_reason_returns_none_for_unknown_agent(self, mock_agent_cls):
        """get_finish_reason returns None for unknown agent ID."""
        mock_agent_cls.return_value = MagicMock()

        factory = AgentFactory()

        # Query non-existent agent
        result = factory.get_finish_reason("unknown_agent")
        assert result is None

    @patch("adkflow_runner.runner.agent_factory.Agent")
    def test_get_finish_reason_returns_stored_value(self, mock_agent_cls):
        """get_finish_reason returns stored finish reason after execution."""
        from unittest.mock import MagicMock

        mock_agent_cls.return_value = MagicMock()

        factory = AgentFactory()
        agent_ir = AgentIR(
            id="agent_1",
            name="TestAgent",
            type="llm",
            model="gemini-2.0-flash",
        )

        factory.create(agent_ir)

        # Simulate finish reason being stored by handler
        # The FinishReasonHandler should be in _finish_reason_handlers
        assert "agent_1" in factory._finish_reason_handlers
        handler = factory._finish_reason_handlers["agent_1"]

        # Set a finish reason (simulating what the handler would do during execution)
        test_finish_reason = {"name": "STOP", "description": "Natural completion"}
        handler._last_finish_reason = test_finish_reason

        result = factory.get_finish_reason("agent_1")
        assert result == test_finish_reason
        assert result["name"] == "STOP"
        assert result["description"] == "Natural completion"
