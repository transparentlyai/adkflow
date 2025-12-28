"""Schema generation for FlowUnit extensions."""

from pathlib import Path
from typing import Any

from adkflow_runner.extensions.flow_unit import (
    FlowUnit,
    UISchema,
    CollapsedDisplay,
    HandleLayout,
)
from adkflow_runner.extensions.types import ExtensionScope


def generate_schema(
    unit_cls: type[FlowUnit],
    ui_schema: UISchema,
    file_path: Path,
    scope: ExtensionScope,
) -> dict[str, Any]:
    """Generate JSON schema from FlowUnit class."""

    def port_to_dict(port):
        return {
            "id": port.id,
            "label": port.label,
            "source_type": port.source_type,
            "data_type": port.data_type,
            "accepted_sources": port.accepted_sources,
            "accepted_types": port.accepted_types,
            "required": port.required,
            "multiple": port.multiple,
            "tab": port.tab,
            "section": port.section,
            "handle_color": port.handle_color,
            "connection_only": port.connection_only,
            "widget": port.widget.value
            if port.widget and hasattr(port.widget, "value")
            else port.widget,
            "default": port.default,
            "placeholder": port.placeholder,
            "options": port.options,
            "lazy": port.lazy,
        }

    def field_to_dict(field):
        return {
            "id": field.id,
            "label": field.label,
            "widget": field.widget.value
            if hasattr(field.widget, "value")
            else str(field.widget),
            "default": field.default,
            "options": field.options,
            "min_value": field.min_value,
            "max_value": field.max_value,
            "step": field.step,
            "placeholder": field.placeholder,
            "help_text": field.help_text,
            "show_if": field.show_if,
            "tab": field.tab,
            "section": field.section,
        }

    def collapsed_display_to_dict(cd: CollapsedDisplay | None):
        if cd is None:
            return None
        return {
            "summary_fields": cd.summary_fields,
            "format": cd.format,
            "show_connections": cd.show_connections,
        }

    def handle_layout_to_dict(hl: HandleLayout | None):
        if hl is None:
            return None
        additional = None
        if hl.additional_handles:
            additional = [
                {
                    "id": h.id,
                    "type": h.type,
                    "position": h.position,
                    "label": h.label,
                }
                for h in hl.additional_handles
            ]
        return {
            "input_position": hl.input_position,
            "output_position": hl.output_position,
            "additional_handles": additional,
        }

    return {
        "unit_id": unit_cls.UNIT_ID,
        "label": unit_cls.UI_LABEL,
        "menu_location": unit_cls.MENU_LOCATION,
        "description": getattr(unit_cls, "DESCRIPTION", ""),
        "version": getattr(unit_cls, "VERSION", "1.0.0"),
        "scope": scope.value,  # Include scope in schema
        "source_file": str(file_path),
        # Execution control properties
        "output_node": getattr(unit_cls, "OUTPUT_NODE", False),
        "always_execute": getattr(unit_cls, "ALWAYS_EXECUTE", False),
        "ui": {
            "inputs": [port_to_dict(p) for p in ui_schema.inputs],
            "outputs": [port_to_dict(p) for p in ui_schema.outputs],
            "fields": [field_to_dict(f) for f in ui_schema.fields],
            "color": ui_schema.color,
            "icon": ui_schema.icon,
            "expandable": ui_schema.expandable,
            "default_width": ui_schema.default_width,
            "default_height": ui_schema.default_height,
            # Layout configuration
            "layout": ui_schema.layout.value
            if hasattr(ui_schema.layout, "value")
            else ui_schema.layout,
            "theme_key": ui_schema.theme_key,
            "collapsed_display": collapsed_display_to_dict(ui_schema.collapsed_display),
            "handle_layout": handle_layout_to_dict(ui_schema.handle_layout),
        },
    }
