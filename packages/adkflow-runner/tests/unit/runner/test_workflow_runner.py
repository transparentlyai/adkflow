"""Tests for the workflow runner.

Tests the main WorkflowRunner class with mocked ADK components.
"""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from adkflow_runner.runner.types import (
    EventType,
    RunConfig,
    RunEvent,
    RunResult,
    RunStatus,
)
from adkflow_runner.runner.workflow_runner import WorkflowRunner


class MockCallbacks:
    """Mock callbacks for testing."""

    def __init__(self):
        self.events: list[RunEvent] = []

    async def on_event(self, event: RunEvent) -> None:
        self.events.append(event)


@pytest.fixture
def mock_adk():
    """Mock all ADK dependencies."""
    with (
        patch("adkflow_runner.runner.workflow_runner.Runner") as mock_runner_cls,
        patch(
            "adkflow_runner.runner.workflow_runner.InMemorySessionService"
        ) as mock_session,
        patch(
            "adkflow_runner.runner.workflow_runner.configure_logging"
        ) as mock_logging,
        patch("adkflow_runner.runner.workflow_runner.Logger") as mock_logger,
        patch("adkflow_runner.runner.workflow_runner.setup_tracing") as mock_tracing,
    ):
        # Setup runner mock
        mock_runner = MagicMock()
        mock_runner.run_async = AsyncMock()
        mock_runner_cls.return_value = mock_runner

        yield {
            "runner_cls": mock_runner_cls,
            "runner": mock_runner,
            "session": mock_session,
            "logging": mock_logging,
            "logger": mock_logger,
            "tracing": mock_tracing,
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
        # This will fail at execution but should still call logging setup
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
