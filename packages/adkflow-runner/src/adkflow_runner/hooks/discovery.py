"""Hook discovery from extensions.

This module integrates with the extension system to discover and register
hooks from extension packages.
"""

import sys
from pathlib import Path
from typing import Any

from adkflow_runner.hooks.registry import HooksRegistry, get_hooks_registry
from adkflow_runner.hooks.decorator import get_hooks_from_function


# Attribute name for hook provider classes in extension modules
HOOK_PROVIDER_ATTR = "HOOK_PROVIDERS"
REGISTER_HOOKS_FUNC = "register_hooks"


def discover_hooks_from_module(
    module: Any, registry: HooksRegistry | None = None
) -> int:
    """Discover and register hooks from an extension module.

    Looks for:
    1. HOOK_PROVIDERS attribute (list of classes to instantiate)
    2. register_hooks(registry) function
    3. Module-level functions with @hook decorator
    4. Classes with @hook decorated methods

    Args:
        module: Python module to scan for hooks
        registry: Registry to register hooks with (uses global if None)

    Returns:
        Number of hooks registered
    """
    registry = registry or get_hooks_registry()
    total_registered = 0

    # 1. Check for HOOK_PROVIDERS list
    providers = getattr(module, HOOK_PROVIDER_ATTR, None)
    if providers:
        for provider_cls in providers:
            try:
                instance = provider_cls()
                count = registry.register(instance)
                total_registered += count
            except Exception as e:
                print(f"[HooksDiscovery] Failed to register {provider_cls}: {e}")

    # 2. Check for register_hooks function
    register_fn = getattr(module, REGISTER_HOOKS_FUNC, None)
    if callable(register_fn):
        try:
            # Call the function with registry
            result = register_fn(registry)
            if isinstance(result, int):
                total_registered += result
        except Exception as e:
            print(f"[HooksDiscovery] register_hooks failed in {module}: {e}")

    # 3. Scan for module-level decorated functions
    for attr_name in dir(module):
        if attr_name.startswith("_"):
            continue
        try:
            attr = getattr(module, attr_name)
        except Exception:
            continue

        # Check for function with hooks
        if callable(attr) and not isinstance(attr, type):
            specs = get_hooks_from_function(attr)
            for spec in specs:
                registry.register_spec(spec)
                total_registered += 1

    # 4. Scan for classes with hook methods (auto-instantiate)
    for attr_name in dir(module):
        if attr_name.startswith("_"):
            continue
        try:
            attr = getattr(module, attr_name)
        except Exception:
            continue

        # Check for class (not in providers list) that has hook methods
        if isinstance(attr, type) and attr not in (providers or []):
            # Check if class has any @hook decorated methods
            has_hooks = False
            for method_name in dir(attr):
                if method_name.startswith("_"):
                    continue
                method = getattr(attr, method_name, None)
                if method and hasattr(method, "_adkflow_hooks"):
                    has_hooks = True
                    break

            if has_hooks:
                try:
                    instance = attr()
                    count = registry.register(instance)
                    total_registered += count
                except Exception as e:
                    print(f"[HooksDiscovery] Failed to instantiate {attr}: {e}")

    return total_registered


def discover_hooks_from_path(
    extensions_path: Path,
    registry: HooksRegistry | None = None,
) -> int:
    """Discover hooks from all extensions in a directory.

    Scans each extension package for hook providers.

    Args:
        extensions_path: Directory containing extension packages
        registry: Registry to register hooks with

    Returns:
        Total number of hooks registered
    """
    if not extensions_path.exists():
        return 0

    registry = registry or get_hooks_registry()
    total = 0

    for subdir in extensions_path.iterdir():
        if not subdir.is_dir():
            continue
        if subdir.name.startswith(("_", ".")):
            continue
        if not (subdir / "__init__.py").exists():
            continue

        # Try to find the module in sys.modules (already loaded by ExtensionRegistry)
        for module_name, module in list(sys.modules.items()):
            if module_name.startswith("adkflow_ext_") and module:
                # Check if this module's file is in our subdir
                module_file = getattr(module, "__file__", None)
                if module_file and Path(module_file).parent == subdir:
                    count = discover_hooks_from_module(module, registry)
                    total += count
                    break

    return total


def reload_hooks_from_extensions(registry: HooksRegistry | None = None) -> int:
    """Reload all hooks from currently loaded extensions.

    Clears the registry and re-discovers hooks from all loaded
    extension modules.

    Args:
        registry: Registry to reload (uses global if None)

    Returns:
        Number of hooks registered
    """
    registry = registry or get_hooks_registry()
    registry.clear()

    total = 0

    # Find all loaded extension modules
    for module_name, module in list(sys.modules.items()):
        if module_name.startswith("adkflow_ext_") and module:
            count = discover_hooks_from_module(module, registry)
            total += count

    return total


class HooksDiscoveryMixin:
    """Mixin for ExtensionRegistry to add hook discovery.

    Add this to ExtensionRegistry to enable automatic hook discovery
    when extensions are loaded.

    Example:
        class ExtensionRegistry(HooksDiscoveryMixin):
            def _load_extension_package(self, package_dir, scope):
                # ... load package ...
                # Then discover hooks
                self._discover_hooks_from_package(package_dir)
    """

    _hooks_registry: HooksRegistry | None = None

    def get_hooks_registry(self) -> HooksRegistry:
        """Get the hooks registry associated with this extension registry."""
        if self._hooks_registry is None:
            self._hooks_registry = get_hooks_registry()
        return self._hooks_registry

    def set_hooks_registry(self, registry: HooksRegistry) -> None:
        """Set a custom hooks registry."""
        self._hooks_registry = registry

    def _discover_hooks_from_package(self, package_dir: Path) -> int:
        """Discover hooks after loading an extension package.

        Should be called after _load_extension_package succeeds.

        Args:
            package_dir: Directory of the loaded package

        Returns:
            Number of hooks discovered
        """
        registry = self.get_hooks_registry()

        # Find the module for this package
        for module_name, module in list(sys.modules.items()):
            if module_name.startswith("adkflow_ext_") and module:
                module_file = getattr(module, "__file__", None)
                if module_file and Path(module_file).parent == package_dir:
                    return discover_hooks_from_module(module, registry)

        return 0

    def _clear_hooks_from_package(self, package_dir: Path) -> int:
        """Clear hooks from an extension package.

        Should be called before reloading or unloading a package.

        Args:
            package_dir: Directory of the package being unloaded

        Returns:
            Number of hooks removed
        """
        registry = self.get_hooks_registry()
        removed = 0

        # Try to find hooks from modules in this package
        for module_name, module in list(sys.modules.items()):
            if module_name.startswith("adkflow_ext_") and module:
                module_file = getattr(module, "__file__", None)
                if module_file and Path(module_file).parent == package_dir:
                    # Get all registered extensions from this module
                    for ext_id in list(registry.get_registered_extensions()):
                        if ext_id.startswith(package_dir.name):
                            removed += registry.unregister(ext_id)

        return removed
