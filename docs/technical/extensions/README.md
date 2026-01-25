# Extensions Overview

Create custom nodes to extend ADKFlow with your own functionality.

## Quick Links

- [FlowUnit API](./flowunit-api.md) - Base class reference
- [Port Schemas](./port-schemas.md) - Input/output ports
- [Field Schemas](./field-schemas.md) - Configuration fields
- [UI Schema](./ui-schema.md) - Node appearance
- [Node Layouts](./node-layouts.md) - Visual styles
- [Type System](./type-system.md) - Type definitions
- [Execution Context](./execution-context.md) - Runtime context
- [Caching & Execution](./caching-execution.md) - Execution control
- [Best Practices](./best-practices.md) - Patterns
- [Examples](./examples/README.md) - Working examples

## Extension Locations

ADKFlow supports two locations for custom nodes:

| Location | Path | Scope |
|----------|------|-------|
| **Global** | `~/.adkflow/adkflow_extensions/` | All projects |
| **Project** | `{project}/adkflow_extensions/` | Single project |

### Precedence

- Project extensions override global with same `UNIT_ID`
- Global loaded at startup
- Project loaded when project opens

## Quick Start

### 1. Create Extension Directory

```bash
mkdir -p ~/.adkflow/adkflow_extensions/hello_world
touch ~/.adkflow/adkflow_extensions/hello_world/__init__.py
```

### 2. Create Node

```python
# ~/.adkflow/adkflow_extensions/hello_world/nodes.py

from adkflow_runner.extensions import (
    FlowUnit,
    UISchema,
    PortDefinition,
    FieldDefinition,
    WidgetType,
    ExecutionContext,
)

class HelloWorldNode(FlowUnit):
    UNIT_ID = "examples.hello_world"
    UI_LABEL = "Hello World"
    MENU_LOCATION = "Examples/Basic"
    DESCRIPTION = "Outputs a greeting message"

    @classmethod
    def setup_interface(cls) -> UISchema:
        return UISchema(
            inputs=[
                PortDefinition(
                    id="name",
                    label="Name",
                    source_type="*",
                    data_type="str",
                    accepted_sources=["*"],
                    accepted_types=["str"],
                ),
            ],
            outputs=[
                PortDefinition(
                    id="greeting",
                    label="Greeting",
                    source_type="hello_world",
                    data_type="str",
                ),
            ],
            fields=[
                FieldDefinition(
                    id="prefix",
                    label="Greeting Prefix",
                    widget=WidgetType.TEXT_INPUT,
                    default="Hello",
                ),
            ],
            color="#3b82f6",
        )

    async def run_process(
        self,
        inputs: dict,
        config: dict,
        context: ExecutionContext,
    ) -> dict:
        name = inputs.get("name", "World")
        prefix = config.get("prefix", "Hello")
        return {"greeting": f"{prefix}, {name}!"}
```

### 3. Export Node

```python
# ~/.adkflow/adkflow_extensions/hello_world/__init__.py

from .nodes import HelloWorldNode

__all__ = ["HelloWorldNode"]
```

### 4. Reload Extensions

```bash
curl -X POST http://localhost:6000/api/extensions/reload
```

Your node appears in **Examples/Basic** menu.

## Extension Structure

```
adkflow_extensions/
└── my_extension/           # Package directory
    ├── __init__.py         # Exports FlowUnit classes
    ├── nodes.py            # Node definitions
    └── utils.py            # Helper functions (optional)
```

### __init__.py

Must export FlowUnit subclasses:

```python
from .nodes import MyNode, AnotherNode

__all__ = ["MyNode", "AnotherNode"]
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/extensions/nodes` | GET | List all nodes |
| `/api/extensions/nodes/{id}` | GET | Get specific node |
| `/api/extensions/reload` | POST | Reload extensions |
| `/api/extensions/init-project` | POST | Init project extensions |
| `/api/extensions/project` | DELETE | Clear project extensions |

## Key Concepts

### FlowUnit

Base class for custom nodes. Defines:
- `UNIT_ID`: Unique identifier
- `UI_LABEL`: Display name
- `MENU_LOCATION`: Menu path
- `setup_interface()`: UI schema
- `run_process()`: Execution logic

### UISchema

Defines node appearance:
- `inputs`: Input port definitions
- `outputs`: Output port definitions
- `fields`: Configuration fields
- `color`, `icon`, `layout`: Visual styling

### ExecutionContext

Runtime context providing:
- Session and run IDs
- Shared state
- Event emission
- Project path

## What's New

Recent additions to the extension API:

| Feature | Description |
|---------|-------------|
| **Node Layouts** | 7 visual styles (pill, circle, diamond, etc.) |
| **Collapsed Display** | Control what shows when collapsed |
| **Handle Layout** | Custom handle positions |
| **Lazy Inputs** | Conditional input evaluation |
| **OUTPUT_NODE** | Mark sink nodes |
| **ALWAYS_EXECUTE** | Skip caching |
| **is_changed()** | Custom change detection |

See [Node Layouts](./node-layouts.md) and [Caching & Execution](./caching-execution.md).

## See Also

- [Backend Extension System](../backend/extension-system.md) - How extensions are loaded
- [Node System](../frontend/node-system.md) - Frontend rendering
