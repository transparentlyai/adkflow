# Field Schemas

Configuration field definitions for custom nodes.

## Overview

Fields are configuration widgets in the node's expanded view. They allow users to set options that affect node behavior.

## FieldDefinition

```python
@dataclass
class FieldDefinition:
    # Required
    id: str                       # Unique field identifier
    label: str                    # Display label
    widget: WidgetType           # Widget type to render

    # Value
    default: Any = None          # Default value

    # Widget-specific
    options: list[dict] | None = None     # For SELECT
    min_value: float | None = None        # For NUMBER/SLIDER
    max_value: float | None = None        # For NUMBER/SLIDER
    step: float | None = None             # For NUMBER/SLIDER
    placeholder: str | None = None        # For TEXT inputs
    help_text: str | None = None          # Help text below field

    # Conditional visibility
    show_if: dict[str, Any] | None = None

    # UI organization
    tab: str | None = None
    section: str | None = None
```

## Widget Types

```python
class WidgetType(str, Enum):
    TEXT_INPUT = "text_input"
    TEXT_AREA = "text_area"
    NUMBER_INPUT = "number_input"
    SELECT = "select"
    CHECKBOX = "checkbox"
    SLIDER = "slider"
    FILE_PICKER = "file_picker"
    CODE_EDITOR = "code_editor"
    JSON_TREE = "json_tree"
    CHAT_LOG = "chat_log"
```

## Text Input

Single-line text:

```python
FieldDefinition(
    id="api_key",
    label="API Key",
    widget=WidgetType.TEXT_INPUT,
    placeholder="Enter your API key",
    default="",
)
```

## Text Area

Multi-line text:

```python
FieldDefinition(
    id="system_prompt",
    label="System Prompt",
    widget=WidgetType.TEXT_AREA,
    placeholder="Enter instructions for the agent...",
    default="You are a helpful assistant.",
)
```

## Number Input

Numeric input with optional range:

```python
FieldDefinition(
    id="max_tokens",
    label="Max Tokens",
    widget=WidgetType.NUMBER_INPUT,
    default=1024,
    min_value=1,
    max_value=8192,
    step=1,
    help_text="Maximum number of tokens to generate",
)
```

## Select (Dropdown)

Dropdown selection:

```python
FieldDefinition(
    id="model",
    label="Model",
    widget=WidgetType.SELECT,
    default="gemini-2.0-flash-exp",
    options=[
        {"value": "gemini-2.0-flash-exp", "label": "Gemini 2.0 Flash"},
        {"value": "gemini-1.5-pro", "label": "Gemini 1.5 Pro"},
        {"value": "gemini-1.5-flash", "label": "Gemini 1.5 Flash"},
    ],
)
```

## Checkbox

Boolean toggle:

```python
FieldDefinition(
    id="stream",
    label="Enable Streaming",
    widget=WidgetType.CHECKBOX,
    default=False,
    help_text="Stream responses as they're generated",
)
```

## Slider

Range slider:

```python
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
```

## File Picker

File selection:

```python
FieldDefinition(
    id="input_file",
    label="Input File",
    widget=WidgetType.FILE_PICKER,
    help_text="Select a file to process",
)
```

## Code Editor

Monaco-powered code editor:

```python
FieldDefinition(
    id="code",
    label="Code",
    widget=WidgetType.CODE_EDITOR,
    default="# Enter your code here",
)
```

## Conditional Visibility

Show fields based on other field values:

```python
# Auth type selector
FieldDefinition(
    id="auth_type",
    label="Auth Type",
    widget=WidgetType.SELECT,
    default="none",
    options=[
        {"value": "none", "label": "None"},
        {"value": "api_key", "label": "API Key"},
        {"value": "bearer", "label": "Bearer Token"},
        {"value": "basic", "label": "Basic Auth"},
    ],
),

# Only shown when auth_type == "api_key"
FieldDefinition(
    id="api_key",
    label="API Key",
    widget=WidgetType.TEXT_INPUT,
    show_if={"auth_type": "api_key"},
),

# Only shown when auth_type == "bearer"
FieldDefinition(
    id="bearer_token",
    label="Bearer Token",
    widget=WidgetType.TEXT_INPUT,
    show_if={"auth_type": "bearer"},
),

# Only shown when auth_type == "basic"
FieldDefinition(
    id="username",
    label="Username",
    widget=WidgetType.TEXT_INPUT,
    show_if={"auth_type": "basic"},
),
FieldDefinition(
    id="password",
    label="Password",
    widget=WidgetType.TEXT_INPUT,
    show_if={"auth_type": "basic"},
),
```

## UI Organization

### Tabs

```python
FieldDefinition(
    id="timeout",
    label="Timeout",
    widget=WidgetType.NUMBER_INPUT,
    tab="Advanced",  # Shows in "Advanced" tab
)
```

### Sections

```python
FieldDefinition(
    id="max_retries",
    label="Max Retries",
    widget=WidgetType.SLIDER,
    tab="Advanced",
    section="Retry",  # Grouped under "Retry" header
)
```

### Tab Behavior

- If any element has `tab`, node uses tabbed interface
- Elements without `tab` appear in "General" tab
- Tabs ordered by first occurrence
- "General" always first if it exists

## Help Text

Add explanatory text:

```python
FieldDefinition(
    id="top_p",
    label="Top P",
    widget=WidgetType.SLIDER,
    default=0.95,
    min_value=0.0,
    max_value=1.0,
    step=0.05,
    help_text="Nucleus sampling threshold. Lower = more focused.",
)
```

## Complete Example

```python
UISchema(
    fields=[
        # General tab
        FieldDefinition(
            id="name",
            label="Name",
            widget=WidgetType.TEXT_INPUT,
            placeholder="Enter node name",
            tab="General",
        ),
        FieldDefinition(
            id="model",
            label="Model",
            widget=WidgetType.SELECT,
            default="gemini-2.0-flash-exp",
            options=[
                {"value": "gemini-2.0-flash-exp", "label": "Gemini 2.0 Flash"},
                {"value": "gemini-1.5-pro", "label": "Gemini 1.5 Pro"},
            ],
            tab="General",
            section="Model",
        ),

        # Parameters tab
        FieldDefinition(
            id="temperature",
            label="Temperature",
            widget=WidgetType.SLIDER,
            default=0.7,
            min_value=0.0,
            max_value=2.0,
            step=0.1,
            tab="Parameters",
        ),
        FieldDefinition(
            id="max_tokens",
            label="Max Tokens",
            widget=WidgetType.NUMBER_INPUT,
            default=1024,
            min_value=1,
            max_value=8192,
            tab="Parameters",
        ),

        # Advanced tab
        FieldDefinition(
            id="stream",
            label="Enable Streaming",
            widget=WidgetType.CHECKBOX,
            default=False,
            tab="Advanced",
        ),
        FieldDefinition(
            id="timeout",
            label="Timeout (seconds)",
            widget=WidgetType.NUMBER_INPUT,
            default=30,
            tab="Advanced",
            section="Timeouts",
        ),
    ],
)
```

## Accessing Values

In `run_process`:

```python
async def run_process(self, inputs, config, context):
    # Get field values
    model = config.get("model", "gemini-2.0-flash-exp")
    temperature = config.get("temperature", 0.7)
    stream = config.get("stream", False)

    # Use values
    response = await call_model(
        model=model,
        temperature=temperature,
        stream=stream,
    )
    return {"output": response}
```

## See Also

- [Port Schemas](./port-schemas.md) - Input/output ports
- [UI Schema](./ui-schema.md) - Node appearance
- [Best Practices](./best-practices.md) - Patterns
