# UI Schema

Node appearance configuration for custom nodes.

## Overview

`UISchema` defines how a node looks and behaves in the visual editor.

## UISchema Definition

```python
@dataclass
class UISchema:
    # Content
    inputs: list[PortDefinition] = field(default_factory=list)
    outputs: list[PortDefinition] = field(default_factory=list)
    fields: list[FieldDefinition] = field(default_factory=list)

    # Appearance
    color: str = "#6366f1"
    icon: str | None = None
    expandable: bool = True
    default_width: int = 250
    default_height: int = 150

    # Layout configuration
    layout: NodeLayout = NodeLayout.STANDARD
    theme_key: str | None = None
    collapsed_display: CollapsedDisplay | None = None
    handle_layout: HandleLayout | None = None
```

## Basic Configuration

```python
@classmethod
def setup_interface(cls) -> UISchema:
    return UISchema(
        inputs=[...],
        outputs=[...],
        fields=[...],
        color="#3b82f6",        # Blue header
        icon="Zap",            # Lucide icon
    )
```

## Color

Header background color (hex):

```python
UISchema(
    color="#22c55e",  # Green
)
```

### Recommended Colors

| Type | Color |
|------|-------|
| Agent | `#3b82f6` (blue) |
| Prompt | `#22c55e` (green) |
| Context | `#8b5cf6` (purple) |
| Tool | `#f59e0b` (orange) |
| Variable | `#06b6d4` (cyan) |
| Custom | Choose your own |

### Theme Key

Use a theme color key instead of hardcoded color:

```python
UISchema(
    theme_key="agent",  # Uses theme's agent color
)
```

Available theme keys: `agent`, `prompt`, `context`, `tool`, `variable`, `group`

## Icon

Lucide icon name:

```python
UISchema(
    icon="Bot",      # Agent icon
    icon="FileText", # Document icon
    icon="Zap",      # Action icon
    icon="Settings", # Config icon
)
```

See [Lucide Icons](https://lucide.dev/) for available icons.

## Sizing

### Default Size

```python
UISchema(
    default_width=300,   # Pixels
    default_height=200,  # Pixels
)
```

### Expandable

Control if node can be collapsed:

```python
UISchema(
    expandable=True,   # Can collapse (default)
    expandable=False,  # Always expanded
)
```

## Layout

Visual style when collapsed:

```python
from adkflow_runner.extensions import NodeLayout

UISchema(
    layout=NodeLayout.STANDARD,  # Default expandable panel
    layout=NodeLayout.PILL,      # Pill-shaped
    layout=NodeLayout.CIRCLE,    # Circular
    layout=NodeLayout.DIAMOND,   # Diamond-shaped
    layout=NodeLayout.OCTAGON,   # Octagonal
    layout=NodeLayout.COMPACT,   # Small pill
)
```

See [Node Layouts](./node-layouts.md) for details.

## Collapsed Display

Control what shows when collapsed:

```python
from adkflow_runner.extensions import CollapsedDisplay

UISchema(
    collapsed_display=CollapsedDisplay(
        summary_fields=["name", "model"],  # Show these fields
        format="{{name}} ({{model}})",     # Format string
        show_connections=True,             # Show connected inputs
    ),
)
```

See [Node Layouts](./node-layouts.md) for details.

## Handle Layout

Custom handle positions:

```python
from adkflow_runner.extensions import HandleLayout, AdditionalHandle

UISchema(
    handle_layout=HandleLayout(
        input_position="left",
        output_position="right",
        additional_handles=[
            AdditionalHandle(
                id="parent",
                type="target",
                position="top",
                label="Parent Agent",
            ),
        ],
    ),
)
```

See [Node Layouts](./node-layouts.md) for details.

## Complete Example

```python
from adkflow_runner.extensions import (
    FlowUnit,
    UISchema,
    PortDefinition,
    FieldDefinition,
    WidgetType,
    NodeLayout,
    CollapsedDisplay,
)

class APIClientNode(FlowUnit):
    UNIT_ID = "http.api_client"
    UI_LABEL = "API Client"
    MENU_LOCATION = "HTTP/Client"

    @classmethod
    def setup_interface(cls) -> UISchema:
        return UISchema(
            inputs=[
                PortDefinition(
                    id="url",
                    label="URL",
                    source_type="*",
                    data_type="str",
                    connection_only=False,
                    widget=WidgetType.TEXT_INPUT,
                    placeholder="https://api.example.com",
                    tab="General",
                ),
                PortDefinition(
                    id="body",
                    label="Body",
                    source_type="*",
                    data_type="dict",
                    required=False,
                    tab="General",
                ),
            ],
            outputs=[
                PortDefinition(
                    id="response",
                    label="Response",
                    source_type="api_client",
                    data_type="dict",
                    handle_color="#22c55e",
                ),
                PortDefinition(
                    id="error",
                    label="Error",
                    source_type="api_client",
                    data_type="str",
                    handle_color="#ef4444",
                ),
            ],
            fields=[
                FieldDefinition(
                    id="method",
                    label="Method",
                    widget=WidgetType.SELECT,
                    default="GET",
                    options=[
                        {"value": "GET", "label": "GET"},
                        {"value": "POST", "label": "POST"},
                        {"value": "PUT", "label": "PUT"},
                        {"value": "DELETE", "label": "DELETE"},
                    ],
                    tab="General",
                ),
                FieldDefinition(
                    id="timeout",
                    label="Timeout",
                    widget=WidgetType.NUMBER_INPUT,
                    default=30,
                    tab="Advanced",
                ),
            ],
            color="#f59e0b",
            icon="Globe",
            default_width=300,
            collapsed_display=CollapsedDisplay(
                format="{{method}}",
                show_connections=True,
            ),
        )
```

## See Also

- [Node Layouts](./node-layouts.md) - Layout styles
- [Port Schemas](./port-schemas.md) - Input/output ports
- [Field Schemas](./field-schemas.md) - Configuration fields
