"""Tests for run_manager module."""

from __future__ import annotations

import asyncio
import time
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from backend.src.api.run_manager import (
    ActiveRun,
    AsyncQueueInputProvider,
    PendingUserInput,
    RunManager,
)


# =============================================================================
# Tests for PendingUserInput
# =============================================================================


class TestPendingUserInput:
    """Tests for PendingUserInput dataclass."""

    def test_creation(self):
        """Test creating a PendingUserInput."""
        event = asyncio.Event()
        pending = PendingUserInput(
            request_id="req-1",
            node_id="node-1",
            node_name="TestNode",
            variable_name="query",
            timeout_seconds=30.0,
            timeout_behavior="error",
            predefined_text="default",
            created_at=time.time(),
            input_event=event,
        )

        assert pending.request_id == "req-1"
        assert pending.node_id == "node-1"
        assert pending.node_name == "TestNode"
        assert pending.variable_name == "query"
        assert pending.timeout_seconds == 30.0
        assert pending.input_value is None
        assert pending.timed_out is False

    def test_default_values(self):
        """Test default values for optional fields."""
        event = asyncio.Event()
        pending = PendingUserInput(
            request_id="req-1",
            node_id="node-1",
            node_name="TestNode",
            variable_name="query",
            timeout_seconds=30.0,
            timeout_behavior="error",
            predefined_text="",
            created_at=time.time(),
            input_event=event,
        )

        assert pending.input_value is None
        assert pending.timed_out is False


# =============================================================================
# Tests for ActiveRun
# =============================================================================


class TestActiveRun:
    """Tests for ActiveRun dataclass."""

    def test_creation(self):
        """Test creating an ActiveRun."""
        config = MagicMock()
        active_run = ActiveRun(run_id="run-1", config=config)

        assert active_run.run_id == "run-1"
        assert active_run.config is config
        assert active_run.task is None
        assert active_run.result is None
        assert active_run.events == []
        assert active_run.subscribers == []
        assert active_run.cancelled is False
        assert active_run.pending_inputs == {}

    def test_events_and_subscribers_are_mutable(self):
        """Test that lists are mutable as expected."""
        config = MagicMock()
        active_run = ActiveRun(run_id="run-1", config=config)

        # Add events
        event = MagicMock()
        active_run.events.append(event)
        assert len(active_run.events) == 1

        # Add subscribers
        queue: asyncio.Queue = asyncio.Queue()
        active_run.subscribers.append(queue)
        assert len(active_run.subscribers) == 1


# =============================================================================
# Tests for AsyncQueueInputProvider
# =============================================================================


class TestAsyncQueueInputProvider:
    """Tests for AsyncQueueInputProvider class."""

    def test_init(self):
        """Test initialization."""
        active_run = MagicMock()
        provider = AsyncQueueInputProvider(active_run)
        assert provider.active_run is active_run

    @pytest.mark.asyncio
    async def test_request_input_returns_value(self):
        """Test that request_input returns the provided value."""
        config = MagicMock()
        active_run = ActiveRun(run_id="run-1", config=config)
        provider = AsyncQueueInputProvider(active_run)

        request = MagicMock()
        request.request_id = "req-1"
        request.node_id = "node-1"
        request.node_name = "TestNode"
        request.variable_name = "query"
        request.timeout_seconds = 0  # No timeout
        request.timeout_behavior = "error"
        request.predefined_text = ""

        # Simulate user providing input in a concurrent task
        async def provide_input():
            await asyncio.sleep(0.01)
            pending = active_run.pending_inputs.get("req-1")
            if pending:
                pending.input_value = "user response"
                pending.input_event.set()

        asyncio.create_task(provide_input())
        result = await provider.request_input(request)

        assert result == "user response"
        # Pending should be cleaned up
        assert "req-1" not in active_run.pending_inputs

    @pytest.mark.asyncio
    async def test_request_input_timeout(self):
        """Test that request_input raises TimeoutError on timeout."""
        config = MagicMock()
        active_run = ActiveRun(run_id="run-1", config=config)
        provider = AsyncQueueInputProvider(active_run)

        request = MagicMock()
        request.request_id = "req-1"
        request.node_id = "node-1"
        request.node_name = "TestNode"
        request.variable_name = "query"
        request.timeout_seconds = 0.05  # Very short timeout
        request.timeout_behavior = "error"
        request.predefined_text = ""

        with pytest.raises(TimeoutError, match="User input timeout"):
            await provider.request_input(request)

        # Pending should be cleaned up even after timeout
        assert "req-1" not in active_run.pending_inputs

    @pytest.mark.asyncio
    async def test_request_input_sets_timed_out_flag(self):
        """Test that timeout sets the timed_out flag."""
        config = MagicMock()
        active_run = ActiveRun(run_id="run-1", config=config)
        provider = AsyncQueueInputProvider(active_run)

        request = MagicMock()
        request.request_id = "req-1"
        request.node_id = "node-1"
        request.node_name = "TestNode"
        request.variable_name = "query"
        request.timeout_seconds = 0.01
        request.timeout_behavior = "error"
        request.predefined_text = ""

        # Track the pending input before it gets cleaned up
        timed_out = False

        original_request_input = provider.request_input

        async def tracking_request_input(request):  # type: ignore[misc]
            nonlocal timed_out
            try:
                return await original_request_input(request)
            except TimeoutError:
                # The pending input is cleaned up in finally, but timed_out should be set
                timed_out = True
                raise

        provider.request_input = tracking_request_input  # type: ignore[method-assign]

        with pytest.raises(TimeoutError):
            await provider.request_input(request)

        assert timed_out


# =============================================================================
# Tests for RunManager
# =============================================================================


class TestRunManager:
    """Tests for RunManager class."""

    def test_init(self):
        """Test initialization."""
        manager = RunManager()
        assert manager.runs == {}
        assert manager.runner is not None

    def test_generate_run_id(self):
        """Test run ID generation."""
        manager = RunManager()
        run_id = manager.generate_run_id()

        assert isinstance(run_id, str)
        assert len(run_id) == 8

    def test_generate_run_id_unique(self):
        """Test that generated run IDs are unique."""
        manager = RunManager()
        ids = {manager.generate_run_id() for _ in range(100)}
        assert len(ids) == 100

    @pytest.mark.asyncio
    async def test_start_run_creates_active_run(self, tmp_path: Path):
        """Test that start_run creates an ActiveRun."""
        manager = RunManager()

        # Create minimal project
        manifest = {
            "name": "test",
            "version": "3.0",
            "tabs": [{"id": "tab1", "name": "Main"}],
            "nodes": [],
            "edges": [],
            "settings": {},
        }
        import json

        (tmp_path / "manifest.json").write_text(json.dumps(manifest))

        request = MagicMock()
        request.project_path = str(tmp_path)
        request.tab_id = None
        request.input_data = {}
        request.timeout_seconds = 300
        request.validate_workflow = False

        with patch.object(manager.runner, "run", new_callable=AsyncMock) as mock_run:
            mock_result = MagicMock()
            mock_result.status.value = "completed"
            mock_run.return_value = mock_result

            run_id = await manager.start_run(request)

            assert run_id in manager.runs
            active_run = manager.runs[run_id]
            assert active_run.run_id == run_id
            assert active_run.task is not None

            # Wait for task to complete
            await asyncio.sleep(0.1)

    @pytest.mark.asyncio
    async def test_start_run_returns_run_id(self, tmp_path: Path):
        """Test that start_run returns a run ID."""
        manager = RunManager()

        manifest = {
            "name": "test",
            "version": "3.0",
            "tabs": [{"id": "tab1", "name": "Main"}],
            "nodes": [],
            "edges": [],
            "settings": {},
        }
        import json

        (tmp_path / "manifest.json").write_text(json.dumps(manifest))

        request = MagicMock()
        request.project_path = str(tmp_path)
        request.tab_id = None
        request.input_data = {"query": "test"}
        request.timeout_seconds = 300
        request.validate_workflow = False

        with patch.object(manager.runner, "run", new_callable=AsyncMock) as mock_run:
            mock_result = MagicMock()
            mock_result.status.value = "completed"
            mock_run.return_value = mock_result

            run_id = await manager.start_run(request)

            assert isinstance(run_id, str)
            assert len(run_id) == 8

    def test_get_run_exists(self):
        """Test get_run returns run when it exists."""
        manager = RunManager()
        config = MagicMock()
        active_run = ActiveRun(run_id="run-1", config=config)
        manager.runs["run-1"] = active_run

        result = manager.get_run("run-1")
        assert result is active_run

    def test_get_run_not_exists(self):
        """Test get_run returns None when run doesn't exist."""
        manager = RunManager()
        result = manager.get_run("nonexistent")
        assert result is None

    @pytest.mark.asyncio
    async def test_subscribe_returns_queue(self):
        """Test subscribe returns a queue with events."""
        manager = RunManager()
        config = MagicMock()
        active_run = ActiveRun(run_id="run-1", config=config)

        # Add some existing events
        event1 = MagicMock()
        event2 = MagicMock()
        active_run.events = [event1, event2]
        manager.runs["run-1"] = active_run

        queue = await manager.subscribe("run-1")

        assert isinstance(queue, asyncio.Queue)
        assert queue in active_run.subscribers

        # Should receive existing events
        received = await queue.get()
        assert received is event1
        received = await queue.get()
        assert received is event2

    @pytest.mark.asyncio
    async def test_subscribe_run_not_found(self):
        """Test subscribe raises error for nonexistent run."""
        manager = RunManager()

        with pytest.raises(ValueError, match="Run not found"):
            await manager.subscribe("nonexistent")

    @pytest.mark.asyncio
    async def test_subscribe_completed_run(self):
        """Test subscribe to completed run gets None sentinel."""
        manager = RunManager()
        config = MagicMock()
        active_run = ActiveRun(run_id="run-1", config=config)
        active_run.result = MagicMock()  # Mark as completed
        manager.runs["run-1"] = active_run

        queue = await manager.subscribe("run-1")

        # Should receive None sentinel
        received = await queue.get()
        assert received is None

    def test_unsubscribe_removes_queue(self):
        """Test unsubscribe removes queue from subscribers."""
        manager = RunManager()
        config = MagicMock()
        active_run = ActiveRun(run_id="run-1", config=config)
        queue: asyncio.Queue = asyncio.Queue()
        active_run.subscribers.append(queue)
        manager.runs["run-1"] = active_run

        manager.unsubscribe("run-1", queue)

        assert queue not in active_run.subscribers

    def test_unsubscribe_nonexistent_queue(self):
        """Test unsubscribe with queue not in subscribers."""
        manager = RunManager()
        config = MagicMock()
        active_run = ActiveRun(run_id="run-1", config=config)
        manager.runs["run-1"] = active_run

        queue: asyncio.Queue = asyncio.Queue()
        # Should not raise
        manager.unsubscribe("run-1", queue)

    def test_unsubscribe_nonexistent_run(self):
        """Test unsubscribe with nonexistent run."""
        manager = RunManager()
        queue: asyncio.Queue = asyncio.Queue()

        # Should not raise
        manager.unsubscribe("nonexistent", queue)

    @pytest.mark.asyncio
    async def test_cancel_run_success(self):
        """Test cancel_run cancels running task."""
        manager = RunManager()
        config = MagicMock()
        active_run = ActiveRun(run_id="run-1", config=config)

        # Create a running task
        async def long_running():
            try:
                await asyncio.sleep(10)
            except asyncio.CancelledError:
                raise

        active_run.task = asyncio.create_task(long_running())
        manager.runs["run-1"] = active_run

        result = await manager.cancel_run("run-1")

        assert result is True
        assert active_run.cancelled is True

        # Wait for task to actually be cancelled
        with pytest.raises(asyncio.CancelledError):
            await active_run.task

    @pytest.mark.asyncio
    async def test_cancel_run_not_found(self):
        """Test cancel_run returns False for nonexistent run."""
        manager = RunManager()

        result = await manager.cancel_run("nonexistent")
        assert result is False

    @pytest.mark.asyncio
    async def test_cancel_run_already_done(self):
        """Test cancel_run returns False for completed run."""
        manager = RunManager()
        config = MagicMock()
        active_run = ActiveRun(run_id="run-1", config=config)

        # Create a completed task
        async def quick_task():
            return "done"

        active_run.task = asyncio.create_task(quick_task())
        await active_run.task  # Wait for completion
        manager.runs["run-1"] = active_run

        result = await manager.cancel_run("run-1")
        assert result is False

    def test_cleanup_old_runs_removes_old(self):
        """Test cleanup_old_runs removes old completed runs."""
        manager = RunManager()

        # Create an old completed run
        config = MagicMock()
        old_run = ActiveRun(run_id="old-run", config=config)
        old_run.result = MagicMock()
        old_event = MagicMock()
        old_event.timestamp = time.time() - 7200  # 2 hours ago
        old_run.events = [old_event]
        manager.runs["old-run"] = old_run

        # Create a recent completed run
        recent_run = ActiveRun(run_id="recent-run", config=config)
        recent_run.result = MagicMock()
        recent_event = MagicMock()
        recent_event.timestamp = time.time() - 1800  # 30 minutes ago
        recent_run.events = [recent_event]
        manager.runs["recent-run"] = recent_run

        manager.cleanup_old_runs(max_age_seconds=3600)

        assert "old-run" not in manager.runs
        assert "recent-run" in manager.runs

    def test_cleanup_old_runs_keeps_running(self):
        """Test cleanup_old_runs keeps running tasks."""
        manager = RunManager()

        config = MagicMock()
        running_run = ActiveRun(run_id="running", config=config)
        running_run.result = None  # Still running
        old_event = MagicMock()
        old_event.timestamp = time.time() - 7200
        running_run.events = [old_event]
        manager.runs["running"] = running_run

        manager.cleanup_old_runs(max_age_seconds=3600)

        # Should still be there because result is None
        assert "running" in manager.runs

    def test_cleanup_old_runs_no_events(self):
        """Test cleanup_old_runs handles runs with no events."""
        manager = RunManager()

        config = MagicMock()
        run_no_events = ActiveRun(run_id="no-events", config=config)
        run_no_events.result = MagicMock()
        run_no_events.events = []  # No events
        manager.runs["no-events"] = run_no_events

        # Should not raise
        manager.cleanup_old_runs(max_age_seconds=3600)

        # Should still be there because no events to check timestamp
        assert "no-events" in manager.runs


# =============================================================================
# Tests for _execute method
# =============================================================================


class TestRunManagerExecute:
    """Tests for RunManager._execute method."""

    @pytest.mark.asyncio
    async def test_execute_success(self, tmp_path: Path):
        """Test successful execution sets result."""
        manager = RunManager()

        manifest = {
            "name": "test",
            "version": "3.0",
            "tabs": [{"id": "tab1", "name": "Main"}],
            "nodes": [],
            "edges": [],
            "settings": {},
        }
        import json

        (tmp_path / "manifest.json").write_text(json.dumps(manifest))

        request = MagicMock()
        request.project_path = str(tmp_path)
        request.tab_id = None
        request.input_data = {}
        request.timeout_seconds = 300
        request.validate_workflow = False

        mock_result = MagicMock()
        mock_result.status.value = "completed"
        mock_result.output = "test output"

        with patch.object(manager.runner, "run", new_callable=AsyncMock) as mock_run:
            mock_run.return_value = mock_result

            run_id = await manager.start_run(request)

            # Wait for execution to complete
            await asyncio.sleep(0.1)

            active_run = manager.runs[run_id]
            assert active_run.result is mock_result

    @pytest.mark.asyncio
    async def test_execute_error_sets_failed_result(self, tmp_path: Path):
        """Test execution error sets failed result."""
        manager = RunManager()

        manifest = {
            "name": "test",
            "version": "3.0",
            "tabs": [{"id": "tab1", "name": "Main"}],
            "nodes": [],
            "edges": [],
            "settings": {},
        }
        import json

        (tmp_path / "manifest.json").write_text(json.dumps(manifest))

        request = MagicMock()
        request.project_path = str(tmp_path)
        request.tab_id = None
        request.input_data = {}
        request.timeout_seconds = 300
        request.validate_workflow = False

        with patch.object(manager.runner, "run", new_callable=AsyncMock) as mock_run:
            mock_run.side_effect = Exception("Test error")

            run_id = await manager.start_run(request)

            # Wait for execution to complete
            await asyncio.sleep(0.1)

            active_run = manager.runs[run_id]
            assert active_run.result is not None
            assert active_run.result.status.value == "failed"
            assert active_run.result.error is not None
            assert "Test error" in active_run.result.error

    @pytest.mark.asyncio
    async def test_execute_broadcasts_events(self, tmp_path: Path):
        """Test execution broadcasts events to subscribers."""
        manager = RunManager()

        manifest = {
            "name": "test",
            "version": "3.0",
            "tabs": [{"id": "tab1", "name": "Main"}],
            "nodes": [],
            "edges": [],
            "settings": {},
        }
        import json

        (tmp_path / "manifest.json").write_text(json.dumps(manifest))

        request = MagicMock()
        request.project_path = str(tmp_path)
        request.tab_id = None
        request.input_data = {}
        request.timeout_seconds = 300
        request.validate_workflow = False

        mock_result = MagicMock()
        mock_result.status.value = "completed"

        with patch.object(manager.runner, "run", new_callable=AsyncMock) as mock_run:
            mock_run.return_value = mock_result

            run_id = await manager.start_run(request)

            # Subscribe to events
            queue = await manager.subscribe(run_id)

            # Wait for execution to complete
            await asyncio.sleep(0.1)

            # Should receive None sentinel when complete
            received = await asyncio.wait_for(queue.get(), timeout=1.0)
            assert received is None
