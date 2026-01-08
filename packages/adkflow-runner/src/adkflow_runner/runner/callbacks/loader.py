"""Loader for user-defined callbacks from file paths.

Loads Python files from CallbackConfig paths and extracts callback functions.
"""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path
from typing import TYPE_CHECKING, Any

from adkflow_runner.logging import get_logger

if TYPE_CHECKING:
    from adkflow_runner.ir import CallbackConfig

_log = get_logger("runner.callbacks")


class UserCallbackLoader:
    """Loads user callback functions from file paths.

    Loads Python modules from file paths specified in CallbackConfig and
    extracts callback functions. Each callback file should define a function
    with the expected name (e.g., before_model_callback).

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
        "before_model": "before_model_callback",
        "after_model": "after_model_callback",
        "before_tool": "before_tool_callback",
        "after_tool": "after_tool_callback",
    }

    def __init__(self, project_path: Path | str):
        """Initialize the loader.

        Args:
            project_path: Base path for resolving relative file paths
        """
        self.project_path = Path(project_path)

    def load(self, config: "CallbackConfig") -> dict[str, Any]:
        """Load callback functions from CallbackConfig file paths.

        Args:
            config: CallbackConfig with file paths

        Returns:
            Dict mapping callback names to loaded functions:
                - before_model_callback: fn(callback_context, llm_request, agent_name)
                - after_model_callback: fn(callback_context, llm_response, agent_name)
                - before_tool_callback: fn(tool, args, tool_context, agent_name)
                - after_tool_callback: fn(tool, args, tool_context, tool_response, agent_name)
        """
        callbacks: dict[str, Any] = {}

        for config_field, func_name in self.CALLBACK_NAMES.items():
            file_path = getattr(config, config_field, None)
            if not file_path:
                continue

            callback = self._load_callback(file_path, func_name)
            if callback:
                callbacks[func_name] = callback

        return callbacks

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
