"""Loader for user-defined callbacks from file paths and inline code.

Loads Python files from CallbackConfig paths or inline code from connected
CallbackNodes and extracts callback functions.
"""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path
from typing import TYPE_CHECKING, Any

from adkflow_runner.codegen.callbacks import CallbackCodeGenerator
from adkflow_runner.logging import get_logger
from adkflow_runner.models import CallbackNode, CallbackType

if TYPE_CHECKING:
    from adkflow_runner.ir import CallbackConfig, CallbackSourceIR

_log = get_logger("runner.callbacks")


class UserCallbackLoader:
    """Loads user callback functions from file paths or inline code.

    Supports two sources for callbacks:
    1. File paths - loads Python modules and extracts callback functions
    2. Inline code - from connected CallbackNodes (takes precedence)

    Example callback file (before_model.py):
        def before_model_callback(callback_context, llm_request, agent_name):
            # Custom logic here
            return None  # or dict with action/modified_data

    Example usage:
        loader = UserCallbackLoader(project_path)
        callbacks = loader.load(agent_ir.callbacks)
        if callbacks:
            registry.register(UserCallbackHandler(callbacks))
    """

    # Mapping from CallbackConfig fields to expected function names
    CALLBACK_NAMES = {
        "before_agent": "before_agent_callback",
        "after_agent": "after_agent_callback",
        "before_model": "before_model_callback",
        "after_model": "after_model_callback",
        "before_tool": "before_tool_callback",
        "after_tool": "after_tool_callback",
    }

    # Mapping from callback type string to CallbackType enum
    CALLBACK_TYPE_MAP = {
        "before_agent": CallbackType.BEFORE_AGENT,
        "after_agent": CallbackType.AFTER_AGENT,
        "before_model": CallbackType.BEFORE_MODEL,
        "after_model": CallbackType.AFTER_MODEL,
        "before_tool": CallbackType.BEFORE_TOOL,
        "after_tool": CallbackType.AFTER_TOOL,
    }

    def __init__(self, project_path: Path | str):
        """Initialize the loader.

        Args:
            project_path: Base path for resolving relative file paths
        """
        self.project_path = Path(project_path)
        self._code_generator = CallbackCodeGenerator(self.project_path)

    def load(
        self, config: "CallbackConfig"
    ) -> tuple[dict[str, Any], dict[str, dict[str, str]]]:
        """Load callback functions from CallbackConfig.

        Callbacks can come from file paths or inline code (from connected
        CallbackNodes). Inline code takes precedence over file paths.

        Args:
            config: CallbackConfig with callback sources

        Returns:
            Tuple of:
                - Dict mapping callback names to loaded functions:
                    - before_agent_callback: fn(callback_context)
                    - after_agent_callback: fn(callback_context)
                    - before_model_callback: fn(callback_context, llm_request, agent_name)
                    - after_model_callback: fn(callback_context, llm_response, agent_name)
                    - before_tool_callback: fn(tool, args, tool_context, agent_name)
                    - after_tool_callback: fn(tool, args, tool_context, tool_response, agent_name)
                - Dict mapping callback names to metadata (for UI display):
                    - { "callback_name": {"name": "...", "type": "..."} }
        """
        callbacks: dict[str, Any] = {}
        metadata: dict[str, dict[str, str]] = {}

        for config_field, func_name in self.CALLBACK_NAMES.items():
            source: CallbackSourceIR | None = getattr(config, config_field, None)
            if not source or not source.has_value():
                continue

            callback = self._load_callback_source(source, config_field, func_name)
            if callback:
                callbacks[func_name] = callback
                # Store metadata for UI display
                metadata[func_name] = {
                    "name": source.source_node_name or config_field,
                    "type": config_field,
                }

        return callbacks, metadata

    def _load_callback_source(
        self,
        source: "CallbackSourceIR",
        callback_type: str,
        func_name: str,
    ) -> Any | None:
        """Load a callback from a CallbackSourceIR.

        Args:
            source: The callback source (inline code or file path)
            callback_type: The callback type (e.g., "before_model")
            func_name: Expected function name

        Returns:
            The callback function, or None if loading failed
        """
        # Inline code from connected CallbackNode takes precedence
        if source.code:
            return self._load_from_inline_code(source, callback_type)

        # Fall back to file path
        if source.file_path:
            return self._load_callback(source.file_path, func_name)

        return None

    def _load_from_inline_code(
        self,
        source: "CallbackSourceIR",
        callback_type: str,
    ) -> Any | None:
        """Load a callback from inline code.

        Args:
            source: The callback source with inline code
            callback_type: The callback type (e.g., "before_model")

        Returns:
            The callback function, or None if loading failed
        """
        callback_type_enum = self.CALLBACK_TYPE_MAP.get(callback_type)
        if not callback_type_enum:
            _log.warning(
                f"Unknown callback type: {callback_type}",
                callback_type=callback_type,
            )
            return None

        # Create a CallbackNode for the code generator
        callback_node = CallbackNode(
            id=source.source_node_id or f"inline_{callback_type}",
            name=callback_type,
            callback_type=callback_type_enum,
            code=source.code or "",
        )

        try:
            func = self._code_generator.load(callback_node)
            _log.debug(
                "Loaded callback from inline code",
                callback_type=callback_type,
                source_node_id=source.source_node_id,
            )
            return func
        except Exception as e:
            _log.error(
                f"Failed to load callback from inline code: {e}",
                callback_type=callback_type,
                source_node_id=source.source_node_id,
                exception=e,
            )
            return None

    def _load_callback(self, file_path: str, func_name: str) -> Any | None:
        """Load a single callback function from a file.

        Args:
            file_path: Path to the Python file (relative to project_path)
            func_name: Name of the function to extract

        Returns:
            The callback function, or None if loading failed
        """
        # Resolve path relative to project
        path = self._resolve_path(file_path)
        if not path.exists():
            _log.warning(
                f"Callback file not found: {path}",
                file_path=str(path),
                func_name=func_name,
            )
            return None

        try:
            module = self._load_module(path)
            callback = getattr(module, func_name, None)

            if callback is None:
                _log.warning(
                    f"Callback function '{func_name}' not found in {path}",
                    file_path=str(path),
                    func_name=func_name,
                )
                return None

            if not callable(callback):
                _log.warning(
                    f"'{func_name}' in {path} is not callable",
                    file_path=str(path),
                    func_name=func_name,
                )
                return None

            _log.debug(
                f"Loaded callback '{func_name}' from {path}",
                file_path=str(path),
                func_name=func_name,
            )
            return callback

        except Exception as e:
            _log.error(
                f"Failed to load callback from {path}: {e}",
                file_path=str(path),
                func_name=func_name,
                exception=e,
            )
            return None

    def _resolve_path(self, file_path: str) -> Path:
        """Resolve a file path relative to project root.

        Args:
            file_path: Absolute or relative path

        Returns:
            Resolved absolute path
        """
        path = Path(file_path)
        if path.is_absolute():
            return path
        return self.project_path / path

    def _load_module(self, path: Path) -> Any:
        """Dynamically load a Python module from file.

        Args:
            path: Path to the Python file

        Returns:
            Loaded module

        Raises:
            Exception: If module loading fails
        """
        # Create unique module name based on path
        module_name = f"_adkflow_user_callback_{path.stem}_{id(path)}"

        spec = importlib.util.spec_from_file_location(module_name, path)
        if spec is None or spec.loader is None:
            raise ImportError(f"Cannot load module spec from {path}")

        module = importlib.util.module_from_spec(spec)
        sys.modules[module_name] = module
        spec.loader.exec_module(module)

        return module
