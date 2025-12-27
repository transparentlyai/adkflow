"""Node definitions for the Uppercase extension."""

from typing import Any

from adkflow_runner.extensions import (
    FlowUnit,
    UISchema,
    PortDefinition,
    FieldDefinition,
    WidgetType,
    ExecutionContext,
)


class UppercaseNode(FlowUnit):
    """
    A simple node that converts text to uppercase.

    This is the most basic custom node possible - it takes text input,
    applies a transformation, and outputs the result.
    """

    UNIT_ID = "examples.uppercase"
    UI_LABEL = "Uppercase"
    MENU_LOCATION = "Examples/Text"
    DESCRIPTION = "Converts input text to UPPERCASE"
    VERSION = "1.0.0"

    @classmethod
    def setup_interface(cls) -> UISchema:
        """Define the node's visual interface."""
        return UISchema(
            inputs=[
                PortDefinition(
                    id="text",
                    label="Text",
                    source_type="*",
                    data_type="str",
                    accepted_sources=["*"],
                    accepted_types=["str"],
                    required=True,
                ),
            ],
            outputs=[
                PortDefinition(
                    id="result",
                    label="Result",
                    source_type="uppercase",
                    data_type="str",
                ),
            ],
            fields=[
                FieldDefinition(
                    id="trim_whitespace",
                    label="Trim Whitespace",
                    widget=WidgetType.CHECKBOX,
                    default=True,
                    help_text="Remove leading/trailing spaces",
                ),
            ],
            color="#3b82f6",
            icon="CaseSensitive",
            expandable=True,
            default_width=200,
            default_height=100,
        )

    async def run_process(
        self,
        inputs: dict[str, Any],
        config: dict[str, Any],
        context: ExecutionContext,
    ) -> dict[str, Any]:
        """Execute the node's logic."""
        text = inputs.get("text", "")
        trim_whitespace = config.get("trim_whitespace", True)

        result = text.upper()
        if trim_whitespace:
            result = result.strip()

        return {"result": result}
