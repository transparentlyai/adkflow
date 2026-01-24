"""Tests for context variable collection and session state initialization.

Tests collect_context_vars_for_session function and related session state logic.
"""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from adkflow_runner.ir import AgentIR, WorkflowIR
from adkflow_runner.runner.types import RunConfig
from adkflow_runner.runner.workflow_runner import (
    WorkflowRunner,
    collect_context_vars_for_session,
)


@pytest.fixture
def mock_hooks():
    """Create a mock HooksIntegration that returns default values."""
    hooks = MagicMock()
    hooks.executor = MagicMock()
    hooks.executor.has_hooks.return_value = False
    return hooks


@pytest.fixture
def mock_adk():
    """Mock all ADK dependencies."""
    with (
        patch("adkflow_runner.runner.workflow_runner.Runner") as mock_runner_cls,
        patch(
            "adkflow_runner.runner.workflow_runner.InMemorySessionService"
        ) as mock_session_cls,
        patch(
            "adkflow_runner.runner.workflow_runner.configure_logging"
        ) as mock_logging,
        patch("adkflow_runner.runner.workflow_runner.Logger") as mock_logger,
        patch("adkflow_runner.runner.workflow_runner.setup_tracing") as mock_tracing,
        patch("adkflow_runner.runner.workflow_runner.load_dotenv") as mock_load_dotenv,
    ):
        # Setup session mock
        mock_session = MagicMock()
        mock_session.id = "session-123"
        mock_session_service = MagicMock()
        mock_session_service.create_session = AsyncMock(return_value=mock_session)
        mock_session_cls.return_value = mock_session_service

        # Setup runner mock
        mock_runner = MagicMock()
        mock_runner.run_async = AsyncMock()
        mock_runner_cls.return_value = mock_runner

        yield {
            "runner_cls": mock_runner_cls,
            "runner": mock_runner,
            "session_cls": mock_session_cls,
            "session_service": mock_session_service,
            "session": mock_session,
            "logging": mock_logging,
            "logger": mock_logger,
            "tracing": mock_tracing,
            "load_dotenv": mock_load_dotenv,
        }


class TestCollectContextVarsForSession:
    """Tests for collect_context_vars_for_session function."""

    def test_collects_context_vars_from_single_agent(self):
        """Collects context vars from a single agent."""
        agent = AgentIR(
            id="a1",
            name="Agent1",
            type="llm",
            model="gemini-2.0-flash",
        )
        agent.context_vars = {"topic": "nature", "style": "formal"}

        ir = WorkflowIR(
            root_agent=agent,
            all_agents={"a1": agent},
        )

        result = collect_context_vars_for_session(ir)

        assert result == {"topic": "nature", "style": "formal"}

    def test_collects_context_vars_from_multiple_agents(self):
        """Collects context vars from multiple agents."""
        agent1 = AgentIR(
            id="a1",
            name="Agent1",
            type="llm",
            model="gemini-2.0-flash",
        )
        agent1.context_vars = {"topic": "nature"}

        agent2 = AgentIR(
            id="a2",
            name="Agent2",
            type="llm",
            model="gemini-2.0-flash",
        )
        agent2.context_vars = {"style": "formal"}

        ir = WorkflowIR(
            root_agent=agent1,
            all_agents={"a1": agent1, "a2": agent2},
        )

        result = collect_context_vars_for_session(ir)

        assert result == {"topic": "nature", "style": "formal"}

    def test_same_value_from_multiple_sources_ok(self):
        """Same variable with same value from multiple agents is allowed."""
        agent1 = AgentIR(
            id="a1",
            name="Agent1",
            type="llm",
            model="gemini-2.0-flash",
        )
        agent1.context_vars = {"topic": "nature"}

        agent2 = AgentIR(
            id="a2",
            name="Agent2",
            type="llm",
            model="gemini-2.0-flash",
        )
        agent2.context_vars = {"topic": "nature"}  # Same value

        ir = WorkflowIR(
            root_agent=agent1,
            all_agents={"a1": agent1, "a2": agent2},
        )

        result = collect_context_vars_for_session(ir)

        assert result == {"topic": "nature"}

    def test_conflict_detection_raises_error(self):
        """Detects conflicts when same variable has different values."""
        from adkflow_runner.errors import ExecutionError

        agent1 = AgentIR(
            id="a1",
            name="Agent1",
            type="llm",
            model="gemini-2.0-flash",
        )
        agent1.context_vars = {"topic": "nature"}

        agent2 = AgentIR(
            id="a2",
            name="Agent2",
            type="llm",
            model="gemini-2.0-flash",
        )
        agent2.context_vars = {"topic": "technology"}  # Different value!

        ir = WorkflowIR(
            root_agent=agent1,
            all_agents={"a1": agent1, "a2": agent2},
        )

        with pytest.raises(ExecutionError) as exc_info:
            collect_context_vars_for_session(ir)

        error_msg = str(exc_info.value)
        assert "topic" in error_msg
        assert "Agent1" in error_msg
        assert "Agent2" in error_msg
        assert "nature" in error_msg
        assert "technology" in error_msg

    def test_escapes_curly_brace_patterns_in_values(self):
        """Escapes {word} patterns in values to prevent ADK substitution."""
        agent = AgentIR(
            id="a1",
            name="Agent1",
            type="llm",
            model="gemini-2.0-flash",
        )
        # Value contains {word} pattern that shouldn't be substituted by ADK
        agent.context_vars = {"template": "Hello {name}, welcome!"}

        ir = WorkflowIR(
            root_agent=agent,
            all_agents={"a1": agent},
        )

        result = collect_context_vars_for_session(ir)

        # {name} should be escaped with zero-width space
        assert "{\u200bname}" in result["template"]
        assert result["template"] == "Hello {\u200bname}, welcome!"

    def test_empty_context_vars_returns_empty_dict(self):
        """Returns empty dict when no agents have context vars."""
        agent = AgentIR(
            id="a1",
            name="Agent1",
            type="llm",
            model="gemini-2.0-flash",
        )
        # No context_vars set

        ir = WorkflowIR(
            root_agent=agent,
            all_agents={"a1": agent},
        )

        result = collect_context_vars_for_session(ir)

        assert result == {}

    def test_collects_global_variables(self):
        """Collects global variables from IR."""
        agent = AgentIR(
            id="a1",
            name="Agent1",
            type="llm",
            model="gemini-2.0-flash",
        )

        ir = WorkflowIR(
            root_agent=agent,
            all_agents={"a1": agent},
            global_variables={"director": "John Smith", "company": "Acme Corp"},
        )

        result = collect_context_vars_for_session(ir)

        assert result == {"director": "John Smith", "company": "Acme Corp"}

    def test_merges_global_and_agent_context_vars(self):
        """Merges global variables with agent context vars."""
        agent = AgentIR(
            id="a1",
            name="Agent1",
            type="llm",
            model="gemini-2.0-flash",
        )
        agent.context_vars = {"topic": "nature"}

        ir = WorkflowIR(
            root_agent=agent,
            all_agents={"a1": agent},
            global_variables={"director": "John Smith"},
        )

        result = collect_context_vars_for_session(ir)

        assert result == {"director": "John Smith", "topic": "nature"}

    def test_conflict_between_global_and_agent_vars_raises_error(self):
        """Detects conflicts between global and agent context vars."""
        from adkflow_runner.errors import ExecutionError

        agent = AgentIR(
            id="a1",
            name="Agent1",
            type="llm",
            model="gemini-2.0-flash",
        )
        agent.context_vars = {"topic": "technology"}  # Different from global

        ir = WorkflowIR(
            root_agent=agent,
            all_agents={"a1": agent},
            global_variables={"topic": "nature"},  # Conflict!
        )

        with pytest.raises(ExecutionError) as exc_info:
            collect_context_vars_for_session(ir)

        error_msg = str(exc_info.value)
        assert "topic" in error_msg

    def test_non_string_values_not_escaped(self):
        """Non-string values are passed through unchanged."""
        agent = AgentIR(
            id="a1",
            name="Agent1",
            type="llm",
            model="gemini-2.0-flash",
        )
        # context_vars is typed as dict[str, str] but runtime may have other types
        agent.context_vars = {"count": 42, "enabled": True}  # type: ignore[dict-item]

        ir = WorkflowIR(
            root_agent=agent,
            all_agents={"a1": agent},
        )

        result = collect_context_vars_for_session(ir)

        assert result["count"] == 42
        assert result["enabled"] is True


class TestSessionStateInitialization:
    """Tests for session state initialization with context vars."""

    @pytest.mark.asyncio
    async def test_execute_passes_context_vars_to_session(
        self, tmp_path, mock_adk, mock_hooks
    ):
        """Execute passes collected context vars as initial session state."""
        agent = AgentIR(
            id="a1",
            name="Agent1",
            type="llm",
            model="gemini-2.0-flash",
            instruction="Topic: {topic}",
        )
        agent.context_vars = {"topic": "nature"}

        ir = WorkflowIR(
            root_agent=agent,
            all_agents={"a1": agent},
        )

        with (
            patch(
                "adkflow_runner.runner.workflow_runner.AgentFactory"
            ) as mock_factory_cls,
        ):
            mock_factory = MagicMock()
            mock_factory.create_from_workflow.return_value = MagicMock()
            mock_factory_cls.return_value = mock_factory

            async def mock_event_stream(*args, **kwargs):
                return
                yield

            mock_adk["runner"].run_async = mock_event_stream

            runner = WorkflowRunner()
            config = RunConfig(project_path=tmp_path, input_data={})
            emit = AsyncMock()

            await runner._execute(ir, config, emit, "run-123", mock_hooks)

            # Verify session was created with initial state
            mock_adk["session_service"].create_session.assert_awaited_once()
            call_kwargs = mock_adk["session_service"].create_session.call_args[1]
            assert "state" in call_kwargs
            assert call_kwargs["state"] == {"topic": "nature"}
