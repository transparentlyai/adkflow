"""Tests for hook decorator functionality."""

import pytest

from adkflow_runner.hooks.decorator import (
    HOOK_ATTR,
    hook,
    get_hooks_from_object,
    get_hooks_from_function,
)
from adkflow_runner.hooks.types import HookContext, HookResult


class TestHookDecorator:
    """Tests for @hook decorator."""

    def test_decorator_on_function(self):
        """Decorator can be applied to standalone function."""

        @hook("before_run")
        def my_hook(ctx: HookContext) -> HookResult:
            return HookResult.continue_()

        # Check decorator attached metadata
        assert hasattr(my_hook, HOOK_ATTR)
        specs = getattr(my_hook, HOOK_ATTR)
        assert len(specs) == 1
        assert specs[0].hook_name == "before_run"
        assert specs[0].handler == my_hook

    def test_decorator_on_async_function(self):
        """Decorator can be applied to async function."""

        @hook("after_run")
        async def my_hook(ctx: HookContext) -> HookResult:
            return HookResult.continue_()

        specs = getattr(my_hook, HOOK_ATTR)
        assert len(specs) == 1
        assert specs[0].hook_name == "after_run"

    def test_decorator_on_method(self):
        """Decorator can be applied to class method."""

        class MyExtension:
            @hook("before_tool_call")
            def rate_limit(self, ctx: HookContext) -> HookResult:
                return HookResult.continue_()

        # Check decorator attached to method
        assert hasattr(MyExtension.rate_limit, HOOK_ATTR)
        specs = getattr(MyExtension.rate_limit, HOOK_ATTR)
        assert len(specs) == 1
        assert specs[0].hook_name == "before_tool_call"

    def test_decorator_with_priority(self):
        """Decorator accepts priority parameter."""

        @hook("before_run", priority=100)
        def high_priority(ctx: HookContext) -> HookResult:
            return HookResult.continue_()

        specs = getattr(high_priority, HOOK_ATTR)
        assert specs[0].priority == 100

    def test_decorator_with_timeout(self):
        """Decorator accepts timeout parameter."""

        @hook("before_run", timeout=60.0)
        def slow_hook(ctx: HookContext) -> HookResult:
            return HookResult.continue_()

        specs = getattr(slow_hook, HOOK_ATTR)
        assert specs[0].timeout_seconds == 60.0

    def test_decorator_with_all_params(self):
        """Decorator accepts all parameters."""

        @hook("before_tool_call", priority=50, timeout=15.0)
        def my_hook(ctx: HookContext) -> HookResult:
            return HookResult.continue_()

        specs = getattr(my_hook, HOOK_ATTR)
        assert len(specs) == 1
        assert specs[0].hook_name == "before_tool_call"
        assert specs[0].priority == 50
        assert specs[0].timeout_seconds == 15.0

    def test_multiple_decorators_on_same_function(self):
        """Multiple @hook decorators can be applied to same function."""

        @hook("before_run")
        @hook("after_run")
        def multi_hook(ctx: HookContext) -> HookResult:
            return HookResult.continue_()

        specs = getattr(multi_hook, HOOK_ATTR)
        assert len(specs) == 2
        hook_names = {spec.hook_name for spec in specs}
        assert hook_names == {"before_run", "after_run"}

    def test_decorator_validates_hook_name(self):
        """Decorator validates hook name."""
        with pytest.raises(ValueError, match="Unknown hook name"):

            @hook("invalid_hook")
            def bad_hook(ctx: HookContext) -> HookResult:
                return HookResult.continue_()

    def test_decorator_preserves_function_name(self):
        """Decorator preserves original function name."""

        @hook("before_run")
        def my_custom_hook(ctx: HookContext) -> HookResult:
            return HookResult.continue_()

        assert my_custom_hook.__name__ == "my_custom_hook"

    def test_decorator_sets_method_name(self):
        """Decorator stores method name in spec."""

        @hook("before_run")
        def my_hook(ctx: HookContext) -> HookResult:
            return HookResult.continue_()

        specs = getattr(my_hook, HOOK_ATTR)
        assert specs[0].method_name == "my_hook"


class TestGetHooksFromObject:
    """Tests for get_hooks_from_object function."""

    def test_extract_from_class_instance(self):
        """Extract hooks from class instance."""

        class MyExtension:
            @hook("before_run")
            def on_run(self, ctx: HookContext) -> HookResult:
                return HookResult.continue_()

            @hook("after_run")
            async def after_run(self, ctx: HookContext) -> HookResult:
                return HookResult.continue_()

        instance = MyExtension()
        specs = get_hooks_from_object(instance)

        assert len(specs) == 2
        hook_names = {spec.hook_name for spec in specs}
        assert hook_names == {"before_run", "after_run"}

    def test_extract_from_class_with_extension_id(self):
        """Extract hooks from class with EXTENSION_ID attribute."""

        class MyExtension:
            EXTENSION_ID = "my-extension"

            @hook("before_run")
            def on_run(self, ctx: HookContext) -> HookResult:
                return HookResult.continue_()

        instance = MyExtension()
        specs = get_hooks_from_object(instance)

        assert len(specs) == 1
        assert specs[0].extension_id == "my-extension"

    def test_extract_uses_class_name_if_no_extension_id(self):
        """Use class name as extension_id if EXTENSION_ID not present."""

        class MyExtension:
            @hook("before_run")
            def on_run(self, ctx: HookContext) -> HookResult:
                return HookResult.continue_()

        instance = MyExtension()
        specs = get_hooks_from_object(instance)

        assert specs[0].extension_id == "MyExtension"

    def test_extract_binds_methods(self):
        """Extracted specs have bound methods as handlers."""

        class MyExtension:
            @hook("before_run")
            def on_run(self, ctx: HookContext) -> HookResult:
                return HookResult.continue_()

        instance = MyExtension()
        specs = get_hooks_from_object(instance)

        # Handler should be bound method
        assert specs[0].handler.__self__ is instance  # type: ignore[attr-defined]

    def test_extract_preserves_priority(self):
        """Extracted specs preserve priority from decorator."""

        class MyExtension:
            @hook("before_run", priority=100)
            def high_priority(self, ctx: HookContext) -> HookResult:
                return HookResult.continue_()

        instance = MyExtension()
        specs = get_hooks_from_object(instance)

        assert specs[0].priority == 100

    def test_extract_preserves_timeout(self):
        """Extracted specs preserve timeout from decorator."""

        class MyExtension:
            @hook("before_run", timeout=60.0)
            def slow_hook(self, ctx: HookContext) -> HookResult:
                return HookResult.continue_()

        instance = MyExtension()
        specs = get_hooks_from_object(instance)

        assert specs[0].timeout_seconds == 60.0

    def test_extract_preserves_method_name(self):
        """Extracted specs preserve method name."""

        class MyExtension:
            @hook("before_run")
            def my_custom_method(self, ctx: HookContext) -> HookResult:
                return HookResult.continue_()

        instance = MyExtension()
        specs = get_hooks_from_object(instance)

        assert specs[0].method_name == "my_custom_method"

    def test_extract_ignores_private_methods(self):
        """Private methods (starting with _) are ignored."""

        class MyExtension:
            @hook("before_run")
            def _private_hook(self, ctx: HookContext) -> HookResult:
                return HookResult.continue_()

            @hook("after_run")
            def public_hook(self, ctx: HookContext) -> HookResult:
                return HookResult.continue_()

        instance = MyExtension()
        specs = get_hooks_from_object(instance)

        # Should only get public_hook
        assert len(specs) == 1
        assert specs[0].method_name == "public_hook"

    def test_extract_handles_multiple_hooks_per_method(self):
        """Extract multiple hooks from single method."""

        class MyExtension:
            @hook("before_run")
            @hook("after_run")
            def multi_hook(self, ctx: HookContext) -> HookResult:
                return HookResult.continue_()

        instance = MyExtension()
        specs = get_hooks_from_object(instance)

        assert len(specs) == 2
        hook_names = {spec.hook_name for spec in specs}
        assert hook_names == {"before_run", "after_run"}

    def test_extract_from_empty_class(self):
        """Extract from class with no hooks returns empty list."""

        class EmptyExtension:
            def regular_method(self):
                pass

        instance = EmptyExtension()
        specs = get_hooks_from_object(instance)

        assert specs == []

    def test_extract_handles_attribute_errors(self):
        """Handle attributes that raise exceptions on access."""

        class ProblematicExtension:
            @hook("before_run")
            def good_hook(self, ctx: HookContext) -> HookResult:
                return HookResult.continue_()

            @property
            def broken_property(self):
                raise RuntimeError("Can't access this")

        instance = ProblematicExtension()
        specs = get_hooks_from_object(instance)

        # Should still get the good hook despite broken property
        assert len(specs) == 1
        assert specs[0].method_name == "good_hook"


class TestGetHooksFromFunction:
    """Tests for get_hooks_from_function function."""

    def test_extract_from_function(self):
        """Extract hooks from standalone function."""

        @hook("before_run")
        def my_hook(ctx: HookContext) -> HookResult:
            return HookResult.continue_()

        specs = get_hooks_from_function(my_hook)

        assert len(specs) == 1
        assert specs[0].hook_name == "before_run"
        assert specs[0].handler == my_hook

    def test_extract_uses_module_as_extension_id(self):
        """Use function's module as extension_id."""

        @hook("before_run")
        def my_hook(ctx: HookContext) -> HookResult:
            return HookResult.continue_()

        specs = get_hooks_from_function(my_hook)

        assert specs[0].extension_id == my_hook.__module__

    def test_extract_preserves_function_name(self):
        """Extracted spec preserves function name."""

        @hook("before_run")
        def my_custom_function(ctx: HookContext) -> HookResult:
            return HookResult.continue_()

        specs = get_hooks_from_function(my_custom_function)

        assert specs[0].method_name == "my_custom_function"

    def test_extract_preserves_priority(self):
        """Extracted spec preserves priority."""

        @hook("before_run", priority=50)
        def my_hook(ctx: HookContext) -> HookResult:
            return HookResult.continue_()

        specs = get_hooks_from_function(my_hook)

        assert specs[0].priority == 50

    def test_extract_preserves_timeout(self):
        """Extracted spec preserves timeout."""

        @hook("before_run", timeout=45.0)
        def my_hook(ctx: HookContext) -> HookResult:
            return HookResult.continue_()

        specs = get_hooks_from_function(my_hook)

        assert specs[0].timeout_seconds == 45.0

    def test_extract_multiple_hooks_from_function(self):
        """Extract multiple hooks from single function."""

        @hook("before_run")
        @hook("after_run")
        @hook("on_run_error")
        def multi_hook(ctx: HookContext) -> HookResult:
            return HookResult.continue_()

        specs = get_hooks_from_function(multi_hook)

        assert len(specs) == 3
        hook_names = {spec.hook_name for spec in specs}
        assert hook_names == {"before_run", "after_run", "on_run_error"}

    def test_extract_from_undecorated_function(self):
        """Extract from undecorated function returns empty list."""

        def regular_function(ctx: HookContext) -> HookResult:
            return HookResult.continue_()

        specs = get_hooks_from_function(regular_function)

        assert specs == []
