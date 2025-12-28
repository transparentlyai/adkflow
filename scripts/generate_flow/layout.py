"""Layout calculation functions for ReactFlow node positioning."""

from pathlib import Path

from scripts.generate_flow.models import AgentData


# Node sizes (contracted agent: min-w-[250px] max-w-[300px] from AgentNode.tsx)
AGENT_WIDTH = 300.0
AGENT_HEIGHT = 140.0
PROMPT_HEIGHT = 30.0
TOOL_HEIGHT = 30.0

# Layout constants
PAIR_GAP = 15.0  # Gap between prompt/tool column and agent
COL_GAP = 30.0  # Gap between agent-prompt pairs
ROW_GAP = 50.0  # Gap between rows
PADDING = 40.0  # Padding inside group
GROUP_HEADER = 30.0  # Height of group header
GROUP_GAP = 80.0  # Gap between groups
TOOL_GAP = 8.0  # Gap between stacked prompts/tools

# Text width calculation: ~7px per character + 30px padding
CHAR_WIDTH = 7.0
TEXT_PADDING = 30.0


def calc_text_width(text: str) -> float:
    """Calculate the width of a node based on its text content"""
    return len(text) * CHAR_WIDTH + TEXT_PADDING


def calc_agent_left_width(agent: AgentData, group_name: str) -> float:
    """Calculate the max width of prompts/tools for an agent"""
    max_width = 0.0

    # Main prompt
    if agent.prompt_file:
        prompt_name = Path(agent.prompt_file).stem.replace(".prompt", "")
        full_name = f"{group_name} - {prompt_name}"
        max_width = max(max_width, calc_text_width(full_name))

    # Additional prompts
    for add_prompt in agent.additional_prompts:
        add_name = Path(add_prompt).stem.replace(".prompt", "")
        full_name = f"{group_name} - {add_name}"
        max_width = max(max_width, calc_text_width(full_name))

    # Tools
    for tool in agent.tool_files:
        full_name = f"{group_name} - {tool.name}"
        max_width = max(max_width, calc_text_width(full_name))

    return max_width


def calc_group_max_left_widths(
    agent_list: list, agents_per_row: int, group_name: str
) -> list[float]:
    """Calculate the max left width for each column in a group"""
    col_widths = [0.0] * agents_per_row
    for j, agent in enumerate(agent_list):
        col = j % agents_per_row
        agent_left_width = calc_agent_left_width(agent, group_name)
        col_widths[col] = max(col_widths[col], agent_left_width)
    return col_widths


def get_agents_per_row(group_name: str) -> int:
    """Determine how many agents per row for a group"""
    if group_name == "Compiler":
        return 3
    return 2


def calc_group_content_size(
    agent_list: list, agents_per_row: int, group_name: str
) -> tuple[float, float, list[float]]:
    """
    Calculate the required group size to contain all child nodes.
    Returns (width, height, col_widths) that encompasses all nodes with padding.
    """
    ROW_HEIGHT = AGENT_HEIGHT + ROW_GAP

    num_agents = len(agent_list)
    num_rows = (num_agents + agents_per_row - 1) // agents_per_row

    # Calculate extra height needed for additional prompts
    extra_prompts = sum(len(a.additional_prompts) for a in agent_list)
    extra_prompt_height = extra_prompts * (PROMPT_HEIGHT + TOOL_GAP)

    # Calculate extra height needed for tools (placed below prompts)
    extra_tools = sum(len(a.tool_files) for a in agent_list)
    extra_tool_height = extra_tools * (TOOL_HEIGHT + TOOL_GAP)

    # Calculate actual column widths based on text lengths
    col_left_widths = calc_group_max_left_widths(agent_list, agents_per_row, group_name)

    # Width: sum of each column's (left_width + gap + agent_width) + gaps between columns
    content_width = 0.0
    for col_left_width in col_left_widths:
        content_width += col_left_width + PAIR_GAP + AGENT_WIDTH
    content_width += (agents_per_row - 1) * COL_GAP

    # Height: header + padding + (num_rows * row_height) + extra_prompts + extra_tools + padding
    content_height = num_rows * ROW_HEIGHT + extra_prompt_height + extra_tool_height

    # Total group dimensions including padding and header
    group_width = PADDING + content_width + PADDING
    group_height = GROUP_HEADER + PADDING + content_height + PADDING

    return group_width, group_height, col_left_widths
