"""Tests for schema generation from FlowUnit classes."""

import pytest

from adkflow_runner.extensions.flow_unit import (
    FlowUnit,
    UISchema,
    PortDefinition,
    FieldDefinition,
    WidgetType,
    CollapsedDisplay,
    HandleLayout,
)
from adkflow_runner.extensions.schema_generator import generate_schema
from adkflow_runner.extensions.types import ExtensionScope


class MockFlowUnit(FlowUnit):
    """Mock FlowUnit for testing."""

    UNIT_ID = "test.mock_unit"
    UI_LABEL = "Mock Unit"
    MENU_LOCATION = "Test/Mock"

    @classmethod
    def get_ui_schema(cls) -> UISchema:
        return UISchema(
            inputs=[
                PortDefinition(
                    id="input",
                    label="Input",
                    source_type="value",
                    data_type="str",
                ),
            ],
            outputs=[
                PortDefinition(
                    id="output",
                    label="Output",
                    source_type="value",
                    data_type="str",
                ),
            ],
        )

    async def execute(self, inputs, context):
        return {"output": inputs.get("input")}


class TestGenerateSchema:
    """Tests for generate_schema function."""

    def test_generates_schema_dict(self, tmp_path):
        """generate_schema returns dict."""
        ui_schema = MockFlowUnit.get_ui_schema()
        schema = generate_schema(
            MockFlowUnit,
            ui_schema,
            tmp_path / "test.py",
            ExtensionScope.PROJECT,
        )
        assert isinstance(schema, dict)

    def test_schema_has_unit_id(self, tmp_path):
        """Schema includes unit_id."""
        ui_schema = MockFlowUnit.get_ui_schema()
        schema = generate_schema(
            MockFlowUnit,
            ui_schema,
            tmp_path / "test.py",
            ExtensionScope.PROJECT,
        )
        assert "unit_id" in schema
        assert schema["unit_id"] == "test.mock_unit"

    def test_schema_has_ui_with_inputs(self, tmp_path):
        """Schema UI includes inputs."""
        ui_schema = MockFlowUnit.get_ui_schema()
        schema = generate_schema(
            MockFlowUnit,
            ui_schema,
            tmp_path / "test.py",
            ExtensionScope.PROJECT,
        )
        assert "ui" in schema
        assert "inputs" in schema["ui"]
        assert len(schema["ui"]["inputs"]) == 1
        assert schema["ui"]["inputs"][0]["id"] == "input"

    def test_schema_has_ui_with_outputs(self, tmp_path):
        """Schema UI includes outputs."""
        ui_schema = MockFlowUnit.get_ui_schema()
        schema = generate_schema(
            MockFlowUnit,
            ui_schema,
            tmp_path / "test.py",
            ExtensionScope.PROJECT,
        )
        assert "ui" in schema
        assert "outputs" in schema["ui"]
        assert len(schema["ui"]["outputs"]) == 1
        assert schema["ui"]["outputs"][0]["id"] == "output"

    def test_schema_has_scope(self, tmp_path):
        """Schema includes scope."""
        ui_schema = MockFlowUnit.get_ui_schema()
        schema = generate_schema(
            MockFlowUnit,
            ui_schema,
            tmp_path / "test.py",
            ExtensionScope.PROJECT,
        )
        assert "scope" in schema


class TestPortDefinitionToDict:
    """Tests for PortDefinition serialization in schema."""

    def test_port_has_id(self, tmp_path):
        """Port dict has id."""
        ui_schema = MockFlowUnit.get_ui_schema()
        schema = generate_schema(
            MockFlowUnit,
            ui_schema,
            tmp_path / "test.py",
            ExtensionScope.PROJECT,
        )
        port = schema["ui"]["inputs"][0]
        assert "id" in port

    def test_port_has_label(self, tmp_path):
        """Port dict has label."""
        ui_schema = MockFlowUnit.get_ui_schema()
        schema = generate_schema(
            MockFlowUnit,
            ui_schema,
            tmp_path / "test.py",
            ExtensionScope.PROJECT,
        )
        port = schema["ui"]["inputs"][0]
        assert "label" in port

    def test_port_has_source_type(self, tmp_path):
        """Port dict has source_type."""
        ui_schema = MockFlowUnit.get_ui_schema()
        schema = generate_schema(
            MockFlowUnit,
            ui_schema,
            tmp_path / "test.py",
            ExtensionScope.PROJECT,
        )
        port = schema["ui"]["inputs"][0]
        assert "source_type" in port


class TestSchemaWithFields:
    """Tests for schema generation with config fields."""

    def test_schema_includes_fields(self, tmp_path):
        """Schema includes config fields in ui."""

        class FieldFlowUnit(FlowUnit):
            UNIT_ID = "test.field_unit"
            UI_LABEL = "Field Unit"
            MENU_LOCATION = "Test/Field"

            @classmethod
            def get_ui_schema(cls) -> UISchema:
                return UISchema(
                    fields=[
                        FieldDefinition(
                            id="count",
                            label="Count",
                            widget=WidgetType.NUMBER_INPUT,
                            default=10,
                        ),
                    ],
                )

            async def execute(self, inputs, context):
                return {}

        ui_schema = FieldFlowUnit.get_ui_schema()
        schema = generate_schema(
            FieldFlowUnit,
            ui_schema,
            tmp_path / "test.py",
            ExtensionScope.PROJECT,
        )
        assert "ui" in schema
        assert "fields" in schema["ui"]
        assert len(schema["ui"]["fields"]) == 1
        assert schema["ui"]["fields"][0]["id"] == "count"


class TestSchemaWithCollapsedDisplay:
    """Tests for schema with collapsed display config."""

    def test_schema_includes_collapsed_display(self, tmp_path):
        """Schema UI includes collapsed_display when set."""

        class CollapsedFlowUnit(FlowUnit):
            UNIT_ID = "test.collapsed_unit"
            UI_LABEL = "Collapsed Unit"
            MENU_LOCATION = "Test/Collapsed"

            @classmethod
            def get_ui_schema(cls) -> UISchema:
                return UISchema(
                    collapsed_display=CollapsedDisplay(
                        summary_fields=["name"],
                        format="{name}",
                    ),
                )

            async def execute(self, inputs, context):
                return {}

        ui_schema = CollapsedFlowUnit.get_ui_schema()
        schema = generate_schema(
            CollapsedFlowUnit,
            ui_schema,
            tmp_path / "test.py",
            ExtensionScope.PROJECT,
        )
        assert "ui" in schema
        assert "collapsed_display" in schema["ui"]
        cd = schema["ui"]["collapsed_display"]
        assert cd["summary_fields"] == ["name"]
