# Execution Context

Runtime context available to custom nodes.

## Overview

`ExecutionContext` provides runtime information and utilities during workflow execution.

## ExecutionContext Definition

```python
@dataclass
class ExecutionContext:
    session_id: str              # Current session ID
    run_id: str                  # Current run ID
    node_id: str                 # This node's ID
    node_name: str               # This node's name
    state: dict[str, Any]        # Shared state across nodes
    emit: EmitFn                 # Emit events for real-time updates
    project_path: Path           # Project directory path

    def get_state(self, key: str, default: Any = None) -> Any:
        """Get a value from shared state."""
        return self.state.get(key, default)

    def set_state(self, key: str, value: Any) -> None:
        """Set a value in shared state."""
        self.state[key] = value
```

## Properties

### session_id

Unique identifier for the current session:

```python
async def run_process(self, inputs, config, context):
    print(f"Session: {context.session_id}")
    # Session: ses_abc123
```

### run_id

Unique identifier for the current run:

```python
async def run_process(self, inputs, config, context):
    print(f"Run: {context.run_id}")
    # Run: run_xyz789
```

### node_id

This node's unique ID in the workflow:

```python
async def run_process(self, inputs, config, context):
    print(f"Node ID: {context.node_id}")
    # Node ID: node_1a2b3c
```

### node_name

This node's display name:

```python
async def run_process(self, inputs, config, context):
    print(f"Node: {context.node_name}")
    # Node: analyze_sentiment
```

### project_path

Path to the current project directory:

```python
async def run_process(self, inputs, config, context):
    prompts_dir = context.project_path / "prompts"
    config_file = context.project_path / "config.json"
```

## Shared State

State is shared across all nodes in a run:

### Setting State

```python
async def run_process(self, inputs, config, context):
    # Store data for downstream nodes
    context.set_state("api_response", {"data": "..."})
    context.set_state("request_count", 1)

    return {"status": "done"}
```

### Getting State

```python
async def run_process(self, inputs, config, context):
    # Retrieve data from upstream nodes
    response = context.get_state("api_response", {})
    count = context.get_state("request_count", 0)

    # Use the data
    return {"result": response.get("data")}
```

### State Scope

- State is scoped to a single run
- Available to all nodes in the run
- Cleared after run completes
- Not persisted across runs

## Event Emission

Emit real-time events to the frontend:

### Progress Events

```python
async def run_process(self, inputs, config, context):
    items = inputs.get("items", [])

    for i, item in enumerate(items):
        # Emit progress
        await context.emit({
            "type": "progress",
            "node_id": context.node_id,
            "message": f"Processing {i+1}/{len(items)}",
            "percent": (i + 1) / len(items) * 100,
        })

        await process_item(item)

    return {"status": "done"}
```

### Log Events

```python
await context.emit({
    "type": "log",
    "node_id": context.node_id,
    "level": "info",
    "message": "Starting data fetch...",
})
```

### Custom Events

```python
await context.emit({
    "type": "custom",
    "node_id": context.node_id,
    "event_name": "token_generated",
    "data": {"token": "abc123"},
})
```

## Use Cases

### Caching Across Nodes

```python
class CacheNode(FlowUnit):
    async def run_process(self, inputs, config, context):
        cache_key = inputs.get("key")
        cache = context.get_state("_cache", {})

        if cache_key in cache:
            return {"result": cache[cache_key], "cached": True}

        # Not cached, compute
        result = await expensive_computation(inputs)

        # Store in cache
        cache[cache_key] = result
        context.set_state("_cache", cache)

        return {"result": result, "cached": False}
```

### Counting Across Nodes

```python
class CounterNode(FlowUnit):
    async def run_process(self, inputs, config, context):
        # Increment counter
        count = context.get_state("node_execution_count", 0) + 1
        context.set_state("node_execution_count", count)

        return {"count": count}
```

### Progress Tracking

```python
class BatchProcessor(FlowUnit):
    async def run_process(self, inputs, config, context):
        items = inputs.get("items", [])
        results = []

        for i, item in enumerate(items):
            # Update progress
            await context.emit({
                "type": "progress",
                "node_id": context.node_id,
                "message": f"Item {i+1}/{len(items)}",
                "percent": int((i + 1) / len(items) * 100),
            })

            result = await self.process_item(item)
            results.append(result)

        return {"results": results}
```

### Reading Project Files

```python
class FileReaderNode(FlowUnit):
    async def run_process(self, inputs, config, context):
        filename = config.get("filename")
        file_path = context.project_path / "static" / filename

        if not file_path.exists():
            return {"error": f"File not found: {filename}"}

        content = file_path.read_text()
        return {"content": content}
```

## Best Practices

### Use Prefixed State Keys

```python
# Good: Prefixed to avoid collisions
context.set_state("mynode_cache", {})
context.set_state("mynode_count", 0)

# Avoid: Generic keys
context.set_state("cache", {})
context.set_state("count", 0)
```

### Don't Store Large Data

```python
# Good: Store reference or key
context.set_state("result_path", "/tmp/result.json")

# Avoid: Large data in state
context.set_state("result", very_large_object)
```

### Emit Progress for Long Operations

```python
async def run_process(self, inputs, config, context):
    # Let users know something is happening
    await context.emit({
        "type": "progress",
        "message": "Connecting to API...",
    })

    # Long operation
    await slow_api_call()
```

## See Also

- [FlowUnit API](./flowunit-api.md) - Base class
- [Caching & Execution](./caching-execution.md) - Execution control
- [Best Practices](./best-practices.md) - Patterns
