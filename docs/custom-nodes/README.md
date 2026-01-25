# ADKFlow Custom Nodes

Create custom nodes to extend ADKFlow with your own functionality. Custom nodes integrate seamlessly with the visual editor and execution pipeline.

## Quick Links

- [Extension Locations](#extension-locations)
- [Getting Started](#getting-started)
- [FlowUnit API Reference](#flowunit-api-reference)
- [UI Schema Reference](#ui-schema-reference)
- [Widget Types](#widget-types)
- [UI Organization](#ui-organization) (tabs & sections)
- [Visual Customization](#visual-customization) (handle colors, manual input)
- [Type System](#type-system)
- [Execution Context](#execution-context)
- [Best Practices](#best-practices)
- [Examples](./examples/)

---

## Extension Locations

ADKFlow supports **three locations** for custom nodes:

| Location | Path | Scope | Description |
|----------|------|-------|-------------|
| **Shipped** | `{app}/extensions/` | All projects | Built-in extensions that ship with ADKFlow |
| **Global** | `~/.adkflow/adkflow_extensions/` | All projects | User's shared utilities, company-wide tools |
| **Project** | `{project}/adkflow_extensions/` | Single project | Project-specific integrations |

### Directory Structure

```
# Shipped extensions (built-in, always available)
{adkflow-root}/extensions/
├── api_client/                  # HTTP API client example
│   ├── __init__.py
│   ├── nodes.py
│   └── http_utils.py
└── uppercase/                   # Simple text processing example
    ├── __init__.py
    └── nodes.py

# User's global extensions
~/.adkflow/
└── adkflow_extensions/
    ├── __init__.py
    ├── shared_utils.py          # Available in all projects
    └── company_integrations.py  # Team-wide tools

# Project-specific extensions
~/projects/my-project/
├── adkflow_extensions/
│   ├── __init__.py
│   └── project_nodes.py         # Only for this project
├── manifest.json
├── prompts/
└── tools/
```

### Precedence Rules

1. **Project-level takes precedence**: Highest priority - overrides global and shipped
2. **Global takes precedence over shipped**: User extensions override built-in ones
3. **Shipped loaded first**: Built-in extensions loaded at startup
4. **Global loaded at startup**: Global extensions loaded when the server starts
5. **Project loaded on-demand**: Project extensions loaded when you open a project
6. **Hot-reload**: File changes in global and project locations trigger automatic reload

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/extensions/nodes` | GET | List all nodes (global + project) |
| `/api/extensions/reload?scope=all` | POST | Reload all extensions |
| `/api/extensions/reload?scope=global` | POST | Reload only global extensions |
| `/api/extensions/reload?scope=project` | POST | Reload only project extensions |
| `/api/extensions/init-project` | POST | Initialize project extensions |
| `/api/extensions/project` | DELETE | Clear project extensions |

### Scope Information

Each node schema includes a `scope` field indicating its origin:

```json
{
    "unit_id": "tools.web_search",
    "label": "Web Search",
    "scope": "global",
    "source_file": "~/.adkflow/adkflow_extensions/web_tools.py"
}
```

Possible `scope` values:
- `"shipped"` - Built-in extension from `{app}/extensions/`
- `"global"` - User's global extension from `~/.adkflow/adkflow_extensions/`
- `"project"` - Project-specific extension from `{project}/adkflow_extensions/`

---

## Getting Started

### 1. Choose Your Extension Location

**For project-specific nodes:**
Create `adkflow_extensions/` in your project root:

```
your-project/
├── adkflow_extensions/
│   └── my_extension/
│       ├── __init__.py
│       └── nodes.py
├── manifest.json
├── prompts/
└── tools/
```

**For shared/global nodes:**
Create `~/.adkflow/adkflow_extensions/`:

```bash
mkdir -p ~/.adkflow/adkflow_extensions/my_extension
touch ~/.adkflow/adkflow_extensions/my_extension/__init__.py
```

### 2. Create an Extension Package

Each extension is a **directory** (Python package) with an `__init__.py`:

```
adkflow_extensions/
└── hello_world/
    ├── __init__.py    # Entry point - exports FlowUnit classes
    └── nodes.py       # Node definitions
```

**`nodes.py`** - Define your node:

```python
# adkflow_extensions/hello_world/nodes.py

from adkflow_runner.extensions import (
    FlowUnit,
    UISchema,
    PortDefinition,
    FieldDefinition,
    WidgetType,
    ExecutionContext,
)

class HelloWorldNode(FlowUnit):
    """A simple node that greets the user."""

    # Required: Unique identifier (category.name format)
    UNIT_ID = "examples.hello_world"

    # Required: Display name in the UI
    UI_LABEL = "Hello World"

    # Required: Menu path for the node palette
    MENU_LOCATION = "Examples/Basic"

    # Optional: Description shown in tooltips
    DESCRIPTION = "Outputs a greeting message"

    # Optional: Version string
    VERSION = "1.0.0"

    @classmethod
    def setup_interface(cls) -> UISchema:
        """Define the node's inputs, outputs, and configuration fields."""
        return UISchema(
            inputs=[
                PortDefinition(
                    id="name",
                    label="Name",
                    source_type="*",      # Accept from any source
                    data_type="str",      # Expect string data
                    accepted_sources=["*"],
                    accepted_types=["str"],
                ),
            ],
            outputs=[
                PortDefinition(
                    id="greeting",
                    label="Greeting",
                    source_type="hello_world",  # This node's source type
                    data_type="str",
                ),
            ],
            fields=[
                FieldDefinition(
                    id="prefix",
                    label="Greeting Prefix",
                    widget=WidgetType.TEXT_INPUT,
                    default="Hello",
                    placeholder="e.g., Hello, Hi, Hey",
                ),
            ],
            color="#3b82f6",  # Blue header
        )

    async def run_process(
        self,
        inputs: dict[str, Any],
        config: dict[str, Any],
        context: ExecutionContext,
    ) -> dict[str, Any]:
        """Execute the node's logic."""
        name = inputs.get("name", "World")
        prefix = config.get("prefix", "Hello")

        greeting = f"{prefix}, {name}!"

        return {"greeting": greeting}
```

**`__init__.py`** - Export your node classes:

```python
# adkflow_extensions/hello_world/__init__.py

from hello_world.nodes import HelloWorldNode

__all__ = ["HelloWorldNode"]
```

The `__init__.py` must export the FlowUnit classes you want to register. Only classes exported here will be discovered.

### 3. Reload Extensions

After creating your node, reload extensions in ADKFlow:

```bash
# Reload all extensions (global + project)
curl -X POST http://localhost:6000/api/extensions/reload

# Reload only project extensions
curl -X POST http://localhost:6000/api/extensions/reload?scope=project

# Reload only global extensions
curl -X POST http://localhost:6000/api/extensions/reload?scope=global
```

Or simply restart the backend server.

Your node will appear in the "Examples/Basic" menu.

---

## FlowUnit API Reference

### Required Class Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `UNIT_ID` | `str` | Unique identifier in `category.name` format |
| `UI_LABEL` | `str` | Display name shown in the UI |
| `MENU_LOCATION` | `str` | Menu path using `/` as separator |

### Optional Class Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `DESCRIPTION` | `str` | `""` | Tooltip description |
| `VERSION` | `str` | `"1.0.0"` | Version string |

### Required Methods

#### `setup_interface() -> UISchema`

Define the node's visual interface. Called once when the node type is registered.

```python
@classmethod
def setup_interface(cls) -> UISchema:
    return UISchema(
        inputs=[...],
        outputs=[...],
        fields=[...],
        color="#hex",
        icon="IconName",
    )
```

#### `run_process(inputs, config, context) -> dict`

Execute the node's logic. Called during workflow execution.

```python
async def run_process(
    self,
    inputs: dict[str, Any],    # Values from connected input ports
    config: dict[str, Any],    # Values from configuration fields
    context: ExecutionContext, # Execution context
) -> dict[str, Any]:           # Output values keyed by port ID
    # Your logic here
    return {"output_port_id": result}
```

### Optional Lifecycle Hooks

```python
async def on_before_execute(self, context: ExecutionContext) -> None:
    """Called before run_process. Use for setup/initialization."""
    pass

async def on_after_execute(
    self,
    context: ExecutionContext,
    outputs: dict[str, Any]
) -> None:
    """Called after run_process. Use for cleanup."""
    pass

@classmethod
def compute_state_hash(cls, inputs: dict, config: dict) -> str:
    """Compute hash for caching. Override for custom cache keys."""
    # Default: hash of inputs + config
    pass

@classmethod
def validate_config(cls, config: dict[str, Any]) -> list[str]:
    """Validate configuration. Return list of error messages."""
    return []
```

---

## UI Schema Reference

### UISchema

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `inputs` | `list[PortDefinition]` | `[]` | Input port definitions |
| `outputs` | `list[PortDefinition]` | `[]` | Output port definitions |
| `fields` | `list[FieldDefinition]` | `[]` | Configuration field definitions |
| `color` | `str` | `"#6366f1"` | Header background color (hex) |
| `icon` | `str \| None` | `None` | Lucide icon name |
| `expandable` | `bool` | `True` | Allow expand/collapse |
| `default_width` | `int` | `250` | Default width in pixels |
| `default_height` | `int` | `150` | Default height in pixels |

### PortDefinition

Defines an input or output connection point.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `str` | Yes | Unique port identifier |
| `label` | `str` | Yes | Display label |
| `source_type` | `str` | Yes | Semantic source type (e.g., `"agent"`, `"prompt"`, `"*"`) |
| `data_type` | `str` | Yes | Python data type (e.g., `"str"`, `"dict"`, `"list"`) |
| `accepted_sources` | `list[str] \| None` | No | For inputs: accepted source types (`["*"]` = any) |
| `accepted_types` | `list[str] \| None` | No | For inputs: accepted data types (`["*"]` = any) |
| `required` | `bool` | No | Whether connection is required (default: `True`) |
| `multiple` | `bool` | No | Allow multiple connections (default: `False`) |
| `tab` | `str \| None` | No | Tab name for UI organization (e.g., `"General"`, `"Advanced"`) |
| `section` | `str \| None` | No | Section within tab (e.g., `"Authentication"`) |
| `handle_color` | `str \| None` | No | Custom handle color (hex, e.g., `"#ff6b6b"`) |
| `connection_only` | `bool` | No | For inputs: `True` = only accepts connections (default), `False` = allows manual input |
| `widget` | `WidgetType \| None` | No | For inputs with `connection_only=False`: widget for manual input |
| `default` | `Any` | No | For inputs with `connection_only=False`: default value |
| `placeholder` | `str \| None` | No | For inputs with `connection_only=False`: placeholder text |
| `options` | `list[dict] \| None` | No | For inputs with `connection_only=False` and SELECT widget |

**Example:**

```python
# Input that accepts strings from any source
PortDefinition(
    id="query",
    label="Search Query",
    source_type="*",
    data_type="str",
    accepted_sources=["*"],
    accepted_types=["str"],
)

# Input that only accepts agent outputs
PortDefinition(
    id="agent_response",
    label="Agent Response",
    source_type="agent",
    data_type="dict",
    accepted_sources=["agent"],
    accepted_types=["dict"],
)

# Output
PortDefinition(
    id="result",
    label="Result",
    source_type="my_node",  # Your node's source type
    data_type="str",
)
```

### FieldDefinition

Defines a configuration field in the node's expanded view.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `str` | Yes | Unique field identifier |
| `label` | `str` | Yes | Display label |
| `widget` | `WidgetType` | Yes | Widget type to render |
| `default` | `Any` | No | Default value |
| `options` | `list[dict]` | No | For SELECT: `[{"value": "x", "label": "X"}]` |
| `min_value` | `float` | No | For NUMBER/SLIDER: minimum value |
| `max_value` | `float` | No | For NUMBER/SLIDER: maximum value |
| `step` | `float` | No | For NUMBER/SLIDER: step increment |
| `placeholder` | `str` | No | Placeholder text |
| `help_text` | `str` | No | Help text below the field |
| `show_if` | `dict` | No | Conditional visibility: `{"field_id": "value"}` |
| `tab` | `str \| None` | No | Tab name for UI organization (e.g., `"General"`, `"Advanced"`) |
| `section` | `str \| None` | No | Section within tab (e.g., `"Retry"`) |

---

## Widget Types

Available widget types for configuration fields:

| Widget | WidgetType | Description | Config Options |
|--------|-----------|-------------|----------------|
| Text Input | `TEXT_INPUT` | Single-line text | `placeholder` |
| Text Area | `TEXT_AREA` | Multi-line text | `placeholder` |
| Number | `NUMBER_INPUT` | Numeric input | `min_value`, `max_value`, `step` |
| Select | `SELECT` | Dropdown select | `options` (required) |
| Checkbox | `CHECKBOX` | Boolean toggle | - |
| Slider | `SLIDER` | Range slider | `min_value`, `max_value`, `step` |
| File Picker | `FILE_PICKER` | File selection | - |
| Code Editor | `CODE_EDITOR` | Monaco code editor | - |
| JSON Tree | `JSON_TREE` | Collapsible JSON viewer | - |
| Chat Log | `CHAT_LOG` | Message history display | - |

### Widget Examples

```python
# Text input
FieldDefinition(
    id="api_key",
    label="API Key",
    widget=WidgetType.TEXT_INPUT,
    placeholder="Enter your API key",
)

# Select dropdown
FieldDefinition(
    id="model",
    label="Model",
    widget=WidgetType.SELECT,
    default="gpt-4",
    options=[
        {"value": "gpt-4", "label": "GPT-4"},
        {"value": "gpt-3.5-turbo", "label": "GPT-3.5 Turbo"},
        {"value": "claude-3", "label": "Claude 3"},
    ],
)

# Slider with range
FieldDefinition(
    id="temperature",
    label="Temperature",
    widget=WidgetType.SLIDER,
    default=0.7,
    min_value=0.0,
    max_value=2.0,
    step=0.1,
    help_text="Higher values = more creative",
)

# Conditional field (only shown when format == "custom")
FieldDefinition(
    id="custom_format",
    label="Custom Format",
    widget=WidgetType.TEXT_INPUT,
    show_if={"format": "custom"},
)
```

---

## UI Organization

Use `tab` and `section` properties to organize complex nodes into a tabbed interface with logical groupings.

### Tabs

Add the `tab` property to inputs, outputs, or fields to group them into tabs:

```python
FieldDefinition(
    id="timeout",
    label="Timeout",
    widget=WidgetType.NUMBER_INPUT,
    tab="Advanced",  # Shows in "Advanced" tab
)

PortDefinition(
    id="headers",
    label="Headers",
    source_type="*",
    data_type="dict",
    tab="Advanced",  # Input port in "Advanced" tab
)
```

**Behavior:**
- If **any** element has a `tab` property, the node displays a tabbed interface
- Elements **without** a `tab` property appear in a default "General" tab
- Tabs are ordered by first occurrence, with "General" always first if it exists
- Outputs typically don't need tabs - they appear in a footer section below the tabs

### Sections

Use `section` to create visual groupings within a tab:

```python
# Both fields appear in the "Retry" section under "Advanced" tab
FieldDefinition(
    id="max_retries",
    label="Max Retries",
    widget=WidgetType.SLIDER,
    tab="Advanced",
    section="Retry",
)

FieldDefinition(
    id="retry_delay",
    label="Retry Delay",
    widget=WidgetType.SLIDER,
    tab="Advanced",
    section="Retry",
)
```

Sections display a header with a left border accent. Section order follows the order elements are defined in the schema.

### Complete Example

See the [API Client example](/extensions/api_client/nodes.py) for a complete implementation with tabs and sections:

```python
UISchema(
    inputs=[
        PortDefinition(id="url", ..., tab="General"),
        PortDefinition(id="body", ..., tab="General"),
        PortDefinition(id="headers", ..., tab="Advanced", section="Headers"),
    ],
    fields=[
        # General tab - Request section
        FieldDefinition(id="method", ..., tab="General", section="Request"),
        FieldDefinition(id="content_type", ..., tab="General", section="Request"),
        FieldDefinition(id="response_type", ..., tab="General", section="Response"),

        # Auth tab - conditional fields by auth type
        FieldDefinition(id="auth_type", ..., tab="Auth"),
        FieldDefinition(id="api_key", ..., tab="Auth", section="API Key", show_if={"auth_type": "api_key"}),
        FieldDefinition(id="bearer_token", ..., tab="Auth", section="Bearer Token", show_if={"auth_type": "bearer"}),

        # Advanced tab - multiple sections
        FieldDefinition(id="timeout", ..., tab="Advanced", section="Timeouts"),
        FieldDefinition(id="max_retries", ..., tab="Advanced", section="Retry"),
        FieldDefinition(id="enable_cache", ..., tab="Advanced", section="Options"),
    ],
    outputs=[...],  # Outputs appear in footer, no tab needed
)
```

### Backward Compatibility

- Nodes without any `tab` properties render with the original flat layout
- Existing extensions continue to work without modification
- `show_if` conditional visibility works within tabs - hidden fields don't appear

---

## Visual Customization

### Handle Colors

Use `handle_color` to visually distinguish different port types:

```python
# Color-coded outputs for different data types
PortDefinition(
    id="response",
    label="Response",
    source_type="api_client",
    data_type="dict",
    handle_color="#22c55e",  # Green for success data
)

PortDefinition(
    id="error",
    label="Error",
    source_type="api_client",
    data_type="str",
    handle_color="#ef4444",  # Red for error output
)

# Color-coded input
PortDefinition(
    id="headers",
    label="Headers",
    source_type="*",
    data_type="dict",
    handle_color="#8b5cf6",  # Purple for headers
)
```

Common color conventions:
- `#22c55e` (green) - Success/data outputs
- `#ef4444` (red) - Error outputs
- `#3b82f6` (blue) - Status/metadata
- `#8b5cf6` (purple) - Configuration/headers
- `#f59e0b` (amber) - Warnings

### Manual Input for Ports

By default, input ports only accept connections. Use `connection_only=False` to allow users to manually enter values when no connection is made:

```python
# URL input: can be typed manually OR connected
PortDefinition(
    id="url",
    label="URL",
    source_type="*",
    data_type="str",
    connection_only=False,  # Allow manual input
    widget=WidgetType.TEXT_INPUT,
    placeholder="https://api.example.com/endpoint",
)

# Body input: can be edited as JSON OR connected
PortDefinition(
    id="body",
    label="Body",
    source_type="*",
    data_type="dict",
    connection_only=False,
    widget=WidgetType.TEXT_AREA,
    default="{}",
    placeholder='{"key": "value"}',
)

# Connection-only input (default behavior)
PortDefinition(
    id="params",
    label="Query Params",
    source_type="*",
    data_type="dict",
    # connection_only=True is the default
)
```

**Behavior:**
- `connection_only=True` (default): Only accepts connections, shows "None" when disconnected
- `connection_only=False`: Shows an editable widget when disconnected, disabled when connected
- When connected, the input shows the connected source name and the widget is hidden
- When disconnected, the editable widget reappears with its last value

---

## Type System

ADKFlow uses a `source:type` format for connection validation.

### Source Types

The semantic origin of data:
- `prompt` - From a Prompt node
- `context` - From a Context node
- `agent` - From an Agent node
- `tool` - From a Tool node
- `variable` - From a Variable node
- `user_input` - From a User Input node
- `*` - Wildcard (accepts any source)
- `your_node_name` - Custom source type for your nodes

### Data Types

Python types:
- `str` - String
- `int` - Integer
- `float` - Float
- `bool` - Boolean
- `list` - List/Array
- `dict` - Dictionary/Object
- `callable` - Function/Tool
- `any` - Any type (wildcard)

### Connection Validation

A connection is valid when:
1. Output's `source_type` ∈ Input's `accepted_sources`
2. Output's `data_type` ∈ Input's `accepted_types`

```python
# This output...
PortDefinition(
    id="result",
    source_type="my_node",
    data_type="str",
)

# ...can connect to this input:
PortDefinition(
    id="text",
    accepted_sources=["my_node", "prompt"],  # Includes "my_node"
    accepted_types=["str"],                   # Includes "str"
)
```

---

## Execution Context

The `ExecutionContext` provides runtime information and utilities.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `session_id` | `str` | Current session ID |
| `run_id` | `str` | Current run ID |
| `node_id` | `str` | This node's ID |
| `node_name` | `str` | This node's name |
| `state` | `dict` | Shared state across nodes |
| `project_path` | `Path` | Project directory path |
| `emit` | `Callable` | Emit events for real-time updates |

### Methods

```python
# Get shared state
value = context.get_state("my_key", default=None)

# Set shared state (available to downstream nodes)
context.set_state("my_key", value)

# Emit progress event
await context.emit({
    "type": "progress",
    "message": "Processing step 1...",
    "percent": 25,
})
```

### Example: Using Shared State

```python
class ProducerNode(FlowUnit):
    async def run_process(self, inputs, config, context):
        # Store data for other nodes
        context.set_state("api_response", {"data": "..."})
        return {"status": "done"}

class ConsumerNode(FlowUnit):
    async def run_process(self, inputs, config, context):
        # Retrieve data from earlier nodes
        response = context.get_state("api_response", {})
        return {"result": response.get("data")}
```

---

## Best Practices

### 1. Naming Conventions

```python
# UNIT_ID: lowercase with dots
UNIT_ID = "category.node_name"  # ✓
UNIT_ID = "Category.NodeName"   # ✗

# MENU_LOCATION: Title case with slashes
MENU_LOCATION = "My Tools/Data Processing"  # ✓
```

### 2. Error Handling

```python
async def run_process(self, inputs, config, context):
    try:
        result = await self.do_work(inputs)
        return {"output": result}
    except ValueError as e:
        # Return error information
        return {"output": None, "error": str(e)}
    except Exception as e:
        # Log and re-raise for critical errors
        await context.emit({"type": "error", "message": str(e)})
        raise
```

### 3. Progress Updates

```python
async def run_process(self, inputs, config, context):
    items = inputs.get("items", [])
    results = []

    for i, item in enumerate(items):
        # Emit progress
        await context.emit({
            "type": "progress",
            "message": f"Processing {i+1}/{len(items)}",
            "percent": (i + 1) / len(items) * 100,
        })

        results.append(await self.process_item(item))

    return {"results": results}
```

### 4. Caching Expensive Operations

```python
class LLMNode(FlowUnit):
    @classmethod
    def compute_state_hash(cls, inputs: dict, config: dict) -> str:
        """Cache based on prompt + model + temperature."""
        import hashlib
        cache_key = f"{inputs.get('prompt')}:{config.get('model')}:{config.get('temperature')}"
        return hashlib.sha256(cache_key.encode()).hexdigest()

    async def run_process(self, inputs, config, context):
        # This will be cached if inputs+config hash matches
        response = await call_llm(inputs["prompt"], config)
        return {"response": response}
```

### 5. Type Validation

```python
@classmethod
def validate_config(cls, config: dict) -> list[str]:
    """Validate configuration before execution."""
    errors = []

    if not config.get("api_key"):
        errors.append("API key is required")

    temp = config.get("temperature", 0.7)
    if not 0 <= temp <= 2:
        errors.append("Temperature must be between 0 and 2")

    return errors
```

### 6. Resource Cleanup

```python
class DatabaseNode(FlowUnit):
    async def on_before_execute(self, context):
        """Initialize database connection."""
        self.connection = await create_connection()

    async def run_process(self, inputs, config, context):
        result = await self.connection.query(inputs["sql"])
        return {"result": result}

    async def on_after_execute(self, context, outputs):
        """Close database connection."""
        if hasattr(self, 'connection'):
            await self.connection.close()
```

---

## Context Aggregator Preview

The Context Aggregator node includes a preview feature that allows you to inspect aggregation results before running the workflow.

### Using Preview

1. Add inputs to your Context Aggregator node
2. Click the **Preview** button in the inputs section header
3. A side panel opens showing the aggregated content for each input

### Preview Behavior by Input Type

| Input Type | Preview Behavior |
|------------|------------------|
| **File** | Shows file content with syntax highlighting |
| **Directory** | Shows matched files count, expandable file list with content |
| **URL** | Fetches and displays URL content with HTTP status |
| **Node** | Shows placeholder: `--- {input-name} Value Resolved at Runtime ---` |

### Schema-Driven Display

The preview system is schema-driven for extensibility:

- **Automatic property display**: New properties added to `DynamicInputConfig` automatically appear in preview
- **PREVIEW_DISPLAY_HINTS**: Customize how properties are displayed in the preview panel
- **GenericPropertyDisplay**: Fallback widget for unknown properties

```typescript
// Add custom display hints for new properties
PREVIEW_DISPLAY_HINTS["myNewProperty"] = {
  label: "My New Property",
  displayAs: "code",
};
```

### API Endpoint

Preview uses the `/api/context-aggregator/preview` endpoint:

```typescript
POST /api/context-aggregator/preview
{
  "projectPath": "/path/to/project",
  "dynamicInputs": [...],
  "aggregationMode": "pass",
  "separator": "\\n\\n---",
  "outputVariableName": "context",
  "includeMetadata": true,
  "maxContentSize": 10240
}
```

**Response:**
```typescript
{
  "results": {
    "input_id": {
      "variableName": "my_var",
      "content": "file content...",
      "metadata": { "source_path": "..." },
      "truncated": false,
      "totalSize": 1234
    }
  },
  "errors": []
}
```

---

## Troubleshooting

### Node Not Appearing

1. Check for Python syntax errors: `python -m py_compile your_file.py`
2. Verify `UNIT_ID`, `UI_LABEL`, and `MENU_LOCATION` are defined
3. Reload extensions: `POST /api/extensions/reload`
4. Check backend logs for import errors
5. Verify the file is in the correct location:
   - Global: `~/.adkflow/adkflow_extensions/`
   - Project: `{project_path}/adkflow_extensions/`

### Node Scope Issues

1. Check the `scope` field in the API response to see where a node is loaded from
2. If a project node should override a global node, ensure the `UNIT_ID` matches exactly
3. When switching projects, call `DELETE /api/extensions/project` to clear old project nodes

### Connection Not Allowed

1. Verify `source_type` matches `accepted_sources`
2. Verify `data_type` matches `accepted_types`
3. Use `"*"` for wildcard matching

### Execution Errors

1. Check that `run_process` returns a dict
2. Ensure output keys match port IDs
3. Handle missing inputs gracefully

---

## Next Steps

- See [Shipped Extensions](/extensions/) for complete working nodes that ship with ADKFlow
- Check the [Uppercase Example](/extensions/uppercase/) to get started with a simple example
- See the [API Client Example](/extensions/api_client/) for advanced patterns with tabs, sections, and all widget types
