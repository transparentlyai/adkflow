"""Tool mapping and configuration for Google ADK integration.

This module maps tool name strings from workflow YAML files to actual Google ADK
tool instances. It provides a centralized way to configure and instantiate tools.
"""

import os
from typing import Any
from google.genai.types import Tool, GoogleSearch, CodeExecution


class ToolRegistry:
    """Registry for mapping tool names to ADK tool instances."""

    # Built-in Google ADK tools that don't require configuration
    BUILTIN_TOOLS = {
        "code_execution": CodeExecution,
        "google_search": GoogleSearch,
    }

    # Custom tool mappings (can be extended)
    CUSTOM_TOOLS = {}

    @classmethod
    def get_tool(cls, tool_name: str) -> Tool | None:
        """Get a single tool instance by name.

        Args:
            tool_name: Name of the tool to instantiate

        Returns:
            Tool instance or None if tool not found

        Raises:
            ValueError: If tool name is not recognized
        """
        # Check built-in tools
        if tool_name in cls.BUILTIN_TOOLS:
            tool_class = cls.BUILTIN_TOOLS[tool_name]
            return tool_class()

        # Check custom tools
        if tool_name in cls.CUSTOM_TOOLS:
            return cls.CUSTOM_TOOLS[tool_name]()

        raise ValueError(
            f"Unknown tool: {tool_name}. "
            f"Available tools: {', '.join(cls.list_available_tools())}"
        )

    @classmethod
    def get_tools(cls, tool_names: list[str]) -> list[Tool]:
        """Get multiple tool instances from a list of tool names.

        Args:
            tool_names: List of tool names to instantiate

        Returns:
            List of tool instances

        Raises:
            ValueError: If any tool name is not recognized
        """
        if not tool_names:
            return []

        tools = []
        for tool_name in tool_names:
            tool = cls.get_tool(tool_name)
            if tool:
                tools.append(tool)

        return tools

    @classmethod
    def list_available_tools(cls) -> list[str]:
        """List all available tool names.

        Returns:
            List of available tool names
        """
        return sorted(list(cls.BUILTIN_TOOLS.keys()) + list(cls.CUSTOM_TOOLS.keys()))

    @classmethod
    def register_custom_tool(cls, name: str, tool_factory: callable) -> None:
        """Register a custom tool.

        Args:
            name: Name of the tool
            tool_factory: Callable that returns a tool instance
        """
        cls.CUSTOM_TOOLS[name] = tool_factory

    @classmethod
    def get_tool_descriptions(cls) -> dict[str, str]:
        """Get descriptions of all available tools.

        Returns:
            Dictionary mapping tool names to descriptions
        """
        descriptions = {
            "code_execution": "Execute Python code in a sandboxed environment",
            "google_search": "Search the web using Google Search",
        }

        # Add custom tool descriptions if they have docstrings
        for name, factory in cls.CUSTOM_TOOLS.items():
            if factory.__doc__:
                descriptions[name] = factory.__doc__.strip().split("\n")[0]
            else:
                descriptions[name] = "Custom tool"

        return descriptions


def get_tools(tool_names: list[str]) -> list[Tool]:
    """Convenience function to get tools from the registry.

    Args:
        tool_names: List of tool names to instantiate

    Returns:
        List of tool instances

    Example:
        >>> tools = get_tools(["code_execution", "google_search"])
        >>> len(tools)
        2
    """
    return ToolRegistry.get_tools(tool_names)


def list_available_tools() -> list[str]:
    """Convenience function to list available tools.

    Returns:
        List of available tool names

    Example:
        >>> tools = list_available_tools()
        >>> "code_execution" in tools
        True
    """
    return ToolRegistry.list_available_tools()


def get_tool_descriptions() -> dict[str, str]:
    """Convenience function to get tool descriptions.

    Returns:
        Dictionary mapping tool names to descriptions

    Example:
        >>> descriptions = get_tool_descriptions()
        >>> "code_execution" in descriptions
        True
    """
    return ToolRegistry.get_tool_descriptions()
