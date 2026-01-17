"""Callback code generation utilities.

Generates Python callback functions from CallbackNode definitions.
Follows the same patterns as tool_loader.py for error handling and code loading.
"""

from __future__ import annotations

import ast
import importlib.util
import inspect
import sys
import tempfile
from pathlib import Path
from typing import TYPE_CHECKING, Any, Callable

from adkflow_runner.errors import CompilationError, ErrorLocation
from adkflow_runner.models import CallbackNode, CallbackType

if TYPE_CHECKING:
    pass


class CallbackLoadError(CompilationError):
    """Error loading a callback from code or file."""

    pass


# Function signatures for each callback type
# These match the ADK callback system and frontend templates
CALLBACK_SIGNATURES: dict[CallbackType, str] = {
    CallbackType.BEFORE_AGENT: """async def callback(
    callback_context,
) -> "Optional[types.Content]":""",
    CallbackType.AFTER_AGENT: """async def callback(
    callback_context,
) -> "Optional[types.Content]":""",
    CallbackType.BEFORE_MODEL: """async def callback(
    callback_context: "CallbackContext",
    llm_request: "LlmRequest",
) -> "Optional[LlmResponse]":""",
    CallbackType.AFTER_MODEL: """async def callback(
    callback_context: "CallbackContext",
    llm_response: "LlmResponse",
) -> "LlmResponse":""",
    CallbackType.BEFORE_TOOL: """async def callback(
    tool: "BaseTool",
    args: dict,
    tool_context: "ToolContext",
) -> "Optional[dict]":""",
    CallbackType.AFTER_TOOL: """async def callback(
    tool: "BaseTool",
    args: dict,
    tool_context: "ToolContext",
    tool_response: dict,
) -> "Optional[dict]":""",
}

# Default implementations that return None or pass through
DEFAULT_RETURNS: dict[CallbackType, str] = {
    CallbackType.BEFORE_AGENT: "return None",
    CallbackType.AFTER_AGENT: "return None",
    CallbackType.BEFORE_MODEL: "return None",
    CallbackType.AFTER_MODEL: "return llm_response",
    CallbackType.BEFORE_TOOL: "return None",
    CallbackType.AFTER_TOOL: "return tool_response",
}


def generate_callback_code(callback_node: CallbackNode) -> str:
    """Generate complete callback Python code from a CallbackNode.

    If the CallbackNode already has code, validates and returns it.
    Otherwise, generates a default implementation with the correct signature.

    Args:
        callback_node: The CallbackNode to generate code for.

    Returns:
        Valid Python code string with the callback function.

    Raises:
        CallbackLoadError: If the code is invalid Python.

    Example:
        >>> node = CallbackNode(
        ...     id="cb1",
        ...     name="Log Start",
        ...     callback_type=CallbackType.BEFORE_AGENT,
        ...     code="",
        ... )
        >>> code = generate_callback_code(node)
        >>> # Returns valid Python with async def callback(callback_context): ...
    """
    if callback_node.code and callback_node.code.strip():
        # Validate existing code
        _validate_callback_code(callback_node.code, callback_node.name)
        return callback_node.code

    # Generate default implementation
    return _generate_default_code(callback_node.callback_type)


def _generate_default_code(callback_type: CallbackType) -> str:
    """Generate default callback code for a callback type.

    Args:
        callback_type: The type of callback to generate.

    Returns:
        Python code string with default implementation.
    """
    signature = CALLBACK_SIGNATURES[callback_type]
    default_return = DEFAULT_RETURNS[callback_type]

    return f'''{signature}
    """Auto-generated callback function."""
    {default_return}
'''


def _validate_callback_code(code: str, callback_name: str) -> None:
    """Validate callback code is syntactically correct Python.

    Args:
        code: The Python code to validate.
        callback_name: Name of the callback (for error messages).

    Raises:
        CallbackLoadError: If the code has syntax errors.
    """
    try:
        ast.parse(code)
    except SyntaxError as e:
        raise CallbackLoadError(
            f"Syntax error in callback '{callback_name}': {e}",
            location=ErrorLocation(line=e.lineno),
        ) from e


class CallbackCodeGenerator:
    """Generates and loads callback functions from CallbackNode definitions.

    Similar to ToolLoader, this class handles loading callbacks from inline code
    or file paths and provides proper error handling.

    Example:
        >>> generator = CallbackCodeGenerator(project_path=Path("/my/project"))
        >>> node = CallbackNode(
        ...     id="cb1",
        ...     name="LogCallback",
        ...     callback_type=CallbackType.BEFORE_AGENT,
        ...     code="async def callback(callback_context):\\n    print('Starting')\\n    return None",
        ... )
        >>> func = generator.load(node)
        >>> # func is now a callable async function
    """

    def __init__(self, project_path: Path | None = None):
        """Initialize the callback code generator.

        Args:
            project_path: Base path for resolving relative file paths.
        """
        self.project_path = project_path
        self._loaded_modules: dict[str, Any] = {}

    def load(self, callback_node: CallbackNode) -> Callable:
        """Load a callback function from a CallbackNode.

        The callback can be loaded from:
        1. Inline code (callback_node.code)
        2. A file path (if implemented in the future)

        Args:
            callback_node: The CallbackNode definition.

        Returns:
            The callback function (async or sync).

        Raises:
            CallbackLoadError: If the callback cannot be loaded.
        """
        if not callback_node.code or not callback_node.code.strip():
            raise CallbackLoadError(
                f"Callback '{callback_node.name}' has no code defined",
                location=ErrorLocation(node_name=callback_node.name),
            )

        return self._load_from_code(callback_node)

    def _load_from_code(self, callback_node: CallbackNode) -> Callable:
        """Load a callback function from inline code.

        Args:
            callback_node: The CallbackNode with inline code.

        Returns:
            The loaded callback function.

        Raises:
            CallbackLoadError: If the code cannot be loaded.
        """
        code = callback_node.code

        # Validate syntax first
        _validate_callback_code(code, callback_node.name)

        # Create a unique module name
        module_name = f"adkflow_callback_{callback_node.id.replace('-', '_')}"

        # Write to temp file and load
        with tempfile.NamedTemporaryFile(
            mode="w",
            suffix=".py",
            delete=False,
        ) as f:
            f.write(code)
            temp_path = Path(f.name)

        try:
            module = self._load_module(temp_path, module_name, callback_node.name)
            func = self._find_callback_function(module, callback_node.name, temp_path)
            return func
        finally:
            temp_path.unlink(missing_ok=True)

    def _load_module(
        self, file_path: Path, module_name: str, callback_name: str
    ) -> Any:
        """Load a Python module from file.

        Args:
            file_path: Path to the Python file.
            module_name: Unique module name.
            callback_name: Name of the callback (for error messages).

        Returns:
            The loaded module.

        Raises:
            CallbackLoadError: If the module cannot be loaded.
        """
        try:
            spec = importlib.util.spec_from_file_location(module_name, file_path)
            if spec is None or spec.loader is None:
                raise CallbackLoadError(
                    f"Failed to create module spec for callback '{callback_name}'",
                    location=ErrorLocation(file_path=str(file_path)),
                )

            module = importlib.util.module_from_spec(spec)
            sys.modules[module_name] = module
            spec.loader.exec_module(module)
            return module

        except SyntaxError as e:
            raise CallbackLoadError(
                f"Syntax error in callback '{callback_name}': {e}",
                location=ErrorLocation(file_path=str(file_path), line=e.lineno),
            ) from e
        except Exception as e:
            raise CallbackLoadError(
                f"Failed to load callback '{callback_name}': {e}",
                location=ErrorLocation(file_path=str(file_path)),
            ) from e

    def _find_callback_function(
        self,
        module: Any,
        callback_name: str,
        file_path: Path,
    ) -> Callable:
        """Find the callback function in a loaded module.

        Looks for functions named 'callback', or falls back to common patterns.

        Args:
            module: The loaded Python module.
            callback_name: Name of the callback (for error messages).
            file_path: Path to the source file (for error messages).

        Returns:
            The callback function.

        Raises:
            CallbackLoadError: If no callable function is found.
        """
        # Primary: look for 'callback' function
        if hasattr(module, "callback"):
            func = getattr(module, "callback")
            if callable(func):
                return func

        # Fallback: try common patterns
        for attr_name in ["main", "run", "execute", "handler"]:
            if hasattr(module, attr_name):
                func = getattr(module, attr_name)
                if callable(func) and not attr_name.startswith("_"):
                    return func

        # Last resort: find any public callable
        for attr_name in dir(module):
            if attr_name.startswith("_"):
                continue
            func = getattr(module, attr_name)
            if callable(func) and not isinstance(func, type):
                # Skip imported modules/classes
                if inspect.ismodule(func):
                    continue
                return func

        raise CallbackLoadError(
            f"No callable 'callback' function found in callback '{callback_name}'",
            location=ErrorLocation(file_path=str(file_path)),
        )

    def load_all(self, callback_nodes: list[CallbackNode]) -> dict[str, Callable]:
        """Load all callback functions from a list of CallbackNodes.

        Args:
            callback_nodes: List of CallbackNode definitions.

        Returns:
            Dict mapping callback node IDs to their loaded functions.

        Raises:
            CallbackLoadError: If any callback cannot be loaded.
        """
        return {node.id: self.load(node) for node in callback_nodes}
