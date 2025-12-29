# Type System

Connection validation and type definitions.

## Overview

ADKFlow uses a **dual-type system** for connection validation:

| Dimension | Purpose | Example |
|-----------|---------|---------|
| **Source Type** | Semantic origin (what node produced it) | `agent`, `prompt`, `tool` |
| **Data Type** | Python type of the data | `str`, `dict`, `callable` |

Both dimensions must match for a valid connection.

## Source Types

### Built-in Sources

| Source | Meaning |
|--------|---------|
| `prompt` | From a Prompt node |
| `context` | From a Context node |
| `agent` | From an Agent node |
| `tool` | From a Tool node |
| `agent_tool` | From an Agent Tool node |
| `variable` | From a Variable node |
| `user_input` | From a User Input node |
| `*` | Wildcard (any source) |

### Custom Sources

Define your own source type for custom nodes:

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

| Type | Python Type | Example | Use Case |
|------|-------------|---------|----------|
| `str` | `str` | `"hello"` | Text, prompts, messages |
| `int` | `int` | `42` | Counts, indices |
| `float` | `float` | `3.14` | Numeric values |
| `bool` | `bool` | `True` | Flags, conditions |
| `list` | `list` | `[1, 2, 3]` | Collections |
| `dict` | `dict` | `{"key": "value"}` | Structured data, agent output |
| `callable` | function | `my_function` | Tools, callbacks |
| `any` | Any type | — | Wildcard |

### Special Types

| Type | Purpose |
|------|---------|
| `link` | Agent chaining (parallel execution) |
| `*` | Wildcard (accepts any type) |

## Link Type: Parallel Execution

The `link` type is special—it represents **execution flow**, not data flow.

### Purpose

Link connections indicate that agents should run **in parallel**:

```
       ┌─────────┐
       │ Agent A │──┐
       └─────────┘  │ link connections
                    ▼
       ┌─────────┐  ┌─────────┐
       │ Agent B │──│ Agent C │
       └─────────┘  └─────────┘
```

Agents A and B execute concurrently, then C executes after both complete.

### Link vs Regular Connections

| Aspect | Regular Connections | Link Connections |
|--------|---------------------|------------------|
| **Direction** | Left → Right | Top ↔ Bottom |
| **Handles** | `input`, `output`, etc. | `link-top`, `link-bottom` |
| **Data type** | `str`, `dict`, etc. | `link` |
| **Carries data** | Yes | No |
| **Visual style** | Solid line | Dotted line |
| **Semantic** | Data flow | Execution flow (parallel) |

### Link Handle Definitions

Agent nodes define link handles:

```python
# Input link handle (top of node)
PortDefinition(
    id="link-top",
    label="Link In",
    source_type="agent",
    data_type="link",
    accepted_sources=["agent"],
    accepted_types=["link"],
)

# Output link handle (bottom of node)
PortDefinition(
    id="link-bottom",
    label="Link Out",
    source_type="agent",
    data_type="link",
)
```

### Backend Processing

During workflow compilation:
1. Link edges are assigned `EdgeSemantics.PARALLEL`
2. Linked agents are wrapped in a `ParallelAgent`
3. The ADK framework executes them concurrently

### Validation Rules

- Link handles can only connect to other link handles
- Cannot mix link handles with regular data handles
- Self-connections are not allowed

## Connection Validation

### Validation Logic

A connection is valid when **both** conditions are met:

1. Output's `source_type` ∈ Input's `accepted_sources`
2. Output's `data_type` ∈ Input's `accepted_types`

### HandleTypeInfo Interface

The frontend uses this interface for validation:

```typescript
interface HandleTypeInfo {
  // For output handles (sources)
  outputSource?: string;      // e.g., 'prompt', 'agent', 'tool'
  outputType?: string;        // e.g., 'str', 'dict', 'link'

  // For input handles (targets)
  acceptedSources?: string[]; // Which sources accepted (or ['*'])
  acceptedTypes?: string[];   // Which types accepted (or ['*'])
}
```

### isTypeCompatible Function

```typescript
function isTypeCompatible(
  outputSource: string,
  outputType: string,
  acceptedSources: string[],
  acceptedTypes: string[]
): boolean {
  // Wildcard matching
  const sourceMatch = acceptedSources.includes('*')
    || acceptedSources.includes(outputSource);
  const typeMatch = acceptedTypes.includes('*')
    || acceptedTypes.includes(outputType);

  return sourceMatch && typeMatch;
}
```

### Examples

```python
# Output port
PortDefinition(
    id="result",
    source_type="my_node",
    data_type="str",
)

# Valid input (accepts my_node + str)
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

## Type Inference

If `accepted_sources` or `accepted_types` is `None`, defaults to the port's own types:

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

During connection dragging:

| State | Appearance |
|-------|------------|
| Compatible handle | Green highlight |
| Incompatible handle | Red glow, `not-allowed` cursor |
| Invalid connection | Rejected (no edge created) |

## Wildcards

Accept any source or type:

```python
# Accept anything
PortDefinition(
    id="any_input",
    accepted_sources=["*"],
    accepted_types=["*"],
)

# Accept any source, specific type
PortDefinition(
    id="text_input",
    accepted_sources=["*"],
    accepted_types=["str"],
)
```

## Multiple Type Support

Accept multiple types:

```python
PortDefinition(
    id="input",
    accepted_sources=["*"],
    accepted_types=["str", "list", "dict"],
)
```

Handle in `run_process`:

```python
async def run_process(self, inputs, config, context):
    data = inputs.get("input")

    if isinstance(data, list):
        result = [process(item) for item in data]
    elif isinstance(data, dict):
        result = process(data.get("text", ""))
    else:
        result = process(str(data))

    return {"output": result}
```

## Type Conversion

ADKFlow doesn't auto-convert types. Handle conversion in your node:

```python
async def run_process(self, inputs, config, context):
    value = inputs.get("input")

    # Convert to string if needed
    if not isinstance(value, str):
        value = str(value)

    return {"output": value}
```

## Validation Errors

Invalid connections show in workflow validation:

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

# Avoid: Too permissive (unless intentional)
accepted_sources=["*"]
accepted_types=["*"]
```

### Use Semantic Source Types

```python
# Good: Semantic source type
source_type="sentiment_analysis"

# Avoid: Generic
source_type="output"
```

### Document Expected Types

```python
class MyNode(FlowUnit):
    """
    Inputs:
        - query (str): Search query from prompt or context

    Outputs:
        - results (dict): Search results with {items: [], total: int}
    """
```

### Separate Data Flow from Execution Flow

- Use regular handles (`input`/`output`) for data
- Use link handles (`link-top`/`link-bottom`) for parallel execution
- Never mix link handles with regular data handles

## See Also

- [Port Schemas](./port-schemas.md) - Port definition structure
- [Validation](../../user-manual/validation.md) - Validation errors
- [Best Practices](./best-practices.md) - Extension patterns
