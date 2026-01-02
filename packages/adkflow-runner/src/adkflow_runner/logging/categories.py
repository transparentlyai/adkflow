"""Category registry and hierarchy management for logging."""

from __future__ import annotations

import fnmatch
import threading
from dataclasses import dataclass, field

from adkflow_runner.logging.constants import (
    DEFAULT_CATEGORIES,
    DEFAULT_CATEGORY_LEVELS,
    NESTED_CATEGORIES,
    LogLevel,
)


@dataclass
class CategoryNode:
    """Node in the category hierarchy tree."""

    name: str
    full_path: str  # e.g., "compiler.loader"
    level: LogLevel | None = None  # None means inherit from parent
    enabled: bool = True
    children: dict[str, CategoryNode] = field(default_factory=dict)
    parent: CategoryNode | None = field(default=None, repr=False)


class CategoryRegistry:
    """Manages hierarchical category registration and lookup.

    Supports patterns like:
    - "compiler" - exact match
    - "compiler.loader" - nested match
    - "compiler.*" - wildcard for all children
    - "api.*" - enable all api subcategories
    """

    def __init__(self) -> None:
        self._root: dict[str, CategoryNode] = {}
        self._all_paths: set[str] = set()
        # Use RLock to allow reentrant locking (needed when is_enabled calls get_effective_level)
        self._lock = threading.RLock()
        self._default_level = LogLevel.INFO

    def register(
        self,
        category_path: str,
        level: LogLevel | None = None,
        enabled: bool = True,
    ) -> CategoryNode:
        """Register a category (e.g., 'compiler.loader').

        Creates parent categories if they don't exist.
        """
        with self._lock:
            parts = category_path.split(".")
            current_dict = self._root
            parent: CategoryNode | None = None
            current_path = ""

            node: CategoryNode | None = None
            for i, part in enumerate(parts):
                current_path = f"{current_path}.{part}" if current_path else part

                if part not in current_dict:
                    node = CategoryNode(
                        name=part,
                        full_path=current_path,
                        level=level if i == len(parts) - 1 else None,
                        enabled=enabled,
                        parent=parent,
                    )
                    current_dict[part] = node
                    self._all_paths.add(current_path)
                else:
                    node = current_dict[part]
                    # Update level if this is the target path
                    if i == len(parts) - 1 and level is not None:
                        node.level = level
                        node.enabled = enabled

                parent = node
                current_dict = node.children

            # node is guaranteed to be set after the loop
            assert node is not None
            return node

    def get(self, category_path: str) -> CategoryNode | None:
        """Get a category node by path."""
        with self._lock:
            return self._get_unlocked(category_path)

    def _get_unlocked(self, category_path: str) -> CategoryNode | None:
        """Get without lock (for internal use)."""
        parts = category_path.split(".")
        current_dict = self._root
        node: CategoryNode | None = None

        for part in parts:
            if part not in current_dict:
                return None
            node = current_dict[part]
            current_dict = node.children

        return node

    def set_level(self, category_pattern: str, level: LogLevel) -> None:
        """Set level for a category pattern (supports wildcards like 'api.*').

        Patterns:
        - "api" - exact match
        - "api.*" - all direct children of api
        - "api.**" - all descendants of api (recursive)
        """
        with self._lock:
            if "*" in category_pattern:
                # Wildcard pattern
                for path in list(self._all_paths):
                    if fnmatch.fnmatch(path, category_pattern):
                        node = self._get_unlocked(path)
                        if node:
                            node.level = level
            else:
                # Exact match - register if not exists
                node = self._get_unlocked(category_pattern)
                if node:
                    node.level = level
                else:
                    self.register(category_pattern, level=level)

    def clear_level(self, category_pattern: str) -> None:
        """Clear the explicit level for a category (revert to inheritance).

        Sets level to None so the category inherits from its parent.
        """
        with self._lock:
            if "*" in category_pattern:
                for path in list(self._all_paths):
                    if fnmatch.fnmatch(path, category_pattern):
                        node = self._get_unlocked(path)
                        if node:
                            node.level = None
            else:
                node = self._get_unlocked(category_pattern)
                if node:
                    node.level = None

    def set_enabled(self, category_pattern: str, enabled: bool) -> None:
        """Enable/disable a category pattern."""
        with self._lock:
            if "*" in category_pattern:
                for path in list(self._all_paths):
                    if fnmatch.fnmatch(path, category_pattern):
                        node = self._get_unlocked(path)
                        if node:
                            node.enabled = enabled
            else:
                node = self._get_unlocked(category_pattern)
                if node:
                    node.enabled = enabled

    def get_effective_level(self, category_path: str) -> LogLevel:
        """Get the effective level for a category (inherits from parent if not set)."""
        with self._lock:
            node = self._get_unlocked(category_path)
            if not node:
                return self._default_level

            # Walk up the tree to find an explicit level
            current: CategoryNode | None = node
            while current is not None:
                if current.level is not None:
                    return current.level
                current = current.parent

            return self._default_level

    def is_enabled(self, category_path: str, level: LogLevel) -> bool:
        """Check if logging is enabled for this category at this level.

        A category is enabled if:
        1. The category (or parent) is not explicitly disabled
        2. The message level >= effective category level
        """
        with self._lock:
            node = self._get_unlocked(category_path)

            # Auto-register unknown categories
            if not node:
                node = self.register(category_path)

            # Check if disabled
            current: CategoryNode | None = node
            while current is not None:
                if not current.enabled:
                    return False
                current = current.parent

            # Check level
            effective_level = self.get_effective_level(category_path)
            return level >= effective_level

    def list_all(self) -> list[str]:
        """Return all registered category paths sorted."""
        with self._lock:
            return sorted(self._all_paths)

    def get_all_categories(self) -> list[str]:
        """Return all registered category paths (alias for list_all)."""
        return self.list_all()

    def get_level(self, category_path: str) -> LogLevel | None:
        """Get the explicit level for a category (returns None if inheriting)."""
        with self._lock:
            node = self._get_unlocked(category_path)
            if not node:
                return None
            return node.level

    def is_category_enabled(self, category_path: str) -> bool:
        """Check if a category is enabled (regardless of level)."""
        with self._lock:
            node = self._get_unlocked(category_path)
            if not node:
                return True  # Unknown categories are enabled by default
            # Check if any parent is disabled
            current: CategoryNode | None = node
            while current is not None:
                if not current.enabled:
                    return False
                current = current.parent
            return True

    def get_children(self, category_path: str) -> list[str]:
        """Get direct children of a category."""
        with self._lock:
            node = self._get_unlocked(category_path)
            if not node:
                return []
            return list(node.children.keys())

    def set_default_level(self, level: LogLevel) -> None:
        """Set the default level for categories without explicit level."""
        self._default_level = level

    def get_category_info(self, category_path: str) -> dict:
        """Get detailed info about a category."""
        with self._lock:
            node = self._get_unlocked(category_path)
            if not node:
                return {}

            return {
                "path": node.full_path,
                "name": node.name,
                "level": node.level.name if node.level else None,
                "effective_level": self.get_effective_level(category_path).name,
                "enabled": node.enabled,
                "children": list(node.children.keys()),
            }


# Global registry singleton
_registry: CategoryRegistry | None = None
_registry_lock = threading.Lock()


def get_registry() -> CategoryRegistry:
    """Get or create the global category registry."""
    global _registry
    with _registry_lock:
        if _registry is None:
            _registry = CategoryRegistry()
            _initialize_default_categories(_registry)
        return _registry


def _initialize_default_categories(registry: CategoryRegistry) -> None:
    """Register default categories with their hierarchy."""
    # Register top-level and direct children
    for parent, children in DEFAULT_CATEGORIES.items():
        registry.register(parent)
        for child in children:
            registry.register(f"{parent}.{child}")

    # Register nested subcategories
    for parent, children in NESTED_CATEGORIES.items():
        for child in children:
            registry.register(f"{parent}.{child}")

    # Apply default levels
    for path, level in DEFAULT_CATEGORY_LEVELS.items():
        registry.set_level(path, level)


def reset_registry() -> None:
    """Reset the global registry (for testing)."""
    global _registry
    with _registry_lock:
        _registry = None
