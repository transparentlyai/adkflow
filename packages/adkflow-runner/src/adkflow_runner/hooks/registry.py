"""Registry for managing extension hooks."""

import threading
from collections import defaultdict
from typing import Any, Callable

from adkflow_runner.hooks.types import HookSpec, HOOK_NAMES, validate_hook_name
from adkflow_runner.hooks.decorator import (
    get_hooks_from_object,
    get_hooks_from_function,
)


class HooksRegistry:
    """Registry for extension hooks with priority-based ordering.

    Hooks are organized by hook name and sorted by priority (descending).
    Multiple extensions can register hooks for the same hook point.

    Thread-safe for concurrent registration and retrieval.

    Example:
        registry = HooksRegistry()

        # Register a class-based extension
        registry.register(MyExtension())

        # Register a standalone function
        registry.register_function(my_hook_function)

        # Get all hooks for a point
        hooks = registry.get_hooks("before_tool_call")
    """

    def __init__(self):
        # Map of hook_name -> list of HookSpec (sorted by priority descending)
        self._hooks: dict[str, list[HookSpec]] = defaultdict(list)
        self._lock = threading.RLock()
        # Track registered extensions to prevent duplicates
        self._registered_extensions: set[str] = set()

    def register(self, extension: Any) -> int:
        """Register all hooks from an extension instance.

        Scans the extension object for methods decorated with @hook
        and registers them.

        Args:
            extension: Extension instance with @hook decorated methods

        Returns:
            Number of hooks registered

        Raises:
            ValueError: If extension was already registered
        """
        extension_id = getattr(extension, "EXTENSION_ID", extension.__class__.__name__)

        with self._lock:
            if extension_id in self._registered_extensions:
                raise ValueError(f"Extension already registered: {extension_id}")

            specs = get_hooks_from_object(extension)
            for spec in specs:
                self._add_spec(spec)

            self._registered_extensions.add(extension_id)
            return len(specs)

    def register_function(self, func: Callable[..., Any]) -> int:
        """Register hooks from a standalone function.

        Args:
            func: Function decorated with @hook

        Returns:
            Number of hooks registered
        """
        specs = get_hooks_from_function(func)

        with self._lock:
            for spec in specs:
                self._add_spec(spec)

        return len(specs)

    def register_spec(self, spec: HookSpec) -> None:
        """Register a hook spec directly.

        Args:
            spec: Hook specification to register
        """
        validate_hook_name(spec.hook_name)

        with self._lock:
            self._add_spec(spec)

    def _add_spec(self, spec: HookSpec) -> None:
        """Add a spec and maintain priority ordering (must hold lock)."""
        hooks = self._hooks[spec.hook_name]

        # Find insertion point to maintain descending priority order
        insert_idx = 0
        for i, existing in enumerate(hooks):
            if spec.priority > existing.priority:
                insert_idx = i
                break
            insert_idx = i + 1

        hooks.insert(insert_idx, spec)

    def unregister(self, extension_id: str) -> int:
        """Unregister all hooks from an extension.

        Args:
            extension_id: ID of the extension to unregister

        Returns:
            Number of hooks removed
        """
        with self._lock:
            if extension_id not in self._registered_extensions:
                return 0

            removed = 0
            for hook_name in list(self._hooks.keys()):
                original_len = len(self._hooks[hook_name])
                self._hooks[hook_name] = [
                    spec
                    for spec in self._hooks[hook_name]
                    if spec.extension_id != extension_id
                ]
                removed += original_len - len(self._hooks[hook_name])

                # Clean up empty lists
                if not self._hooks[hook_name]:
                    del self._hooks[hook_name]

            self._registered_extensions.discard(extension_id)
            return removed

    def get_hooks(self, hook_name: str) -> list[HookSpec]:
        """Get all hooks for a hook point, sorted by priority.

        Args:
            hook_name: Name of the hook point

        Returns:
            List of HookSpec sorted by priority (highest first)
        """
        with self._lock:
            return list(self._hooks.get(hook_name, []))

    def has_hooks(self, hook_name: str) -> bool:
        """Check if any hooks are registered for a hook point.

        Args:
            hook_name: Name of the hook point

        Returns:
            True if at least one hook is registered
        """
        with self._lock:
            return bool(self._hooks.get(hook_name))

    def get_all_hook_names(self) -> set[str]:
        """Get all hook names that have registered handlers.

        Returns:
            Set of hook names with at least one handler
        """
        with self._lock:
            return set(self._hooks.keys())

    def get_registered_extensions(self) -> set[str]:
        """Get IDs of all registered extensions.

        Returns:
            Set of extension IDs
        """
        with self._lock:
            return set(self._registered_extensions)

    def clear(self) -> None:
        """Remove all registered hooks."""
        with self._lock:
            self._hooks.clear()
            self._registered_extensions.clear()

    def get_stats(self) -> dict[str, Any]:
        """Get statistics about registered hooks.

        Returns:
            Dict with hook counts and extension info
        """
        with self._lock:
            return {
                "total_hooks": sum(len(hooks) for hooks in self._hooks.values()),
                "hooks_by_name": {
                    name: len(hooks) for name, hooks in self._hooks.items()
                },
                "registered_extensions": list(self._registered_extensions),
                "available_hook_points": sorted(HOOK_NAMES),
            }


# Global singleton registry
_global_registry: HooksRegistry | None = None
_registry_lock = threading.Lock()


def get_hooks_registry() -> HooksRegistry:
    """Get the global hooks registry singleton.

    Returns:
        The global HooksRegistry instance
    """
    global _global_registry

    if _global_registry is None:
        with _registry_lock:
            if _global_registry is None:
                _global_registry = HooksRegistry()

    return _global_registry


def reset_hooks_registry() -> None:
    """Reset the global hooks registry (mainly for testing)."""
    global _global_registry

    with _registry_lock:
        if _global_registry is not None:
            _global_registry.clear()
        _global_registry = None
