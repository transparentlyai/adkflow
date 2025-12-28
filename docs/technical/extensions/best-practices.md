# Best Practices

Patterns and conventions for custom node development.

## Naming Conventions

### UNIT_ID

Use lowercase with dots:

```python
# Good
UNIT_ID = "http.api_client"
UNIT_ID = "text.transform.uppercase"

# Avoid
UNIT_ID = "HTTP.ApiClient"
UNIT_ID = "TextTransformUppercase"
```

### MENU_LOCATION

Use title case with slashes:

```python
# Good
MENU_LOCATION = "HTTP/Client"
MENU_LOCATION = "Text/Transform/Case"

# Avoid
MENU_LOCATION = "http/client"
MENU_LOCATION = "text_transform_case"
```

### Port and Field IDs

Use snake_case:

```python
# Good
PortDefinition(id="user_input", ...)
FieldDefinition(id="max_tokens", ...)

# Avoid
PortDefinition(id="userInput", ...)
FieldDefinition(id="MaxTokens", ...)
```

## Error Handling

### Return Errors

Don't raise exceptions for expected errors:

```python
# Good: Return error information
async def run_process(self, inputs, config, context):
    try:
        result = await api_call(inputs)
        return {"result": result, "error": None}
    except APIError as e:
        return {"result": None, "error": str(e)}
```

### Raise for Critical Errors

Raise exceptions for unrecoverable errors:

```python
# Appropriate: Critical configuration error
async def run_process(self, inputs, config, context):
    if not config.get("api_key"):
        raise ValueError("API key is required")
```

### Use Validation

Validate configuration before execution:

```python
@classmethod
def validate_config(cls, config: dict) -> list[str]:
    errors = []

    if not config.get("api_key"):
        errors.append("API key is required")

    temp = config.get("temperature", 0.7)
    if not 0 <= temp <= 2:
        errors.append("Temperature must be between 0 and 2")

    return errors
```

## Input Handling

### Handle Missing Inputs

```python
async def run_process(self, inputs, config, context):
    # Always provide defaults
    text = inputs.get("text", "")
    count = inputs.get("count", 1)

    if not text:
        return {"result": "", "warning": "No input provided"}
```

### Validate Types

```python
async def run_process(self, inputs, config, context):
    data = inputs.get("data")

    if not isinstance(data, dict):
        return {"error": f"Expected dict, got {type(data).__name__}"}
```

## Output Structure

### Consistent Keys

Return consistent output keys:

```python
# Good: Always return same keys
async def run_process(self, inputs, config, context):
    try:
        result = await process(inputs)
        return {"result": result, "error": None}
    except Exception as e:
        return {"result": None, "error": str(e)}
```

### Separate Success/Error

Use separate output ports for success and error:

```python
UISchema(
    outputs=[
        PortDefinition(
            id="result",
            label="Result",
            handle_color="#22c55e",  # Green
        ),
        PortDefinition(
            id="error",
            label="Error",
            handle_color="#ef4444",  # Red
        ),
    ],
)
```

## Progress Updates

### Long Operations

Emit progress for operations > 1 second:

```python
async def run_process(self, inputs, config, context):
    items = inputs.get("items", [])

    for i, item in enumerate(items):
        await context.emit({
            "type": "progress",
            "message": f"Processing {i+1}/{len(items)}",
            "percent": int((i + 1) / len(items) * 100),
        })

        await process_item(item)

    return {"result": "done"}
```

### API Calls

Show status during external calls:

```python
async def run_process(self, inputs, config, context):
    await context.emit({
        "type": "progress",
        "message": "Connecting to API...",
    })

    response = await api_call()

    await context.emit({
        "type": "progress",
        "message": "Processing response...",
    })

    result = process(response)
    return {"result": result}
```

## Resource Management

### Use Lifecycle Hooks

```python
async def on_before_execute(self, context):
    self.connection = await create_connection()

async def run_process(self, inputs, config, context):
    result = await self.connection.query(inputs["query"])
    return {"result": result}

async def on_after_execute(self, context, outputs):
    if hasattr(self, "connection"):
        await self.connection.close()
```

### Clean Up on Error

```python
async def run_process(self, inputs, config, context):
    resource = None
    try:
        resource = await acquire_resource()
        result = await use_resource(resource)
        return {"result": result}
    finally:
        if resource:
            await release_resource(resource)
```

## State Management

### Prefix State Keys

```python
# Good: Prefixed to avoid collisions
context.set_state("mynode_cache", {})

# Avoid: Generic keys that might conflict
context.set_state("cache", {})
```

### Don't Store Large Data

```python
# Good: Store reference
context.set_state("result_path", "/tmp/result.json")

# Avoid: Large data in state
context.set_state("result", massive_object)
```

## UI Organization

### Use Tabs for Complex Nodes

```python
fields=[
    FieldDefinition(id="name", tab="General", ...),
    FieldDefinition(id="model", tab="General", ...),
    FieldDefinition(id="temperature", tab="Parameters", ...),
    FieldDefinition(id="timeout", tab="Advanced", ...),
]
```

### Use Sections Within Tabs

```python
fields=[
    FieldDefinition(id="max_retries", tab="Advanced", section="Retry", ...),
    FieldDefinition(id="retry_delay", tab="Advanced", section="Retry", ...),
    FieldDefinition(id="cache_ttl", tab="Advanced", section="Cache", ...),
]
```

### Conditional Fields

```python
FieldDefinition(
    id="auth_type",
    widget=WidgetType.SELECT,
    options=[...],
),
FieldDefinition(
    id="api_key",
    show_if={"auth_type": "api_key"},
),
FieldDefinition(
    id="bearer_token",
    show_if={"auth_type": "bearer"},
),
```

## Type Specificity

### Be Specific About Types

```python
# Good: Specific types
accepted_sources=["prompt", "context"]
accepted_types=["str"]

# Avoid unless necessary: Wildcards
accepted_sources=["*"]
accepted_types=["*"]
```

### Use Semantic Source Types

```python
# Good: Describes the data origin
source_type="sentiment_analysis"

# Avoid: Generic
source_type="output"
```

## Documentation

### Docstrings

```python
class MyNode(FlowUnit):
    """
    Analyzes text sentiment using AI.

    Inputs:
        - text (str): Text to analyze

    Outputs:
        - sentiment (dict): {score: float, label: str}
        - error (str): Error message if failed

    Configuration:
        - model: AI model to use
        - threshold: Confidence threshold
    """
```

### Help Text

```python
FieldDefinition(
    id="temperature",
    label="Temperature",
    help_text="Higher values (0.8-2.0) = more creative. Lower (0.1-0.5) = more focused.",
)
```

## Testing

### Unit Tests

```python
import pytest
from my_extension.nodes import MyNode

@pytest.mark.asyncio
async def test_my_node():
    node = MyNode()

    context = MockExecutionContext()
    inputs = {"text": "hello"}
    config = {"option": "uppercase"}

    result = await node.run_process(inputs, config, context)

    assert result["output"] == "HELLO"
```

### Validation Tests

```python
def test_config_validation():
    errors = MyNode.validate_config({})
    assert "API key is required" in errors

    errors = MyNode.validate_config({"api_key": "test"})
    assert len(errors) == 0
```

## See Also

- [FlowUnit API](./flowunit-api.md) - Base class
- [Examples](./examples/README.md) - Working examples
- [Execution Context](./execution-context.md) - Runtime context
