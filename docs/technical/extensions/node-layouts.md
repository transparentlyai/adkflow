# Node Layouts

Visual layout styles for custom nodes.

## Overview

Nodes can have different visual layouts when collapsed. This allows you to create nodes that match their semantic purpose:
- Standard panels for complex configuration
- Pills for simple transforms
- Diamonds for decision nodes
- Circles for action buttons

## NodeLayout Enum

```python
class NodeLayout(str, Enum):
    STANDARD = "standard"  # Standard expandable panel (default)
    PILL = "pill"          # Pill-shaped compact node
    CIRCLE = "circle"      # Circular button
    OCTAGON = "octagon"    # Octagonal shape
    DIAMOND = "diamond"    # Diamond connector
    COMPACT = "compact"    # Small compact pill
    PANEL = "panel"        # Full panel with sections
```

## Using Layouts

```python
from adkflow_runner.extensions import UISchema, NodeLayout

UISchema(
    layout=NodeLayout.PILL,
    # ... other config
)
```

## Layout Types

### STANDARD (Default)

Full expandable panel:
- Shows all fields when expanded
- Collapses to compact header
- Best for: Nodes with many configuration options

```python
UISchema(
    layout=NodeLayout.STANDARD,
)
```

### PILL

Rounded pill shape:
- Compact horizontal layout
- Shows name and optional icon
- Best for: Simple transforms, data flow nodes

```python
UISchema(
    layout=NodeLayout.PILL,
    color="#22c55e",
    icon="ArrowRight",
)
```

### CIRCLE

Circular button:
- Minimal footprint
- Icon-focused
- Best for: Triggers, actions, simple operations

```python
UISchema(
    layout=NodeLayout.CIRCLE,
    icon="Play",
)
```

### DIAMOND

Diamond shape:
- Rotated square
- Best for: Decision points, conditionals, routers

```python
UISchema(
    layout=NodeLayout.DIAMOND,
    icon="GitBranch",
)
```

### OCTAGON

Stop-sign shape:
- Eight-sided
- Best for: Stop conditions, terminators, special nodes

```python
UISchema(
    layout=NodeLayout.OCTAGON,
    icon="StopCircle",
)
```

### COMPACT

Very small pill:
- Minimal size
- Best for: Variables, constants, simple values

```python
UISchema(
    layout=NodeLayout.COMPACT,
)
```

## CollapsedDisplay

Control what shows when a node is collapsed:

```python
@dataclass
class CollapsedDisplay:
    summary_fields: list[str] | None = None  # Fields to show
    format: str | None = None                # Format string
    show_connections: bool = False           # Show connected inputs
```

### Summary Fields

Show specific field values:

```python
UISchema(
    collapsed_display=CollapsedDisplay(
        summary_fields=["model", "temperature"],
    ),
)
```

Displays: `gemini-2.0-flash-exp, 0.7`

### Format String

Custom format with placeholders:

```python
UISchema(
    collapsed_display=CollapsedDisplay(
        format="{{method}} {{url}}",
    ),
)
```

Displays: `GET https://api.example.com`

Placeholders use `{{field_id}}` syntax.

### Show Connections

Display connected input names:

```python
UISchema(
    collapsed_display=CollapsedDisplay(
        show_connections=True,
    ),
)
```

Displays: `← prompt_node, context_node`

### Combined

```python
UISchema(
    layout=NodeLayout.PILL,
    collapsed_display=CollapsedDisplay(
        format="{{name}}",
        show_connections=True,
    ),
)
```

## HandleLayout

Customize handle positions:

```python
@dataclass
class HandleLayout:
    input_position: str = "left"    # left, top, right, bottom
    output_position: str = "right"  # left, top, right, bottom
    additional_handles: list[AdditionalHandle] | None = None

@dataclass
class AdditionalHandle:
    id: str           # Handle ID
    type: str         # "source" or "target"
    position: str     # left, top, right, bottom
    label: str | None = None  # Tooltip
```

### Default Positions

```python
UISchema(
    handle_layout=HandleLayout(
        input_position="left",
        output_position="right",
    ),
)
```

### Custom Positions

For top-down flow:

```python
UISchema(
    handle_layout=HandleLayout(
        input_position="top",
        output_position="bottom",
    ),
)
```

### Additional Handles

For agent hierarchy:

```python
UISchema(
    handle_layout=HandleLayout(
        input_position="left",
        output_position="right",
        additional_handles=[
            AdditionalHandle(
                id="parent_agent",
                type="target",
                position="top",
                label="Parent Agent",
            ),
            AdditionalHandle(
                id="child_agents",
                type="source",
                position="bottom",
                label="Child Agents",
            ),
        ],
    ),
)
```

## Complete Example

```python
from adkflow_runner.extensions import (
    FlowUnit,
    UISchema,
    PortDefinition,
    NodeLayout,
    CollapsedDisplay,
    HandleLayout,
)

class RouterNode(FlowUnit):
    UNIT_ID = "flow.router"
    UI_LABEL = "Router"
    MENU_LOCATION = "Flow/Control"
    DESCRIPTION = "Routes data based on condition"

    @classmethod
    def setup_interface(cls) -> UISchema:
        return UISchema(
            inputs=[
                PortDefinition(
                    id="data",
                    label="Data",
                    source_type="*",
                    data_type="any",
                    accepted_sources=["*"],
                    accepted_types=["*"],
                ),
            ],
            outputs=[
                PortDefinition(
                    id="true_branch",
                    label="True",
                    source_type="router",
                    data_type="any",
                    handle_color="#22c55e",
                ),
                PortDefinition(
                    id="false_branch",
                    label="False",
                    source_type="router",
                    data_type="any",
                    handle_color="#ef4444",
                ),
            ],
            fields=[
                FieldDefinition(
                    id="condition",
                    label="Condition",
                    widget=WidgetType.TEXT_INPUT,
                    placeholder="data.value > 10",
                ),
            ],
            color="#8b5cf6",
            icon="GitBranch",
            layout=NodeLayout.DIAMOND,
            collapsed_display=CollapsedDisplay(
                format="{{condition}}",
            ),
            handle_layout=HandleLayout(
                input_position="left",
                output_position="right",
            ),
        )
```

## Use Cases

### Simple Transform (Pill)

```python
UISchema(
    layout=NodeLayout.PILL,
    collapsed_display=CollapsedDisplay(format="{{operation}}"),
)
```

### Decision Point (Diamond)

```python
UISchema(
    layout=NodeLayout.DIAMOND,
    icon="GitBranch",
)
```

### Action Button (Circle)

```python
UISchema(
    layout=NodeLayout.CIRCLE,
    icon="Play",
)
```

### Agent with Children (Standard + Additional Handles)

```python
UISchema(
    layout=NodeLayout.STANDARD,
    handle_layout=HandleLayout(
        additional_handles=[
            AdditionalHandle(id="children", type="source", position="bottom"),
        ],
    ),
)
```

## See Also

- [UI Schema](./ui-schema.md) - Complete UI configuration
- [Port Schemas](./port-schemas.md) - Handle definitions
- [Examples](./examples/README.md) - Working examples
