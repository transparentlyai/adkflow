"""Module loading utilities for extension packages.

Provides functionality to load Python modules and discover FlowUnit classes
from extension package directories.
"""

import importlib.util
import sys
from pathlib import Path
from typing import TYPE_CHECKING, Any, Protocol

from adkflow_runner.extensions.flow_unit import FlowUnit
from adkflow_runner.extensions.types import ExtensionScope
from adkflow_runner.hooks.discovery import discover_hooks_from_module

if TYPE_CHECKING:
    from adkflow_runner.hooks.registry import HooksRegistry


class UnitRegistrar(Protocol):
    """Protocol for registering FlowUnit classes."""

    def register_unit(
        self, unit_cls: type[FlowUnit], file_path: Path, scope: ExtensionScope
    ) -> bool:
        """Register a FlowUnit and generate its schema."""
        ...


def load_extension_package(
    package_dir: Path,
    scope: ExtensionScope,
    registrar: UnitRegistrar,
    hooks_registry: "HooksRegistry",
    file_mtimes: dict[str, float],
    source_files: dict[str, Path],
    scopes: dict[str, ExtensionScope],
    units: dict[str, type[FlowUnit]],
    schemas: dict[str, dict[str, Any]],
    lock: Any,
) -> int:
    """Load an extension package and register its FlowUnits.

    Each extension package is a directory containing __init__.py.
    FlowUnit classes exported by the package are discovered and registered.

    Args:
        package_dir: Directory containing __init__.py
        scope: The scope to assign to units from this package
        registrar: Object with register_unit method for registering FlowUnits
        hooks_registry: Registry for discovered hooks
        file_mtimes: Dict tracking file modification times
        source_files: Dict mapping unit IDs to source paths
        scopes: Dict mapping unit IDs to scopes
        units: Dict mapping unit IDs to FlowUnit classes
        schemas: Dict mapping unit IDs to schemas
        lock: Thread lock for synchronization

    Returns:
        Number of units registered from this package
    """
    package_name = (
        f"adkflow_ext_{package_dir.name}_{hash(str(package_dir)) & 0xFFFFFF:06x}"
    )

    with lock:
        # Unregister existing units from this package
        if package_name in sys.modules:
            units_to_remove = [
                uid
                for uid, path in source_files.items()
                if path == package_dir
                or (
                    hasattr(path, "is_relative_to") and path.is_relative_to(package_dir)
                )
            ]
            for uid in units_to_remove:
                units.pop(uid, None)
                schemas.pop(uid, None)
                source_files.pop(uid, None)
                scopes.pop(uid, None)

            # Remove package and submodules from sys.modules
            modules_to_remove = [
                name
                for name in list(sys.modules.keys())
                if name == package_name or name.startswith(f"{package_name}.")
            ]
            for name in modules_to_remove:
                del sys.modules[name]

        try:
            # Add parent to path so internal imports work
            parent_path = str(package_dir.parent)
            if parent_path not in sys.path:
                sys.path.insert(0, parent_path)

            # Import the package
            spec = importlib.util.spec_from_file_location(
                package_name,
                package_dir / "__init__.py",
                submodule_search_locations=[str(package_dir)],
            )
            if spec is None or spec.loader is None:
                return 0

            module = importlib.util.module_from_spec(spec)
            sys.modules[package_name] = module
            spec.loader.exec_module(module)

        except Exception as e:
            print(f"[ExtensionRegistry] Failed to load package {package_dir.name}: {e}")
            return 0

        # Find FlowUnit subclasses in the module's namespace
        count = 0
        for attr_name in dir(module):
            attr = getattr(module, attr_name)
            if (
                isinstance(attr, type)
                and issubclass(attr, FlowUnit)
                and attr is not FlowUnit
                and hasattr(attr, "UNIT_ID")
                and hasattr(attr, "UI_LABEL")
                and hasattr(attr, "MENU_LOCATION")
            ):
                if registrar.register_unit(attr, package_dir, scope):
                    count += 1

        # Discover and register hooks from the extension module
        try:
            hooks_count = discover_hooks_from_module(module, hooks_registry)
            if hooks_count > 0:
                print(
                    f"[ExtensionRegistry] Registered {hooks_count} hooks from {package_dir.name}"
                )
        except Exception as e:
            print(
                f"[ExtensionRegistry] Failed to discover hooks from {package_dir.name}: {e}"
            )

        # Track package mtime (use latest mtime from any .py file)
        latest_mtime = 0.0
        for py_file in package_dir.rglob("*.py"):
            mtime = py_file.stat().st_mtime
            if mtime > latest_mtime:
                latest_mtime = mtime
        file_mtimes[str(package_dir)] = latest_mtime

        return count


def load_module_legacy(
    file_path: Path,
    scope: ExtensionScope,
    registrar: UnitRegistrar,
    file_mtimes: dict[str, float],
    source_files: dict[str, Path],
    scopes: dict[str, ExtensionScope],
    units: dict[str, type[FlowUnit]],
    schemas: dict[str, dict[str, Any]],
    lock: Any,
) -> int:
    """Load a Python module and register FlowUnits (legacy - kept for compatibility).

    Args:
        file_path: Path to Python file
        scope: The scope to assign to units from this file
        registrar: Object with register_unit method for registering FlowUnits
        file_mtimes: Dict tracking file modification times
        source_files: Dict mapping unit IDs to source paths
        scopes: Dict mapping unit IDs to scopes
        units: Dict mapping unit IDs to FlowUnit classes
        schemas: Dict mapping unit IDs to schemas
        lock: Thread lock for synchronization

    Returns:
        Number of units registered from this file
    """
    module_name = f"adkflow_ext_{file_path.stem}_{hash(str(file_path)) & 0xFFFFFF:06x}"

    with lock:
        # Remove old module if reloading
        if module_name in sys.modules:
            # Unregister units from this file
            units_to_remove = [
                uid for uid, path in source_files.items() if path == file_path
            ]
            for uid in units_to_remove:
                units.pop(uid, None)
                schemas.pop(uid, None)
                source_files.pop(uid, None)
                scopes.pop(uid, None)
            del sys.modules[module_name]

        try:
            spec = importlib.util.spec_from_file_location(module_name, file_path)
            if spec is None or spec.loader is None:
                return 0

            module = importlib.util.module_from_spec(spec)
            sys.modules[module_name] = module
            spec.loader.exec_module(module)
        except Exception as e:
            print(f"[ExtensionRegistry] Failed to load {file_path}: {e}")
            return 0

        # Find FlowUnit subclasses
        count = 0
        for attr_name in dir(module):
            attr = getattr(module, attr_name)
            if (
                isinstance(attr, type)
                and issubclass(attr, FlowUnit)
                and attr is not FlowUnit
                and hasattr(attr, "UNIT_ID")
                and hasattr(attr, "UI_LABEL")
                and hasattr(attr, "MENU_LOCATION")
            ):
                if registrar.register_unit(attr, file_path, scope):
                    count += 1

        # Track file mtime for hot-reload
        file_mtimes[str(file_path)] = file_path.stat().st_mtime

        return count
