"""Run manager for workflow execution.

Manages active workflow runs, SSE subscriptions, and user input handling.
"""

import asyncio
import time
import uuid
from dataclasses import dataclass, field
from pathlib import Path

from adkflow_runner import (
    RunConfig,
    RunResult,
    WorkflowRunner,
    RunEvent,
    RunStatus,
    EventType,
    UserInputRequest,
)

from backend.src.api.execution_models import RunRequest


@dataclass
class PendingUserInput:
    """Tracks a pending user input request."""

    request_id: str
    node_id: str
    node_name: str
    variable_name: str
    timeout_seconds: float
    timeout_behavior: str
    predefined_text: str
    created_at: float
    input_event: asyncio.Event
    input_value: str | None = None
    timed_out: bool = False


@dataclass
class ActiveRun:
    """Tracks state of an active run."""

    run_id: str
    config: RunConfig
    task: asyncio.Task | None = None
    result: RunResult | None = None
    events: list[RunEvent] = field(default_factory=list)
    subscribers: list[asyncio.Queue] = field(default_factory=list)
    cancelled: bool = False
    pending_inputs: dict[str, PendingUserInput] = field(default_factory=dict)


class AsyncQueueInputProvider:
    """User input provider that works with the backend API.

    Uses asyncio.Event to coordinate between the runner and API endpoint.
    When USER_INPUT_REQUIRED event is emitted, this provider waits for
    the API endpoint to receive user input and trigger the event.
    """

    def __init__(self, active_run: ActiveRun):
        self.active_run = active_run

    async def request_input(self, request: UserInputRequest) -> str | None:
        """Request user input and wait for response.

        The USER_INPUT_REQUIRED event is already emitted by the runner.
        This method creates a pending input record and waits for the
        API endpoint to provide the user's response.
        """
        pending = PendingUserInput(
            request_id=request.request_id,
            node_id=request.node_id,
            node_name=request.node_name,
            variable_name=request.variable_name,
            timeout_seconds=request.timeout_seconds,
            timeout_behavior=request.timeout_behavior,
            predefined_text=request.predefined_text,
            created_at=time.time(),
            input_event=asyncio.Event(),
        )
        self.active_run.pending_inputs[request.request_id] = pending

        try:
            timeout = request.timeout_seconds if request.timeout_seconds > 0 else None
            await asyncio.wait_for(
                pending.input_event.wait(),
                timeout=timeout,
            )
            return pending.input_value

        except asyncio.TimeoutError:
            pending.timed_out = True
            raise TimeoutError(f"User input timeout for '{request.node_name}'")

        finally:
            if request.request_id in self.active_run.pending_inputs:
                del self.active_run.pending_inputs[request.request_id]


class RunManager:
    """Manages active workflow runs."""

    def __init__(self):
        self.runs: dict[str, ActiveRun] = {}
        self.runner = WorkflowRunner()

    def generate_run_id(self) -> str:
        """Generate a unique run ID."""
        return str(uuid.uuid4())[:8]

    async def start_run(self, request: RunRequest) -> str:
        """Start a new workflow run."""
        run_id = self.generate_run_id()

        class BroadcastCallbacks:
            def __init__(self, active_run: ActiveRun):
                self.active_run = active_run

            async def on_event(self, event: RunEvent) -> None:
                self.active_run.events.append(event)
                if event.type.value == "run_error":
                    error_msg = event.data.get("error", "Unknown error")
                    print(f"\n[ERROR] {error_msg}\n")
                for queue in self.active_run.subscribers:
                    try:
                        await queue.put(event)
                    except Exception:
                        pass

        config = RunConfig(
            project_path=Path(request.project_path).resolve(),
            tab_id=request.tab_id,
            input_data=request.input_data,
            timeout_seconds=request.timeout_seconds,
            validate=request.validate_workflow,
        )

        active_run = ActiveRun(run_id=run_id, config=config)
        config.callbacks = BroadcastCallbacks(active_run)  # type: ignore
        config.user_input_provider = AsyncQueueInputProvider(active_run)  # type: ignore
        self.runs[run_id] = active_run

        active_run.task = asyncio.create_task(self._execute(run_id))

        return run_id

    async def _execute(self, run_id: str) -> None:
        """Execute the run."""
        active_run = self.runs.get(run_id)
        if not active_run:
            return

        try:
            result = await self.runner.run(active_run.config)
            active_run.result = result
        except asyncio.CancelledError:
            active_run.result = RunResult(
                run_id=run_id,
                status=RunStatus.CANCELLED,
                error="Run cancelled",
            )
        except Exception as e:
            error_event = RunEvent(
                type=EventType.ERROR,
                timestamp=time.time(),
                data={"error": str(e)},
            )
            active_run.events.append(error_event)
            for queue in active_run.subscribers:
                try:
                    await queue.put(error_event)
                except Exception:
                    pass
            active_run.result = RunResult(
                run_id=run_id,
                status=RunStatus.FAILED,
                error=str(e),
            )
        finally:
            for queue in active_run.subscribers:
                await queue.put(None)

    def get_run(self, run_id: str) -> ActiveRun | None:
        """Get an active run by ID."""
        return self.runs.get(run_id)

    async def subscribe(self, run_id: str) -> asyncio.Queue:
        """Subscribe to events for a run."""
        active_run = self.runs.get(run_id)
        if not active_run:
            raise ValueError(f"Run not found: {run_id}")

        queue: asyncio.Queue = asyncio.Queue()
        active_run.subscribers.append(queue)

        for event in active_run.events:
            await queue.put(event)

        if active_run.result is not None:
            await queue.put(None)

        return queue

    def unsubscribe(self, run_id: str, queue: asyncio.Queue) -> None:
        """Unsubscribe from events."""
        active_run = self.runs.get(run_id)
        if active_run and queue in active_run.subscribers:
            active_run.subscribers.remove(queue)

    async def cancel_run(self, run_id: str) -> bool:
        """Cancel a running workflow."""
        active_run = self.runs.get(run_id)
        if not active_run:
            return False

        if active_run.task and not active_run.task.done():
            active_run.cancelled = True
            active_run.task.cancel()
            return True

        return False

    def cleanup_old_runs(self, max_age_seconds: float = 3600) -> None:
        """Remove old completed runs."""
        now = time.time()
        to_remove = []

        for run_id, active_run in self.runs.items():
            if active_run.result:
                if active_run.events:
                    last_event_time = active_run.events[-1].timestamp
                    if now - last_event_time > max_age_seconds:
                        to_remove.append(run_id)

        for run_id in to_remove:
            del self.runs[run_id]


# Global run manager instance
run_manager = RunManager()
