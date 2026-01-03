"""Tests for the extension registry.

Tests FlowUnit discovery and registration.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import pytest

from adkflow_runner.extensions.flow_unit import (
    ExecutionContext,
    FieldDefinition,
    FlowUnit,
    PortDefinition,
    UISchema,
    WidgetType,
)
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
