# Execution Engine

Workflow execution and streaming in ADKFlow.

## Overview

The execution engine:
- Compiles visual workflows into executable graphs
- Runs workflows asynchronously
- Streams events via SSE (Server-Sent Events)
- Handles user input during execution
- Manages run lifecycle

## Architecture

```
Run Request
    ↓
Compiler (workflow → IR)
    ↓
WorkflowRunner (execute IR)
    ↓
BroadcastCallbacks (emit events)
    ↓
SSE Stream → Frontend
```

## Components

### RunManager

Manages active workflow runs.

**Location**: `api/run_manager.py`

```python
class RunManager:
    def __init__(self):
        self.runs: dict[str, ActiveRun] = {}

    def create_run(self, workflow: ReactFlowJSON) -> str:
        run_id = f"run_{uuid.uuid4().hex[:8]}"
        self.runs[run_id] = ActiveRun(workflow)
        return run_id

    def get_run(self, run_id: str) -> ActiveRun | None:
        return self.runs.get(run_id)

    def remove_run(self, run_id: str) -> None:
        self.runs.pop(run_id, None)
```

### ActiveRun

Tracks state of a running workflow.

```python
@dataclass
class ActiveRun:
    workflow: ReactFlowJSON
    status: str = "pending"  # pending, running, completed, error, cancelled
    events: list[RunEvent] = field(default_factory=list)
    subscribers: list[asyncio.Queue] = field(default_factory=list)
    pending_inputs: dict[str, asyncio.Future] = field(default_factory=dict)
    cancel_flag: bool = False

    def emit(self, event: RunEvent) -> None:
        self.events.append(event)
        for queue in self.subscribers:
            queue.put_nowait(event)

    def subscribe(self) -> asyncio.Queue:
        queue = asyncio.Queue()
        self.subscribers.append(queue)
        # Send past events
        for event in self.events:
            queue.put_nowait(event)
        return queue
```

## Execution Flow

### Starting a Run

```python
@router.post("/execution/run")
async def start_run(request: RunRequest) -> RunResponse:
    run_id = run_manager.create_run(request.workflow)

    # Start execution in background
    asyncio.create_task(
        execute_workflow(run_id, request.project_path, request.workflow)
    )

    return RunResponse(run_id=run_id)

async def execute_workflow(run_id: str, project_path: str, workflow: ReactFlowJSON):
    run = run_manager.get_run(run_id)
    run.status = "running"
    run.emit({"type": "run_started", "run_id": run_id})

    try:
        # Compile workflow
        compiler = Compiler()
        ir = compiler.compile(workflow.model_dump())

        # Create callbacks for event streaming
        callbacks = BroadcastCallbacks(run)

        # Create input provider for user interaction
        input_provider = AsyncQueueInputProvider(run)

        # Run workflow
        runner = WorkflowRunner(callbacks=callbacks, input_provider=input_provider)
        result = await runner.run(ir, project_path=project_path)

        run.status = "completed"
        run.emit({"type": "run_completed", "result": result})

    except Exception as e:
        run.status = "error"
        run.emit({"type": "run_error", "error": str(e)})
```

### Event Streaming

```python
@router.get("/execution/run/{run_id}/events")
async def stream_events(run_id: str) -> EventSourceResponse:
    run = run_manager.get_run(run_id)
    if not run:
        raise HTTPException(404, "Run not found")

    queue = run.subscribe()

    async def event_generator():
        while True:
            # Check for cancellation
            if run.cancel_flag:
                yield {"event": "cancelled", "data": "{}"}
                break

            # Wait for next event
            try:
                event = await asyncio.wait_for(queue.get(), timeout=30)
                yield {"data": json.dumps(event)}

                # Stop on terminal events
                if event["type"] in ("run_completed", "run_error"):
                    break
            except asyncio.TimeoutError:
                # Send keepalive
                yield {"event": "keepalive", "data": "{}"}

    return EventSourceResponse(event_generator())
```

## Event Types

```python
type RunEvent = (
    | {"type": "run_started", "run_id": str}
    | {"type": "node_executing", "node_id": str, "node_name": str}
    | {"type": "node_completed", "node_id": str, "output": Any}
    | {"type": "node_error", "node_id": str, "error": str}
    | {"type": "agent_message", "node_id": str, "content": str}
    | {"type": "user_input_required", "input_id": str, "prompt": str}
    | {"type": "run_completed", "result": Any}
    | {"type": "run_error", "error": str}
)
```

## User Input Handling

When an agent requests user input:

```python
class AsyncQueueInputProvider:
    def __init__(self, run: ActiveRun):
        self.run = run

    async def get_input(self, prompt: str) -> str:
        input_id = f"input_{uuid.uuid4().hex[:8]}"

        # Create future for response
        future = asyncio.Future()
        self.run.pending_inputs[input_id] = future

        # Emit event to frontend
        self.run.emit({
            "type": "user_input_required",
            "input_id": input_id,
            "prompt": prompt,
        })

        # Wait for response
        response = await future
        del self.run.pending_inputs[input_id]
        return response
```

Frontend submits input:

```python
@router.post("/execution/run/{run_id}/input")
async def submit_input(run_id: str, request: InputRequest) -> None:
    run = run_manager.get_run(run_id)
    if not run:
        raise HTTPException(404, "Run not found")

    future = run.pending_inputs.get(request.input_id)
    if not future:
        raise HTTPException(400, "Input not pending")

    future.set_result(request.value)
```

## Cancellation

```python
@router.post("/execution/run/{run_id}/cancel")
async def cancel_run(run_id: str) -> None:
    run = run_manager.get_run(run_id)
    if not run:
        raise HTTPException(404, "Run not found")

    run.cancel_flag = True
    run.status = "cancelled"

    # Resolve any pending inputs
    for future in run.pending_inputs.values():
        future.cancel()
```

## Validation

Validate without executing:

```python
@router.post("/execution/validate")
async def validate_workflow(request: ValidateRequest) -> ValidationResult:
    compiler = Compiler()

    try:
        errors, warnings = compiler.validate(request.workflow.model_dump())
        return ValidationResult(
            valid=len(errors) == 0,
            errors=errors,
            warnings=warnings,
        )
    except Exception as e:
        return ValidationResult(
            valid=False,
            errors=[{"message": str(e)}],
            warnings=[],
        )
```

## Topology Generation

Generate visual representation:

```python
@router.post("/execution/topology")
async def get_topology(request: TopologyRequest) -> TopologyResult:
    from adkflow_runner.visualization import generate_topology

    topology = generate_topology(request.workflow.model_dump())

    return TopologyResult(
        mermaid=topology.mermaid,
        ascii=topology.ascii,
    )
```

## See Also

- [API Reference](./api-reference.md) - Execution endpoints
- [Extension System](./extension-system.md) - Custom nodes
- [Frontend API Client](../frontend/api-client.md) - Client usage
