"""Execution API routes for workflow running.

Provides endpoints for:
- Starting workflow runs
- Streaming execution events via SSE
- Checking run status
- Cancelling runs
"""

import asyncio
import json
import time
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query, Request
from sse_starlette.sse import EventSourceResponse

from adkflow_runner import Compiler, RunEvent

from backend.src.api.execution_models import (
    RunRequest,
    RunResponse,
    RunStatusResponse,
    ValidateRequest,
    ValidateResponse,
    TopologyRequest,
    TopologyResponse,
    UserInputSubmission,
    UserInputSubmissionResponse,
)
from backend.src.api.run_manager import run_manager

router = APIRouter(prefix="/api/execution", tags=["execution"])


@router.post("/run", response_model=RunResponse)
async def start_run(request: RunRequest) -> RunResponse:
    """Start a workflow run.

    Returns a run_id that can be used to:
    - Subscribe to events via SSE at /run/{run_id}/events
    - Check status at /run/{run_id}/status
    - Cancel the run at /run/{run_id}/cancel
    """
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

        except Exception as e:
            yield {
                "event": "run_error",
                "data": json.dumps(
                    {
                        "type": "run_error",
                        "timestamp": time.time(),
                        "agent_id": None,
                        "agent_name": None,
                        "data": {"error": str(e)},
                    }
                ),
            }
            yield {
                "event": "complete",
                "data": json.dumps({"run_id": run_id}),
            }
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

        error_node_ids = [
            e.location.node_id
            for e in result.errors
            if e.location and e.location.node_id
        ]

        warning_node_ids = [
            w.location.node_id
            for w in result.warnings
            if w.location and w.location.node_id
        ]

        node_errors: dict[str, list[str]] = {}
        for e in result.errors:
            if e.location and e.location.node_id:
                node_id = e.location.node_id
                if node_id not in node_errors:
                    node_errors[node_id] = []
                node_errors[node_id].append(str(e))

        node_warnings: dict[str, list[str]] = {}
        for w in result.warnings:
            if w.location and w.location.node_id:
                node_id = w.location.node_id
                if node_id not in node_warnings:
                    node_warnings[node_id] = []
                node_warnings[node_id].append(str(w))

        return ValidateResponse(
            valid=result.valid,
            errors=[str(e) for e in result.errors],
            warnings=[str(w) for w in result.warnings],
            error_node_ids=error_node_ids,
            warning_node_ids=warning_node_ids,
            node_errors=node_errors,
            node_warnings=node_warnings,
            agent_count=len(graph.get_agent_nodes()),
            tab_count=len(project.tabs),
            teleporter_count=len(graph.teleporter_pairs),
        )

    except Exception as e:
        return ValidateResponse(
            valid=False,
            errors=[str(e)],
        )


@router.post("/topology", response_model=TopologyResponse)
async def get_topology(request: TopologyRequest) -> TopologyResponse:
    """Get the compiled agent topology of a workflow.

    Returns a Mermaid diagram and ASCII tree showing how agents
    are grouped and executed (SequentialAgent, ParallelAgent, LoopAgent).
    """
    from adkflow_runner.visualization import render_ascii, render_mermaid

    project_path = Path(request.project_path).resolve()
    if not project_path.exists():
        raise HTTPException(
            status_code=404, detail=f"Project path not found: {request.project_path}"
        )

    compiler = Compiler()

    try:
        ir = compiler.compile(project_path)
        mermaid = render_mermaid(ir)
        ascii_tree = render_ascii(ir)

        return TopologyResponse(
            mermaid=mermaid,
            ascii=ascii_tree,
            agent_count=len(ir.all_agents),
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate topology: {e}")


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


@router.post("/run/{run_id}/input", response_model=UserInputSubmissionResponse)
async def submit_user_input(
    run_id: str, request: UserInputSubmission
) -> UserInputSubmissionResponse:
    """Submit user input for a waiting workflow.

    When a workflow encounters a UserInput node and emits USER_INPUT_REQUIRED,
    the frontend should collect user input and submit it here.
    """
    active_run = run_manager.get_run(run_id)
    if not active_run:
        raise HTTPException(status_code=404, detail=f"Run not found: {run_id}")

    pending = active_run.pending_inputs.get(request.request_id)
    if not pending:
        raise HTTPException(
            status_code=400,
            detail=f"No pending input request: {request.request_id}",
        )

    if pending.timed_out:
        raise HTTPException(
            status_code=410,  # Gone
            detail="Input request has timed out",
        )

    pending.input_value = request.user_input
    pending.input_event.set()

    return UserInputSubmissionResponse(
        success=True,
        message="Input received",
        request_id=request.request_id,
    )
