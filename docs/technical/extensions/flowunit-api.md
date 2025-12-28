# FlowUnit API

Base class reference for custom nodes.

## Overview

`FlowUnit` is the base class for all custom nodes. Subclass it to create nodes that integrate with ADKFlow's visual editor and execution pipeline.

**Location**: `adkflow_runner/extensions/flow_unit.py`

## Class Definition

```python
from abc import ABC, abstractmethod

class FlowUnit(ABC):
    # Required class attributes
    UNIT_ID: str          # Unique identifier
    UI_LABEL: str         # Display name
    MENU_LOCATION: str    # Menu path

    # Optional class attributes
    DESCRIPTION: str = ""
    VERSION: str = "1.0.0"
    OUTPUT_NODE: bool = False
    ALWAYS_EXECUTE: bool = False

    @classmethod
    @abstractmethod
    def setup_interface(cls) -> UISchema:
        """Define the node's UI schema."""
        pass

    @abstractmethod
    async def run_process(
        self,
        inputs: dict[str, Any],
        config: dict[str, Any],
        context: ExecutionContext,
    ) -> dict[str, Any]:
        """Execute the node's logic."""
        pass
```

## Required Attributes

### UNIT_ID

Unique identifier in `category.name` format:

```python
UNIT_ID = "my_category.my_node"
```

**Rules**:
- Use lowercase with dots
- Must be unique across all extensions
- Used for referencing and caching

### UI_LABEL

Display name shown in the UI:

```python
UI_LABEL = "My Custom Node"
```

### MENU_LOCATION

Menu path using `/` as separator:

```python
MENU_LOCATION = "Custom/Data Processing"
```

Creates nested menu structure.

## Optional Attributes

### DESCRIPTION

Tooltip text:

```python
DESCRIPTION = "Processes data and returns results"
```

### VERSION

Version string for tracking:

```python
VERSION = "2.1.0"
```

### OUTPUT_NODE

Mark as a sink node (writes file, sends API, etc.):

```python
OUTPUT_NODE = True
```

Output nodes are always executed, even if their output isn't used.

### ALWAYS_EXECUTE

Skip caching, always run:

```python
ALWAYS_EXECUTE = True
```

Use for nodes with side effects or time-dependent outputs.

## Required Methods

### setup_interface()

Define the node's visual interface. Called once when the node type is registered.

```python
@classmethod
def setup_interface(cls) -> UISchema:
    return UISchema(
        inputs=[
            PortDefinition(
                id="input",
                label="Input",
                source_type="*",
                data_type="str",
                accepted_sources=["*"],
                accepted_types=["str"],
            ),
        ],
        outputs=[
            PortDefinition(
                id="output",
                label="Output",
                source_type="my_node",
                data_type="str",
            ),
        ],
        fields=[
            FieldDefinition(
                id="option",
                label="Option",
                widget=WidgetType.SELECT,
                options=[
                    {"value": "a", "label": "Option A"},
                    {"value": "b", "label": "Option B"},
                ],
            ),
        ],
        color="#3b82f6",
        icon="Zap",
    )
```

### run_process()

Execute the node's logic. Called during workflow execution.

```python
async def run_process(
    self,
    inputs: dict[str, Any],
    config: dict[str, Any],
    context: ExecutionContext,
) -> dict[str, Any]:
    # Get input values
    input_value = inputs.get("input", "")

    # Get config values
    option = config.get("option", "a")

    # Process
    result = process_data(input_value, option)

    # Return outputs keyed by port ID
    return {"output": result}
```

**Parameters**:
- `inputs`: Values from connected input ports
- `config`: Values from configuration fields
- `context`: Execution context (session, state, emit)

**Returns**: Dict mapping output port IDs to values.

## Optional Methods

### on_before_execute()

Called before `run_process`. Use for setup:

```python
async def on_before_execute(self, context: ExecutionContext) -> None:
    self.connection = await create_connection()
```

### on_after_execute()

Called after `run_process`. Use for cleanup:

```python
async def on_after_execute(
    self,
    context: ExecutionContext,
    outputs: dict[str, Any],
) -> None:
    await self.connection.close()
```

### compute_state_hash()

Custom cache key computation:

```python
@classmethod
def compute_state_hash(cls, inputs: dict, config: dict) -> str:
    # Only cache based on prompt and model
    key = f"{inputs.get('prompt')}:{config.get('model')}"
    return hashlib.sha256(key.encode()).hexdigest()
```

### validate_config()

Validate configuration before execution:

```python
@classmethod
def validate_config(cls, config: dict[str, Any]) -> list[str]:
    errors = []
    if not config.get("api_key"):
        errors.append("API key is required")
    return errors
```

### is_changed()

Custom change detection:

```python
@classmethod
def is_changed(cls, config: dict, inputs: dict) -> Any:
    # Always execute if output mode is "stream"
    if config.get("output_mode") == "stream":
        return float("nan")  # NaN != NaN, forces execution
    return None  # Use default hash comparison
```

### check_lazy_status()

Determine which lazy inputs are needed:

```python
@classmethod
def check_lazy_status(
    cls,
    config: dict,
    available_inputs: dict,
) -> list[str]:
    # Only need fallback if primary is None
    if available_inputs.get("primary") is None:
        return ["fallback"]  # Request fallback input
    return []  # Primary is sufficient
```

## Complete Example

```python
from typing import Any
from adkflow_runner.extensions import (
    FlowUnit,
    UISchema,
    PortDefinition,
    FieldDefinition,
    WidgetType,
    ExecutionContext,
)

class TextTransformerNode(FlowUnit):
    UNIT_ID = "text.transformer"
    UI_LABEL = "Text Transformer"
    MENU_LOCATION = "Text/Transform"
    DESCRIPTION = "Transforms text based on selected operation"
    VERSION = "1.0.0"

    @classmethod
    def setup_interface(cls) -> UISchema:
        return UISchema(
            inputs=[
                PortDefinition(
                    id="text",
                    label="Text",
                    source_type="*",
                    data_type="str",
                    accepted_sources=["*"],
                    accepted_types=["str"],
                ),
            ],
            outputs=[
                PortDefinition(
                    id="result",
                    label="Result",
                    source_type="text_transformer",
                    data_type="str",
                ),
            ],
            fields=[
                FieldDefinition(
                    id="operation",
                    label="Operation",
                    widget=WidgetType.SELECT,
                    default="uppercase",
                    options=[
                        {"value": "uppercase", "label": "UPPERCASE"},
                        {"value": "lowercase", "label": "lowercase"},
                        {"value": "title", "label": "Title Case"},
                    ],
                ),
            ],
            color="#22c55e",
        )

    async def run_process(
        self,
        inputs: dict[str, Any],
        config: dict[str, Any],
        context: ExecutionContext,
    ) -> dict[str, Any]:
        text = inputs.get("text", "")
        operation = config.get("operation", "uppercase")

        if operation == "uppercase":
            result = text.upper()
        elif operation == "lowercase":
            result = text.lower()
        else:
            result = text.title()

        return {"result": result}
```

## See Also

- [Port Schemas](./port-schemas.md) - Input/output definitions
- [Field Schemas](./field-schemas.md) - Configuration fields
- [UI Schema](./ui-schema.md) - Visual configuration
- [Execution Context](./execution-context.md) - Runtime context
