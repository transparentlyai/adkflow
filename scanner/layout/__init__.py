"""
Layout package for ADKFlow Scanner

Provides layout calculation functions and constants for positioning nodes
in React Flow canvas.
"""

from scanner.layout.calculator import (
    AGENT_HEIGHT,
    AGENT_WIDTH,
    COL_GAP,
    GROUP_GAP,
    GROUP_HEADER,
    PADDING,
    PAIR_GAP,
    PROMPT_HEIGHT,
    ROW_GAP,
    TOOL_GAP,
    TOOL_HEIGHT,
    calc_agent_left_width,
    calc_group_content_size,
    calc_group_max_left_widths,
    calc_text_width,
    generate_node_id,
    get_agents_per_row,
)

__all__ = [
    # Constants
    "AGENT_WIDTH",
    "AGENT_HEIGHT",
    "PROMPT_HEIGHT",
    "TOOL_HEIGHT",
    "PAIR_GAP",
    "COL_GAP",
    "ROW_GAP",
    "PADDING",
    "GROUP_HEADER",
    "GROUP_GAP",
    "TOOL_GAP",
    # Functions
    "calc_text_width",
    "calc_agent_left_width",
    "calc_group_max_left_widths",
    "calc_group_content_size",
    "get_agents_per_row",
    "generate_node_id",
]
