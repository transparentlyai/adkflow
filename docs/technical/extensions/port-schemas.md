# Port Schemas

Input and output port definitions for custom nodes.

## Overview

Ports are connection points on nodes:
- **Inputs** (left side): Receive data from other nodes
- **Outputs** (right side): Send data to other nodes

## PortDefinition

```python
@dataclass
class PortDefinition:
    # Required
    id: str                           # Unique port identifier
    label: str                        # Display label
    source_type: str                  # Semantic source type
    data_type: str                    # Python data type

    # For inputs only
    accepted_sources: list[str] | None = None
    accepted_types: list[str] | None = None

    # Behavior
    required: bool = True
    multiple: bool = False
    lazy: bool = False

    # UI organization
    tab: str | None = None
    section: str | None = None

    # Visual
    handle_color: str | None = None

    # Manual input (inputs only)
    connection_only: bool = True
    widget: WidgetType | None = None
    default: Any = None
    placeholder: str | None = None
    options: list[dict] | None = None
```

## Basic Output Port

```python
PortDefinition(
    id="result",
    label="Result",
    source_type="my_node",    # This node's type
    data_type="str",          # Python type
)
```

## Basic Input Port

```python
PortDefinition(
    id="text",
    label="Text Input",
    source_type="*",          # Accept any source
    data_type="str",
    accepted_sources=["*"],   # From any node type
    accepted_types=["str"],   # String data only
)
```

## Type Filtering

### Accept Specific Sources

```python
# Only accept from agent nodes
PortDefinition(
    id="agent_output",
    label="Agent Output",
    source_type="agent",
    data_type="dict",
    accepted_sources=["agent", "llm_agent"],
    accepted_types=["dict"],
)
```

### Accept Multiple Types

```python
# Accept string or dict
PortDefinition(
    id="data",
    label="Data",
    source_type="*",
    data_type="any",
    accepted_sources=["*"],
    accepted_types=["str", "dict", "list"],
)
```

### Wildcard

```python
# Accept anything
PortDefinition(
    id="any_input",
    label="Any",
    source_type="*",
    data_type="any",
    accepted_sources=["*"],
    accepted_types=["*"],
)
```

## Optional Inputs

```python
PortDefinition(
    id="context",
    label="Context",
    source_type="*",
    data_type="str",
    accepted_sources=["*"],
    accepted_types=["str"],
    required=False,  # Connection not required
)
```

## Multiple Connections

Allow multiple inputs to the same port:

```python
PortDefinition(
    id="items",
    label="Items",
    source_type="*",
    data_type="any",
    accepted_sources=["*"],
    accepted_types=["*"],
    multiple=True,  # Collects into a list
)
```

In `run_process`, `inputs["items"]` will be a list of all connected values.

## Lazy Inputs

Defer evaluation until needed:

```python
PortDefinition(
    id="fallback",
    label="Fallback",
    source_type="*",
    data_type="str",
    accepted_sources=["*"],
    accepted_types=["str"],
    lazy=True,  # Not evaluated until requested
)
```

Use with `check_lazy_status()`:

```python
@classmethod
def check_lazy_status(cls, config: dict, available_inputs: dict) -> list[str]:
    if available_inputs.get("primary") is None:
        return ["fallback"]  # Request fallback evaluation
    return []
```

## UI Organization

### Tabs

```python
PortDefinition(
    id="headers",
    label="Headers",
    source_type="*",
    data_type="dict",
    tab="Advanced",  # Show in Advanced tab
)
```

### Sections

```python
PortDefinition(
    id="auth_token",
    label="Auth Token",
    source_type="*",
    data_type="str",
    tab="Auth",
    section="OAuth",  # Group within tab
)
```

## Handle Colors

Custom visual styling:

```python
# Success output (green)
PortDefinition(
    id="success",
    label="Success",
    source_type="api_client",
    data_type="dict",
    handle_color="#22c55e",
)

# Error output (red)
PortDefinition(
    id="error",
    label="Error",
    source_type="api_client",
    data_type="str",
    handle_color="#ef4444",
)
```

### Recommended Colors

| Purpose | Color |
|---------|-------|
| Success/Data | `#22c55e` (green) |
| Error | `#ef4444` (red) |
| Warning | `#f59e0b` (amber) |
| Info/Status | `#3b82f6` (blue) |
| Config | `#8b5cf6` (purple) |

## Manual Input

Allow typing values when not connected:

```python
PortDefinition(
    id="url",
    label="URL",
    source_type="*",
    data_type="str",
    accepted_sources=["*"],
    accepted_types=["str"],
    connection_only=False,  # Allow manual input
    widget=WidgetType.TEXT_INPUT,
    placeholder="https://api.example.com",
    default="",
)
```

### With Select Widget

```python
PortDefinition(
    id="method",
    label="Method",
    source_type="*",
    data_type="str",
    connection_only=False,
    widget=WidgetType.SELECT,
    default="GET",
    options=[
        {"value": "GET", "label": "GET"},
        {"value": "POST", "label": "POST"},
        {"value": "PUT", "label": "PUT"},
        {"value": "DELETE", "label": "DELETE"},
    ],
)
```

**Behavior**:
- When disconnected: Shows editable widget
- When connected: Hides widget, shows connected source name

## Complete Example

```python
UISchema(
    inputs=[
        # Required text input
        PortDefinition(
            id="query",
            label="Query",
            source_type="*",
            data_type="str",
            accepted_sources=["*"],
            accepted_types=["str"],
        ),
        # Optional with manual entry
        PortDefinition(
            id="api_key",
            label="API Key",
            source_type="*",
            data_type="str",
            accepted_sources=["*"],
            accepted_types=["str"],
            required=False,
            connection_only=False,
            widget=WidgetType.TEXT_INPUT,
            placeholder="sk-...",
            tab="Auth",
        ),
        # Multiple connections allowed
        PortDefinition(
            id="context_docs",
            label="Context Documents",
            source_type="*",
            data_type="str",
            accepted_sources=["*"],
            accepted_types=["str"],
            multiple=True,
            tab="Advanced",
        ),
    ],
    outputs=[
        PortDefinition(
            id="result",
            label="Result",
            source_type="search",
            data_type="dict",
            handle_color="#22c55e",
        ),
        PortDefinition(
            id="error",
            label="Error",
            source_type="search",
            data_type="str",
            handle_color="#ef4444",
        ),
    ],
)
```

## See Also

- [Field Schemas](./field-schemas.md) - Configuration fields
- [Type System](./type-system.md) - Type definitions
- [UI Schema](./ui-schema.md) - Node appearance
