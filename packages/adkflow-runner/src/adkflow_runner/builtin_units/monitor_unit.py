"""Monitor FlowUnit for capturing and displaying runtime values.

This builtin unit acts as a sink node that captures values from
connected nodes and emits them via monitor_update events for
real-time display in the frontend.
"""

import json
import time
from typing import Any

from adkflow_runner.extensions.flow_unit import (
    FlowUnit,
    UISchema,
    PortDefinition,
    FieldDefinition,
    WidgetType,
    NodeLayout,
    CollapsedDisplay,
    HandleLayout,
    ExecutionContext,
)
from adkflow_runner.runner.types import EventType, RunEvent


def detect_value_type(value: Any) -> str:
    """Detect the content type for syntax highlighting.

    Args:
        value: The value to analyze

    Returns:
        Content type: "json", "markdown", or "plaintext"
    """
    if isinstance(value, (dict, list)):
        return "json"

    if isinstance(value, str):
        # Check for markdown indicators
        if any(
            pattern in value for pattern in ["# ", "## ", "**", "- ", "[", "](", "```"]
        ):
            return "markdown"

    return "plaintext"


def serialize_value(value: Any) -> str:
    """Serialize a value to string for display.

    Args:
        value: The value to serialize

    Returns:
        String representation of the value
    """
    if value is None:
        return ""

    if isinstance(value, str):
        return value

    if isinstance(value, (dict, list)):
        try:
            return json.dumps(value, indent=2, ensure_ascii=False)
        except (TypeError, ValueError):
            return str(value)

    return str(value)


class MonitorUnit(FlowUnit):
    """Monitor node for capturing and displaying runtime values.

    This is a sink node that:
    - Captures any value from connected nodes
    - Emits monitor_update events for real-time display
    - Auto-detects content type for syntax highlighting
    """

    UNIT_ID = "builtin.monitor"
    UI_LABEL = "Monitor"
    MENU_LOCATION = "Probes/Monitor"
    DESCRIPTION = (
        "Captures and displays runtime output from connected nodes. "
        "Shows values in a read-only editor with syntax highlighting."
    )
    VERSION = "1.0.0"

    # Sink node - triggers execution trace
    OUTPUT_NODE = True
    # Always capture, skip cache
    ALWAYS_EXECUTE = True

    @classmethod
    def setup_interface(cls) -> UISchema:
        """Define the monitor node's UI schema."""
        return UISchema(
            inputs=[
                PortDefinition(
                    id="input",
                    label="Input",
                    source_type="*",
                    data_type="any",
                    accepted_sources=["*"],
                    accepted_types=["str", "dict", "any"],
                    required=False,
                    multiple=False,
                    connection_only=True,
                )
            ],
            outputs=[],
            fields=[
                FieldDefinition(
                    id="name",
                    label="Name",
                    widget=WidgetType.TEXT_INPUT,
                    default="Monitor",
                    placeholder="Monitor name...",
                    help_text="Display name for this monitor",
                ),
            ],
            color="",  # Uses theme colors from theme_key
            icon="Eye",
            expandable=True,
            default_width=400,
            default_height=280,
            layout=NodeLayout.CIRCLE,
            theme_key="probe",
            collapsed_display=CollapsedDisplay(format="MON"),
            handle_layout=HandleLayout(input_position="bottom"),
        )

    async def run_process(
        self,
        inputs: dict[str, Any],
        config: dict[str, Any],
        context: ExecutionContext,
    ) -> dict[str, Any]:
        """Capture the input value and emit monitor_update event.

        Args:
            inputs: Values from connected input ports
            config: Configuration values
            context: Execution context

        Returns:
            Empty dict (sink node has no outputs)
        """
        # Get the input value
        value = inputs.get("input")

        # Serialize and detect type
        serialized_value = serialize_value(value)
        value_type = detect_value_type(value)
        timestamp = time.strftime("%Y-%m-%dT%H:%M:%S")

        # Emit monitor_update event for frontend
        await context.emit(
            RunEvent(
                type=EventType.MONITOR_UPDATE,
                timestamp=time.time(),
                agent_id=context.node_id,
                agent_name=context.node_name,
                data={
                    "node_id": context.node_id,
                    "value": serialized_value,
                    "value_type": value_type,
                    "timestamp": timestamp,
                },
            )
        )

        # Sink node - no outputs
        return {}
