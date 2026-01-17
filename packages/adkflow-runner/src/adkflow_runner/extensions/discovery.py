"""Extension discovery and initialization for custom FlowUnit nodes.

This module provides the singleton registry pattern and initialization
functions for the extension system. The actual registry implementation
is in registry.py.
"""

import threading
from pathlib import Path

from adkflow_runner.extensions.types import ExtensionScope
from adkflow_runner.extensions.registry import ExtensionRegistry

# Re-export for backwards compatibility
__all__ = [
    "ExtensionScope",
    "ExtensionRegistry",
    "SHIPPED_EXTENSIONS_PATH",
    "GLOBAL_EXTENSIONS_PATH",
    "get_registry",
    "init_registry",
    "init_shipped_extensions",
    "init_global_extensions",
    "init_project_extensions",
    "init_builtin_units",
    "clear_project_extensions",
]

# Global registry instance
_registry: ExtensionRegistry | None = None
_registry_lock = threading.Lock()

# Shipped extensions path (relative to project root)
# Path: packages/adkflow-runner/src/adkflow_runner/extensions/discovery.py
#       -> go up 6 levels to project root, then into extensions/
_THIS_FILE = Path(__file__).resolve()
_PROJECT_ROOT = _THIS_FILE.parent.parent.parent.parent.parent.parent
SHIPPED_EXTENSIONS_PATH = _PROJECT_ROOT / "extensions"

# Default global extensions path
GLOBAL_EXTENSIONS_PATH = Path.home() / ".adkflow" / "adkflow_extensions"


def get_registry() -> ExtensionRegistry:
    """Get or create the global extension registry."""
    global _registry
    with _registry_lock:
        if _registry is None:
            _registry = ExtensionRegistry()
        return _registry


def init_registry(extensions_path: Path, watch: bool = False) -> ExtensionRegistry:
    """Initialize the global registry with a path (legacy single-path).

    Args:
        extensions_path: Directory containing extension Python files
        watch: Whether to enable hot-reload file watching

    Returns:
        The initialized registry
    """
    registry = get_registry()
    registry.discover(extensions_path)
    if watch:
        registry.start_watching()
    return registry


def init_shipped_extensions() -> ExtensionRegistry:
    """Initialize shipped extensions at server startup.

    Shipped extensions are built-in extensions that ship with the application.
    They are loaded from the extensions/ directory at the project root and
    are always available. They have the lowest precedence and can be
    overridden by global or project extensions.

    Returns:
        The initialized registry
    """
    registry = get_registry()

    if SHIPPED_EXTENSIONS_PATH.exists():
        count = registry.discover_shipped(SHIPPED_EXTENSIONS_PATH)
        print(
            f"[ExtensionRegistry] Loaded {count} shipped extension(s) from {SHIPPED_EXTENSIONS_PATH}"
        )
    else:
        print(
            f"[ExtensionRegistry] Shipped extensions directory not found: {SHIPPED_EXTENSIONS_PATH}"
        )

    return registry


def init_global_extensions(watch: bool = True) -> ExtensionRegistry:
    """Initialize global extensions at server startup.

    Global extensions are loaded from ~/.adkflow/adkflow_extensions/
    and are available across all projects.

    Args:
        watch: Whether to enable hot-reload file watching

    Returns:
        The initialized registry
    """
    registry = get_registry()

    # Ensure global extensions directory exists
    GLOBAL_EXTENSIONS_PATH.mkdir(parents=True, exist_ok=True)

    count = registry.discover_global(GLOBAL_EXTENSIONS_PATH)
    print(
        f"[ExtensionRegistry] Loaded {count} global extension(s) from {GLOBAL_EXTENSIONS_PATH}"
    )

    if watch:
        registry.start_watching_global()

    return registry


def init_project_extensions(
    project_path: Path, watch: bool = True
) -> ExtensionRegistry:
    """Initialize project-level extensions when a project is opened.

    Project extensions are loaded from {project_path}/adkflow_extensions/
    and take precedence over global extensions with the same UNIT_ID.

    Args:
        project_path: Path to the project directory
        watch: Whether to enable hot-reload file watching

    Returns:
        The initialized registry
    """
    registry = get_registry()

    extensions_path = project_path / "adkflow_extensions"
    if extensions_path.exists():
        count = registry.discover_project(extensions_path)
        print(
            f"[ExtensionRegistry] Loaded {count} project extension(s) from {extensions_path}"
        )

        if watch:
            registry.start_watching_project()

    return registry


def clear_project_extensions() -> None:
    """Clear project-level extensions when switching projects."""
    registry = get_registry()
    registry.clear_project()
    print("[ExtensionRegistry] Cleared project extensions")


def init_builtin_units() -> int:
    """Register builtin FlowUnit nodes with the extension registry.

    Builtin units are core nodes that are always available, not loaded
    from extension directories. They are registered with GLOBAL scope
    and can be overridden by project-level extensions.

    Returns:
        Number of builtin units registered
    """
    from adkflow_runner.builtin_units import BUILTIN_UNITS

    registry = get_registry()
    count = registry.register_builtin_units(BUILTIN_UNITS)
    print(f"[ExtensionRegistry] Registered {count} builtin unit(s)")
    return count
