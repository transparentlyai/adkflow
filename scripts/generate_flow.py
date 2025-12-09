#!/usr/bin/env python3
"""
Generate ADKFlow flow.json from agents.md

This script parses the agents.md file and creates a complete React Flow JSON
with all agents, prompts, groups, and edges.
"""

import json
import re
from dataclasses import dataclass, field
from typing import Optional
from pathlib import Path


@dataclass
class ToolData:
    """Represents a tool parsed from agents.md"""

    name: str
    file_path: str


@dataclass
class AgentData:
    """Represents an agent parsed from agents.md"""

    name: str
    group: str
    model: str = "gemini-2.5-flash"
    temperature: float = 0.0
    description: str = ""
    output_key: Optional[str] = None
    output_schema: Optional[str] = None
    tools: list = field(default_factory=list)  # List of tool names
    tool_files: list = field(default_factory=list)  # List of ToolData objects
    planner_type: str = "none"
    thinking_budget: Optional[int] = None
    disallow_transfer_to_parent: bool = False
    disallow_transfer_to_peers: bool = False
    after_model_callback: Optional[str] = None
    http_timeout: int = 300000
    http_max_retries: int = 5
    http_retry_delay: float = 1.0
    http_retry_multiplier: float = 2.0
    prompt_file: Optional[str] = None
    additional_prompts: list = field(default_factory=list)


def generate_node_id(prefix: str, name: str) -> str:
    """Generate a unique node ID"""
    safe_name = re.sub(r"[^a-zA-Z0-9_]", "_", name.lower())
    return f"{prefix}_{safe_name}"


def _parse_agent_details(agent: AgentData, section_text: str) -> AgentData:
    """Parse the details of an agent section"""
    # Parse model
    model_match = re.search(r"\| model \| ([^|]+) \|", section_text)
    if model_match:
        model_val = model_match.group(1).strip()
        if "gemini" in model_val.lower():
            if "pro" in model_val.lower():
                agent.model = "gemini-2.5-pro"
            else:
                agent.model = "gemini-2.5-flash"

    # Parse temperature
    temp_match = re.search(r"\| temperature \| ([0-9.]+)", section_text)
    if temp_match:
        agent.temperature = float(temp_match.group(1))

    # Parse description
    desc_match = re.search(r"\| description \| ([^|]+) \|", section_text)
    if desc_match:
        agent.description = desc_match.group(1).strip()

    # Parse output_key
    output_key_match = re.search(r"\| output_key \| ([^|]+) \|", section_text)
    if output_key_match:
        agent.output_key = output_key_match.group(1).strip()

    # Parse output_schema
    output_schema_match = re.search(r"\| output_schema \| ([^|]+) \|", section_text)
    if output_schema_match:
        agent.output_schema = output_schema_match.group(1).strip()

    # Parse tools
    tools_match = re.search(r"\| tools \| \[([^\]]+)\]", section_text)
    if tools_match:
        tools_str = tools_match.group(1)
        agent.tools = [
            t.strip() for t in tools_str.split(",") if t.strip() and t.strip() != "none"
        ]

    # Parse planner
    planner_match = re.search(
        r"\| type \| (BuiltInPlanner|ReactPlanner|none)", section_text
    )
    if planner_match:
        planner_val = planner_match.group(1)
        if planner_val == "BuiltInPlanner":
            agent.planner_type = "builtin"
        elif planner_val == "ReactPlanner":
            agent.planner_type = "react"

    # Parse thinking budget
    thinking_match = re.search(r"thinking_budget \| (\d+)", section_text)
    if thinking_match:
        agent.thinking_budget = int(thinking_match.group(1))

    # Parse transfer controls
    if "disallow_transfer_to_parent | true" in section_text.lower():
        agent.disallow_transfer_to_parent = True
    if "disallow_transfer_to_peers | true" in section_text.lower():
        agent.disallow_transfer_to_peers = True

    # Parse callback
    callback_match = re.search(r"after_model_callback[:\s]+([a-zA-Z_]+)", section_text)
    if callback_match:
        agent.after_model_callback = callback_match.group(1)

    # Parse HTTP options
    timeout_match = re.search(r"\| timeout \| (\d+)ms", section_text)
    if timeout_match:
        agent.http_timeout = int(timeout_match.group(1))

    retries_match = re.search(r"retry_options\.attempts \| (\d+)", section_text)
    if retries_match:
        agent.http_max_retries = int(retries_match.group(1))

    delay_match = re.search(r"retry_options\.initial_delay \| ([0-9.]+)s", section_text)
    if delay_match:
        agent.http_retry_delay = float(delay_match.group(1))

    multiplier_match = re.search(r"retry_options\.exp_base \| ([0-9.]+)", section_text)
    if multiplier_match:
        agent.http_retry_multiplier = float(multiplier_match.group(1))

    # Parse prompt file
    prompt_match = re.search(r"### Prompt File\s*\n`([^`]+)`", section_text)
    if prompt_match:
        agent.prompt_file = prompt_match.group(1)

    # Parse additional prompts (like scale reconciliation)
    additional_prompt_matches = re.findall(
        r"### Additional Prompt[^\n]*\n`([^`]+)`", section_text
    )
    agent.additional_prompts = additional_prompt_matches

    # Parse tool files from ### Tools section
    # Format: - `tool_name`: `/path/to/tools.py`
    tool_matches = re.findall(r"- `([^`]+)`: `([^`]+)`", section_text)
    for tool_name, tool_path in tool_matches:
        # Skip if it's not a .py file (could be other references)
        if tool_path.endswith(".py"):
            agent.tool_files.append(ToolData(name=tool_name, file_path=tool_path))

    return agent


def parse_agents_md(filepath: str) -> list[AgentData]:
    """Parse agents.md and extract all agent definitions"""
    agents = []

    with open(filepath, "r") as f:
        content = f.read()

    # Track current module as we scan line by line
    current_module = "Unknown"
    lines = content.split("\n")

    i = 0
    while i < len(lines):
        line = lines[i].strip()

        # Check for module header (# ModuleName - single #, not ##)
        if line.startswith("# ") and not line.startswith("## "):
            module_name = line[2:].strip()
            # Clean up module names
            if module_name == "Lynx ADK Agents Registry":
                i += 1
                continue
            if module_name == "Summary":
                # Stop at summary section
                break
            if " Module" in module_name:
                module_name = module_name.replace(" Module", "")
            # Handle special cases
            if "Specialist Agents" in module_name:
                # This is a meta-header, specialists have their own groups
                i += 1
                continue
            if "Compiler" in module_name:
                module_name = "Compiler"
            current_module = module_name
            i += 1
            continue

        # Check for agent header (## AgentName)
        if line.startswith("## "):
            agent_name = line[3:].strip()

            # Skip non-agent sections
            if any(
                skip in agent_name.lower()
                for skip in [
                    "http options",
                    "agent count",
                    "configuration",
                    "factory",
                    "summary",
                    "compiler http",
                ]
            ):
                i += 1
                continue

            # Collect all lines for this agent section until next ## or #
            section_lines = [agent_name]
            i += 1
            while i < len(lines):
                next_line = lines[i]
                if next_line.strip().startswith("## ") or (
                    next_line.strip().startswith("# ")
                    and not next_line.strip().startswith("## ")
                ):
                    break
                section_lines.append(next_line)
                i += 1

            section_text = "\n".join(section_lines)

            # Determine the group for specialist agents
            group = current_module

            # Known specialist names (23 total)
            known_specialists = {
                "altmanz",
                "assets",
                "benford",
                "business_model",
                "cash",
                "cf_dechow",
                "cf_jones",
                "credit",
                "governance",
                "growth",
                "gunny",
                "income",
                "interim",
                "investing",
                "jones",
                "margins",
                "miscellaneous",
                "mscore",
                "piotroski",
                "roychowdhury",
                "smoothing",
                "valuation",
                "working_capital",
            }

            # For specialist agents, use the specialist name as the group
            # Pattern: specialist_agenttype (e.g., altmanz_retriever)
            specialist_match = re.match(
                r"^([a-z_]+)_(retriever|analyst|benchmarker|reporter)$",
                agent_name.lower(),
            )
            if specialist_match and specialist_match.group(1) in known_specialists:
                group = specialist_match.group(1)

            # For scorer agents
            scorer_match = re.match(r"^scorer_([a-z_]+)$", agent_name.lower())
            if scorer_match:
                group = "Compiler"

            # For compiler agents
            if agent_name.lower() in ["compiler_consolidator", "compiler_reporter"]:
                group = "Compiler"

            agent = AgentData(name=agent_name, group=group)
            agent = _parse_agent_details(agent, section_text)
            agents.append(agent)
            continue

        i += 1

    return agents


def create_agent_node_data(agent: AgentData) -> dict:
    """Create the data structure for an agent node"""
    agent_data = {
        "id": generate_node_id("agent", f"{agent.group}_{agent.name}"),
        "name": f"{agent.group} - {agent.name}",
        "type": "llm",
        "model": agent.model,
        "temperature": agent.temperature,
        "description": agent.description,
        "tools": agent.tools,
    }

    # Add optional fields
    if agent.output_key:
        agent_data["output_key"] = agent.output_key
    if agent.output_schema:
        agent_data["output_schema"] = agent.output_schema
    if agent.disallow_transfer_to_parent:
        agent_data["disallow_transfer_to_parent"] = True
    if agent.disallow_transfer_to_peers:
        agent_data["disallow_transfer_to_peers"] = True
    if agent.after_model_callback:
        agent_data["after_model_callback"] = agent.after_model_callback

    # Planner config
    if agent.planner_type != "none":
        planner: dict[str, str | int] = {"type": agent.planner_type}
        if agent.thinking_budget:
            planner["thinking_budget"] = agent.thinking_budget
        agent_data["planner"] = planner

    # HTTP options
    agent_data["http_options"] = {
        "timeout": agent.http_timeout,
        "max_retries": agent.http_max_retries,
        "retry_delay": int(agent.http_retry_delay * 1000),  # Convert to ms
        "retry_backoff_multiplier": agent.http_retry_multiplier,
    }

    return {"agent": agent_data}


def create_prompt_node_data(prompt_name: str, file_path: str) -> dict:
    """Create the data structure for a prompt node"""
    return {
        "prompt": {
            "id": generate_node_id("prompt", prompt_name),
            "name": prompt_name,
            "file_path": file_path,
        }
    }


def create_tool_node_data(tool_name: str, file_path: str) -> dict:
    """Create the data structure for a tool node"""
    # Read the tool code if the file exists
    code = ""
    try:
        with open(file_path, "r") as f:
            code = f.read()
    except (FileNotFoundError, IOError):
        code = f"# Tool file not found: {file_path}"

    return {
        "name": tool_name,
        "code": code,
        "file_path": file_path,
    }


def generate_flow_json(agents: list[AgentData], output_path: str):
    """Generate the complete flow.json file"""
    nodes = []
    edges = []

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

    # Calculate max left width per column for each group (for PAIR_WIDTH calculation)
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

    ROW_HEIGHT = AGENT_HEIGHT + ROW_GAP

    # Group agents by their module/group
    groups = {}
    for agent in agents:
        if agent.group not in groups:
            groups[agent.group] = []
        groups[agent.group].append(agent)

    # Define group layout
    # Core modules in first row
    core_modules = ["CAGX", "SRAG", "DocPrep", "LynxTool"]

    # Specialists (23 of them)
    specialists = [
        "altmanz",
        "assets",
        "benford",
        "business_model",
        "cash",
        "cf_dechow",
        "cf_jones",
        "credit",
        "governance",
        "growth",
        "gunny",
        "income",
        "interim",
        "investing",
        "jones",
        "margins",
        "miscellaneous",
        "mscore",
        "piotroski",
        "roychowdhury",
        "smoothing",
        "valuation",
        "working_capital",
    ]

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
        Returns (width, height) that encompasses all nodes with padding.
        """
        num_agents = len(agent_list)
        num_rows = (num_agents + agents_per_row - 1) // agents_per_row

        # Calculate extra height needed for additional prompts
        extra_prompts = sum(len(a.additional_prompts) for a in agent_list)
        extra_prompt_height = extra_prompts * (PROMPT_HEIGHT + TOOL_GAP)

        # Calculate extra height needed for tools (placed below prompts)
        extra_tools = sum(len(a.tool_files) for a in agent_list)
        extra_tool_height = extra_tools * (TOOL_HEIGHT + TOOL_GAP)

        # Calculate actual column widths based on text lengths
        col_left_widths = calc_group_max_left_widths(
            agent_list, agents_per_row, group_name
        )

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

    # Pre-calculate all group sizes and column widths for positioning
    group_sizes = {}
    group_col_widths = {}
    for group_name, agent_list in groups.items():
        agents_per_row = get_agents_per_row(group_name)
        width, height, col_widths = calc_group_content_size(
            agent_list, agents_per_row, group_name
        )
        group_sizes[group_name] = (width, height)
        group_col_widths[group_name] = col_widths

    # Calculate group positions
    group_positions = {}

    # Core modules - top row
    x_offset = 100.0
    core_y = 100.0
    max_core_height = 0.0
    for module in core_modules:
        if module in groups:
            width, height = group_sizes[module]
            group_positions[module] = {"x": x_offset, "y": core_y}
            x_offset += width + GROUP_GAP
            max_core_height = max(max_core_height, height)

    # Specialist groups arranged in a grid (3 columns)
    cols = 3
    # Find the widest specialist group for uniform column spacing
    specialist_max_width = max(
        group_sizes.get(s, (0, 0))[0] for s in specialists if s in groups
    )
    specialist_max_height = max(
        group_sizes.get(s, (0, 0))[1] for s in specialists if s in groups
    )
    col_spacing = specialist_max_width + GROUP_GAP
    row_spacing = specialist_max_height + GROUP_GAP
    start_y = core_y + max_core_height + GROUP_GAP

    specialist_idx = 0
    for specialist in specialists:
        if specialist in groups:
            col = specialist_idx % cols
            row = specialist_idx // cols
            group_positions[specialist] = {
                "x": 100.0 + col * col_spacing,
                "y": start_y + row * row_spacing,
            }
            specialist_idx += 1

    # Compiler group at the bottom
    num_specialist_rows = (specialist_idx + cols - 1) // cols
    compiler_y = start_y + num_specialist_rows * row_spacing + GROUP_GAP
    if "Compiler" in groups:
        group_positions["Compiler"] = {"x": 100.0, "y": compiler_y}

    # Collect all group nodes first (parents must come before children)
    group_nodes = []
    child_nodes = []

    # Now create nodes for each group
    for group_name, agent_list in groups.items():
        if group_name not in group_positions:
            # Fallback position for unknown groups
            group_positions[group_name] = {"x": 100.0, "y": compiler_y + 1500.0}

        group_pos = group_positions[group_name]
        group_width, group_height = group_sizes[group_name]
        agents_per_row = get_agents_per_row(group_name)

        # Create group node
        # IMPORTANT: React Flow uses 'style' for actual rendering dimensions
        # 'measured' is populated by React Flow after DOM measurement
        group_id = generate_node_id("group", group_name)
        group_node = {
            "id": group_id,
            "type": "group",
            "position": {"x": group_pos["x"], "y": group_pos["y"]},
            "data": {"label": group_name},
            "selected": False,
            "dragging": False,
            "style": {
                "width": group_width,
                "height": group_height,
            },  # Actual size for rendering
            "measured": {"width": group_width, "height": group_height},
        }
        group_nodes.append(group_node)

        # Add agents and prompts to this group
        # Child positions are relative to the group (0,0 is top-left of group content area)
        start_x = PADDING
        start_y_offset = GROUP_HEADER + PADDING  # Below header and padding

        # Get column widths for this group
        col_widths = group_col_widths[group_name]

        for j, agent in enumerate(agent_list):
            row = j // agents_per_row
            col = j % agents_per_row

            # Calculate x position based on previous columns' widths
            # Each column takes: max(col_left_width, AGENT_WIDTH) + PAIR_GAP + AGENT_WIDTH + COL_GAP
            # But we need to ensure prompts/tools don't overlap next column's agent
            # So the total column width is: col_left_width + PAIR_GAP + AGENT_WIDTH
            pair_x = start_x
            for prev_col in range(col):
                # Full width of previous column including its prompt/tool area
                prev_col_width = col_widths[prev_col] + PAIR_GAP + AGENT_WIDTH
                pair_x += prev_col_width + COL_GAP
            pair_y = start_y_offset + row * ROW_HEIGHT

            # Get this column's left width
            col_left_width = col_widths[col]

            # Prompt position (LEFT side of the column)
            prompt_x = pair_x
            prompt_y = pair_y

            # Agent position (RIGHT side, after the FULL left width for this column)
            # This ensures prompts/tools have enough space without overlapping the agent
            agent_x = pair_x + col_left_width + PAIR_GAP
            agent_y = pair_y

            # Create prompt node FIRST (to the LEFT)
            prompt_id = ""
            if agent.prompt_file:
                prompt_name = Path(agent.prompt_file).stem.replace(".prompt", "")
                prompt_full_name = f"{group_name} - {prompt_name}"
                prompt_id = generate_node_id(
                    "prompt", f"{group_name}_{agent.name}_{prompt_name}"
                )
                prompt_width = calc_text_width(prompt_full_name)
                prompt_node = {
                    "id": prompt_id,
                    "type": "prompt",
                    "position": {"x": float(prompt_x), "y": float(prompt_y)},
                    "data": create_prompt_node_data(
                        prompt_full_name, agent.prompt_file
                    ),
                    "selected": False,
                    "dragging": False,
                    "parentId": group_id,
                    "extent": "parent",
                    "measured": {
                        "width": float(prompt_width),
                        "height": float(PROMPT_HEIGHT),
                    },
                }
                child_nodes.append(prompt_node)

            # Create agent node (to the RIGHT of prompt)
            agent_id = generate_node_id("agent", f"{group_name}_{agent.name}")
            agent_node = {
                "id": agent_id,
                "type": "agent",
                "position": {"x": float(agent_x), "y": float(agent_y)},
                "data": create_agent_node_data(agent),
                "selected": False,
                "dragging": False,
                "parentId": group_id,
                "extent": "parent",
                "measured": {
                    "width": float(AGENT_WIDTH),
                    "height": float(AGENT_HEIGHT),
                },
            }
            child_nodes.append(agent_node)

            # Create edge from prompt to agent (prompt -> agent connection)
            if agent.prompt_file:
                edge_id = f"xy-edge__{prompt_id}output-{agent_id}input"
                edges.append(
                    {
                        "id": edge_id,
                        "source": prompt_id,
                        "target": agent_id,
                        "sourceHandle": "output",
                        "targetHandle": "input",
                        "animated": False,
                        "style": {"strokeWidth": 1.5, "stroke": "#64748b"},
                    }
                )

            # Handle additional prompts (stack below the main prompt)
            for k, additional_prompt in enumerate(agent.additional_prompts):
                add_prompt_name = Path(additional_prompt).stem.replace(".prompt", "")
                add_prompt_full_name = f"{group_name} - {add_prompt_name}"
                add_prompt_width = calc_text_width(add_prompt_full_name)
                add_prompt_id = generate_node_id(
                    "prompt", f"{group_name}_{agent.name}_{add_prompt_name}"
                )
                add_prompt_y = (
                    prompt_y + PROMPT_HEIGHT + TOOL_GAP + k * (PROMPT_HEIGHT + TOOL_GAP)
                )
                add_prompt_node = {
                    "id": add_prompt_id,
                    "type": "prompt",
                    "position": {"x": float(prompt_x), "y": float(add_prompt_y)},
                    "data": create_prompt_node_data(
                        add_prompt_full_name, additional_prompt
                    ),
                    "selected": False,
                    "dragging": False,
                    "parentId": group_id,
                    "extent": "parent",
                    "measured": {
                        "width": float(add_prompt_width),
                        "height": float(PROMPT_HEIGHT),
                    },
                }
                child_nodes.append(add_prompt_node)

                # Create edge from additional prompt to agent
                add_edge_id = f"xy-edge__{add_prompt_id}output-{agent_id}input"
                edges.append(
                    {
                        "id": add_edge_id,
                        "source": add_prompt_id,
                        "target": agent_id,
                        "sourceHandle": "output",
                        "targetHandle": "input",
                        "animated": False,
                        "style": {"strokeWidth": 1.5, "stroke": "#64748b"},
                    }
                )

            # Handle tools (stack below the prompt and additional prompts)
            # Calculate starting Y position for tools
            num_additional_prompts = len(agent.additional_prompts)
            tool_start_y = prompt_y + PROMPT_HEIGHT + TOOL_GAP
            if num_additional_prompts > 0:
                tool_start_y = (
                    prompt_y
                    + PROMPT_HEIGHT
                    + TOOL_GAP
                    + num_additional_prompts * (PROMPT_HEIGHT + TOOL_GAP)
                )

            for k, tool_data in enumerate(agent.tool_files):
                tool_full_name = f"{group_name} - {tool_data.name}"
                tool_width = calc_text_width(tool_full_name)
                tool_id = generate_node_id(
                    "tool", f"{group_name}_{agent.name}_{tool_data.name}"
                )
                tool_y = tool_start_y + k * (TOOL_HEIGHT + TOOL_GAP)
                tool_node = {
                    "id": tool_id,
                    "type": "tool",
                    "position": {"x": float(prompt_x), "y": float(tool_y)},
                    "data": create_tool_node_data(tool_full_name, tool_data.file_path),
                    "selected": False,
                    "dragging": False,
                    "parentId": group_id,
                    "extent": "parent",
                    "measured": {
                        "width": float(tool_width),
                        "height": float(TOOL_HEIGHT),
                    },
                }
                child_nodes.append(tool_node)

                # Create edge from tool to agent
                tool_edge_id = f"xy-edge__{tool_id}-{agent_id}input"
                edges.append(
                    {
                        "id": tool_edge_id,
                        "source": tool_id,
                        "target": agent_id,
                        "targetHandle": "input",
                        "animated": False,
                        "style": {"strokeWidth": 1.5, "stroke": "#64748b"},
                    }
                )

    # Combine nodes: group nodes first, then children (required by React Flow)
    nodes = group_nodes + child_nodes

    # Build final JSON structure
    flow_json = {
        "nodes": nodes,
        "edges": edges,
        "viewport": {"x": 0, "y": 0, "zoom": 0.3},
    }

    # Write to file
    with open(output_path, "w") as f:
        json.dump(flow_json, f, indent=2)

    print(f"Generated flow.json with {len(nodes)} nodes and {len(edges)} edges")
    print(f"Groups: {len([n for n in nodes if n['type'] == 'group'])}")
    print(f"Agents: {len([n for n in nodes if n['type'] == 'agent'])}")
    print(f"Prompts: {len([n for n in nodes if n['type'] == 'prompt'])}")
    print(f"Tools: {len([n for n in nodes if n['type'] == 'tool'])}")


def main():
    agents_md_path = "/home/mauro/projects/adkflow/scripts/agents.md"
    output_path = "/home/mauro/adkworkflows/lynx-workflow-agents/flow.json"

    print(f"Parsing {agents_md_path}...")
    agents = parse_agents_md(agents_md_path)
    print(f"Found {len(agents)} agents")

    # Debug: print unique groups
    unique_groups = sorted(set(a.group for a in agents))
    print(f"Unique groups ({len(unique_groups)}): {unique_groups}")

    # Count agents per group
    group_counts = {}
    for a in agents:
        group_counts[a.group] = group_counts.get(a.group, 0) + 1
    print(f"Agents per group: {group_counts}")

    print(f"\nGenerating {output_path}...")
    generate_flow_json(agents, output_path)
    print("Done!")


if __name__ == "__main__":
    main()
