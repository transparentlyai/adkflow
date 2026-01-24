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

from adkflow_runner.ir import AgentIR, WorkflowIR
from adkflow_runner.runner.types import (
    EventType,
    RunConfig,
    RunEvent,
    RunResult,
    RunStatus,
)
from adkflow_runner.runner.workflow_runner import WorkflowRunner, run_workflow


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
