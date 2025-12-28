# Type System

Type definitions and connection validation.

## Overview

ADKFlow uses a dual-type system for connection validation:
- **Source Type**: Semantic origin of data (what node produced it)
- **Data Type**: Python type of the data (string, dict, etc.)

## Source Types

### Built-in Sources

| Source | Meaning |
|--------|---------|
| `prompt` | From a Prompt node |
| `context` | From a Context node |
| `agent` | From an Agent node |
| `tool` | From a Tool node |
| `variable` | From a Variable node |
| `user_input` | From a User Input node |
| `*` | Wildcard (any source) |

### Custom Sources

Define your own source type:

```python
PortDefinition(
    id="output",
    label="Output",
    source_type="my_custom_node",  # Your custom type
    data_type="dict",
)
```

## Data Types

### Standard Types

| Type | Python Type | Example |
|------|-------------|---------|
| `str` | `str` | `"hello"` |
| `int` | `int` | `42` |
| `float` | `float` | `3.14` |
| `bool` | `bool` | `True` |
| `list` | `list` | `[1, 2, 3]` |
| `dict` | `dict` | `{"key": "value"}` |
| `callable` | function | `my_function` |
| `any` | Any type | Wildcard |

### Wildcard

Use `*` or `any` to accept any type:

```python
accepted_types=["*"]
# or
accepted_types=["any"]
```

## Connection Validation

A connection is valid when:

1. Output's `source_type` ∈ Input's `accepted_sources`
2. Output's `data_type` ∈ Input's `accepted_types`

### Example

```python
# Output port
PortDefinition(
    id="result",
    source_type="my_node",
    data_type="str",
)

# Valid input (accepts my_node and str)
PortDefinition(
    id="text",
    accepted_sources=["my_node", "prompt"],
    accepted_types=["str"],
)

# Invalid input (doesn't accept my_node)
PortDefinition(
    id="agent_data",
    accepted_sources=["agent"],
    accepted_types=["dict"],
)
```

## Output Port Types

Define what your node produces:

```python
# Single output with specific type
PortDefinition(
    id="response",
    label="Response",
    source_type="api_client",  # Your node's source type
    data_type="dict",          # Python dict
)

# Multiple outputs with different types
PortDefinition(
    id="success",
    label="Success",
    source_type="api_client",
    data_type="dict",
),
PortDefinition(
    id="error",
    label="Error",
    source_type="api_client",
    data_type="str",
),
```

## Input Port Acceptance

Define what your node accepts:

### Accept Any

```python
PortDefinition(
    id="data",
    accepted_sources=["*"],
    accepted_types=["*"],
)
```

### Accept Specific Sources

```python
# Only from agent nodes
PortDefinition(
    id="agent_response",
    accepted_sources=["agent", "llm_agent"],
    accepted_types=["dict", "str"],
)
```

### Accept Specific Types

```python
# Only strings, from any source
PortDefinition(
    id="text",
    accepted_sources=["*"],
    accepted_types=["str"],
)
```

## Type Inference

If `accepted_sources` or `accepted_types` is `None`, it uses the port's own types:

```python
PortDefinition(
    id="input",
    source_type="text",
    data_type="str",
    accepted_sources=None,  # Defaults to ["text"]
    accepted_types=None,    # Defaults to ["str"]
)
```

## Visual Feedback

During connection:
- Compatible handles highlight
- Incompatible handles dim
- Invalid connection is rejected

## Multiple Type Support

Accept multiple types:

```python
# Accept strings or lists
PortDefinition(
    id="input",
    accepted_sources=["*"],
    accepted_types=["str", "list"],
)
```

In `run_process`, handle both:

```python
async def run_process(self, inputs, config, context):
    data = inputs.get("input")

    if isinstance(data, list):
        # Handle list
        result = [process(item) for item in data]
    else:
        # Handle string
        result = process(data)

    return {"output": result}
```

## Type Conversion

ADKFlow doesn't automatically convert types. If you need conversion, handle it in your node:

```python
async def run_process(self, inputs, config, context):
    value = inputs.get("input")

    # Convert to string if needed
    if not isinstance(value, str):
        value = str(value)

    # Process
    return {"output": value}
```

## Validation Errors

Invalid connections show in validation:

```
Error: Cannot connect "prompt_node.output" to "agent_node.input"
  - Source type "prompt" not in accepted sources ["agent"]
```

## Best Practices

### Be Specific

```python
# Good: Clear about what's accepted
accepted_sources=["prompt", "context"]
accepted_types=["str"]

# Avoid: Too permissive
accepted_sources=["*"]
accepted_types=["*"]
```

### Use Semantic Types

```python
# Good: Semantic source type
source_type="sentiment_analysis"

# Avoid: Generic
source_type="output"
```

### Document Types

```python
class MyNode(FlowUnit):
    """
    Inputs:
        - query (str): Search query from prompt or context

    Outputs:
        - results (dict): Search results with {items: [], total: int}
    """
```

## See Also

- [Port Schemas](./port-schemas.md) - Port definitions
- [Validation](../../user-manual/validation.md) - Validation errors
- [Best Practices](./best-practices.md) - Patterns
