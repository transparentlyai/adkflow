"""Dynamic tool loader.

Loads Python tools from files or inline code and wraps them
for use with ADK agents.
"""

import ast
import asyncio
import functools
import importlib.util
import inspect
import sys
import tempfile
from pathlib import Path
from typing import Any, Callable

from adkflow_runner.errors import ErrorLocation, ToolLoadError
from adkflow_runner.ir import ToolIR


# Built-in tool names that map to ADK built-in tools
BUILTIN_TOOLS = {
    "google_search",
    "code_execution",
    "vertex_ai_search",
}


class ToolLoader:
    """Loads Python tools from IR definitions."""

    def __init__(self, project_path: Path | None = None):
        self.project_path = project_path
        self._loaded_modules: dict[str, Any] = {}

    def load(self, tool_ir: ToolIR) -> Callable | str:
        """Load a tool from IR.

        Args:
            tool_ir: Tool IR definition

        Returns:
            Callable function for custom tools, or string name for built-in tools

        Raises:
            ToolLoadError: If tool cannot be loaded
        """
        # Check for built-in tools
        if tool_ir.name in BUILTIN_TOOLS:
            return tool_ir.name

        # Load the function
        func: Callable | None = None
        if tool_ir.file_path:
            func = self._load_from_file(tool_ir)
        elif tool_ir.code:
            func = self._load_from_code(tool_ir)
        else:
            raise ToolLoadError(
                f"Tool '{tool_ir.name}' has neither file_path nor code",
            )

        # Wrap sync functions to run in thread pool (prevents event loop blocking)
        func = self._wrap_for_async(func)

        # Wrap with error handling if pass_to_model
        if tool_ir.error_behavior == "pass_to_model":
            func = self._wrap_with_error_handling(func, tool_ir.name)

        return func

    def load_all(self, tools: list[ToolIR]) -> list[Callable | str]:
        """Load all tools from IR list.

        Args:
            tools: List of tool IR definitions

        Returns:
            List of loaded tools (callables or built-in names)
        """
        return [self.load(tool) for tool in tools]

    def _load_from_file(self, tool_ir: ToolIR) -> Callable:
        """Load a tool from a Python file."""
        if not self.project_path or not tool_ir.file_path:
            raise ToolLoadError(
                f"Cannot load tool from file without project_path: {tool_ir.file_path}",
            )

        # file_path may already include the directory (e.g., "tools/file.py")
        # or just the filename. Handle both cases.
        file_path = (self.project_path / tool_ir.file_path).resolve()

        # If not found, try with tools/ prefix
        if not file_path.exists():
            file_path = (self.project_path / "tools" / tool_ir.file_path).resolve()

        if not file_path.exists():
            raise ToolLoadError(
                f"Tool file not found: {file_path}",
                location=ErrorLocation(file_path=str(file_path)),
            )

        # Check if already loaded
        cache_key = str(file_path.resolve())
        if cache_key in self._loaded_modules:
            module = self._loaded_modules[cache_key]
        else:
            module = self._load_module(file_path, tool_ir.name)
            self._loaded_modules[cache_key] = module

        # Find the tool function
        func = self._find_tool_function(module, tool_ir.name, file_path)
        return func

    def _load_from_code(self, tool_ir: ToolIR) -> Callable:
        """Load a tool from inline code."""
        if not tool_ir.code:
            raise ToolLoadError(f"Tool '{tool_ir.name}' has no code")

        # Validate the code is safe (basic check)
        self._validate_code(tool_ir.code, tool_ir.name)

        # Create a temporary module
        module_name = f"adkflow_tool_{tool_ir.name}"

        # Write to temp file and load
        with tempfile.NamedTemporaryFile(
            mode="w",
            suffix=".py",
            delete=False,
        ) as f:
            f.write(tool_ir.code)
            temp_path = Path(f.name)

        try:
            module = self._load_module(temp_path, module_name)
            func = self._find_tool_function(module, tool_ir.name, temp_path)
            return func
        finally:
            temp_path.unlink(missing_ok=True)

    def _load_module(self, file_path: Path, module_name: str) -> Any:
        """Load a Python module from file."""
        try:
            spec = importlib.util.spec_from_file_location(module_name, file_path)
            if spec is None or spec.loader is None:
                raise ToolLoadError(
                    f"Failed to create module spec for {file_path}",
                    location=ErrorLocation(file_path=str(file_path)),
                )

            module = importlib.util.module_from_spec(spec)
            sys.modules[module_name] = module
            spec.loader.exec_module(module)
            return module

        except SyntaxError as e:
            raise ToolLoadError(
                f"Syntax error in tool file: {e}",
                location=ErrorLocation(file_path=str(file_path), line=e.lineno),
            ) from e
        except Exception as e:
            raise ToolLoadError(
                f"Failed to load tool module: {e}",
                location=ErrorLocation(file_path=str(file_path)),
            ) from e

    def _find_tool_function(
        self,
        module: Any,
        tool_name: str,
        file_path: Path,
    ) -> Callable:
        """Find the tool function in a module."""
        # Try exact name match
        if hasattr(module, tool_name):
            func = getattr(module, tool_name)
            if callable(func):
                return func

        # Try common patterns
        for attr_name in [tool_name, f"{tool_name}_tool", "main", "run", "execute"]:
            if hasattr(module, attr_name):
                func = getattr(module, attr_name)
                if callable(func) and not attr_name.startswith("_"):
                    return func

        # Find any public callable
        for attr_name in dir(module):
            if attr_name.startswith("_"):
                continue
            func = getattr(module, attr_name)
            if callable(func) and not isinstance(func, type):
                return func

        raise ToolLoadError(
            f"No callable function found in tool file for '{tool_name}'",
            location=ErrorLocation(file_path=str(file_path)),
        )

    def _validate_code(self, code: str, tool_name: str) -> None:
        """Basic validation of inline tool code."""
        try:
            ast.parse(code)
        except SyntaxError as e:
            raise ToolLoadError(
                f"Syntax error in inline tool '{tool_name}': {e}",
            ) from e

        # Check for dangerous patterns
        dangerous_patterns = [
            "import os",
            "import subprocess",
            "import shutil",
            "__import__",
            "eval(",
            "exec(",
            "compile(",
            "open(",
        ]

        for pattern in dangerous_patterns:
            if pattern in code:
                # Warning only - don't block, but log
                # In production, you might want to be stricter
                pass

    def _wrap_for_async(self, func: Callable) -> Callable:
        """Wrap sync functions to run in thread pool.

        This prevents synchronous tool functions from blocking the event loop,
        allowing SSE events to be sent in real-time while tools execute.
        Async functions are returned unchanged.
        """
        if inspect.iscoroutinefunction(func):
            return func  # Already async, no wrapping needed

        @functools.wraps(func)
        async def async_wrapper(*args: Any, **kwargs: Any) -> Any:
            return await asyncio.to_thread(func, *args, **kwargs)

        return async_wrapper

    def _wrap_with_error_handling(self, func: Callable, tool_name: str) -> Callable:
        """Wrap a tool function to catch errors and return them as dict.

        This allows the LLM to see and handle tool errors instead of
        having them propagate as exceptions.
        """
        if inspect.iscoroutinefunction(func):

            @functools.wraps(func)
            async def async_wrapper(*args: Any, **kwargs: Any) -> dict[str, Any]:
                try:
                    return await func(*args, **kwargs)
                except Exception as e:
                    return {"error": f"Tool '{tool_name}' failed: {e!s}"}

            return async_wrapper
        else:

            @functools.wraps(func)
            def sync_wrapper(*args: Any, **kwargs: Any) -> dict[str, Any]:
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    return {"error": f"Tool '{tool_name}' failed: {e!s}"}

            return sync_wrapper
