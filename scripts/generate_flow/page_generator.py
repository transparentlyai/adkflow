"""Page/tab JSON generation functions."""

from pathlib import Path

from scripts.generate_flow.models import (
    AgentData,
    TabDefinition,
    TABS,
    generate_node_id,
)
from scripts.generate_flow.node_builders import (
    create_agent_node_data,
    create_prompt_node_data,
    create_tool_node_data,
)
from scripts.generate_flow.layout import (
    AGENT_WIDTH,
    AGENT_HEIGHT,
    PROMPT_HEIGHT,
    TOOL_HEIGHT,
    PAIR_GAP,
    COL_GAP,
    ROW_GAP,
    PADDING,
    GROUP_HEADER,
    GROUP_GAP,
    TOOL_GAP,
    calc_text_width,
    get_agents_per_row,
    calc_group_content_size,
)


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
