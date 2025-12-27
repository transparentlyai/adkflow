"""
API Client Extension - Advanced Example
========================================

A comprehensive example demonstrating ALL capabilities of the custom node
system. Implements a configurable HTTP API client that showcases:

- Multiple input/output ports
- All widget types
- Conditional field visibility
- Custom state hashing for caching
- Configuration validation
- Lifecycle hooks
- Shared state between nodes
- Progress events
- Type-safe connections

To use this extension:
1. Copy this directory to your project's `adkflow_extensions/` directory
2. Reload extensions in ADKFlow
3. Find "API Client" in the "Advanced/HTTP" menu
"""

from api_client.nodes import APIClientNode, APIResponseParserNode

__all__ = ["APIClientNode", "APIResponseParserNode"]
