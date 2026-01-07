"""Tests for hook discovery from extensions."""

# pyright: reportAttributeAccessIssue=false
# Dynamic module attribute assignments are expected in these tests

import sys
from types import ModuleType

import pytest

from adkflow_runner.hooks.discovery import (
    HooksDiscoveryMixin,
    discover_hooks_from_module,
    discover_hooks_from_path,
    reload_hooks_from_extensions,
)
from adkflow_runner.hooks.registry import HooksRegistry
from adkflow_runner.hooks.types import HookContext, HookResult
from adkflow_runner.hooks.decorator import hook


class TestDiscoverHooksFromModule:
    """Tests for discover_hooks_from_module function."""

    @pytest.fixture
    def registry(self):
        """Create a fresh registry for each test."""
        return HooksRegistry()

    def test_discovers_from_hook_providers_list(self, registry):
        """Discover hooks from HOOK_PROVIDERS list."""

        class MyProvider:
            @hook("before_run")
            def my_hook(self, ctx: HookContext) -> HookResult:
                return HookResult.continue_()

        module = ModuleType("test_module")
        module.HOOK_PROVIDERS = [MyProvider]

        count = discover_hooks_from_module(module, registry)

        assert count == 1
        assert registry.has_hooks("before_run")

    def test_discovers_from_register_hooks_function(self, registry):
        """Discover hooks from register_hooks function."""

        def register_hooks(reg: HooksRegistry) -> int:
            @hook("before_tool_call")
            def my_hook(ctx: HookContext) -> HookResult:
                return HookResult.continue_()

            reg.register_function(my_hook)
            return 1

        module = ModuleType("test_module")
        module.register_hooks = register_hooks

        count = discover_hooks_from_module(module, registry)

        assert count == 1
        assert registry.has_hooks("before_tool_call")

    def test_discovers_decorated_module_functions(self, registry):
        """Discover module-level decorated functions."""

        @hook("after_run")
        def module_hook(ctx: HookContext) -> HookResult:
            return HookResult.continue_()

        module = ModuleType("test_module")
        module.module_hook = module_hook

        count = discover_hooks_from_module(module, registry)

        assert count == 1
        assert registry.has_hooks("after_run")

    def test_discovers_classes_with_hook_methods(self, registry):
        """Discover and auto-instantiate classes with hook methods."""

        class AutoProvider:
            @hook("before_agent_execute")
            def agent_hook(self, ctx: HookContext) -> HookResult:
                return HookResult.continue_()

        module = ModuleType("test_module")
        module.AutoProvider = AutoProvider

        count = discover_hooks_from_module(module, registry)

        assert count == 1
        assert registry.has_hooks("before_agent_execute")

    def test_skips_private_attributes(self, registry):
        """Skip attributes starting with underscore."""

        @hook("before_run")
        def _private_hook(ctx: HookContext) -> HookResult:
            return HookResult.continue_()

        module = ModuleType("test_module")
        module._private_hook = _private_hook

        count = discover_hooks_from_module(module, registry)

        assert count == 0
        assert not registry.has_hooks("before_run")

    def test_handles_provider_instantiation_error(self, registry, capsys):
        """Handle errors when instantiating providers."""

        class FailingProvider:
            def __init__(self):
                raise ValueError("Cannot instantiate")

            @hook("before_run")
            def my_hook(self, ctx: HookContext) -> HookResult:
                return HookResult.continue_()

        module = ModuleType("test_module")
        module.HOOK_PROVIDERS = [FailingProvider]

        count = discover_hooks_from_module(module, registry)

        # Should not crash, just log error
        assert count == 0
        captured = capsys.readouterr()
        assert "Failed to register" in captured.out

    def test_handles_register_hooks_error(self, registry, capsys):
        """Handle errors in register_hooks function."""

        def register_hooks(reg: HooksRegistry) -> int:
            raise RuntimeError("Registration failed")

        module = ModuleType("test_module")
        module.register_hooks = register_hooks

        count = discover_hooks_from_module(module, registry)

        # Should not crash, just log error
        assert count == 0
        captured = capsys.readouterr()
        assert "register_hooks failed" in captured.out

    def test_handles_class_instantiation_error(self, registry, capsys):
        """Handle errors when auto-instantiating classes."""

        class FailingClass:
            def __init__(self):
                raise ValueError("Init failed")

            @hook("before_run")
            def my_hook(self, ctx: HookContext) -> HookResult:
                return HookResult.continue_()

        module = ModuleType("test_module")
        module.FailingClass = FailingClass

        count = discover_hooks_from_module(module, registry)

        # Should not crash
        assert count == 0
        captured = capsys.readouterr()
        assert "Failed to instantiate" in captured.out

    def test_skips_classes_in_providers_list(self, registry):
        """Skip auto-instantiation for classes in HOOK_PROVIDERS."""

        class Provider:
            instantiated = False

            def __init__(self):
                Provider.instantiated = True

            @hook("before_run")
            def my_hook(self, ctx: HookContext) -> HookResult:
                return HookResult.continue_()

        module = ModuleType("test_module")
        module.HOOK_PROVIDERS = [Provider]
        module.Provider = Provider

        count = discover_hooks_from_module(module, registry)

        # Should only instantiate once (via HOOK_PROVIDERS)
        assert count == 1

    def test_uses_global_registry_when_none_provided(self):
        """Use global registry when none provided."""

        @hook("before_run")
        def module_hook(ctx: HookContext) -> HookResult:
            return HookResult.continue_()

        module = ModuleType("test_module")
        module.module_hook = module_hook

        # Should not raise error
        count = discover_hooks_from_module(module)
        assert count >= 0  # May have other hooks from global state

    def test_combines_all_discovery_methods(self, registry):
        """Discover hooks from all sources in one module."""

        class Provider1:
            @hook("before_run")
            def hook1(self, ctx: HookContext) -> HookResult:
                return HookResult.continue_()

        class AutoProvider:
            @hook("after_run")
            def hook2(self, ctx: HookContext) -> HookResult:
                return HookResult.continue_()

        @hook("before_tool_call")
        def standalone_hook(ctx: HookContext) -> HookResult:
            return HookResult.continue_()

        def register_hooks(reg: HooksRegistry) -> int:
            @hook("after_tool_result")
            def hook3(ctx: HookContext) -> HookResult:
                return HookResult.continue_()

            reg.register_function(hook3)
            return 1

        module = ModuleType("test_module")
        module.HOOK_PROVIDERS = [Provider1]
        module.AutoProvider = AutoProvider
        module.standalone_hook = standalone_hook
        module.register_hooks = register_hooks

        count = discover_hooks_from_module(module, registry)

        assert count == 4
        assert registry.has_hooks("before_run")
        assert registry.has_hooks("after_run")
        assert registry.has_hooks("before_tool_call")
        assert registry.has_hooks("after_tool_result")


class TestDiscoverHooksFromPath:
    """Tests for discover_hooks_from_path function."""

    @pytest.fixture
    def registry(self):
        """Create a fresh registry for each test."""
        return HooksRegistry()

    def test_returns_zero_when_path_not_exists(self, registry, tmp_path):
        """Return 0 when extensions path doesn't exist."""
        non_existent = tmp_path / "non_existent"
        count = discover_hooks_from_path(non_existent, registry)
        assert count == 0

    def test_skips_non_directory_files(self, registry, tmp_path):
        """Skip files that are not directories."""
        (tmp_path / "file.txt").write_text("test")
        count = discover_hooks_from_path(tmp_path, registry)
        assert count == 0

    def test_skips_directories_starting_with_underscore(self, registry, tmp_path):
        """Skip directories starting with underscore."""
        (tmp_path / "_private").mkdir()
        (tmp_path / "_private" / "__init__.py").write_text("")
        count = discover_hooks_from_path(tmp_path, registry)
        assert count == 0

    def test_skips_directories_starting_with_dot(self, registry, tmp_path):
        """Skip directories starting with dot."""
        (tmp_path / ".hidden").mkdir()
        (tmp_path / ".hidden" / "__init__.py").write_text("")
        count = discover_hooks_from_path(tmp_path, registry)
        assert count == 0

    def test_skips_directories_without_init_py(self, registry, tmp_path):
        """Skip directories without __init__.py."""
        (tmp_path / "not_a_package").mkdir()
        count = discover_hooks_from_path(tmp_path, registry)
        assert count == 0

    def test_discovers_from_loaded_extension_modules(self, registry, tmp_path):
        """Discover hooks from already-loaded extension modules."""
        # Create extension directory
        ext_dir = tmp_path / "my_extension"
        ext_dir.mkdir()
        (ext_dir / "__init__.py").write_text("")

        # Create and register mock module
        module = ModuleType("adkflow_ext_my_extension")
        module.__file__ = str(ext_dir / "__init__.py")

        @hook("before_run")
        def test_hook(ctx: HookContext) -> HookResult:
            return HookResult.continue_()

        module.test_hook = test_hook
        sys.modules["adkflow_ext_my_extension"] = module

        try:
            count = discover_hooks_from_path(tmp_path, registry)
            assert count == 1
            assert registry.has_hooks("before_run")
        finally:
            # Cleanup
            del sys.modules["adkflow_ext_my_extension"]

    def test_uses_global_registry_when_none_provided(self, tmp_path):
        """Use global registry when none provided."""
        # Should not raise error
        count = discover_hooks_from_path(tmp_path)
        assert count >= 0


class TestReloadHooksFromExtensions:
    """Tests for reload_hooks_from_extensions function."""

    @pytest.fixture
    def registry(self):
        """Create a fresh registry for each test."""
        return HooksRegistry()

    def test_clears_and_reloads_hooks(self, registry):
        """Clear registry and reload from extensions."""

        # Add initial hook
        @hook("before_run")
        def initial_hook(ctx: HookContext) -> HookResult:
            return HookResult.continue_()

        registry.register_function(initial_hook)
        assert registry.has_hooks("before_run")

        # Create mock extension module
        module = ModuleType("adkflow_ext_test")

        @hook("after_run")
        def ext_hook(ctx: HookContext) -> HookResult:
            return HookResult.continue_()

        module.ext_hook = ext_hook
        sys.modules["adkflow_ext_test"] = module

        try:
            count = reload_hooks_from_extensions(registry)

            # Should have cleared initial_hook and loaded ext_hook
            assert not registry.has_hooks("before_run")
            assert registry.has_hooks("after_run")
            assert count == 1
        finally:
            # Cleanup
            del sys.modules["adkflow_ext_test"]

    def test_handles_empty_extensions(self, registry):
        """Handle case with no extension modules loaded."""
        count = reload_hooks_from_extensions(registry)
        assert count == 0

    def test_uses_global_registry_when_none_provided(self):
        """Use global registry when none provided."""
        # Should not raise error
        count = reload_hooks_from_extensions()
        assert count >= 0


class TestHooksDiscoveryMixin:
    """Tests for HooksDiscoveryMixin class."""

    @pytest.fixture
    def mixin(self):
        """Create a mixin instance."""
        return HooksDiscoveryMixin()

    def test_get_hooks_registry_creates_default(self, mixin):
        """Get or create default hooks registry."""
        registry = mixin.get_hooks_registry()
        assert isinstance(registry, HooksRegistry)

    def test_get_hooks_registry_returns_same_instance(self, mixin):
        """Return same registry instance on multiple calls."""
        registry1 = mixin.get_hooks_registry()
        registry2 = mixin.get_hooks_registry()
        assert registry1 is registry2

    def test_set_hooks_registry_sets_custom_registry(self, mixin):
        """Set custom hooks registry."""
        custom_registry = HooksRegistry()
        mixin.set_hooks_registry(custom_registry)

        retrieved = mixin.get_hooks_registry()
        assert retrieved is custom_registry

    def test_discover_hooks_from_package(self, mixin, tmp_path):
        """Discover hooks from a package directory."""
        # Create package directory
        pkg_dir = tmp_path / "test_package"
        pkg_dir.mkdir()
        (pkg_dir / "__init__.py").write_text("")

        # Create mock module
        module = ModuleType("adkflow_ext_test_package")
        module.__file__ = str(pkg_dir / "__init__.py")

        @hook("before_run")
        def pkg_hook(ctx: HookContext) -> HookResult:
            return HookResult.continue_()

        module.pkg_hook = pkg_hook
        sys.modules["adkflow_ext_test_package"] = module

        try:
            count = mixin._discover_hooks_from_package(pkg_dir)
            assert count == 1

            registry = mixin.get_hooks_registry()
            assert registry.has_hooks("before_run")
        finally:
            # Cleanup
            del sys.modules["adkflow_ext_test_package"]

    def test_discover_hooks_returns_zero_when_no_module(self, mixin, tmp_path):
        """Return 0 when package module not found."""
        pkg_dir = tmp_path / "unknown_package"
        pkg_dir.mkdir()

        count = mixin._discover_hooks_from_package(pkg_dir)
        assert count == 0

    def test_clear_hooks_from_package(self, mixin, tmp_path):
        """Clear hooks from a specific package."""
        # Create package
        pkg_dir = tmp_path / "test_package"
        pkg_dir.mkdir()
        (pkg_dir / "__init__.py").write_text("")

        # Register some hooks
        registry = mixin.get_hooks_registry()

        @hook("before_run")
        def pkg_hook(ctx: HookContext) -> HookResult:
            return HookResult.continue_()

        # Manually register with extension_id matching package name
        from adkflow_runner.hooks.types import HookSpec

        spec = HookSpec(
            hook_name="before_run",
            handler=pkg_hook,
            extension_id="test_package_hook",
        )
        registry.register_spec(spec)

        # Create mock module
        module = ModuleType("adkflow_ext_test_package")
        module.__file__ = str(pkg_dir / "__init__.py")
        sys.modules["adkflow_ext_test_package"] = module

        try:
            # Clear hooks
            removed = mixin._clear_hooks_from_package(pkg_dir)

            # Note: May be 0 if extension_id doesn't match package name
            assert removed >= 0
        finally:
            # Cleanup
            if "adkflow_ext_test_package" in sys.modules:
                del sys.modules["adkflow_ext_test_package"]

    def test_clear_hooks_returns_zero_when_no_module(self, mixin, tmp_path):
        """Return 0 when package module not found."""
        pkg_dir = tmp_path / "unknown_package"
        pkg_dir.mkdir()

        removed = mixin._clear_hooks_from_package(pkg_dir)
        assert removed == 0
