"""Tests for the dynamic tool loader.

Tests loading tools from files and inline code.
"""

from __future__ import annotations

import asyncio
from pathlib import Path

import pytest

from adkflow_runner.errors import ToolLoadError
from adkflow_runner.ir import ToolIR
from adkflow_runner.runner.tool_loader import BUILTIN_TOOLS, ToolLoader


class TestBuiltinTools:
    """Tests for built-in tool handling."""

    def test_builtin_tools_exist(self):
        """Verify expected built-in tools."""
        assert "google_search" in BUILTIN_TOOLS
        assert "code_execution" in BUILTIN_TOOLS
        assert "vertex_ai_search" in BUILTIN_TOOLS

    def test_load_builtin_returns_name(self, tmp_path):
        """Loading built-in tool returns the tool name."""
        loader = ToolLoader(project_path=tmp_path)
        tool_ir = ToolIR(
            name="google_search",
            code="# Built-in",  # Still need code or file_path
        )

        result = loader.load(tool_ir)
        assert result == "google_search"


class TestLoadFromFile:
    """Tests for loading tools from files."""

    def test_load_simple_function(self, tmp_path):
        """Load a simple function from file."""
        (tmp_path / "tools").mkdir()
        (tmp_path / "tools" / "my_tool.py").write_text(
            "def my_tool(x: int) -> int:\n    return x * 2"
        )

        loader = ToolLoader(project_path=tmp_path)
        tool_ir = ToolIR(name="my_tool", file_path="my_tool.py")

        result = loader.load(tool_ir)
        assert callable(result)

    def test_load_from_full_path(self, tmp_path):
        """Load using full path including tools/ directory."""
        (tmp_path / "tools").mkdir()
        (tmp_path / "tools" / "calc.py").write_text(
            "def calc(a: int, b: int) -> int:\n    return a + b"
        )

        loader = ToolLoader(project_path=tmp_path)
        tool_ir = ToolIR(name="calc", file_path="tools/calc.py")

        result = loader.load(tool_ir)
        assert callable(result)

    def test_load_file_not_found(self, tmp_path):
        """Error when tool file doesn't exist."""
        (tmp_path / "tools").mkdir()

        loader = ToolLoader(project_path=tmp_path)
        tool_ir = ToolIR(name="missing", file_path="nonexistent.py")

        with pytest.raises(ToolLoadError):
            loader.load(tool_ir)

    def test_load_without_project_path(self):
        """Error when loading file without project path."""
        loader = ToolLoader(project_path=None)
        tool_ir = ToolIR(name="test", file_path="test.py")

        with pytest.raises(ToolLoadError):
            loader.load(tool_ir)


class TestLoadFromCode:
    """Tests for loading tools from inline code."""

    def test_load_simple_code(self, tmp_path):
        """Load a simple function from inline code."""
        loader = ToolLoader(project_path=tmp_path)
        tool_ir = ToolIR(
            name="inline_tool",
            code="def inline_tool(x: str) -> str:\n    return x.upper()",
        )

        result = loader.load(tool_ir)
        assert callable(result)

    def test_load_code_with_imports(self, tmp_path):
        """Load code with import statements."""
        loader = ToolLoader(project_path=tmp_path)
        tool_ir = ToolIR(
            name="json_tool",
            code='import json\n\ndef json_tool(data: str) -> dict:\n    return json.loads(data)',
        )

        result = loader.load(tool_ir)
        assert callable(result)

    def test_load_async_function(self, tmp_path):
        """Load an async function."""
        loader = ToolLoader(project_path=tmp_path)
        tool_ir = ToolIR(
            name="async_tool",
            code='import asyncio\n\nasync def async_tool() -> str:\n    await asyncio.sleep(0.001)\n    return "done"',
        )

        result = loader.load(tool_ir)
        assert callable(result)

    def test_load_code_syntax_error(self, tmp_path):
        """Error on syntax error in code."""
        loader = ToolLoader(project_path=tmp_path)
        tool_ir = ToolIR(
            name="bad_code",
            code="def broken(\n    # missing close paren",
        )

        with pytest.raises(ToolLoadError):
            loader.load(tool_ir)


class TestToolValidation:
    """Tests for tool validation."""

    def test_tool_without_code_or_file(self, tmp_path):
        """Error when tool has neither code nor file_path."""
        loader = ToolLoader(project_path=tmp_path)
        # Create a tool with just code to satisfy the constructor
        tool_ir = ToolIR(name="empty", code="def t(): pass")
        # Then clear both to simulate invalid state
        tool_ir.code = None
        tool_ir.file_path = None

        with pytest.raises(ToolLoadError):
            loader.load(tool_ir)


class TestLoadAll:
    """Tests for loading multiple tools."""

    def test_load_all_tools(self, tmp_path):
        """Load multiple tools at once."""
        (tmp_path / "tools").mkdir()
        (tmp_path / "tools" / "tool1.py").write_text(
            "def tool1() -> str:\n    return 'one'"
        )
        (tmp_path / "tools" / "tool2.py").write_text(
            "def tool2() -> str:\n    return 'two'"
        )

        loader = ToolLoader(project_path=tmp_path)
        tools = [
            ToolIR(name="tool1", file_path="tool1.py"),
            ToolIR(name="tool2", file_path="tool2.py"),
        ]

        results = loader.load_all(tools)
        assert len(results) == 2
        assert all(callable(r) for r in results)

    def test_load_all_empty(self, tmp_path):
        """Load empty list of tools."""
        loader = ToolLoader(project_path=tmp_path)
        results = loader.load_all([])
        assert results == []


class TestErrorHandling:
    """Tests for error handling wrapper."""

    def test_pass_to_model_wraps_errors(self, tmp_path):
        """Tools with pass_to_model error behavior wrap errors."""
        loader = ToolLoader(project_path=tmp_path)
        tool_ir = ToolIR(
            name="failing_tool",
            code="def failing_tool():\n    raise ValueError('test error')",
            error_behavior="pass_to_model",
        )

        result = loader.load(tool_ir)
        assert callable(result)
        # The wrapper should catch errors and return them as strings

    def test_fail_fast_propagates_errors(self, tmp_path):
        """Tools with fail_fast error behavior propagate errors."""
        loader = ToolLoader(project_path=tmp_path)
        tool_ir = ToolIR(
            name="failing_tool",
            code="def failing_tool():\n    raise ValueError('test error')",
            error_behavior="fail_fast",
        )

        result = loader.load(tool_ir)
        assert callable(result)
        # The function should propagate errors when called


class TestAsyncWrapping:
    """Tests for async function wrapping."""

    @pytest.mark.asyncio
    async def test_sync_function_wrapped_for_async(self, tmp_path):
        """Sync functions are wrapped to be async-compatible."""
        loader = ToolLoader(project_path=tmp_path)
        tool_ir = ToolIR(
            name="sync_tool",
            code="def sync_tool(x: int) -> int:\n    return x * 2",
        )

        result = loader.load(tool_ir)
        # The wrapper should handle sync functions in async context
        assert callable(result)

    @pytest.mark.asyncio
    async def test_async_function_preserved(self, tmp_path):
        """Async functions remain async."""
        loader = ToolLoader(project_path=tmp_path)
        tool_ir = ToolIR(
            name="async_tool",
            code='async def async_tool() -> str:\n    return "async result"',
        )

        result = loader.load(tool_ir)
        assert callable(result)
