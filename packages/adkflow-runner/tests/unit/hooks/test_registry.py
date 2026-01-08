"""Tests for hooks registry."""

import pytest

from adkflow_runner.hooks.decorator import hook
from adkflow_runner.hooks.registry import (
    HooksRegistry,
    get_hooks_registry,
    reset_hooks_registry,
)
from adkflow_runner.hooks.types import HookContext, HookResult, HookSpec


class TestHooksRegistry:
    """Tests for HooksRegistry class."""

    def test_creation(self):
        """Create HooksRegistry instance."""
        registry = HooksRegistry()
        assert registry is not None
        assert registry.get_registered_extensions() == set()

    def test_register_class_extension(self):
        """Register hooks from class-based extension."""

        class MyExtension:
            EXTENSION_ID = "my-extension"

            @hook("before_run")
            def on_run(self, ctx: HookContext) -> HookResult:
                return HookResult.continue_()

            @hook("after_run")
            async def after_run(self, ctx: HookContext) -> HookResult:
                return HookResult.continue_()

        registry = HooksRegistry()
        instance = MyExtension()
        count = registry.register(instance)

        assert count == 2
        assert "my-extension" in registry.get_registered_extensions()
        assert registry.has_hooks("before_run")
        assert registry.has_hooks("after_run")

    def test_register_uses_class_name_if_no_extension_id(self):
        """Use class name as extension ID if EXTENSION_ID not present."""

        class MyExtension:
            @hook("before_run")
            def on_run(self, ctx: HookContext) -> HookResult:
                return HookResult.continue_()

        registry = HooksRegistry()
        instance = MyExtension()
        registry.register(instance)

        assert "MyExtension" in registry.get_registered_extensions()

    def test_register_duplicate_extension_raises(self):
        """Registering same extension twice raises ValueError."""

        class MyExtension:
            EXTENSION_ID = "my-extension"

            @hook("before_run")
            def on_run(self, ctx: HookContext) -> HookResult:
                return HookResult.continue_()

        registry = HooksRegistry()
        instance = MyExtension()
        registry.register(instance)

        with pytest.raises(ValueError, match="already registered"):
            registry.register(instance)

    def test_register_function(self):
        """Register hooks from standalone function."""

        @hook("before_run")
        @hook("after_run")
        def my_hook(ctx: HookContext) -> HookResult:
            return HookResult.continue_()

        registry = HooksRegistry()
        count = registry.register_function(my_hook)

        assert count == 2
        assert registry.has_hooks("before_run")
        assert registry.has_hooks("after_run")

    def test_register_spec_directly(self):
        """Register HookSpec directly."""

        def handler(ctx: HookContext) -> HookResult:
            return HookResult.continue_()

        spec = HookSpec(
            hook_name="before_run",
            handler=handler,
            priority=100,
        )

        registry = HooksRegistry()
        registry.register_spec(spec)

        assert registry.has_hooks("before_run")
        hooks = registry.get_hooks("before_run")
        assert len(hooks) == 1
        assert hooks[0].priority == 100

    def test_register_spec_validates_hook_name(self):
        """Registering spec with invalid hook name raises ValueError."""

        def handler(ctx: HookContext) -> HookResult:
            return HookResult.continue_()

        spec = HookSpec(hook_name="invalid_hook", handler=handler)

        registry = HooksRegistry()
        with pytest.raises(ValueError, match="Unknown hook name"):
            registry.register_spec(spec)

    def test_get_hooks_returns_by_priority(self):
        """get_hooks returns hooks sorted by priority (highest first)."""

        @hook("before_run", priority=50)
        def medium_priority(ctx: HookContext) -> HookResult:
            return HookResult.continue_()

        @hook("before_run", priority=100)
        def high_priority(ctx: HookContext) -> HookResult:
            return HookResult.continue_()

        @hook("before_run", priority=10)
        def low_priority(ctx: HookContext) -> HookResult:
            return HookResult.continue_()

        registry = HooksRegistry()
        registry.register_function(high_priority)
        registry.register_function(medium_priority)
        registry.register_function(low_priority)

        hooks = registry.get_hooks("before_run")
        assert len(hooks) == 3
        assert hooks[0].priority == 100
        assert hooks[1].priority == 50
        assert hooks[2].priority == 10

    def test_get_hooks_empty(self):
        """get_hooks returns empty list if no hooks registered."""
        registry = HooksRegistry()
        hooks = registry.get_hooks("before_run")
        assert hooks == []

    def test_has_hooks_true(self):
        """has_hooks returns True when hooks are registered."""

        @hook("before_run")
        def my_hook(ctx: HookContext) -> HookResult:
            return HookResult.continue_()

        registry = HooksRegistry()
        registry.register_function(my_hook)

        assert registry.has_hooks("before_run") is True

    def test_has_hooks_false(self):
        """has_hooks returns False when no hooks registered."""
        registry = HooksRegistry()
        assert registry.has_hooks("before_run") is False

    def test_unregister_extension(self):
        """Unregister all hooks from an extension."""

        class MyExtension:
            EXTENSION_ID = "my-extension"

            @hook("before_run")
            def on_run(self, ctx: HookContext) -> HookResult:
                return HookResult.continue_()

            @hook("after_run")
            def after_run(self, ctx: HookContext) -> HookResult:
                return HookResult.continue_()

        registry = HooksRegistry()
        instance = MyExtension()
        registry.register(instance)

        count = registry.unregister("my-extension")

        assert count == 2
        assert "my-extension" not in registry.get_registered_extensions()
        assert not registry.has_hooks("before_run")
        assert not registry.has_hooks("after_run")

    def test_unregister_nonexistent_extension(self):
        """Unregistering nonexistent extension returns 0."""
        registry = HooksRegistry()
        count = registry.unregister("nonexistent")
        assert count == 0

    def test_unregister_removes_from_multiple_hook_points(self):
        """Unregistering removes hooks from all hook points."""

        class MyExtension:
            EXTENSION_ID = "my-extension"

            @hook("before_run")
            @hook("after_run")
            @hook("on_run_error")
            def multi_hook(self, ctx: HookContext) -> HookResult:
                return HookResult.continue_()

        registry = HooksRegistry()
        instance = MyExtension()
        registry.register(instance)

        # Verify hooks exist
        assert registry.has_hooks("before_run")
        assert registry.has_hooks("after_run")
        assert registry.has_hooks("on_run_error")

        # Unregister
        count = registry.unregister("my-extension")
        assert count == 3

        # Verify all removed
        assert not registry.has_hooks("before_run")
        assert not registry.has_hooks("after_run")
        assert not registry.has_hooks("on_run_error")

    def test_unregister_preserves_other_extensions(self):
        """Unregistering one extension preserves others."""

        class Extension1:
            EXTENSION_ID = "ext-1"

            @hook("before_run")
            def hook1(self, ctx: HookContext) -> HookResult:
                return HookResult.continue_()

        class Extension2:
            EXTENSION_ID = "ext-2"

            @hook("before_run")
            def hook2(self, ctx: HookContext) -> HookResult:
                return HookResult.continue_()

        registry = HooksRegistry()
        registry.register(Extension1())
        registry.register(Extension2())

        # Unregister ext-1
        registry.unregister("ext-1")

        # ext-2 should remain
        assert "ext-2" in registry.get_registered_extensions()
        assert registry.has_hooks("before_run")
        hooks = registry.get_hooks("before_run")
        assert len(hooks) == 1
        assert hooks[0].extension_id == "ext-2"

    def test_get_all_hook_names(self):
        """get_all_hook_names returns all hook points with handlers."""

        @hook("before_run")
        def hook1(ctx: HookContext) -> HookResult:
            return HookResult.continue_()

        @hook("after_run")
        def hook2(ctx: HookContext) -> HookResult:
            return HookResult.continue_()

        registry = HooksRegistry()
        registry.register_function(hook1)
        registry.register_function(hook2)

        hook_names = registry.get_all_hook_names()
        assert hook_names == {"before_run", "after_run"}

    def test_get_all_hook_names_empty(self):
        """get_all_hook_names returns empty set when no hooks."""
        registry = HooksRegistry()
        assert registry.get_all_hook_names() == set()

    def test_get_registered_extensions(self):
        """get_registered_extensions returns all extension IDs."""

        class Extension1:
            EXTENSION_ID = "ext-1"

            @hook("before_run")
            def hook1(self, ctx: HookContext) -> HookResult:
                return HookResult.continue_()

        class Extension2:
            EXTENSION_ID = "ext-2"

            @hook("after_run")
            def hook2(self, ctx: HookContext) -> HookResult:
                return HookResult.continue_()

        registry = HooksRegistry()
        registry.register(Extension1())
        registry.register(Extension2())

        extensions = registry.get_registered_extensions()
        assert extensions == {"ext-1", "ext-2"}

    def test_clear(self):
        """clear removes all hooks and extensions."""

        class MyExtension:
            EXTENSION_ID = "my-extension"

            @hook("before_run")
            def hook1(self, ctx: HookContext) -> HookResult:
                return HookResult.continue_()

        registry = HooksRegistry()
        registry.register(MyExtension())

        registry.clear()

        assert registry.get_registered_extensions() == set()
        assert registry.get_all_hook_names() == set()
        assert not registry.has_hooks("before_run")

    def test_get_stats(self):
        """get_stats returns registry statistics."""

        class MyExtension:
            EXTENSION_ID = "my-extension"

            @hook("before_run")
            @hook("after_run")
            def multi_hook(self, ctx: HookContext) -> HookResult:
                return HookResult.continue_()

            @hook("before_run")
            def another_hook(self, ctx: HookContext) -> HookResult:
                return HookResult.continue_()

        registry = HooksRegistry()
        registry.register(MyExtension())

        stats = registry.get_stats()

        assert stats["total_hooks"] == 3
        assert stats["hooks_by_name"]["before_run"] == 2
        assert stats["hooks_by_name"]["after_run"] == 1
        assert stats["registered_extensions"] == ["my-extension"]
        assert "available_hook_points" in stats
        assert "before_run" in stats["available_hook_points"]

    def test_thread_safety_registration(self):
        """Registry is thread-safe for concurrent registration."""
        import threading

        class Extension:
            def __init__(self, ext_id):
                self.EXTENSION_ID = ext_id

            @hook("before_run")
            def hook(self, ctx: HookContext) -> HookResult:
                return HookResult.continue_()

        registry = HooksRegistry()
        errors = []

        def register_extension(ext_id):
            try:
                registry.register(Extension(ext_id))
            except Exception as e:
                errors.append(e)

        threads = [
            threading.Thread(target=register_extension, args=(f"ext-{i}",))
            for i in range(10)
        ]

        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert len(errors) == 0
        assert len(registry.get_registered_extensions()) == 10

    def test_priority_ordering_maintained_across_operations(self):
        """Priority ordering is maintained across multiple operations."""

        @hook("before_run", priority=10)
        def hook1(ctx: HookContext) -> HookResult:
            return HookResult.continue_()

        @hook("before_run", priority=50)
        def hook2(ctx: HookContext) -> HookResult:
            return HookResult.continue_()

        registry = HooksRegistry()
        registry.register_function(hook1)
        registry.register_function(hook2)

        # Add another with priority 30
        @hook("before_run", priority=30)
        def hook3(ctx: HookContext) -> HookResult:
            return HookResult.continue_()

        registry.register_function(hook3)

        # Check ordering
        hooks = registry.get_hooks("before_run")
        assert hooks[0].priority == 50
        assert hooks[1].priority == 30
        assert hooks[2].priority == 10


class TestGetHooksRegistry:
    """Tests for get_hooks_registry singleton."""

    def test_returns_singleton(self):
        """get_hooks_registry returns same instance."""
        # Reset first to ensure clean state
        reset_hooks_registry()

        registry1 = get_hooks_registry()
        registry2 = get_hooks_registry()

        assert registry1 is registry2

    def test_singleton_persists_state(self):
        """Singleton persists state across calls."""
        reset_hooks_registry()

        @hook("before_run")
        def my_hook(ctx: HookContext) -> HookResult:
            return HookResult.continue_()

        registry1 = get_hooks_registry()
        registry1.register_function(my_hook)

        registry2 = get_hooks_registry()
        assert registry2.has_hooks("before_run")


class TestResetHooksRegistry:
    """Tests for reset_hooks_registry function."""

    def test_reset_clears_singleton(self):
        """reset_hooks_registry clears the singleton."""
        reset_hooks_registry()

        @hook("before_run")
        def my_hook(ctx: HookContext) -> HookResult:
            return HookResult.continue_()

        registry1 = get_hooks_registry()
        registry1.register_function(my_hook)

        reset_hooks_registry()

        registry2 = get_hooks_registry()
        assert not registry2.has_hooks("before_run")

    def test_reset_creates_new_instance(self):
        """reset_hooks_registry creates new instance on next access."""
        reset_hooks_registry()

        registry1 = get_hooks_registry()
        id1 = id(registry1)

        reset_hooks_registry()

        registry2 = get_hooks_registry()
        id2 = id(registry2)

        assert id1 != id2
