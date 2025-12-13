#!/usr/bin/env python3
"""
Generate ADKFlow multi-page project from agents.md

This script parses the agents.md file (Lynx ADK Agents Registry) and creates
a complete ADKFlow project with multiple tabs (pages), each containing
React Flow nodes for agents, prompts, tools, groups, and edges.

================================================================================
SOURCE DATA
================================================================================

The script reads from:
    /home/mauro/projects/adkflow/scripts/agents.md

This file contains definitions for 127 agents across 6 modules:
    - DocPrep (2 agents): Document preparation and enrichment
    - CAGX (4 agents): Customizable Agent Generation eXtended
    - SRAG (2 agents): Semantic/Simple RAG retrieval
    - LynxTool (2 agents): Inference and synthesis
    - Specialists (92 agents): 23 specialist types × 4 agents each
      (retriever, analyst, benchmarker, reporter)
    - Compiler (25 agents): 23 scorers + consolidator + reporter

================================================================================
OUTPUT STRUCTURE
================================================================================

The script generates a multi-page ADKFlow project at:
    ~/adkworkflows/lynx/

Directory structure:
    lynx/
    ├── manifest.json              # Project metadata (v2.0 format)
    └── pages/
        ├── page_docprep.json      # DocPrep module (1 group, 2 agents)
        ├── page_cagx.json         # CAGX module (1 group, 4 agents)
        ├── page_srag.json         # SRAG module (1 group, 2 agents)
        ├── page_specialists.json  # All 23 specialists (23 groups, 92 agents)
        ├── page_compiler.json     # Compiler module (1 group, 25 agents)
        └── page_lynxtool.json     # LynxTool module (1 group, 2 agents)

================================================================================
TAB ORGANIZATION
================================================================================

Tab 0: DocPrep
    - 1 visual group containing 2 agents
    - Agents: metadata_extractor, document_enricher

Tab 1: CAGX
    - 1 visual group containing 4 agents
    - Agents: FinancialResearcher, BatchFinancialResearcher,
              MetadataExtractor, ConsolidationJudge

Tab 2: SRAG
    - 1 visual group containing 2 agents
    - Agents: retrieval_analyst, csv_generator

Tab 3: Specialists
    - 23 visual groups (one per specialist type)
    - Each group contains 4 agents: retriever, analyst, benchmarker, reporter
    - Groups arranged in a 4-column grid layout
    - Specialist types: altmanz, assets, benford, business_model, cash,
      cf_dechow, cf_jones, credit, governance, growth, gunny, income,
      interim, investing, jones, margins, miscellaneous, mscore, piotroski,
      roychowdhury, smoothing, valuation, working_capital

Tab 4: Compiler
    - 1 visual group containing 25 agents
    - Agents: 23 scorer agents (scorer_altmanz, scorer_assets, etc.)
              + compiler_consolidator + compiler_reporter
    - 3 agents per row layout

Tab 5: LynxTool
    - 1 visual group containing 2 agents
    - Agents: workflow_retrieval, workflow_synthesis

================================================================================
NODE TYPES
================================================================================

The script generates the following React Flow node types:

1. GROUP nodes
   - Visual containers for organizing agents
   - Auto-sized based on contained nodes
   - Named after the module/specialist

2. AGENT nodes
   - Represent LLM agents with model, temperature, tools config
   - Include HTTP options, planner settings, transfer controls
   - Position: right side of prompt/tool column

3. PROMPT nodes
   - Reference prompt template files (.prompt.md)
   - Connected to agents via edges
   - Position: left side, stacked vertically

4. TOOL nodes
   - Reference Python tool files (.py)
   - Include the tool source code
   - Connected to agents via edges
   - Position: below prompts, stacked vertically

================================================================================
EDGE CONNECTIONS
================================================================================

Edges connect:
    - Prompt nodes → Agent nodes (sourceHandle: output, targetHandle: input)
    - Tool nodes → Agent nodes (targetHandle: input)

Edge styling: strokeWidth 1.5, stroke color #64748b

================================================================================
USAGE
================================================================================

Run the script directly:
    python scripts/generate_flow.py

Or import and call:
    from scripts.generate_flow import parse_agents_md, generate_project
    agents = parse_agents_md("/path/to/agents.md")
    generate_project(agents, "/path/to/output")

================================================================================
MANIFEST FORMAT (v2.0)
================================================================================

{
    "version": "2.0",
    "name": "Lynx Agents",
    "tabs": [
        {"id": "page_docprep", "name": "DocPrep", "order": 0},
        {"id": "page_cagx", "name": "CAGX", "order": 1},
        ...
    ]
}

================================================================================
LAYOUT CONSTANTS
================================================================================

Node dimensions:
    - Agent: 300×140 px
    - Prompt: text-width × 30 px
    - Tool: text-width × 30 px

Spacing:
    - PAIR_GAP: 15px (between prompt/tool column and agent)
    - COL_GAP: 30px (between agent-prompt pairs)
    - ROW_GAP: 50px (between rows)
    - GROUP_GAP: 80px (between groups)
    - PADDING: 40px (inside group)
    - GROUP_HEADER: 30px (height of group label)

Text width calculation: len(text) × 7px + 30px padding

================================================================================
"""

import json
import os
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional


# =============================================================================
# Data Classes
# =============================================================================


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


@dataclass
class TabDefinition:
    """Represents a tab/page in the ADKFlow project"""

    id: str
    name: str
    order: int
    groups: list[str]  # Group names that belong to this tab


# =============================================================================
# Constants
# =============================================================================

# Known specialist names (23 total)
SPECIALIST_NAMES = [
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

# Tab definitions with their group mappings
TABS = [
    TabDefinition("page_docprep", "DocPrep", 0, ["DocPrep"]),
    TabDefinition("page_cagx", "CAGX", 1, ["CAGX"]),
    TabDefinition("page_srag", "SRAG", 2, ["SRAG"]),
    TabDefinition("page_specialists", "Specialists", 3, SPECIALIST_NAMES),
    TabDefinition("page_compiler", "Compiler", 4, ["Compiler"]),
    TabDefinition("page_lynxtool", "LynxTool", 5, ["LynxTool"]),
]


# =============================================================================
# Helper Functions
# =============================================================================


def generate_node_id(prefix: str, name: str) -> str:
    """Generate a unique node ID"""
    safe_name = re.sub(r"[^a-zA-Z0-9_]", "_", name.lower())
    return f"{prefix}_{safe_name}"


# =============================================================================
# Parsing Functions
# =============================================================================


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

    known_specialists = set(SPECIALIST_NAMES)

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


# =============================================================================
# Node Data Creation Functions
# =============================================================================


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


# =============================================================================
# Layout Calculation Functions
# =============================================================================

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


# =============================================================================
# Page Generation Functions
# =============================================================================


def generate_page_json(agents: list[AgentData], tab: TabDefinition) -> dict:
    """
    Generate a ReactFlow JSON for a single page/tab.
    Returns the flow structure with nodes, edges, and viewport.
    """
    nodes = []
    edges = []

    ROW_HEIGHT = AGENT_HEIGHT + ROW_GAP

    # Group agents by their group name
    groups = {}
    for agent in agents:
        if agent.group not in groups:
            groups[agent.group] = []
        groups[agent.group].append(agent)

    # Pre-calculate all group sizes and column widths
    group_sizes = {}
    group_col_widths = {}
    for group_name, agent_list in groups.items():
        agents_per_row = get_agents_per_row(group_name)
        width, height, col_widths = calc_group_content_size(
            agent_list, agents_per_row, group_name
        )
        group_sizes[group_name] = (width, height)
        group_col_widths[group_name] = col_widths

    # Calculate group positions based on tab type
    group_positions = {}

    if tab.id == "page_specialists":
        # Specialists page: arrange groups in a grid (4 columns)
        cols = 4
        specialist_groups = [g for g in tab.groups if g in groups]

        # Find max dimensions for uniform grid
        max_width = (
            max(group_sizes.get(g, (0, 0))[0] for g in specialist_groups)
            if specialist_groups
            else 0
        )
        max_height = (
            max(group_sizes.get(g, (0, 0))[1] for g in specialist_groups)
            if specialist_groups
            else 0
        )

        col_spacing = max_width + GROUP_GAP
        row_spacing = max_height + GROUP_GAP

        for idx, group_name in enumerate(specialist_groups):
            col = idx % cols
            row = idx // cols
            group_positions[group_name] = {
                "x": 100.0 + col * col_spacing,
                "y": 100.0 + row * row_spacing,
            }
    elif tab.id == "page_compiler":
        # Compiler page: single group, centered
        if "Compiler" in groups:
            group_positions["Compiler"] = {"x": 100.0, "y": 100.0}
    else:
        # Core module pages (DocPrep, CAGX, SRAG, LynxTool): single group each
        x_offset = 100.0
        for group_name in tab.groups:
            if group_name in groups:
                group_positions[group_name] = {"x": x_offset, "y": 100.0}
                x_offset += group_sizes[group_name][0] + GROUP_GAP

    # Collect all group nodes first (parents must come before children)
    group_nodes = []
    child_nodes = []

    # Create nodes for each group
    for group_name, agent_list in groups.items():
        if group_name not in group_positions:
            # Fallback position for unknown groups
            group_positions[group_name] = {"x": 100.0, "y": 100.0}

        group_pos = group_positions[group_name]
        group_width, group_height = group_sizes[group_name]
        agents_per_row = get_agents_per_row(group_name)

        # Create group node
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
            },
            "measured": {"width": group_width, "height": group_height},
        }
        group_nodes.append(group_node)

        # Get column widths for this group
        col_widths = group_col_widths[group_name]

        # Add agents and prompts to this group
        start_x = PADDING
        start_y_offset = GROUP_HEADER + PADDING

        for j, agent in enumerate(agent_list):
            row = j // agents_per_row
            col = j % agents_per_row

            # Calculate x position based on previous columns' widths
            pair_x = start_x
            for prev_col in range(col):
                prev_col_width = col_widths[prev_col] + PAIR_GAP + AGENT_WIDTH
                pair_x += prev_col_width + COL_GAP
            pair_y = start_y_offset + row * ROW_HEIGHT

            # Get this column's left width
            col_left_width = col_widths[col]

            # Prompt position (LEFT side of the column)
            prompt_x = pair_x
            prompt_y = pair_y

            # Agent position (RIGHT side)
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

            # Create edge from prompt to agent
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
    return {
        "nodes": nodes,
        "edges": edges,
        "viewport": {"x": 0, "y": 0, "zoom": 0.5},
    }


def generate_manifest(project_name: str = "Lynx Agents") -> dict:
    """Generate the manifest.json structure"""
    return {
        "version": "2.0",
        "name": project_name,
        "tabs": [{"id": tab.id, "name": tab.name, "order": tab.order} for tab in TABS],
    }


# =============================================================================
# Project Generation
# =============================================================================


def generate_project(agents: list[AgentData], output_dir: str):
    """Generate the complete multi-page ADKFlow project"""
    # Create output directories
    pages_dir = os.path.join(output_dir, "pages")
    os.makedirs(pages_dir, exist_ok=True)

    # Generate manifest.json
    manifest = generate_manifest("Lynx Agents")
    manifest_path = os.path.join(output_dir, "manifest.json")
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)
    print(f"Generated {manifest_path}")

    # For each tab, filter agents and generate page JSON
    total_nodes = 0
    total_edges = 0

    for tab in TABS:
        # Filter agents that belong to this tab's groups
        tab_agents = [a for a in agents if a.group in tab.groups]

        if not tab_agents:
            print(f"Skipping {tab.name} (no agents)")
            continue

        # Generate page JSON
        page_json = generate_page_json(tab_agents, tab)

        # Write page file
        page_path = os.path.join(pages_dir, f"{tab.id}.json")
        with open(page_path, "w") as f:
            json.dump(page_json, f, indent=2)

        # Count stats
        num_nodes = len(page_json["nodes"])
        num_edges = len(page_json["edges"])
        num_groups = len([n for n in page_json["nodes"] if n["type"] == "group"])
        num_agents = len([n for n in page_json["nodes"] if n["type"] == "agent"])

        total_nodes += num_nodes
        total_edges += num_edges

        print(
            f"Generated {page_path}: {num_groups} groups, {num_agents} agents, "
            f"{num_nodes} total nodes, {num_edges} edges"
        )

    print(f"\nTotal: {total_nodes} nodes, {total_edges} edges across {len(TABS)} tabs")


# =============================================================================
# Main Entry Point
# =============================================================================


def main():
    agents_md_path = "/home/mauro/projects/adkflow/scripts/agents.md"
    output_dir = "/home/mauro/adkworkflows/lynx"

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

    print(f"\nGenerating project at {output_dir}...")
    generate_project(agents, output_dir)
    print("Done!")


if __name__ == "__main__":
    main()
