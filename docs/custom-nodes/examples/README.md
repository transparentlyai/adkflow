# Custom Node Examples

This directory contains example custom nodes demonstrating the ADKFlow extension system.

## Examples Overview

| Example | Difficulty | Concepts Covered |
|---------|------------|------------------|
| [simple_uppercase.py](./simple_uppercase.py) | Beginner | Basic structure, single I/O, simple widget |
| [advanced_api_client.py](./advanced_api_client.py) | Advanced | All features, multiple I/O, validation, caching |

---

## Simple Example: Uppercase Converter

**File:** `simple_uppercase.py`

A beginner-friendly node that converts text to uppercase. Perfect for understanding the basic structure of a custom node.

**Concepts demonstrated:**
- Basic `FlowUnit` class structure
- Required attributes (`UNIT_ID`, `UI_LABEL`, `MENU_LOCATION`)
- Single input and output port
- Simple checkbox widget
- Basic `run_process` implementation

**Code preview:**
```python
class UppercaseNode(FlowUnit):
    UNIT_ID = "examples.uppercase"
    UI_LABEL = "Uppercase"
    MENU_LOCATION = "Examples/Text"

    @classmethod
    def setup_interface(cls) -> UISchema:
        return UISchema(
            inputs=[PortDefinition(id="text", label="Text", ...)],
            outputs=[PortDefinition(id="result", label="Result", ...)],
            fields=[FieldDefinition(id="trim", widget=WidgetType.CHECKBOX)],
        )

    async def run_process(self, inputs, config, context):
        text = inputs.get("text", "").upper()
        return {"result": text}
```

**To use:**
1. Copy `simple_uppercase.py` to your `adkflow_extensions/` directory
2. Reload extensions in ADKFlow
3. Find "Uppercase" in the "Examples/Text" menu

---

## Advanced Example: API Client

**File:** `advanced_api_client.py`

A comprehensive HTTP API client demonstrating ALL capabilities of the custom node system.

**Concepts demonstrated:**

### Node Identity & Metadata
- `UNIT_ID`, `UI_LABEL`, `MENU_LOCATION`
- `DESCRIPTION`, `VERSION`

### Multiple Inputs with Type Constraints
```python
inputs=[
    PortDefinition(id="url", accepted_sources=["*"], accepted_types=["str"]),
    PortDefinition(id="body", accepted_types=["dict", "str"], required=False),
    PortDefinition(id="headers", accepted_types=["dict"], required=False),
]
```

### Multiple Outputs
```python
outputs=[
    PortDefinition(id="response", source_type="api_client", data_type="dict"),
    PortDefinition(id="status_code", source_type="api_client", data_type="int"),
    PortDefinition(id="error", source_type="api_client", data_type="str"),
]
```

### All Widget Types
- `SELECT` - HTTP method, auth type
- `TEXT_INPUT` - API keys, tokens
- `TEXT_AREA` - Custom headers
- `NUMBER_INPUT` - Timeout
- `SLIDER` - Retry settings
- `CHECKBOX` - Enable caching, SSL verification

### Conditional Field Visibility
```python
FieldDefinition(
    id="api_key",
    widget=WidgetType.TEXT_INPUT,
    show_if={"auth_type": "api_key"},  # Only shown when auth_type is "api_key"
),
```

### Configuration Validation
```python
@classmethod
def validate_config(cls, config: dict) -> list[str]:
    errors = []
    if config.get("auth_type") == "api_key" and not config.get("api_key"):
        errors.append("API Key is required")
    return errors
```

### Custom Caching
```python
@classmethod
def compute_state_hash(cls, inputs: dict, config: dict) -> str:
    # Only cache GET requests
    if config.get("method") != "GET":
        return unique_hash()  # Don't cache
    return hash_of(inputs, config)
```

### Lifecycle Hooks
```python
async def on_before_execute(self, context):
    # Initialize resources, log start
    context.set_state("request_count", context.get_state("request_count", 0) + 1)

async def on_after_execute(self, context, outputs):
    # Cleanup, update metrics
    stats = context.get_state("api_stats", {"success": 0, "failed": 0})
    stats["success" if not outputs.get("error") else "failed"] += 1
    context.set_state("api_stats", stats)
```

### Progress Events
```python
await context.emit({
    "type": "progress",
    "message": f"Making {method} request...",
    "percent": 25,
})
```

### Shared State
```python
# Write state
context.set_state("api_response", response_data)

# Read state (in another node)
data = context.get_state("api_response", {})
```

### Type-Safe Connections
The companion `APIResponseParserNode` only accepts connections from `api_client` nodes:
```python
PortDefinition(
    id="response",
    accepted_sources=["api_client"],  # Only API Client nodes
    accepted_types=["dict"],
)
```

---

## Using the Examples

### Option 1: Copy to Extensions Directory

```bash
# Copy a single example
cp docs/custom-nodes/examples/simple_uppercase.py adkflow_extensions/

# Or copy all examples
cp docs/custom-nodes/examples/*.py adkflow_extensions/
```

### Option 2: Import in Your Extension

```python
# adkflow_extensions/my_nodes.py

# You can reference these as patterns
from .simple_uppercase import UppercaseNode
from .advanced_api_client import APIClientNode, APIResponseParserNode
```

### Reload Extensions

After copying, reload extensions:
```bash
# Via API
curl -X POST http://localhost:8000/api/extensions/reload

# Or restart the backend
```

---

## Creating Your Own Nodes

Use these examples as templates:

1. **Start with the simple example** - Copy `simple_uppercase.py` and modify:
   - Change `UNIT_ID`, `UI_LABEL`, `MENU_LOCATION`
   - Adjust inputs/outputs for your use case
   - Implement your logic in `run_process`

2. **Add complexity as needed** - Reference `advanced_api_client.py` for:
   - Multiple inputs/outputs
   - Configuration validation
   - Caching behavior
   - Lifecycle hooks
   - Progress reporting

3. **Test incrementally** - After each change:
   - Reload extensions
   - Check the node appears in the menu
   - Test connections work as expected
   - Verify execution produces correct output

---

## Troubleshooting

### Node doesn't appear in menu
- Check for Python syntax errors: `python -m py_compile your_file.py`
- Verify required attributes are defined (`UNIT_ID`, `UI_LABEL`, `MENU_LOCATION`)
- Check backend logs for import errors

### Connections not allowed
- Verify `source_type` matches `accepted_sources`
- Verify `data_type` matches `accepted_types`
- Use `"*"` for wildcard matching

### Execution errors
- Check `run_process` returns a dict
- Ensure output keys match port IDs
- Handle missing inputs gracefully
- Check backend logs for exceptions
