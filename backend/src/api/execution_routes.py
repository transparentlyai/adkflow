"""Execution API routes for workflow running.

Provides endpoints for:
- Starting workflow runs
- Streaming execution events via SSE
- Checking run status
- Cancelling runs
"""

import asyncio
import json
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sse_starlette.sse import EventSourceResponse

from adkflow_runner import (
    Compiler,
    RunConfig,
    RunResult,
    WorkflowRunner,
    RunEvent,
    RunStatus,
)

router = APIRouter(prefix="/api/execution", tags=["execution"])


# Request/Response Models


class RunRequest(BaseModel):
    """Request to start a workflow run."""

    project_path: str = Field(..., description="Path to the project directory")
    tab_id: str | None = Field(None, description="Specific tab to run")
    input_data: dict[str, Any] = Field(
        default_factory=dict, description="Input data for the workflow"
    )
    timeout_seconds: float = Field(
        default=300, description="Execution timeout in seconds"
    )
    validate_workflow: bool = Field(
        default=True, description="Whether to validate before running"
    )


class RunResponse(BaseModel):
    """Response when starting a run."""

    run_id: str = Field(..., description="Unique run identifier")
    status: str = Field(..., description="Run status")
    message: str = Field(..., description="Status message")


class RunStatusResponse(BaseModel):
    """Response for run status check."""

    run_id: str
    status: str
    output: str | None = None
    error: str | None = None
    duration_ms: float = 0
    event_count: int = 0


class ValidateRequest(BaseModel):
    """Request to validate a workflow."""

    project_path: str = Field(..., description="Path to the project directory")


class ValidateResponse(BaseModel):
    """Response from workflow validation."""

    valid: bool
    errors: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    agent_count: int = 0
    tab_count: int = 0
    teleporter_count: int = 0


# Run Manager (tracks active runs)


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

        # Create callback that broadcasts to subscribers
        class BroadcastCallbacks:
            def __init__(self, active_run: ActiveRun):
                self.active_run = active_run

            async def on_event(self, event: RunEvent) -> None:
                self.active_run.events.append(event)
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
        self.runs[run_id] = active_run

        # Start execution in background
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
            active_run.result = RunResult(
                run_id=run_id,
                status=RunStatus.FAILED,
                error=str(e),
            )
        finally:
            # Signal completion to all subscribers
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

        # Send any existing events
        for event in active_run.events:
            await queue.put(event)

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
        import time

        now = time.time()
        to_remove = []

        for run_id, active_run in self.runs.items():
            if active_run.result:
                # Check if run is old enough to clean up
                if active_run.events:
                    last_event_time = active_run.events[-1].timestamp
                    if now - last_event_time > max_age_seconds:
                        to_remove.append(run_id)

        for run_id in to_remove:
            del self.runs[run_id]


# Global run manager instance
run_manager = RunManager()


# Endpoints


@router.post("/run", response_model=RunResponse)
async def start_run(request: RunRequest) -> RunResponse:
    """Start a workflow run.

    Returns a run_id that can be used to:
    - Subscribe to events via SSE at /run/{run_id}/events
    - Check status at /run/{run_id}/status
    - Cancel the run at /run/{run_id}/cancel
    """
    # Validate project path
    project_path = Path(request.project_path).resolve()
    if not project_path.exists():
        raise HTTPException(
            status_code=404, detail=f"Project path not found: {request.project_path}"
        )

    manifest_path = project_path / "manifest.json"
    if not manifest_path.exists():
        raise HTTPException(
            status_code=400,
            detail="Invalid project: manifest.json not found",
        )

    try:
        run_id = await run_manager.start_run(request)
        return RunResponse(
            run_id=run_id,
            status="running",
            message="Workflow execution started",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/run/{run_id}/events")
async def stream_events(run_id: str, request: Request):
    """Stream execution events via Server-Sent Events (SSE).

    Connect to this endpoint to receive real-time updates during execution.
    Events are formatted as SSE with event type and JSON data.
    """
    active_run = run_manager.get_run(run_id)
    if not active_run:
        raise HTTPException(status_code=404, detail=f"Run not found: {run_id}")

    async def event_generator():
        queue: asyncio.Queue[RunEvent | None] | None = None
        try:
            queue = await run_manager.subscribe(run_id)

            while True:
                if await request.is_disconnected():
                    break

                try:
                    event = await asyncio.wait_for(queue.get(), timeout=30)

                    if event is None:
                        yield {
                            "event": "complete",
                            "data": json.dumps({"run_id": run_id}),
                        }
                        break

                    yield {
                        "event": event.type.value,
                        "data": json.dumps(event.to_dict()),
                    }

                except asyncio.TimeoutError:
                    yield {"event": "keepalive", "data": ""}

        finally:
            if queue is not None:
                run_manager.unsubscribe(run_id, queue)

    return EventSourceResponse(event_generator())


@router.get("/run/{run_id}/status", response_model=RunStatusResponse)
async def get_run_status(run_id: str) -> RunStatusResponse:
    """Get the current status of a run.

    Use this for polling-based status updates as an alternative to SSE.
    """
    active_run = run_manager.get_run(run_id)
    if not active_run:
        raise HTTPException(status_code=404, detail=f"Run not found: {run_id}")

    if active_run.result:
        return RunStatusResponse(
            run_id=run_id,
            status=active_run.result.status.value,
            output=active_run.result.output,
            error=active_run.result.error,
            duration_ms=active_run.result.duration_ms,
            event_count=len(active_run.events),
        )
    else:
        return RunStatusResponse(
            run_id=run_id,
            status="running",
            event_count=len(active_run.events),
        )


@router.post("/run/{run_id}/cancel")
async def cancel_run(run_id: str):
    """Cancel a running workflow."""
    active_run = run_manager.get_run(run_id)
    if not active_run:
        raise HTTPException(status_code=404, detail=f"Run not found: {run_id}")

    cancelled = await run_manager.cancel_run(run_id)

    if cancelled:
        return {"success": True, "message": "Run cancelled"}
    else:
        return {"success": False, "message": "Run already completed or not running"}


@router.post("/validate", response_model=ValidateResponse)
async def validate_workflow(request: ValidateRequest) -> ValidateResponse:
    """Validate a workflow without executing it.

    Checks for:
    - Valid project structure
    - Missing file references
    - Cycles in sequential flow
    - Invalid agent configurations
    """
    project_path = Path(request.project_path).resolve()
    if not project_path.exists():
        raise HTTPException(
            status_code=404, detail=f"Project path not found: {request.project_path}"
        )

    compiler = Compiler()

    try:
        project = compiler.load(project_path)
        parsed = compiler.parse(project)
        graph = compiler.build_graph(parsed)
        result = compiler.validate_graph(graph, project)

        return ValidateResponse(
            valid=result.valid,
            errors=[str(e) for e in result.errors],
            warnings=result.warnings,
            agent_count=len(graph.get_agent_nodes()),
            tab_count=len(project.tabs),
            teleporter_count=len(graph.teleporter_pairs),
        )

    except Exception as e:
        return ValidateResponse(
            valid=False,
            errors=[str(e)],
        )


@router.get("/runs")
async def list_runs(
    status: str | None = Query(None, description="Filter by status"),
    limit: int = Query(10, description="Maximum number of runs to return"),
):
    """List recent workflow runs."""
    runs = []

    for run_id, active_run in run_manager.runs.items():
        run_status = "running"
        if active_run.result:
            run_status = active_run.result.status.value

        if status and run_status != status:
            continue

        runs.append(
            {
                "run_id": run_id,
                "status": run_status,
                "project_path": str(active_run.config.project_path),
                "event_count": len(active_run.events),
            }
        )

        if len(runs) >= limit:
            break

    return {"runs": runs}
