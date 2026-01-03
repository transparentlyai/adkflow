"""Tests for the FlowUnit base class and related types.

Tests the core extension infrastructure.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import pytest

from adkflow_runner.extensions.flow_unit import (
    AdditionalHandle,
    CollapsedDisplay,
    ExecutionContext,
    FieldDefinition,
    FlowUnit,
    HandleLayout,
    NodeLayout,
    PortDefinition,
    UISchema,
    WidgetType,
)


class TestWidgetType:
    """Tests for WidgetType enum."""

    def test_all_widget_types_exist(self):
        """Verify all expected widget types."""
        assert WidgetType.TEXT_INPUT.value == "text_input"
        assert WidgetType.TEXT_AREA.value == "text_area"
        assert WidgetType.NUMBER_INPUT.value == "number_input"
        assert WidgetType.SELECT.value == "select"
        assert WidgetType.CHECKBOX.value == "checkbox"
        assert WidgetType.SLIDER.value == "slider"
        assert WidgetType.FILE_PICKER.value == "file_picker"
        assert WidgetType.CODE_EDITOR.value == "code_editor"


class TestNodeLayout:
    """Tests for NodeLayout enum."""

    def test_all_layouts_exist(self):
        """Verify all layout types."""
        assert NodeLayout.STANDARD.value == "standard"
        assert NodeLayout.PILL.value == "pill"
        assert NodeLayout.CIRCLE.value == "circle"
        assert NodeLayout.OCTAGON.value == "octagon"
        assert NodeLayout.DIAMOND.value == "diamond"
        assert NodeLayout.COMPACT.value == "compact"
        assert NodeLayout.PANEL.value == "panel"


class TestCollapsedDisplay:
    """Tests for CollapsedDisplay dataclass."""

    def test_default_values(self):
        """Default values for collapsed display."""
        display = CollapsedDisplay()
        assert display.summary_fields is None
        assert display.format is None
        assert display.show_connections is False

    def test_with_format(self):
        """Collapsed display with format string."""
        display = CollapsedDisplay(
            format="{{name}} - {{model}}",
            show_connections=True,
        )
        assert display.format == "{{name}} - {{model}}"
        assert display.show_connections is True


class TestPortDefinition:
    """Tests for PortDefinition dataclass."""

    def test_basic_port(self):
        """Create a basic port definition."""
        port = PortDefinition(
            id="input",
            label="Input",
            source_type="prompt",
            data_type="str",
        )
        assert port.id == "input"
        assert port.label == "Input"
        assert port.source_type == "prompt"
        assert port.data_type == "str"
        assert port.required is True
        assert port.multiple is False

    def test_port_with_all_options(self):
        """Port with all options configured."""
        port = PortDefinition(
            id="data",
            label="Data Input",
            source_type="custom",
            data_type="dict",
            accepted_sources=["api", "file"],
            accepted_types=["dict", "list"],
            required=False,
            multiple=True,
            tab="Advanced",
            section="Data",
            handle_color="#ff6b6b",
            connection_only=False,
            widget=WidgetType.CODE_EDITOR,
            default="{}",
            lazy=True,
        )
        assert port.accepted_sources == ["api", "file"]
        assert port.multiple is True
        assert port.lazy is True
        assert port.widget == WidgetType.CODE_EDITOR


class TestFieldDefinition:
    """Tests for FieldDefinition dataclass."""

    def test_text_field(self):
        """Create a text input field."""
        field = FieldDefinition(
            id="name",
            label="Name",
            widget=WidgetType.TEXT_INPUT,
            default="",
            placeholder="Enter name...",
        )
        assert field.id == "name"
        assert field.widget == WidgetType.TEXT_INPUT
        assert field.placeholder == "Enter name..."

    def test_number_field(self):
        """Create a number field with range."""
        field = FieldDefinition(
            id="count",
            label="Count",
            widget=WidgetType.NUMBER_INPUT,
            default=5,
            min_value=1,
            max_value=100,
            step=1,
        )
        assert field.min_value == 1
        assert field.max_value == 100
        assert field.step == 1

    def test_select_field(self):
        """Create a select field with options."""
        field = FieldDefinition(
            id="model",
            label="Model",
            widget=WidgetType.SELECT,
            options=[
                {"value": "gpt-4", "label": "GPT-4"},
                {"value": "claude", "label": "Claude"},
            ],
        )
        assert len(field.options) == 2
        assert field.options[0]["value"] == "gpt-4"

    def test_conditional_field(self):
        """Field with conditional visibility."""
        field = FieldDefinition(
            id="api_key",
            label="API Key",
            widget=WidgetType.TEXT_INPUT,
            show_if={"use_custom_api": True},
        )
        assert field.show_if == {"use_custom_api": True}


class TestUISchema:
    """Tests for UISchema dataclass."""

    def test_default_schema(self):
        """Create schema with defaults."""
        schema = UISchema()
        assert schema.inputs == []
        assert schema.outputs == []
        assert schema.fields == []
        assert schema.color == "#6366f1"
        assert schema.expandable is True
        assert schema.layout == NodeLayout.STANDARD

    def test_complete_schema(self):
        """Create a complete UI schema."""
        schema = UISchema(
            inputs=[
                PortDefinition(id="in", label="In", source_type="*", data_type="str")
            ],
            outputs=[
                PortDefinition(id="out", label="Out", source_type="custom", data_type="str")
            ],
            fields=[
                FieldDefinition(id="prefix", label="Prefix", widget=WidgetType.TEXT_INPUT)
            ],
            color="#ff0000",
            icon="zap",
            default_width=300,
            default_height=200,
            layout=NodeLayout.PILL,
        )
        assert len(schema.inputs) == 1
        assert len(schema.outputs) == 1
        assert len(schema.fields) == 1
        assert schema.color == "#ff0000"
        assert schema.icon == "zap"
        assert schema.layout == NodeLayout.PILL


class TestHandleLayout:
    """Tests for HandleLayout dataclass."""

    def test_default_layout(self):
        """Default handle positions."""
        layout = HandleLayout()
        assert layout.input_position == "left"
        assert layout.output_position == "right"
        assert layout.additional_handles is None

    def test_custom_layout(self):
        """Custom handle positions."""
        layout = HandleLayout(
            input_position="top",
            output_position="bottom",
            additional_handles=[
                AdditionalHandle(id="agent-input", type="target", position="left"),
            ],
        )
        assert layout.input_position == "top"
        assert len(layout.additional_handles) == 1


class TestAdditionalHandle:
    """Tests for AdditionalHandle dataclass."""

    def test_handle_creation(self):
        """Create an additional handle."""
        handle = AdditionalHandle(
            id="link-top",
            type="source",
            position="top",
            label="Link to child",
        )
        assert handle.id == "link-top"
        assert handle.type == "source"
        assert handle.position == "top"
        assert handle.label == "Link to child"


class TestExecutionContext:
    """Tests for ExecutionContext dataclass."""

    def test_context_creation(self, tmp_path):
        """Create execution context."""
        async def mock_emit(event: Any) -> None:
            pass

        context = ExecutionContext(
            session_id="sess-123",
            run_id="run-456",
            node_id="node-789",
            node_name="MyNode",
            state={},
            emit=mock_emit,
            project_path=tmp_path,
        )
        assert context.session_id == "sess-123"
        assert context.run_id == "run-456"
        assert context.node_id == "node-789"
        assert context.project_path == tmp_path

    def test_state_operations(self, tmp_path):
        """Test state get/set operations."""
        async def mock_emit(event: Any) -> None:
            pass

        context = ExecutionContext(
            session_id="s",
            run_id="r",
            node_id="n",
            node_name="N",
            state={},
            emit=mock_emit,
            project_path=tmp_path,
        )

        # Get default value
        assert context.get_state("key", "default") == "default"

        # Set and get
        context.set_state("key", "value")
        assert context.get_state("key") == "value"


class ConcreteFlowUnit(FlowUnit):
    """Concrete implementation for testing."""

    UNIT_ID = "test.concrete"
    UI_LABEL = "Test Node"
    MENU_LOCATION = "Test/Category"
    DESCRIPTION = "A test node"
    VERSION = "1.0.0"

    @classmethod
    def setup_interface(cls) -> UISchema:
        return UISchema(
            inputs=[PortDefinition(id="in", label="Input", source_type="*", data_type="str")],
            outputs=[PortDefinition(id="out", label="Output", source_type="test", data_type="str")],
            fields=[FieldDefinition(id="msg", label="Message", widget=WidgetType.TEXT_INPUT)],
        )

    async def run_process(
        self,
        inputs: dict[str, Any],
        config: dict[str, Any],
        context: ExecutionContext,
    ) -> dict[str, Any]:
        msg = config.get("msg", "")
        return {"out": msg + inputs.get("in", "")}


class TestFlowUnitSubclass:
    """Tests for FlowUnit subclass."""

    def test_class_attributes(self):
        """Verify class attributes are set."""
        assert ConcreteFlowUnit.UNIT_ID == "test.concrete"
        assert ConcreteFlowUnit.UI_LABEL == "Test Node"
        assert ConcreteFlowUnit.MENU_LOCATION == "Test/Category"
        assert ConcreteFlowUnit.DESCRIPTION == "A test node"
        assert ConcreteFlowUnit.VERSION == "1.0.0"

    def test_default_flags(self):
        """Default execution flags."""
        assert ConcreteFlowUnit.OUTPUT_NODE is False
        assert ConcreteFlowUnit.ALWAYS_EXECUTE is False

    def test_setup_interface(self):
        """Test setup_interface returns valid schema."""
        schema = ConcreteFlowUnit.setup_interface()
        assert isinstance(schema, UISchema)
        assert len(schema.inputs) == 1
        assert len(schema.outputs) == 1
        assert len(schema.fields) == 1

    @pytest.mark.asyncio
    async def test_run_process(self, tmp_path):
        """Test run_process execution."""
        async def mock_emit(event: Any) -> None:
            pass

        context = ExecutionContext(
            session_id="s",
            run_id="r",
            node_id="n",
            node_name="Test",
            state={},
            emit=mock_emit,
            project_path=tmp_path,
        )

        unit = ConcreteFlowUnit()
        result = await unit.run_process(
            inputs={"in": " world"},
            config={"msg": "hello"},
            context=context,
        )

        assert result["out"] == "hello world"
