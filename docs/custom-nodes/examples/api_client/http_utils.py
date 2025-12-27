"""HTTP utility functions for the API Client extension.

This module demonstrates how to organize helper functions in a separate
module within an extension package. The main node class imports from here.
"""

from typing import Any
import json
import base64
import asyncio


def build_headers(
    config: dict[str, Any], input_headers: dict[str, Any]
) -> dict[str, str]:
    """
    Build request headers from configuration and input.

    Args:
        config: Node configuration containing auth settings and custom headers
        input_headers: Headers passed as input from upstream nodes

    Returns:
        Combined headers dictionary
    """
    content_type = config.get("content_type", "application/json")

    headers = {
        "Content-Type": content_type,
        "User-Agent": "ADKFlow-APIClient/2.0",
    }

    # Add custom headers from config
    try:
        custom_headers = json.loads(config.get("custom_headers", "{}"))
        headers.update(custom_headers)
    except json.JSONDecodeError:
        pass

    # Add input headers
    if input_headers:
        headers.update(input_headers)

    # Add authentication headers
    auth_type = config.get("auth_type", "none")

    if auth_type == "api_key":
        header_name = config.get("api_key_header", "X-API-Key")
        headers[header_name] = config.get("api_key", "")
    elif auth_type == "bearer":
        headers["Authorization"] = f"Bearer {config.get('bearer_token', '')}"
    elif auth_type == "basic":
        credentials = (
            f"{config.get('basic_username', '')}:{config.get('basic_password', '')}"
        )
        encoded = base64.b64encode(credentials.encode()).decode()
        headers["Authorization"] = f"Basic {encoded}"

    return headers


async def make_http_request(
    method: str,
    url: str,
    headers: dict[str, str],
    body: Any,
    params: dict[str, Any],
    timeout: int,
    response_type: str,
) -> tuple[Any, int, dict[str, str]]:
    """
    Make an HTTP request.

    In a real implementation, this would use aiohttp or httpx.
    This is a simulation for demonstration purposes.

    Args:
        method: HTTP method (GET, POST, etc.)
        url: Target URL
        headers: Request headers
        body: Request body
        params: URL query parameters
        timeout: Request timeout in seconds
        response_type: Expected response type (json, text, binary)

    Returns:
        Tuple of (response_data, status_code, response_headers)
    """
    # Simulate network delay
    await asyncio.sleep(0.1)

    # Simulate error conditions based on URL
    if "error" in url.lower():
        raise Exception("Simulated network error")

    if "timeout" in url.lower():
        raise asyncio.TimeoutError()

    # Simulate successful response
    response_data = {
        "success": True,
        "url": url,
        "method": method,
        "message": "This is a simulated API response",
        "params": params,
        "headers_received": list(headers.keys()),
    }

    if body:
        response_data["body_received"] = True

    response_headers = {
        "Content-Type": "application/json",
        "X-Request-ID": "abc123",
    }

    return response_data, 200, response_headers
