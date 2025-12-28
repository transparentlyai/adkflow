# Extension Examples

Working examples of custom ADKFlow nodes.

## Available Examples

| Example | Description | Features |
|---------|-------------|----------|
| [Uppercase Transformer](#uppercase-transformer) | Simple text transformation | Basic structure |
| [API Client](#api-client) | HTTP API calls | Tabs, sections, error handling |

## Uppercase Transformer

A minimal example demonstrating basic node structure.

**Location**: `docs/custom-nodes/examples/uppercase/`

```python
from adkflow_runner.extensions import (
    FlowUnit,
    UISchema,
    PortDefinition,
    FieldDefinition,
    WidgetType,
    ExecutionContext,
)

class UppercaseNode(FlowUnit):
    """Converts text to uppercase."""

    UNIT_ID = "text.uppercase"
    UI_LABEL = "Uppercase"
    MENU_LOCATION = "Text/Transform"
    DESCRIPTION = "Converts input text to uppercase"

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
                    source_type="uppercase",
                    data_type="str",
                ),
            ],
            color="#22c55e",
        )

    async def run_process(
        self,
        inputs: dict,
        config: dict,
        context: ExecutionContext,
    ) -> dict:
        text = inputs.get("text", "")
        return {"result": text.upper()}
```

### Key Points

- Minimal required attributes: `UNIT_ID`, `UI_LABEL`, `MENU_LOCATION`
- Simple input/output ports
- Straightforward processing

## API Client

A complex example with tabs, sections, authentication, and error handling.

**Location**: `docs/custom-nodes/examples/api_client/`

```python
from typing import Any
import aiohttp
from adkflow_runner.extensions import (
    FlowUnit,
    UISchema,
    PortDefinition,
    FieldDefinition,
    WidgetType,
    ExecutionContext,
)

class APIClientNode(FlowUnit):
    """Makes HTTP API requests."""

    UNIT_ID = "http.api_client"
    UI_LABEL = "API Client"
    MENU_LOCATION = "HTTP/Client"
    DESCRIPTION = "Make HTTP requests to external APIs"
    VERSION = "1.0.0"

    @classmethod
    def setup_interface(cls) -> UISchema:
        return UISchema(
            inputs=[
                # URL with manual input option
                PortDefinition(
                    id="url",
                    label="URL",
                    source_type="*",
                    data_type="str",
                    accepted_sources=["*"],
                    accepted_types=["str"],
                    connection_only=False,
                    widget=WidgetType.TEXT_INPUT,
                    placeholder="https://api.example.com/endpoint",
                    tab="General",
                ),
                # Optional request body
                PortDefinition(
                    id="body",
                    label="Body",
                    source_type="*",
                    data_type="dict",
                    accepted_sources=["*"],
                    accepted_types=["dict", "str"],
                    required=False,
                    connection_only=False,
                    widget=WidgetType.TEXT_AREA,
                    placeholder='{"key": "value"}',
                    tab="General",
                ),
                # Optional headers
                PortDefinition(
                    id="headers",
                    label="Headers",
                    source_type="*",
                    data_type="dict",
                    accepted_sources=["*"],
                    accepted_types=["dict"],
                    required=False,
                    tab="Advanced",
                    section="Headers",
                    handle_color="#8b5cf6",
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
                # General tab - Request section
                FieldDefinition(
                    id="method",
                    label="Method",
                    widget=WidgetType.SELECT,
                    default="GET",
                    options=[
                        {"value": "GET", "label": "GET"},
                        {"value": "POST", "label": "POST"},
                        {"value": "PUT", "label": "PUT"},
                        {"value": "PATCH", "label": "PATCH"},
                        {"value": "DELETE", "label": "DELETE"},
                    ],
                    tab="General",
                    section="Request",
                ),
                FieldDefinition(
                    id="content_type",
                    label="Content Type",
                    widget=WidgetType.SELECT,
                    default="application/json",
                    options=[
                        {"value": "application/json", "label": "JSON"},
                        {"value": "application/x-www-form-urlencoded", "label": "Form"},
                        {"value": "text/plain", "label": "Text"},
                    ],
                    tab="General",
                    section="Request",
                ),

                # Auth tab
                FieldDefinition(
                    id="auth_type",
                    label="Auth Type",
                    widget=WidgetType.SELECT,
                    default="none",
                    options=[
                        {"value": "none", "label": "None"},
                        {"value": "api_key", "label": "API Key"},
                        {"value": "bearer", "label": "Bearer Token"},
                    ],
                    tab="Auth",
                ),
                FieldDefinition(
                    id="api_key",
                    label="API Key",
                    widget=WidgetType.TEXT_INPUT,
                    placeholder="Your API key",
                    tab="Auth",
                    section="API Key",
                    show_if={"auth_type": "api_key"},
                ),
                FieldDefinition(
                    id="api_key_header",
                    label="Header Name",
                    widget=WidgetType.TEXT_INPUT,
                    default="X-API-Key",
                    tab="Auth",
                    section="API Key",
                    show_if={"auth_type": "api_key"},
                ),
                FieldDefinition(
                    id="bearer_token",
                    label="Token",
                    widget=WidgetType.TEXT_INPUT,
                    placeholder="Bearer token",
                    tab="Auth",
                    section="Bearer Token",
                    show_if={"auth_type": "bearer"},
                ),

                # Advanced tab
                FieldDefinition(
                    id="timeout",
                    label="Timeout (seconds)",
                    widget=WidgetType.NUMBER_INPUT,
                    default=30,
                    min_value=1,
                    max_value=300,
                    tab="Advanced",
                    section="Timeouts",
                ),
                FieldDefinition(
                    id="max_retries",
                    label="Max Retries",
                    widget=WidgetType.SLIDER,
                    default=0,
                    min_value=0,
                    max_value=5,
                    step=1,
                    tab="Advanced",
                    section="Retry",
                ),
            ],
            color="#f59e0b",
            icon="Globe",
            default_width=320,
        )

    @classmethod
    def validate_config(cls, config: dict) -> list[str]:
        errors = []

        auth_type = config.get("auth_type", "none")
        if auth_type == "api_key" and not config.get("api_key"):
            errors.append("API key is required when using API Key auth")
        if auth_type == "bearer" and not config.get("bearer_token"):
            errors.append("Token is required when using Bearer auth")

        return errors

    async def run_process(
        self,
        inputs: dict[str, Any],
        config: dict[str, Any],
        context: ExecutionContext,
    ) -> dict[str, Any]:
        url = inputs.get("url", "")
        if not url:
            return {"response": None, "error": "URL is required"}

        method = config.get("method", "GET")
        timeout = config.get("timeout", 30)

        # Build headers
        headers = dict(inputs.get("headers", {}) or {})
        headers["Content-Type"] = config.get("content_type", "application/json")

        # Add auth headers
        auth_type = config.get("auth_type", "none")
        if auth_type == "api_key":
            header_name = config.get("api_key_header", "X-API-Key")
            headers[header_name] = config.get("api_key", "")
        elif auth_type == "bearer":
            headers["Authorization"] = f"Bearer {config.get('bearer_token', '')}"

        # Make request
        await context.emit({
            "type": "progress",
            "message": f"Making {method} request...",
        })

        try:
            async with aiohttp.ClientSession() as session:
                async with session.request(
                    method=method,
                    url=url,
                    headers=headers,
                    json=inputs.get("body") if method != "GET" else None,
                    timeout=aiohttp.ClientTimeout(total=timeout),
                ) as resp:
                    data = await resp.json()
                    return {
                        "response": {
                            "status": resp.status,
                            "data": data,
                            "headers": dict(resp.headers),
                        },
                        "error": None,
                    }
        except Exception as e:
            return {"response": None, "error": str(e)}
```

### Key Points

- Uses tabs (`General`, `Auth`, `Advanced`) for organization
- Uses sections within tabs for grouping
- Conditional fields with `show_if`
- Manual input option for URL
- Separate success/error outputs with colors
- Config validation
- Progress emission
- Proper error handling

## Creating Your Own

1. **Start Simple**: Begin with the Uppercase example structure
2. **Add Complexity**: Gradually add tabs, sections, and validation
3. **Test Incrementally**: Reload extensions and test after each change
4. **Follow Patterns**: Use the API Client as a reference for complex nodes

## See Also

- [Extensions Overview](../README.md) - Getting started
- [FlowUnit API](../flowunit-api.md) - Base class reference
- [Best Practices](../best-practices.md) - Patterns and conventions
