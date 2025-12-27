"""Node definitions for the API Client extension.

This comprehensive example demonstrates ALL capabilities of the custom node
system including multiple ports, all widget types, conditional visibility,
validation, lifecycle hooks, and more.
"""

from typing import Any
import json
import hashlib
import asyncio

from adkflow_runner.extensions import (
    FlowUnit,
    UISchema,
    PortDefinition,
    FieldDefinition,
    WidgetType,
    ExecutionContext,
)

from api_client.http_utils import build_headers, make_http_request


class APIClientNode(FlowUnit):
    """
    Advanced HTTP API client node demonstrating all custom node capabilities.

    This node can:
    - Make HTTP requests to any API
    - Handle authentication (API key, Bearer token, Basic auth)
    - Parse JSON/text responses
    - Cache responses based on request hash
    - Retry failed requests with exponential backoff
    - Track request metrics in shared state
    """

    UNIT_ID = "advanced.api_client"
    UI_LABEL = "API Client"
    MENU_LOCATION = "Advanced/HTTP"
    DESCRIPTION = "Make HTTP API requests with full configuration options"
    VERSION = "2.0.0"

    @classmethod
    def setup_interface(cls) -> UISchema:
        return UISchema(
            inputs=[
                # Tab: General - Core request configuration
                # URL: Can be typed manually OR connected (connection_only=False)
                PortDefinition(
                    id="url",
                    label="URL",
                    source_type="*",
                    data_type="str",
                    accepted_sources=["*"],
                    accepted_types=["str"],
                    required=True,
                    tab="General",
                    connection_only=False,  # Allow manual input
                    widget=WidgetType.TEXT_INPUT,
                    placeholder="https://api.example.com/endpoint",
                ),
                # Body: Can be typed as JSON OR connected
                PortDefinition(
                    id="body",
                    label="Body",
                    source_type="*",
                    data_type="dict",
                    accepted_sources=["*"],
                    accepted_types=["dict", "str"],
                    required=False,
                    tab="General",
                    connection_only=False,
                    widget=WidgetType.TEXT_AREA,
                    default="{}",
                    placeholder='{"key": "value"}',
                ),
                # Params: Connection only (complex data)
                PortDefinition(
                    id="params",
                    label="Query Params",
                    source_type="*",
                    data_type="dict",
                    accepted_sources=["*"],
                    accepted_types=["dict"],
                    required=False,
                    tab="General",
                ),
                # Tab: Advanced - Headers input (connection only)
                PortDefinition(
                    id="headers",
                    label="Headers Input",
                    source_type="*",
                    data_type="dict",
                    accepted_sources=["*"],
                    accepted_types=["dict"],
                    required=False,
                    tab="Advanced",
                    section="Headers",
                    handle_color="#8b5cf6",  # Purple handle for headers
                ),
            ],
            outputs=[
                PortDefinition(
                    id="response",
                    label="Response",
                    source_type="api_client",
                    data_type="dict",
                    handle_color="#22c55e",  # Green for success data
                ),
                PortDefinition(
                    id="status_code",
                    label="Status",
                    source_type="api_client",
                    data_type="int",
                    handle_color="#3b82f6",  # Blue for status
                ),
                PortDefinition(
                    id="response_headers",
                    label="Headers",
                    source_type="api_client",
                    data_type="dict",
                    handle_color="#8b5cf6",  # Purple for headers
                ),
                PortDefinition(
                    id="error",
                    label="Error",
                    source_type="api_client",
                    data_type="str",
                    handle_color="#ef4444",  # Red for errors
                ),
            ],
            fields=[
                # === Tab: General ===
                FieldDefinition(
                    id="method",
                    label="HTTP Method",
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
                        {
                            "value": "application/x-www-form-urlencoded",
                            "label": "Form URL Encoded",
                        },
                        {"value": "multipart/form-data", "label": "Multipart Form"},
                        {"value": "text/plain", "label": "Plain Text"},
                    ],
                    tab="General",
                    section="Request",
                ),
                FieldDefinition(
                    id="response_type",
                    label="Response Type",
                    widget=WidgetType.SELECT,
                    default="json",
                    options=[
                        {"value": "json", "label": "JSON"},
                        {"value": "text", "label": "Text"},
                        {"value": "binary", "label": "Binary (base64)"},
                    ],
                    tab="General",
                    section="Response",
                ),
                # === Tab: Auth ===
                FieldDefinition(
                    id="auth_type",
                    label="Authentication Type",
                    widget=WidgetType.SELECT,
                    default="none",
                    options=[
                        {"value": "none", "label": "None"},
                        {"value": "api_key", "label": "API Key"},
                        {"value": "bearer", "label": "Bearer Token"},
                        {"value": "basic", "label": "Basic Auth"},
                    ],
                    tab="Auth",
                ),
                # API Key auth fields
                FieldDefinition(
                    id="api_key",
                    label="API Key",
                    widget=WidgetType.TEXT_INPUT,
                    placeholder="Enter your API key",
                    show_if={"auth_type": "api_key"},
                    tab="Auth",
                    section="API Key",
                ),
                FieldDefinition(
                    id="api_key_header",
                    label="Header Name",
                    widget=WidgetType.TEXT_INPUT,
                    default="X-API-Key",
                    help_text="Header name for the API key",
                    show_if={"auth_type": "api_key"},
                    tab="Auth",
                    section="API Key",
                ),
                # Bearer token auth fields
                FieldDefinition(
                    id="bearer_token",
                    label="Bearer Token",
                    widget=WidgetType.TEXT_INPUT,
                    placeholder="Enter Bearer token",
                    show_if={"auth_type": "bearer"},
                    tab="Auth",
                    section="Bearer Token",
                ),
                # Basic auth fields
                FieldDefinition(
                    id="basic_username",
                    label="Username",
                    widget=WidgetType.TEXT_INPUT,
                    placeholder="Username",
                    show_if={"auth_type": "basic"},
                    tab="Auth",
                    section="Basic Auth",
                ),
                FieldDefinition(
                    id="basic_password",
                    label="Password",
                    widget=WidgetType.TEXT_INPUT,
                    placeholder="Password",
                    show_if={"auth_type": "basic"},
                    tab="Auth",
                    section="Basic Auth",
                ),
                # === Tab: Advanced ===
                FieldDefinition(
                    id="timeout",
                    label="Timeout (seconds)",
                    widget=WidgetType.NUMBER_INPUT,
                    default=30,
                    min_value=1,
                    max_value=300,
                    step=1,
                    tab="Advanced",
                    section="Timeouts",
                ),
                FieldDefinition(
                    id="max_retries",
                    label="Max Retries",
                    widget=WidgetType.SLIDER,
                    default=3,
                    min_value=0,
                    max_value=10,
                    step=1,
                    help_text="Number of retry attempts on failure",
                    tab="Advanced",
                    section="Retry",
                ),
                FieldDefinition(
                    id="retry_delay",
                    label="Retry Delay (seconds)",
                    widget=WidgetType.SLIDER,
                    default=1.0,
                    min_value=0.5,
                    max_value=10.0,
                    step=0.5,
                    tab="Advanced",
                    section="Retry",
                ),
                FieldDefinition(
                    id="enable_cache",
                    label="Enable Response Caching",
                    widget=WidgetType.CHECKBOX,
                    default=True,
                    help_text="Cache responses for identical requests",
                    tab="Advanced",
                    section="Options",
                ),
                FieldDefinition(
                    id="verify_ssl",
                    label="Verify SSL Certificate",
                    widget=WidgetType.CHECKBOX,
                    default=True,
                    tab="Advanced",
                    section="Options",
                ),
                FieldDefinition(
                    id="follow_redirects",
                    label="Follow Redirects",
                    widget=WidgetType.CHECKBOX,
                    default=True,
                    tab="Advanced",
                    section="Options",
                ),
                FieldDefinition(
                    id="custom_headers",
                    label="Custom Headers (JSON)",
                    widget=WidgetType.TEXT_AREA,
                    default="{}",
                    placeholder='{"X-Custom-Header": "value"}',
                    help_text="Additional headers as JSON object",
                    tab="Advanced",
                    section="Headers",
                ),
            ],
            color="#f59e0b",
            icon="Globe",
            expandable=True,
            default_width=320,
            default_height=400,
        )

    @classmethod
    def validate_config(cls, config: dict[str, Any]) -> list[str]:
        """Validate configuration before execution."""
        errors = []

        auth_type = config.get("auth_type", "none")

        if auth_type == "api_key" and not config.get("api_key"):
            errors.append("API Key is required when using API Key authentication")

        if auth_type == "bearer" and not config.get("bearer_token"):
            errors.append("Bearer Token is required when using Bearer authentication")

        if auth_type == "basic":
            if not config.get("basic_username"):
                errors.append("Username is required for Basic authentication")
            if not config.get("basic_password"):
                errors.append("Password is required for Basic authentication")

        timeout = config.get("timeout", 30)
        if timeout < 1 or timeout > 300:
            errors.append("Timeout must be between 1 and 300 seconds")

        custom_headers = config.get("custom_headers", "{}")
        if custom_headers:
            try:
                parsed = json.loads(custom_headers)
                if not isinstance(parsed, dict):
                    errors.append("Custom headers must be a JSON object")
            except json.JSONDecodeError:
                errors.append("Custom headers must be valid JSON")

        return errors

    @classmethod
    def compute_state_hash(cls, inputs: dict[str, Any], config: dict[str, Any]) -> str:
        """Compute a hash for caching purposes."""
        if config.get("method", "GET") != "GET":
            import time

            return hashlib.sha256(str(time.time()).encode()).hexdigest()

        cache_data = {
            "url": inputs.get("url"),
            "params": inputs.get("params"),
            "method": config.get("method"),
            "auth_type": config.get("auth_type"),
            "headers": inputs.get("headers"),
        }

        cache_str = json.dumps(cache_data, sort_keys=True, default=str)
        return hashlib.sha256(cache_str.encode()).hexdigest()

    async def on_before_execute(self, context: ExecutionContext) -> None:
        """Called before run_process."""
        request_count = context.get_state("api_request_count", 0)
        context.set_state("api_request_count", request_count + 1)

        await context.emit(
            {
                "type": "info",
                "message": f"Starting API request #{request_count + 1}",
            }
        )

    async def on_after_execute(
        self, context: ExecutionContext, outputs: dict[str, Any]
    ) -> None:
        """Called after run_process completes."""
        stats = context.get_state("api_stats", {"success": 0, "failed": 0})

        if outputs.get("error"):
            stats["failed"] += 1
        else:
            stats["success"] += 1

        context.set_state("api_stats", stats)

        await context.emit(
            {
                "type": "info",
                "message": f"API stats: {stats['success']} success, {stats['failed']} failed",
            }
        )

    async def run_process(
        self,
        inputs: dict[str, Any],
        config: dict[str, Any],
        context: ExecutionContext,
    ) -> dict[str, Any]:
        """Execute the API request."""
        url = inputs.get("url", "")
        if not url:
            return self._error_response("URL is required")

        body = inputs.get("body")
        input_headers = inputs.get("headers", {})
        params = inputs.get("params", {})

        method = config.get("method", "GET")
        timeout = config.get("timeout", 30)
        max_retries = config.get("max_retries", 3)
        retry_delay = config.get("retry_delay", 1.0)
        response_type = config.get("response_type", "json")

        # Use helper function from http_utils
        headers = build_headers(config, input_headers)

        await context.emit(
            {
                "type": "progress",
                "message": f"Making {method} request to {url}",
                "percent": 10,
            }
        )

        last_error = None
        response_data = None
        status_code = None
        response_headers = {}

        for attempt in range(max_retries + 1):
            try:
                if attempt > 0:
                    await context.emit(
                        {
                            "type": "progress",
                            "message": f"Retry attempt {attempt}/{max_retries}",
                            "percent": 10 + (attempt * 20),
                        }
                    )
                    await asyncio.sleep(retry_delay * (2 ** (attempt - 1)))

                response_data, status_code, response_headers = await make_http_request(
                    method=method,
                    url=url,
                    headers=headers,
                    body=body,
                    params=params,
                    timeout=timeout,
                    response_type=response_type,
                )

                if 200 <= status_code < 300:
                    break

                if status_code >= 500:
                    last_error = f"Server error: {status_code}"
                    continue

                if 400 <= status_code < 500:
                    last_error = f"Client error: {status_code}"
                    break

            except asyncio.TimeoutError:
                last_error = f"Request timed out after {timeout}s"
            except Exception as e:
                last_error = str(e)

        await context.emit(
            {
                "type": "progress",
                "message": "Request complete",
                "percent": 100,
            }
        )

        if response_data is None and last_error:
            return {
                "response": None,
                "status_code": status_code or 0,
                "response_headers": response_headers,
                "error": last_error,
            }

        return {
            "response": response_data,
            "status_code": status_code,
            "response_headers": response_headers,
            "error": None,
        }

    def _error_response(self, error_message: str) -> dict[str, Any]:
        """Helper to create error response."""
        return {
            "response": None,
            "status_code": 0,
            "response_headers": {},
            "error": error_message,
        }


class APIResponseParserNode(FlowUnit):
    """
    Companion node that parses API responses.

    Demonstrates:
    - Accepting specific source types (only from api_client)
    - JSON path extraction
    - Type-safe connections
    """

    UNIT_ID = "advanced.api_response_parser"
    UI_LABEL = "Response Parser"
    MENU_LOCATION = "Advanced/HTTP"
    DESCRIPTION = "Parse and extract data from API responses"
    VERSION = "1.0.0"

    @classmethod
    def setup_interface(cls) -> UISchema:
        return UISchema(
            inputs=[
                PortDefinition(
                    id="response",
                    label="API Response",
                    source_type="api_client",
                    data_type="dict",
                    accepted_sources=["api_client"],
                    accepted_types=["dict"],
                ),
            ],
            outputs=[
                PortDefinition(
                    id="data",
                    label="Extracted Data",
                    source_type="response_parser",
                    data_type="any",
                ),
                PortDefinition(
                    id="success",
                    label="Success",
                    source_type="response_parser",
                    data_type="bool",
                ),
            ],
            fields=[
                FieldDefinition(
                    id="json_path",
                    label="JSON Path",
                    widget=WidgetType.TEXT_INPUT,
                    default="",
                    placeholder="e.g., data.items[0].name",
                    help_text="Dot notation path to extract (empty = full response)",
                ),
                FieldDefinition(
                    id="default_value",
                    label="Default Value",
                    widget=WidgetType.TEXT_INPUT,
                    default="",
                    help_text="Value to return if path not found",
                ),
            ],
            color="#10b981",
            icon="FileJson",
            default_width=280,
        )

    async def run_process(
        self,
        inputs: dict[str, Any],
        config: dict[str, Any],
        context: ExecutionContext,
    ) -> dict[str, Any]:
        response = inputs.get("response")

        if not response:
            return {"data": config.get("default_value", ""), "success": False}

        json_path = config.get("json_path", "").strip()

        if not json_path:
            return {"data": response, "success": True}

        try:
            data = self._extract_path(response, json_path)
            return {"data": data, "success": True}
        except (KeyError, IndexError, TypeError):
            return {"data": config.get("default_value", ""), "success": False}

    def _extract_path(self, obj: Any, path: str) -> Any:
        """Extract value using dot notation path."""
        parts = path.replace("[", ".").replace("]", "").split(".")

        current = obj
        for part in parts:
            if not part:
                continue
            if part.isdigit():
                current = current[int(part)]
            else:
                current = current[part]

        return current
