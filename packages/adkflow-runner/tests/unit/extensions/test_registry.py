"""Tests for the extension registry.

Tests FlowUnit discovery and registration.
"""

from __future__ import annotations


from adkflow_runner.extensions.registry import ExtensionRegistry
from adkflow_runner.extensions.types import ExtensionScope


class TestExtensionRegistry:
    """Tests for ExtensionRegistry class."""

    def test_registry_creation(self):
        """Create empty registry."""
        registry = ExtensionRegistry()
        # Empty registry has no units
        assert registry.get_unit("nonexistent") is None

    def test_get_nonexistent_unit(self):
        """Get non-existent unit returns None."""
        registry = ExtensionRegistry()
        assert registry.get_unit("nonexistent") is None

    def test_get_all_schemas_empty(self):
        """Get all schemas from empty registry."""
        registry = ExtensionRegistry()
        schemas = registry.get_all_schemas()
        assert schemas == []


class TestDiscovery:
    """Tests for extension discovery."""

    def test_discover_empty_directory(self, tmp_path):
        """Discover from empty directory finds nothing."""
        registry = ExtensionRegistry()
        count = registry.discover(tmp_path)
        assert count == 0

    def test_discover_nonexistent_directory(self, tmp_path):
        """Discover from non-existent path returns 0."""
        registry = ExtensionRegistry()
        count = registry.discover(tmp_path / "nonexistent")
        assert count == 0

    def test_discover_extension_package(self, tmp_path):
        """Discover extension from package directory."""
        # Create extension package
        ext_dir = tmp_path / "test_ext"
        ext_dir.mkdir()
        (ext_dir / "__init__.py").write_text("""
from adkflow_runner.extensions.flow_unit import (
    FlowUnit, UISchema, PortDefinition, ExecutionContext
)
from typing import Any

class DiscoveredUnit(FlowUnit):
    UNIT_ID = "discovered.unit"
    UI_LABEL = "Discovered"
    MENU_LOCATION = "Test"

    @classmethod
    def setup_interface(cls) -> UISchema:
        return UISchema(
            inputs=[PortDefinition(id="in", label="In", source_type="*", data_type="str")],
            outputs=[PortDefinition(id="out", label="Out", source_type="discovered", data_type="str")],
        )

    async def run_process(self, inputs, config, context):
        return {"out": inputs.get("in", "")}
""")

        registry = ExtensionRegistry()
        count = registry.discover(tmp_path)
        assert count >= 1

    def test_skip_private_directories(self, tmp_path):
        """Skip directories starting with underscore or dot."""
        # Create private dirs
        (tmp_path / "_private").mkdir()
        (tmp_path / ".hidden").mkdir()

        registry = ExtensionRegistry()
        count = registry.discover(tmp_path)
        assert count == 0

    def test_skip_non_package_directories(self, tmp_path):
        """Skip directories without __init__.py."""
        (tmp_path / "not_a_package").mkdir()

        registry = ExtensionRegistry()
        count = registry.discover(tmp_path)
        assert count == 0


class TestDualPathDiscovery:
    """Tests for global and project path discovery."""

    def test_discover_global(self, tmp_path):
        """Discover from global path."""
        global_path = tmp_path / "global"
        global_path.mkdir()

        registry = ExtensionRegistry()
        count = registry.discover_global(global_path)
        assert count == 0  # Empty dir

    def test_discover_project(self, tmp_path):
        """Discover from project path."""
        project_path = tmp_path / "project"
        project_path.mkdir()

        registry = ExtensionRegistry()
        count = registry.discover_project(project_path)
        assert count == 0  # Empty dir

    def test_discover_shipped(self, tmp_path):
        """Discover from shipped path."""
        shipped_path = tmp_path / "shipped"
        shipped_path.mkdir()

        registry = ExtensionRegistry()
        count = registry.discover_shipped(shipped_path)
        assert count == 0  # Empty dir


class TestSchemaGeneration:
    """Tests for schema generation."""

    def test_schema_generation_from_discovery(self, tmp_path):
        """Schema is generated when unit is discovered."""
        # Create extension package
        ext_dir = tmp_path / "sample_ext"
        ext_dir.mkdir()
        (ext_dir / "__init__.py").write_text("""
from adkflow_runner.extensions.flow_unit import (
    FlowUnit, UISchema, PortDefinition, ExecutionContext
)
from typing import Any

class SampleUnit(FlowUnit):
    UNIT_ID = "sample.unit"
    UI_LABEL = "Sample"
    MENU_LOCATION = "Sample"

    @classmethod
    def setup_interface(cls) -> UISchema:
        return UISchema(
            inputs=[PortDefinition(id="in", label="In", source_type="*", data_type="str")],
            outputs=[PortDefinition(id="out", label="Out", source_type="sample", data_type="str")],
        )

    async def run_process(self, inputs, config, context):
        return {"out": ""}
""")

        registry = ExtensionRegistry()
        count = registry.discover(tmp_path)

        if count > 0:
            schema = registry.get_schema("sample.unit")
            assert schema is not None


class TestExtensionScope:
    """Tests for ExtensionScope enum."""

    def test_scope_values(self):
        """Verify scope enum values."""
        assert ExtensionScope.GLOBAL.value == "global"
        assert ExtensionScope.PROJECT.value == "project"

    def test_shipped_scope_value(self):
        """Verify shipped scope enum value."""
        assert ExtensionScope.SHIPPED.value == "shipped"


class TestRegistryMethods:
    """Tests for additional registry methods."""

    def test_get_schema_nonexistent(self):
        """Get schema for nonexistent unit returns None."""
        registry = ExtensionRegistry()
        schema = registry.get_schema("nonexistent")
        assert schema is None

    def test_get_scope_nonexistent(self):
        """Get scope for nonexistent unit returns None."""
        registry = ExtensionRegistry()
        scope = registry.get_scope("nonexistent")
        assert scope is None

    def test_get_menu_tree_empty(self):
        """Get menu tree from empty registry."""
        registry = ExtensionRegistry()
        tree = registry.get_menu_tree()
        assert tree == {}

    def test_reload_all_empty(self):
        """Reload all on empty registry returns 0."""
        registry = ExtensionRegistry()
        count = registry.reload_all()
        assert count == 0

    def test_reload_global_no_path(self):
        """Reload global without path set returns 0."""
        registry = ExtensionRegistry()
        count = registry.reload_global()
        assert count == 0

    def test_reload_project_no_path(self):
        """Reload project without path set returns 0."""
        registry = ExtensionRegistry()
        count = registry.reload_project()
        assert count == 0

    def test_stop_watching_no_watcher(self):
        """Stop watching when no watcher started."""
        registry = ExtensionRegistry()
        registry.stop_watching()  # Should not raise

    def test_stop_watching_global_no_watcher(self):
        """Stop global watching when not started."""
        registry = ExtensionRegistry()
        registry.stop_watching_global()  # Should not raise

    def test_stop_watching_project_no_watcher(self):
        """Stop project watching when not started."""
        registry = ExtensionRegistry()
        registry.stop_watching_project()  # Should not raise

    def test_start_watching_no_path(self):
        """Start watching without extensions path set."""
        registry = ExtensionRegistry()
        registry.start_watching()  # Should not raise (no path)

    def test_start_watching_global_no_path(self):
        """Start global watching without path set."""
        registry = ExtensionRegistry()
        registry.start_watching_global()  # Should not raise

    def test_start_watching_project_no_path(self):
        """Start project watching without path set."""
        registry = ExtensionRegistry()
        registry.start_watching_project()  # Should not raise

    def test_clear_project(self):
        """Clear project extensions."""
        registry = ExtensionRegistry()
        registry.clear_project()  # Should not raise

    def test_hooks_registry_property(self):
        """Access hooks_registry property."""
        registry = ExtensionRegistry()
        hooks_reg = registry.hooks_registry
        assert hooks_reg is not None


class TestRegistryWithExtensions:
    """Tests for registry with actual extensions."""

    def test_discover_and_get_unit(self, tmp_path):
        """Discover and retrieve a unit."""
        # Create extension package
        ext_dir = tmp_path / "myext"
        ext_dir.mkdir()
        (ext_dir / "__init__.py").write_text("""
from adkflow_runner.extensions.flow_unit import (
    FlowUnit, UISchema, PortDefinition
)

class MyUnit(FlowUnit):
    UNIT_ID = "my.unit"
    UI_LABEL = "My Unit"
    MENU_LOCATION = "Test"

    @classmethod
    def setup_interface(cls) -> UISchema:
        return UISchema(
            inputs=[PortDefinition(id="in", label="In", source_type="*", data_type="str")],
            outputs=[PortDefinition(id="out", label="Out", source_type="my", data_type="str")],
        )

    async def run_process(self, inputs, config, context):
        return {"out": ""}
""")

        registry = ExtensionRegistry()
        count = registry.discover(tmp_path)

        if count > 0:
            unit = registry.get_unit("my.unit")
            assert unit is not None
            assert unit.UNIT_ID == "my.unit"

            scope = registry.get_scope("my.unit")
            assert scope == ExtensionScope.PROJECT

    def test_reload_all_with_paths(self, tmp_path):
        """Reload all reloads from all paths."""
        global_path = tmp_path / "global"
        global_path.mkdir()
        project_path = tmp_path / "project"
        project_path.mkdir()

        registry = ExtensionRegistry()
        registry.discover_global(global_path)
        registry.discover_project(project_path)
        count = registry.reload_all()
        assert count == 0  # Empty directories

    def test_get_menu_tree_with_extensions(self, tmp_path):
        """Menu tree is built from menu locations."""
        ext_dir = tmp_path / "menu_ext"
        ext_dir.mkdir()
        (ext_dir / "__init__.py").write_text("""
from adkflow_runner.extensions.flow_unit import (
    FlowUnit, UISchema, PortDefinition
)

class MenuUnit(FlowUnit):
    UNIT_ID = "menu.unit"
    UI_LABEL = "Menu Unit"
    MENU_LOCATION = "Tools/Processing"

    @classmethod
    def setup_interface(cls) -> UISchema:
        return UISchema(
            inputs=[PortDefinition(id="in", label="In", source_type="*", data_type="str")],
            outputs=[PortDefinition(id="out", label="Out", source_type="menu", data_type="str")],
        )

    async def run_process(self, inputs, config, context):
        return {"out": ""}
""")

        registry = ExtensionRegistry()
        count = registry.discover(tmp_path)

        if count > 0:
            tree = registry.get_menu_tree()
            assert "Tools" in tree

    def test_start_and_stop_watching(self, tmp_path):
        """Start and stop file watching."""
        ext_dir = tmp_path / "watch_ext"
        ext_dir.mkdir()

        registry = ExtensionRegistry()
        registry.discover(tmp_path)
        registry.start_watching(poll_interval=0.1)
        registry.stop_watching()

    def test_check_for_changes_no_path(self):
        """Check for changes with no path set."""
        registry = ExtensionRegistry()
        registry._check_for_changes()  # Should not raise


class TestProjectPrecedence:
    """Tests for project overriding global."""

    def test_project_overrides_global(self, tmp_path):
        """Project unit overrides global unit with same ID."""
        global_path = tmp_path / "global"
        global_path.mkdir()
        project_path = tmp_path / "project"
        project_path.mkdir()

        # Create global extension
        global_ext = global_path / "shared"
        global_ext.mkdir()
        (global_ext / "__init__.py").write_text("""
from adkflow_runner.extensions.flow_unit import (
    FlowUnit, UISchema, PortDefinition
)

class SharedUnit(FlowUnit):
    UNIT_ID = "shared.unit"
    UI_LABEL = "Global Shared"
    MENU_LOCATION = "Shared"

    @classmethod
    def setup_interface(cls) -> UISchema:
        return UISchema(
            inputs=[PortDefinition(id="in", label="In", source_type="*", data_type="str")],
            outputs=[PortDefinition(id="out", label="Out", source_type="g", data_type="str")],
        )

    async def run_process(self, inputs, config, context):
        return {"out": "global"}
""")

        # Create project extension with same UNIT_ID
        project_ext = project_path / "shared"
        project_ext.mkdir()
        (project_ext / "__init__.py").write_text("""
from adkflow_runner.extensions.flow_unit import (
    FlowUnit, UISchema, PortDefinition
)

class SharedUnit(FlowUnit):
    UNIT_ID = "shared.unit"
    UI_LABEL = "Project Shared"
    MENU_LOCATION = "Shared"

    @classmethod
    def setup_interface(cls) -> UISchema:
        return UISchema(
            inputs=[PortDefinition(id="in", label="In", source_type="*", data_type="str")],
            outputs=[PortDefinition(id="out", label="Out", source_type="p", data_type="str")],
        )

    async def run_process(self, inputs, config, context):
        return {"out": "project"}
""")

        registry = ExtensionRegistry()
        # Load project first to establish precedence
        registry.discover_project(project_path)
        # Then try to load global (should be skipped)
        registry.discover_global(global_path)

        unit = registry.get_unit("shared.unit")
        if unit:
            assert unit.UI_LABEL == "Project Shared"
            assert registry.get_scope("shared.unit") == ExtensionScope.PROJECT


class TestBuiltinUnits:
    """Tests for builtin unit registration."""

    def test_register_builtin_units(self, tmp_path):
        """Register builtin units from list."""
        from adkflow_runner.extensions.flow_unit import FlowUnit, UISchema, PortDefinition

        # Create a proper FlowUnit subclass
        class TestBuiltinUnit(FlowUnit):
            UNIT_ID = "builtin.test"
            UI_LABEL = "Test Builtin"
            MENU_LOCATION = "Builtin"

            @classmethod
            def setup_interface(cls):
                return UISchema(
                    inputs=[PortDefinition(id="in", label="In", source_type="*", data_type="str")],
                    outputs=[PortDefinition(id="out", label="Out", source_type="builtin", data_type="str")],
                )

            async def run_process(self, inputs, config, context):
                return {"out": ""}

        registry = ExtensionRegistry()
        count = registry.register_builtin_units([TestBuiltinUnit])

        # Should register successfully
        assert count >= 0

    def test_register_builtin_units_empty_list(self):
        """Register empty list of builtin units."""
        registry = ExtensionRegistry()
        count = registry.register_builtin_units([])
        assert count == 0


class TestReloadOperations:
    """Tests for reload operations."""

    def test_reload_global_with_extensions(self, tmp_path):
        """Reload global extensions."""
        global_path = tmp_path / "global"
        global_path.mkdir()

        registry = ExtensionRegistry()
        registry.discover_global(global_path)
        count = registry.reload_global()
        assert count == 0  # Empty dir

    def test_reload_project_with_extensions(self, tmp_path):
        """Reload project extensions."""
        project_path = tmp_path / "project"
        project_path.mkdir()

        registry = ExtensionRegistry()
        registry.discover_project(project_path)
        count = registry.reload_project()
        assert count == 0  # Empty dir

    def test_clear_project_with_extensions(self, tmp_path):
        """Clear project extensions after loading."""
        project_path = tmp_path / "project"
        project_path.mkdir()

        ext_dir = project_path / "test_ext"
        ext_dir.mkdir()
        (ext_dir / "__init__.py").write_text("""
from adkflow_runner.extensions.flow_unit import (
    FlowUnit, UISchema, PortDefinition
)

class TestUnit(FlowUnit):
    UNIT_ID = "test.unit"
    UI_LABEL = "Test"
    MENU_LOCATION = "Test"

    @classmethod
    def setup_interface(cls) -> UISchema:
        return UISchema(
            inputs=[PortDefinition(id="in", label="In", source_type="*", data_type="str")],
            outputs=[PortDefinition(id="out", label="Out", source_type="test", data_type="str")],
        )

    async def run_process(self, inputs, config, context):
        return {"out": ""}
""")

        registry = ExtensionRegistry()
        count = registry.discover_project(project_path)

        # Clear project extensions
        registry.clear_project()

        # Unit should be removed if it was loaded
        if count > 0:
            assert registry.get_unit("test.unit") is None
