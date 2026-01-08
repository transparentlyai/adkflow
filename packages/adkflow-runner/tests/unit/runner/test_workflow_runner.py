"""Tests for the workflow runner.

Tests the main WorkflowRunner class with mocked ADK components.
"""

from __future__ import annotations

import asyncio
import json
import os
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from adkflow_runner.runner.types import (
    EventType,
    RunConfig,
    RunEvent,
    RunResult,
    RunStatus,
)
from adkflow_runner.runner.workflow_runner import WorkflowRunner, run_workflow
from adkflow_runner.ir import AgentIR, WorkflowIR, UserInputIR, CustomNodeIR


class MockCallbacks:
    """Mock callbacks for testing."""

    def __init__(self):
        self.events: list[RunEvent] = []

    async def on_event(self, event: RunEvent) -> None:
        self.events.append(event)


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


@pytest.fixture
def simple_project(tmp_path):
    """Create a simple project for testing."""
    manifest = {
        "name": "test",
        "version": "3.0",
        "tabs": [{"id": "tab1", "name": "Main"}],
        "nodes": [
            {
                "id": "start",
                "type": "start",
                "position": {"x": 0, "y": 0},
                "data": {"tabId": "tab1"},
            },
            {
                "id": "a1",
                "type": "agent",
                "position": {"x": 100, "y": 0},
                "data": {
                    "tabId": "tab1",
                    "config": {"name": "Agent1", "description": "Test agent"},
                },
            },
        ],
        "edges": [
            {"id": "e1", "source": "start", "target": "a1"},
        ],
    }
    (tmp_path / "manifest.json").write_text(json.dumps(manifest))
    return tmp_path


@pytest.fixture
def simple_ir():
    """Create a simple WorkflowIR for testing."""
    agent = AgentIR(
        id="a1",
        name="TestAgent",
        type="llm",
        model="gemini-2.0-flash",
        instruction="Test instruction",
    )
    return WorkflowIR(
        root_agent=agent,
        all_agents={"a1": agent},
        custom_nodes=[],
        user_inputs=[],
    )


class TestWorkflowRunner:
    """Tests for WorkflowRunner class."""

    def test_runner_creation(self):
        """Create a workflow runner."""
        runner = WorkflowRunner()
        assert runner.compiler is not None
        assert runner._enable_cache is True

    def test_runner_with_cache_disabled(self):
        """Create runner with cache disabled."""
        runner = WorkflowRunner(enable_cache=False)
        assert runner._enable_cache is False

    def test_runner_with_custom_cache_dir(self, tmp_path):
        """Create runner with custom cache directory."""
        cache_dir = tmp_path / "cache"
        runner = WorkflowRunner(cache_dir=cache_dir)
        assert runner._cache_dir == cache_dir


class TestRunConfig:
    """Tests for run configuration."""

    def test_config_defaults(self, tmp_path):
        """Verify default config values."""
        config = RunConfig(project_path=tmp_path)

        assert config.project_path == tmp_path
        assert config.tab_id is None
        assert config.input_data == {}
        assert config.callbacks is None
        assert config.timeout_seconds == 300
        assert config.validate is True
        assert config.user_input_provider is None
        assert config.run_id is None

    def test_config_with_input(self, tmp_path):
        """Config with input data."""
        config = RunConfig(
            project_path=tmp_path,
            input_data={"query": "test query"},
        )
        assert config.input_data["query"] == "test query"

    def test_config_with_callbacks(self, tmp_path):
        """Config with callbacks."""
        callbacks = MockCallbacks()
        config = RunConfig(
            project_path=tmp_path,
            callbacks=callbacks,
        )
        assert config.callbacks is callbacks


class TestRunResult:
    """Tests for run result handling."""

    def test_result_creation(self):
        """Create run result."""
        result = RunResult(
            run_id="test-123",
            status=RunStatus.COMPLETED,
            output="Success",
        )
        assert result.run_id == "test-123"
        assert result.status == RunStatus.COMPLETED
        assert result.output == "Success"

    def test_result_with_error(self):
        """Result with error."""
        result = RunResult(
            run_id="test-123",
            status=RunStatus.FAILED,
            error="Something went wrong",
        )
        assert result.error == "Something went wrong"
        assert result.status == RunStatus.FAILED

    def test_result_to_dict(self):
        """Serialize result."""
        result = RunResult(
            run_id="test-123",
            status=RunStatus.COMPLETED,
            output="Done",
            duration_ms=1500.0,
        )
        d = result.to_dict()

        assert d["run_id"] == "test-123"
        assert d["status"] == "completed"
        assert d["output"] == "Done"
        assert d["duration_ms"] == 1500.0


class TestRunEvents:
    """Tests for run events."""

    def test_event_creation(self):
        """Create run event."""
        event = RunEvent(
            type=EventType.RUN_START,
            timestamp=1234567890.0,
        )
        assert event.type == EventType.RUN_START
        assert event.timestamp == 1234567890.0

    def test_event_with_agent(self):
        """Event with agent info."""
        event = RunEvent(
            type=EventType.AGENT_START,
            timestamp=1234567890.0,
            agent_id="a1",
            agent_name="TestAgent",
        )
        assert event.agent_id == "a1"
        assert event.agent_name == "TestAgent"

    def test_event_with_data(self):
        """Event with custom data."""
        event = RunEvent(
            type=EventType.TOOL_CALL,
            timestamp=1234567890.0,
            data={"tool_name": "search", "args": {"q": "test"}},
        )
        assert event.data["tool_name"] == "search"
        assert event.data["args"]["q"] == "test"

    def test_event_to_dict(self):
        """Serialize event."""
        event = RunEvent(
            type=EventType.AGENT_OUTPUT,
            timestamp=1234567890.0,
            agent_id="a1",
            agent_name="Agent",
            data={"output": "Hello"},
        )
        d = event.to_dict()

        assert d["type"] == "agent_output"
        assert d["timestamp"] == 1234567890.0
        assert d["agent_id"] == "a1"
        assert d["data"]["output"] == "Hello"


class TestMockCallbacks:
    """Tests for the mock callbacks helper."""

    @pytest.mark.asyncio
    async def test_callbacks_collect_events(self):
        """Mock callbacks collect all events."""
        callbacks = MockCallbacks()

        event1 = RunEvent(type=EventType.RUN_START, timestamp=1.0)
        event2 = RunEvent(type=EventType.AGENT_START, timestamp=2.0)

        await callbacks.on_event(event1)
        await callbacks.on_event(event2)

        assert len(callbacks.events) == 2
        assert callbacks.events[0].type == EventType.RUN_START
        assert callbacks.events[1].type == EventType.AGENT_START


class TestWorkflowRunnerRun:
    """Tests for WorkflowRunner.run method."""

    @pytest.mark.asyncio
    async def test_run_with_compilation_error(self, tmp_path, mock_adk):
        """Run handles compilation errors gracefully."""
        # Create invalid manifest
        (tmp_path / "manifest.json").write_text("{}")

        callbacks = MockCallbacks()
        runner = WorkflowRunner()
        config = RunConfig(
            project_path=tmp_path,
            callbacks=callbacks,
        )

        result = await runner.run(config)

        assert result.status == RunStatus.FAILED
        assert result.error is not None
        event_types = [e.type for e in callbacks.events]
        assert EventType.ERROR in event_types

    @pytest.mark.asyncio
    async def test_run_with_missing_manifest(self, tmp_path, mock_adk):
        """Run handles missing manifest gracefully."""
        callbacks = MockCallbacks()
        runner = WorkflowRunner()
        config = RunConfig(
            project_path=tmp_path,
            callbacks=callbacks,
        )

        result = await runner.run(config)

        assert result.status == RunStatus.FAILED
        assert result.error is not None

    @pytest.mark.asyncio
    async def test_run_initializes_logging(self, simple_project, mock_adk):
        """Run initializes logging for the project."""
        runner = WorkflowRunner()
        config = RunConfig(project_path=simple_project)

        await runner.run(config)

        mock_adk["logging"].assert_called()
        mock_adk["logger"].initialize.assert_called()

    @pytest.mark.asyncio
    async def test_run_initializes_tracing(self, simple_project, mock_adk):
        """Run initializes tracing for the project."""
        runner = WorkflowRunner()
        config = RunConfig(project_path=simple_project)

        await runner.run(config)

        mock_adk["tracing"].assert_called_once_with(simple_project)

    @pytest.mark.asyncio
    async def test_run_generates_run_id_if_not_provided(self, simple_project, mock_adk):
        """Run generates a run_id if not provided."""
        runner = WorkflowRunner()
        config = RunConfig(project_path=simple_project)

        result = await runner.run(config)

        # run_id should be an 8-character UUID segment
        assert result.run_id is not None
        assert len(result.run_id) == 8

    @pytest.mark.asyncio
    async def test_run_uses_provided_run_id(self, simple_project, mock_adk):
        """Run uses provided run_id instead of generating one."""
        runner = WorkflowRunner()
        config = RunConfig(
            project_path=simple_project,
            run_id="custom-id",
        )

        result = await runner.run(config)
        assert result.run_id == "custom-id"

    @pytest.mark.asyncio
    async def test_run_result_includes_duration(self, simple_project, mock_adk):
        """Run result includes duration."""
        runner = WorkflowRunner()
        config = RunConfig(project_path=simple_project)

        result = await runner.run(config)

        assert result.duration_ms is not None
        assert result.duration_ms >= 0

    @pytest.mark.asyncio
    async def test_run_loads_dotenv_file_if_exists(self, simple_project, mock_adk):
        """Run loads .env file from project directory if it exists."""
        # Create a .env file
        env_file = simple_project / ".env"
        env_file.write_text("TEST_VAR=test_value\n")

        runner = WorkflowRunner()
        config = RunConfig(project_path=simple_project)

        await runner.run(config)

        # Verify load_dotenv was called with the .env file
        mock_adk["load_dotenv"].assert_called_once_with(env_file, override=True)

    @pytest.mark.asyncio
    async def test_run_skips_dotenv_if_not_exists(self, simple_project, mock_adk):
        """Run doesn't load .env if file doesn't exist."""
        runner = WorkflowRunner()
        config = RunConfig(project_path=simple_project)

        await runner.run(config)

        # load_dotenv should not be called
        mock_adk["load_dotenv"].assert_not_called()

    @pytest.mark.asyncio
    async def test_run_emits_start_event(self, simple_project, mock_adk):
        """Run emits RUN_START event."""
        callbacks = MockCallbacks()
        runner = WorkflowRunner()
        config = RunConfig(
            project_path=simple_project,
            tab_id="tab1",
            callbacks=callbacks,
        )

        await runner.run(config)

        # Find RUN_START event
        start_events = [e for e in callbacks.events if e.type == EventType.RUN_START]
        assert len(start_events) == 1
        assert start_events[0].data["project_path"] == str(simple_project)
        assert start_events[0].data["tab_id"] == "tab1"

    @pytest.mark.asyncio
    async def test_run_emits_complete_event_on_success(self, simple_project, mock_adk):
        """Run emits RUN_COMPLETE event on successful execution."""
        callbacks = MockCallbacks()

        # Mock successful execution
        with patch.object(
            WorkflowRunner, "_execute", new_callable=AsyncMock
        ) as mock_execute:
            mock_execute.return_value = "Test output"

            runner = WorkflowRunner()
            config = RunConfig(
                project_path=simple_project,
                callbacks=callbacks,
            )

            result = await runner.run(config)

            assert result.status == RunStatus.COMPLETED
            assert result.output == "Test output"

            # Verify RUN_COMPLETE event
            complete_events = [
                e for e in callbacks.events if e.type == EventType.RUN_COMPLETE
            ]
            assert len(complete_events) == 1
            assert complete_events[0].data["output"] == "Test output"

    @pytest.mark.asyncio
    async def test_run_handles_cancellation(self, simple_project, mock_adk):
        """Run handles asyncio.CancelledError gracefully."""
        callbacks = MockCallbacks()

        with patch.object(
            WorkflowRunner, "_execute", new_callable=AsyncMock
        ) as mock_execute:
            mock_execute.side_effect = asyncio.CancelledError()

            runner = WorkflowRunner()
            config = RunConfig(
                project_path=simple_project,
                callbacks=callbacks,
            )

            result = await runner.run(config)

            assert result.status == RunStatus.CANCELLED
            assert result.error == "Run cancelled"

            # Verify ERROR event emitted
            error_events = [e for e in callbacks.events if e.type == EventType.ERROR]
            assert len(error_events) == 1
            assert error_events[0].data["error"] == "Run cancelled"

    @pytest.mark.asyncio
    async def test_run_includes_traceback_in_dev_mode(self, simple_project, mock_adk):
        """Run includes traceback when ADKFLOW_DEV_MODE=1."""
        callbacks = MockCallbacks()

        # Set dev mode
        os.environ["ADKFLOW_DEV_MODE"] = "1"

        try:
            with patch.object(
                WorkflowRunner, "_execute", new_callable=AsyncMock
            ) as mock_execute:
                mock_execute.side_effect = RuntimeError("Test error")

                runner = WorkflowRunner()
                config = RunConfig(
                    project_path=simple_project,
                    callbacks=callbacks,
                )

                result = await runner.run(config)

                assert result.status == RunStatus.FAILED
                # Error should contain traceback
                assert result.error is not None and (
                    "Traceback" in result.error or "RuntimeError" in result.error
                )
        finally:
            # Clean up
            os.environ.pop("ADKFLOW_DEV_MODE", None)

    @pytest.mark.asyncio
    async def test_run_result_includes_metadata(self, simple_project, mock_adk):
        """Run result includes metadata."""
        with patch.object(
            WorkflowRunner, "_execute", new_callable=AsyncMock
        ) as mock_execute:
            mock_execute.return_value = "Output"

            runner = WorkflowRunner()
            config = RunConfig(
                project_path=simple_project,
                tab_id="tab1",
            )

            result = await runner.run(config)

            assert result.metadata["project_path"] == str(simple_project)
            assert result.metadata["tab_id"] == "tab1"


class TestWorkflowRunnerExecute:
    """Tests for WorkflowRunner._execute method."""

    @pytest.mark.asyncio
    async def test_execute_simple_workflow(
        self, tmp_path, mock_adk, simple_ir, mock_hooks
    ):
        """Execute a simple workflow with mocked ADK."""
        # Mock agent factory and runner
        with (
            patch(
                "adkflow_runner.runner.workflow_runner.AgentFactory"
            ) as mock_factory_cls,
            patch(
                "adkflow_runner.runner.workflow_runner.process_adk_event"
            ) as mock_process_event,
        ):
            mock_agent = MagicMock()
            mock_factory = MagicMock()
            mock_factory.create_from_workflow.return_value = mock_agent
            mock_factory_cls.return_value = mock_factory

            # Mock ADK event stream
            mock_part = MagicMock()
            mock_part.text = "Hello, world!"
            mock_content = MagicMock()
            mock_content.parts = [mock_part]
            mock_event = MagicMock()
            mock_event.content = mock_content

            async def mock_event_stream(*args, **kwargs):
                yield mock_event

            mock_adk["runner"].run_async = mock_event_stream
            mock_process_event.return_value = "TestAgent"

            runner = WorkflowRunner()
            config = RunConfig(
                project_path=tmp_path,
                input_data={"prompt": "Test prompt"},
            )
            emit = AsyncMock()

            output = await runner._execute(
                simple_ir, config, emit, "run-123", mock_hooks
            )

            assert output == "Hello, world!"
            mock_factory.create_from_workflow.assert_called_once_with(
                simple_ir, emit=emit, hooks=mock_hooks
            )

    @pytest.mark.asyncio
    async def test_execute_with_default_prompt(
        self, tmp_path, mock_adk, simple_ir, mock_hooks
    ):
        """Execute uses default prompt if none provided."""
        with (
            patch(
                "adkflow_runner.runner.workflow_runner.AgentFactory"
            ) as mock_factory_cls,
        ):
            mock_agent = MagicMock()
            mock_factory = MagicMock()
            mock_factory.create_from_workflow.return_value = mock_agent
            mock_factory_cls.return_value = mock_factory

            async def mock_event_stream(*args, **kwargs):
                # Verify default prompt is used
                assert "Execute the workflow" in kwargs["new_message"].parts[0].text
                return
                yield  # Make it an async generator

            mock_adk["runner"].run_async = mock_event_stream

            runner = WorkflowRunner()
            config = RunConfig(
                project_path=tmp_path,
                input_data={},  # No prompt
            )
            emit = AsyncMock()

            await runner._execute(simple_ir, config, emit, "run-123", mock_hooks)

    @pytest.mark.asyncio
    async def test_execute_with_trigger_user_inputs(
        self, tmp_path, mock_adk, mock_hooks
    ):
        """Execute handles trigger user inputs."""
        user_input = UserInputIR(
            id="ui1",
            name="User Input",
            variable_name="user_query",
            is_trigger=True,
        )
        agent = AgentIR(id="a1", name="Agent", type="llm", model="gemini-2.0-flash")
        ir = WorkflowIR(
            root_agent=agent,
            all_agents={"a1": agent},
            user_inputs=[user_input],
        )

        with (
            patch(
                "adkflow_runner.runner.workflow_runner.handle_user_input"
            ) as mock_handle_input,
            patch(
                "adkflow_runner.runner.workflow_runner.AgentFactory"
            ) as mock_factory_cls,
        ):
            mock_handle_input.return_value = "User response"
            mock_factory = MagicMock()
            mock_factory.create_from_workflow.return_value = MagicMock()
            mock_factory_cls.return_value = mock_factory

            async def mock_event_stream(*args, **kwargs):
                # Verify trigger input is in prompt
                message_text = kwargs["new_message"].parts[0].text
                assert "user_query: User response" in message_text
                return
                yield

            mock_adk["runner"].run_async = mock_event_stream

            runner = WorkflowRunner()
            config = RunConfig(project_path=tmp_path, input_data={})
            emit = AsyncMock()

            await runner._execute(ir, config, emit, "run-123", mock_hooks)
            mock_handle_input.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_execute_with_custom_nodes(self, tmp_path, mock_adk, mock_hooks):
        """Execute handles custom nodes."""
        custom_node = CustomNodeIR(
            id="custom1",
            unit_id="test.unit",
            name="Test Node",
            source_node_id="custom1",
            config={},
        )
        agent = AgentIR(id="a1", name="Agent", type="llm", model="gemini-2.0-flash")
        ir = WorkflowIR(
            root_agent=agent,
            all_agents={"a1": agent},
            custom_nodes=[custom_node],
        )

        with (
            patch(
                "adkflow_runner.runner.workflow_runner.execute_custom_nodes_graph"
            ) as mock_execute_custom,
            patch(
                "adkflow_runner.runner.workflow_runner.AgentFactory"
            ) as mock_factory_cls,
        ):
            mock_execute_custom.return_value = {"custom1": {"output": "Custom output"}}
            mock_factory = MagicMock()
            mock_factory.create_from_workflow.return_value = MagicMock()
            mock_factory_cls.return_value = mock_factory

            async def mock_event_stream(*args, **kwargs):
                # Verify custom node output is in prompt
                message_text = kwargs["new_message"].parts[0].text
                assert "[custom1.output]: Custom output" in message_text
                return
                yield

            mock_adk["runner"].run_async = mock_event_stream

            runner = WorkflowRunner()
            config = RunConfig(project_path=tmp_path, input_data={})
            emit = AsyncMock()

            await runner._execute(ir, config, emit, "run-123", mock_hooks)
            mock_execute_custom.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_execute_with_context_vars(self, tmp_path, mock_adk, mock_hooks):
        """Execute resolves context variables from custom nodes."""
        custom_node = CustomNodeIR(
            id="custom1",
            unit_id="test.unit",
            name="Context Provider",
            source_node_id="custom1",
            config={},
        )
        agent = AgentIR(
            id="a1",
            name="Agent",
            type="llm",
            model="gemini-2.0-flash",
            context_var_sources=["custom1"],
        )
        ir = WorkflowIR(
            root_agent=agent,
            all_agents={"a1": agent},
            custom_nodes=[custom_node],
        )

        with (
            patch(
                "adkflow_runner.runner.workflow_runner.execute_custom_nodes_graph"
            ) as mock_execute_custom,
            patch(
                "adkflow_runner.runner.workflow_runner.merge_context_vars"
            ) as mock_merge_vars,
            patch(
                "adkflow_runner.runner.workflow_runner.AgentFactory"
            ) as mock_factory_cls,
        ):
            # Custom node outputs context variables
            mock_execute_custom.return_value = {
                "custom1": {"output": {"var1": "value1", "var2": "value2"}}
            }
            mock_merge_vars.return_value = {"var1": "value1", "var2": "value2"}

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

            # Verify merge_context_vars was called
            mock_merge_vars.assert_called_once()
            # Verify agent context_vars were set
            assert agent.context_vars == {"var1": "value1", "var2": "value2"}

    @pytest.mark.asyncio
    async def test_execute_with_pause_user_inputs(self, tmp_path, mock_adk, mock_hooks):
        """Execute handles pause user inputs after agent execution."""
        user_input = UserInputIR(
            id="ui1",
            name="Review Input",
            variable_name="review",
            is_trigger=False,
        )
        agent = AgentIR(id="a1", name="Agent", type="llm", model="gemini-2.0-flash")
        ir = WorkflowIR(
            root_agent=agent,
            all_agents={"a1": agent},
            user_inputs=[user_input],
        )

        with (
            patch(
                "adkflow_runner.runner.workflow_runner.handle_user_input"
            ) as mock_handle_input,
            patch(
                "adkflow_runner.runner.workflow_runner.execute_downstream_agents"
            ) as mock_downstream,
            patch(
                "adkflow_runner.runner.workflow_runner.AgentFactory"
            ) as mock_factory_cls,
        ):
            mock_handle_input.return_value = "User feedback"
            mock_downstream.return_value = "Downstream output"

            mock_factory = MagicMock()
            mock_factory.create_from_workflow.return_value = MagicMock()
            mock_factory_cls.return_value = mock_factory

            # Mock first agent execution
            mock_part = MagicMock()
            mock_part.text = "Initial output"
            mock_content = MagicMock()
            mock_content.parts = [mock_part]
            mock_event = MagicMock()
            mock_event.content = mock_content

            async def mock_event_stream(*args, **kwargs):
                yield mock_event

            mock_adk["runner"].run_async = mock_event_stream

            with patch(
                "adkflow_runner.runner.workflow_runner.process_adk_event",
                new_callable=AsyncMock,
                return_value="Agent",
            ):
                runner = WorkflowRunner()
                config = RunConfig(project_path=tmp_path, input_data={})
                emit = AsyncMock()

                output = await runner._execute(ir, config, emit, "run-123", mock_hooks)

                # Verify pause input was handled
                mock_handle_input.assert_awaited_once()
                # Verify downstream agents were executed
                mock_downstream.assert_awaited_once()
                # Final output should be from downstream
                assert output == "Downstream output"

    @pytest.mark.asyncio
    async def test_execute_pause_input_no_downstream(
        self, tmp_path, mock_adk, mock_hooks
    ):
        """Execute handles pause user input with no downstream agents."""
        user_input = UserInputIR(
            id="ui1",
            name="Final Input",
            variable_name="final_input",
            is_trigger=False,
        )
        agent = AgentIR(id="a1", name="Agent", type="llm", model="gemini-2.0-flash")
        ir = WorkflowIR(
            root_agent=agent,
            all_agents={"a1": agent},
            user_inputs=[user_input],
        )

        with (
            patch(
                "adkflow_runner.runner.workflow_runner.handle_user_input"
            ) as mock_handle_input,
            patch(
                "adkflow_runner.runner.workflow_runner.execute_downstream_agents"
            ) as mock_downstream,
            patch(
                "adkflow_runner.runner.workflow_runner.AgentFactory"
            ) as mock_factory_cls,
        ):
            mock_handle_input.return_value = "Final user input"
            # No downstream output - this is the edge case
            mock_downstream.return_value = None

            mock_factory = MagicMock()
            mock_factory.create_from_workflow.return_value = MagicMock()
            mock_factory_cls.return_value = mock_factory

            # Mock first agent execution
            mock_part = MagicMock()
            mock_part.text = "Initial output"
            mock_content = MagicMock()
            mock_content.parts = [mock_part]
            mock_event = MagicMock()
            mock_event.content = mock_content

            async def mock_event_stream(*args, **kwargs):
                yield mock_event

            mock_adk["runner"].run_async = mock_event_stream

            with patch(
                "adkflow_runner.runner.workflow_runner.process_adk_event",
                new_callable=AsyncMock,
                return_value="Agent",
            ):
                runner = WorkflowRunner()
                config = RunConfig(project_path=tmp_path, input_data={})
                emit = AsyncMock()

                output = await runner._execute(ir, config, emit, "run-123", mock_hooks)

                # Final output should be the user input itself (no downstream)
                assert output == "Final user input"

    @pytest.mark.asyncio
    async def test_execute_writes_output_files(self, tmp_path, mock_adk, mock_hooks):
        """Execute writes output files after completion."""
        from adkflow_runner.ir import OutputFileIR

        output_file = OutputFileIR(
            name="output",
            file_path="output.txt",
            agent_id="a1",
        )
        agent = AgentIR(id="a1", name="Agent", type="llm", model="gemini-2.0-flash")
        ir = WorkflowIR(
            root_agent=agent,
            all_agents={"a1": agent},
            output_files=[output_file],
        )

        with (
            patch(
                "adkflow_runner.runner.workflow_runner.write_output_files"
            ) as mock_write,
            patch(
                "adkflow_runner.runner.workflow_runner.AgentFactory"
            ) as mock_factory_cls,
        ):
            mock_write.return_value = None  # Async function returns None
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

            # Verify write_output_files was called
            mock_write.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_execute_reraises_with_friendly_error(
        self, tmp_path, mock_adk, mock_hooks
    ):
        """Execute re-raises exceptions with friendly error messages."""
        agent = AgentIR(id="a1", name="Agent", type="llm", model="gemini-2.0-flash")
        ir = WorkflowIR(root_agent=agent, all_agents={"a1": agent})

        with (
            patch(
                "adkflow_runner.runner.workflow_runner.AgentFactory"
            ) as mock_factory_cls,
            patch(
                "adkflow_runner.runner.workflow_runner.format_error"
            ) as mock_format_error,
        ):
            mock_factory = MagicMock()
            mock_factory.create_from_workflow.return_value = MagicMock()
            mock_factory_cls.return_value = mock_factory

            async def mock_event_stream(*args, **kwargs):
                raise RuntimeError("API key not valid")

            mock_adk["runner"].run_async = mock_event_stream
            mock_format_error.return_value = "Friendly error message"

            runner = WorkflowRunner()
            config = RunConfig(project_path=tmp_path, input_data={})
            emit = AsyncMock()

            with pytest.raises(RuntimeError, match="Friendly error message"):
                await runner._execute(ir, config, emit, "run-123", mock_hooks)

            mock_format_error.assert_called_once()


class TestRunAsyncGenerator:
    """Tests for WorkflowRunner.run_async_generator method."""

    @pytest.mark.asyncio
    async def test_yields_events_and_result(self, simple_project, mock_adk):
        """run_async_generator yields events and completes successfully."""
        with patch.object(
            WorkflowRunner, "_execute", new_callable=AsyncMock
        ) as mock_execute:
            mock_execute.return_value = "Output"

            runner = WorkflowRunner()
            config = RunConfig(project_path=simple_project)

            # Consume all items from generator
            items = []
            async for item in runner.run_async_generator(config):
                items.append(item)

            # Verify we got items and didn't hang
            assert len(items) > 0

    @pytest.mark.asyncio
    async def test_generator_cancellation_cleanup(self, simple_project, mock_adk):
        """run_async_generator cancels background task when generator is cancelled."""
        # This test verifies the try/except block in run_async_generator
        # by having the generator itself be cancelled
        runner = WorkflowRunner()
        config = RunConfig(project_path=simple_project)

        gen = runner.run_async_generator(config)

        # Start iteration then cancel
        try:
            coro = gen.__anext__()
            item_task = asyncio.create_task(coro)  # type: ignore[arg-type]
            await asyncio.sleep(0.01)  # Let it start
            item_task.cancel()
            await item_task
        except asyncio.CancelledError:
            # Expected - this confirms the cancellation path works
            pass


class TestRunWorkflowConvenience:
    """Tests for run_workflow convenience function."""

    @pytest.mark.asyncio
    async def test_run_workflow_creates_runner_and_config(
        self, simple_project, mock_adk
    ):
        """run_workflow creates runner and config, then runs."""
        with patch.object(WorkflowRunner, "run", new_callable=AsyncMock) as mock_run:
            mock_run.return_value = RunResult(
                run_id="test",
                status=RunStatus.COMPLETED,
                output="Done",
            )

            result = await run_workflow(
                project_path=simple_project,
                input_data={"prompt": "Test"},
            )

            assert result.output == "Done"
            mock_run.assert_called_once()

            # Verify config was created correctly
            call_args = mock_run.call_args[0][0]
            assert call_args.project_path == simple_project
            assert call_args.input_data == {"prompt": "Test"}

    @pytest.mark.asyncio
    async def test_run_workflow_with_string_path(self, simple_project, mock_adk):
        """run_workflow accepts string path."""
        with patch.object(WorkflowRunner, "run", new_callable=AsyncMock) as mock_run:
            mock_run.return_value = RunResult(
                run_id="test",
                status=RunStatus.COMPLETED,
            )

            await run_workflow(
                project_path=str(simple_project),
            )

            # Verify Path was created
            call_args = mock_run.call_args[0][0]
            assert isinstance(call_args.project_path, Path)
            assert call_args.project_path == simple_project

    @pytest.mark.asyncio
    async def test_run_workflow_with_callbacks(self, simple_project, mock_adk):
        """run_workflow passes callbacks to config."""
        callbacks = MockCallbacks()

        with patch.object(WorkflowRunner, "run", new_callable=AsyncMock) as mock_run:
            mock_run.return_value = RunResult(
                run_id="test",
                status=RunStatus.COMPLETED,
            )

            await run_workflow(
                project_path=simple_project,
                callbacks=callbacks,
            )

            call_args = mock_run.call_args[0][0]
            assert call_args.callbacks is callbacks

    @pytest.mark.asyncio
    async def test_run_workflow_defaults_empty_input_data(
        self, simple_project, mock_adk
    ):
        """run_workflow defaults to empty input_data."""
        with patch.object(WorkflowRunner, "run", new_callable=AsyncMock) as mock_run:
            mock_run.return_value = RunResult(
                run_id="test",
                status=RunStatus.COMPLETED,
            )

            await run_workflow(project_path=simple_project)

            call_args = mock_run.call_args[0][0]
            assert call_args.input_data == {}
