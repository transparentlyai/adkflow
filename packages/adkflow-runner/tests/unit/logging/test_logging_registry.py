"""Tests for CategoryRegistry.

Tests category registration, hierarchy, and enable/disable.
"""

from __future__ import annotations

import pytest

from adkflow_runner.logging import (
    LogLevel,
    get_registry,
    reset_config,
    reset_loggers,
    reset_registry,
)


@pytest.fixture(autouse=True)
def reset_logging_state():
    """Reset logging state before each test."""
    reset_config()
    reset_loggers()
    reset_registry()
    yield
    reset_config()
    reset_loggers()
    reset_registry()


class TestCategoryRegistry:
    """Tests for category registry."""

    def test_get_registry(self):
        """Get the global registry."""
        registry = get_registry()
        assert registry is not None

    def test_category_hierarchy(self):
        """Categories follow hierarchical structure."""
        registry = get_registry()

        # Register parent and child
        registry.register("parent", LogLevel.WARNING)
        registry.register("parent.child", LogLevel.DEBUG)

        # Child should inherit from parent if not set
        # The registry should handle this


class TestCategoryRegistryAdvanced:
    """Advanced tests for CategoryRegistry."""

    def test_register_nested_category(self):
        """Register nested category creates parent nodes."""
        registry = get_registry()
        registry.register("a.b.c", LogLevel.DEBUG)

        node = registry.get("a.b.c")
        assert node is not None
        assert node.level == LogLevel.DEBUG

        # Parents should also exist
        parent = registry.get("a.b")
        assert parent is not None

    def test_register_updates_existing(self):
        """Register updates existing category level."""
        registry = get_registry()
        registry.register("update.test", LogLevel.INFO)
        registry.register("update.test", LogLevel.DEBUG)

        node = registry.get("update.test")
        assert node is not None
        assert node.level == LogLevel.DEBUG

    def test_get_nonexistent_category(self):
        """Get returns None for nonexistent category."""
        registry = get_registry()
        node = registry.get("does.not.exist")
        assert node is None

    def test_is_enabled_for_category(self):
        """Check if category is enabled for level."""
        registry = get_registry()
        registry.register("enabled.test", LogLevel.INFO, enabled=True)

        # Check enabled status with level
        result = registry.is_enabled("enabled.test", LogLevel.INFO)
        assert result is True

    def test_is_enabled_disabled_category(self):
        """Check if disabled category returns False."""
        registry = get_registry()
        registry.register("disabled.test", LogLevel.INFO, enabled=False)

        result = registry.is_enabled("disabled.test", LogLevel.INFO)
        assert result is False

    def test_set_level_by_pattern(self):
        """Set level for all categories matching pattern."""
        registry = get_registry()
        registry.register("api.auth")
        registry.register("api.users")
        registry.register("api.products")

        registry.set_level("api.*", LogLevel.DEBUG)

        # All api.* should have DEBUG
        assert registry.get_effective_level("api.auth") == LogLevel.DEBUG
        assert registry.get_effective_level("api.users") == LogLevel.DEBUG

    def test_get_effective_level_inherits(self):
        """Get effective level inherits from parent."""
        registry = get_registry()
        registry.register("parent", LogLevel.WARNING)
        registry.register("parent.child")  # No explicit level

        # Child should inherit parent's level
        level = registry.get_effective_level("parent.child")
        assert level == LogLevel.WARNING

    def test_clear_level_exact(self):
        """Clear level for exact category."""
        registry = get_registry()
        registry.register("cleartest", LogLevel.DEBUG)
        registry.clear_level("cleartest")

        node = registry.get("cleartest")
        assert node is not None
        assert node.level is None

    def test_clear_level_pattern(self):
        """Clear level for pattern."""
        registry = get_registry()
        registry.register("clearpat.a", LogLevel.DEBUG)
        registry.register("clearpat.b", LogLevel.DEBUG)
        registry.clear_level("clearpat.*")

        node_a = registry.get("clearpat.a")
        node_b = registry.get("clearpat.b")
        assert node_a.level is None  # type: ignore[union-attr]
        assert node_b.level is None  # type: ignore[union-attr]

    def test_set_enabled_exact(self):
        """Set enabled for exact category."""
        registry = get_registry()
        registry.register("enabletest", LogLevel.INFO)
        registry.set_enabled("enabletest", False)

        node = registry.get("enabletest")
        assert node.enabled is False  # type: ignore[union-attr]

    def test_set_enabled_pattern(self):
        """Set enabled for pattern."""
        registry = get_registry()
        registry.register("enablepat.a", LogLevel.INFO)
        registry.register("enablepat.b", LogLevel.INFO)
        registry.set_enabled("enablepat.*", False)

        node_a = registry.get("enablepat.a")
        node_b = registry.get("enablepat.b")
        assert node_a.enabled is False  # type: ignore[union-attr]
        assert node_b.enabled is False  # type: ignore[union-attr]

    def test_list_all(self):
        """List all registered categories."""
        registry = get_registry()
        registry.register("listone")
        registry.register("listtwo")

        all_cats = registry.list_all()
        assert "listone" in all_cats
        assert "listtwo" in all_cats

    def test_get_all_categories(self):
        """get_all_categories is alias for list_all."""
        registry = get_registry()
        registry.register("aliascat")

        all_list = registry.list_all()
        all_cats = registry.get_all_categories()
        assert all_list == all_cats

    def test_get_level_explicit(self):
        """Get explicit level for category."""
        registry = get_registry()
        registry.register("getlevel", LogLevel.ERROR)

        level = registry.get_level("getlevel")
        assert level == LogLevel.ERROR

    def test_get_level_none_if_inheriting(self):
        """Get level returns None if inheriting."""
        registry = get_registry()
        registry.register("inheritcat")

        level = registry.get_level("inheritcat")
        assert level is None

    def test_is_category_enabled_true(self):
        """Check category enabled status."""
        registry = get_registry()
        registry.register("isenabledcat", enabled=True)

        assert registry.is_category_enabled("isenabledcat") is True

    def test_is_category_enabled_false(self):
        """Check category disabled status."""
        registry = get_registry()
        registry.register("isdisabledcat", enabled=False)

        assert registry.is_category_enabled("isdisabledcat") is False

    def test_is_category_enabled_unknown(self):
        """Unknown categories are enabled by default."""
        registry = get_registry()

        # Don't register - should return True
        assert registry.is_category_enabled("totally.unknown.cat") is True

    def test_is_category_enabled_parent_disabled(self):
        """Child disabled if parent is disabled."""
        registry = get_registry()
        registry.register("disabledparent", enabled=False)
        registry.register("disabledparent.child", enabled=True)

        # Child should be disabled because parent is disabled
        assert registry.is_category_enabled("disabledparent.child") is False

    def test_get_children(self):
        """Get direct children of a category."""
        registry = get_registry()
        registry.register("parentcat")
        registry.register("parentcat.child1")
        registry.register("parentcat.child2")

        children = registry.get_children("parentcat")
        assert set(children) == {"child1", "child2"}

    def test_get_children_empty(self):
        """Get children of leaf category returns empty."""
        registry = get_registry()
        registry.register("leafcat")

        children = registry.get_children("leafcat")
        assert children == []

    def test_get_children_nonexistent(self):
        """Get children of nonexistent category returns empty."""
        registry = get_registry()

        children = registry.get_children("nonexistent")
        assert children == []

    def test_set_default_level(self):
        """Set default level for categories."""
        registry = get_registry()
        registry.set_default_level(LogLevel.ERROR)
        registry.register("defaultlevelcat")  # No explicit level

        # Should return the new default
        level = registry.get_effective_level("defaultlevelcat")
        assert level == LogLevel.ERROR

    def test_get_category_info(self):
        """Get detailed info about a category."""
        registry = get_registry()
        registry.register("infocat", LogLevel.WARNING)
        registry.register("infocat.child")

        info = registry.get_category_info("infocat")

        assert info["path"] == "infocat"
        assert info["name"] == "infocat"
        assert info["level"] == "WARNING"
        assert info["effective_level"] == "WARNING"
        assert info["enabled"] is True
        assert "child" in info["children"]

    def test_get_category_info_nonexistent(self):
        """Get info for nonexistent category returns empty."""
        registry = get_registry()

        info = registry.get_category_info("doesnotexist")
        assert info == {}

    def test_is_enabled_auto_registers(self):
        """is_enabled auto-registers unknown categories."""
        registry = get_registry()

        # Category doesn't exist yet
        assert registry.get("autoregcat") is None

        # is_enabled should auto-register
        result = registry.is_enabled("autoregcat", LogLevel.INFO)

        # Now it should exist
        assert registry.get("autoregcat") is not None
        assert result is True

    def test_is_enabled_parent_disabled(self):
        """is_enabled returns False if parent disabled."""
        registry = get_registry()
        registry.register("dispar", enabled=False)
        registry.register("dispar.child", enabled=True)

        result = registry.is_enabled("dispar.child", LogLevel.INFO)
        assert result is False

    def test_set_level_nonexistent_exact(self):
        """set_level registers category if it doesn't exist."""
        registry = get_registry()

        # Category doesn't exist
        assert registry.get("newlevelcat") is None

        registry.set_level("newlevelcat", LogLevel.DEBUG)

        # Now it should exist with the level
        node = registry.get("newlevelcat")
        assert node is not None
        assert node.level == LogLevel.DEBUG
