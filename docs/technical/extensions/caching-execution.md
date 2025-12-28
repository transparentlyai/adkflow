# Caching & Execution Control

Control when and how nodes execute.

## Overview

ADKFlow provides several mechanisms to control node execution:
- **Caching**: Skip re-execution when inputs haven't changed
- **Output Nodes**: Mark sink nodes that always execute
- **Always Execute**: Bypass caching for specific nodes
- **Change Detection**: Custom logic to determine re-execution
- **Lazy Inputs**: Conditional input evaluation

## Caching

By default, nodes cache their outputs based on input/config hash.

### Default Behavior

```python
# First run: executes and caches
# Second run with same inputs: returns cached result
async def run_process(self, inputs, config, context):
    return {"result": expensive_computation(inputs)}
```

### Custom Cache Key

Override `compute_state_hash()` for custom cache keys:

```python
@classmethod
def compute_state_hash(cls, inputs: dict, config: dict) -> str:
    # Only cache based on specific fields
    cache_key = f"{inputs.get('prompt')}:{config.get('model')}"
    return hashlib.sha256(cache_key.encode()).hexdigest()
```

This is useful when:
- Some inputs don't affect output
- You want coarser caching

## OUTPUT_NODE

Mark nodes that produce side effects:

```python
class FileSaverNode(FlowUnit):
    UNIT_ID = "io.file_saver"
    UI_LABEL = "Save File"

    OUTPUT_NODE = True  # Always execute, even if output unused

    async def run_process(self, inputs, config, context):
        content = inputs.get("content")
        path = config.get("path")

        # Side effect: writes to filesystem
        Path(path).write_text(content)

        return {"path": path}
```

Use `OUTPUT_NODE = True` for:
- File writers
- API senders
- Database writers
- Notification senders
- Any node with side effects

## ALWAYS_EXECUTE

Skip caching entirely:

```python
class TimestampNode(FlowUnit):
    UNIT_ID = "util.timestamp"
    UI_LABEL = "Timestamp"

    ALWAYS_EXECUTE = True  # Never use cache

    async def run_process(self, inputs, config, context):
        return {"timestamp": datetime.now().isoformat()}
```

Use `ALWAYS_EXECUTE = True` for:
- Time-dependent outputs
- Random number generators
- Nodes that must always run
- Debugging/logging nodes

## is_changed()

Custom change detection:

```python
@classmethod
def is_changed(cls, config: dict, inputs: dict) -> Any:
    """
    Return value is compared to previous run.
    Different value = re-execute.
    """
    # Always execute if in streaming mode
    if config.get("stream"):
        return float("nan")  # NaN != NaN, forces execution

    # Otherwise, use default caching
    return None
```

### Return Values

| Return | Behavior |
|--------|----------|
| `None` | Use default hash comparison |
| `float("nan")` | Always execute (NaN != NaN) |
| Same value as last run | Skip execution |
| Different value | Execute |

### Examples

```python
# Always execute in debug mode
@classmethod
def is_changed(cls, config: dict, inputs: dict) -> Any:
    if config.get("debug"):
        return float("nan")
    return None

# Execute if file was modified
@classmethod
def is_changed(cls, config: dict, inputs: dict) -> Any:
    path = config.get("file_path")
    if path:
        return os.path.getmtime(path)
    return None
```

## Lazy Inputs

Defer input evaluation until needed:

### Marking Inputs as Lazy

```python
PortDefinition(
    id="fallback",
    label="Fallback",
    source_type="*",
    data_type="str",
    lazy=True,  # Not evaluated until requested
)
```

### Requesting Lazy Inputs

Override `check_lazy_status()`:

```python
@classmethod
def check_lazy_status(
    cls,
    config: dict,
    available_inputs: dict,
) -> list[str]:
    """
    Called when lazy inputs haven't been evaluated.
    Return list of input IDs that should be evaluated.
    """
    # If primary is available, don't need fallback
    if available_inputs.get("primary") is not None:
        return []

    # Primary is None, request fallback
    return ["fallback"]
```

### Use Case: Conditional Execution

```python
class ConditionalNode(FlowUnit):
    UNIT_ID = "flow.conditional"

    @classmethod
    def setup_interface(cls) -> UISchema:
        return UISchema(
            inputs=[
                PortDefinition(id="condition", ...),
                PortDefinition(id="if_true", lazy=True, ...),
                PortDefinition(id="if_false", lazy=True, ...),
            ],
            outputs=[
                PortDefinition(id="result", ...),
            ],
        )

    @classmethod
    def check_lazy_status(cls, config, available_inputs):
        condition = available_inputs.get("condition")

        if condition:
            return ["if_true"]   # Only evaluate true branch
        else:
            return ["if_false"]  # Only evaluate false branch

    async def run_process(self, inputs, config, context):
        condition = inputs.get("condition")

        if condition:
            return {"result": inputs.get("if_true")}
        else:
            return {"result": inputs.get("if_false")}
```

## Execution Order

1. Check `ALWAYS_EXECUTE`
2. If false, check `is_changed()`
3. If changed or no cache, check lazy inputs via `check_lazy_status()`
4. Evaluate needed inputs
5. Run `on_before_execute()`
6. Run `run_process()`
7. Run `on_after_execute()`
8. Cache result (unless `ALWAYS_EXECUTE`)

## Combining Controls

```python
class SmartCacheNode(FlowUnit):
    UNIT_ID = "cache.smart"

    # Don't auto-execute as output node
    OUTPUT_NODE = False

    # Allow caching (not ALWAYS_EXECUTE)
    ALWAYS_EXECUTE = False

    @classmethod
    def compute_state_hash(cls, inputs, config):
        # Custom cache key
        return hash(inputs.get("key"))

    @classmethod
    def is_changed(cls, config, inputs):
        # Force re-execute if refresh flag set
        if config.get("force_refresh"):
            return float("nan")
        return None
```

## Best Practices

### Cache by Default

Let the system cache:
```python
# Good: Returns same result for same inputs
async def run_process(self, inputs, config, context):
    return {"result": pure_function(inputs)}
```

### Mark Side Effects

```python
# If it writes, sends, or modifies external state
OUTPUT_NODE = True
```

### Use Lazy for Branches

```python
# Don't evaluate unused branches
PortDefinition(id="unused_branch", lazy=True)
```

### Avoid ALWAYS_EXECUTE Unless Needed

```python
# Only use if output truly changes every time
ALWAYS_EXECUTE = True  # Use sparingly
```

## See Also

- [FlowUnit API](./flowunit-api.md) - Base class methods
- [Execution Context](./execution-context.md) - Runtime context
- [Best Practices](./best-practices.md) - Patterns
