"""Topology visualization for ADKFlow workflows.

Renders the compiled WorkflowIR as Mermaid diagrams or ASCII trees,
showing how agents are grouped and executed (SequentialAgent, ParallelAgent, LoopAgent).
"""

from adkflow_runner.ir import AgentIR, UserInputIR, WorkflowIR


def render_mermaid(ir: WorkflowIR) -> str:
    """Convert WorkflowIR to Mermaid flowchart diagram.

    Shows the agent hierarchy with wrapper agents as subgraphs.
    """
    lines: list[str] = ["flowchart TD"]
    styles: list[str] = []  # Collect styles to add at the end
    node_counter = {"count": 0}

    def get_node_id() -> str:
        node_counter["count"] += 1
        return f"N{node_counter['count']}"

    # Track connections for sequential agents
    connections: list[tuple[str, str]] = []

    def render_agent(agent: AgentIR, indent: str = "    ") -> tuple[str, str]:
        """Recursively render an agent and its subagents.

        Returns: (node_id, last_leaf_id) - the node/subgraph ID and the last
        leaf node ID for making outgoing connections.
        """
        node_id = get_node_id()

        if agent.is_composite():
            # Composite agents become subgraphs
            wrapper_label = _get_wrapper_label(agent)
            lines.append(f'{indent}subgraph {node_id}["{wrapper_label}"]')

            child_results: list[tuple[str, str]] = []
            for subagent in agent.subagents:
                result = render_agent(subagent, indent + "    ")
                child_results.append(result)

            child_ids = [r[0] for r in child_results]

            # Add connections based on agent type
            if agent.type == "sequential" and len(child_ids) > 1:
                for i in range(len(child_ids) - 1):
                    connections.append((child_ids[i], child_ids[i + 1]))
            elif agent.type == "loop" and child_ids:
                # Loop back arrow
                connections.append((child_ids[-1], child_ids[0]))

            lines.append(f"{indent}end")
            # Style for subgraph - add to styles list (applied after all definitions)
            styles.append(f"style {node_id} fill:#e0f2fe,stroke:#0284c7")

            # Return the last leaf node for outgoing connections
            last_leaf = child_results[-1][1] if child_results else node_id
            return (node_id, last_leaf)
        else:
            # LLM agents become nodes
            label = _get_agent_label(agent)
            lines.append(f'{indent}{node_id}["{label}"]')
            # Style for node - add to styles list
            styles.append(f"style {node_id} fill:#4ade80")
            return (node_id, node_id)  # Leaf node: both IDs are the same

    # Render the root agent
    root_id, last_leaf_id = render_agent(ir.root_agent)

    # Find user inputs that are pause points (not triggers)
    pause_inputs = [ui for ui in ir.user_inputs if not ui.is_trigger]

    # Add user input pause points after the root
    # Use last_leaf_id for connections (not subgraph ID)
    current_leaf = last_leaf_id
    for ui in pause_inputs:
        ui_id = get_node_id()
        ui_label = _get_user_input_label(ui)
        lines.append(f'    {ui_id}{{{{"{ui_label}"}}}}')
        styles.append(f"style {ui_id} fill:#fbbf24")
        connections.append((current_leaf, ui_id))

        # Find downstream agents
        for agent_id in ui.outgoing_agent_ids:
            agent = ir.get_agent(agent_id)
            if agent:
                _, downstream_leaf = render_agent(agent)
                connections.append((ui_id, downstream_leaf))
                current_leaf = downstream_leaf

    # Add output files
    for out_file in ir.output_files:
        out_id = get_node_id()
        file_name = out_file.file_path.split("/")[-1]
        lines.append(f'    {out_id}[/"{file_name}"/]')
        styles.append(f"style {out_id} fill:#60a5fa")
        # Connect from the last leaf node (actual agent, not subgraph)
        connections.append((current_leaf, out_id))

    # Add all connections
    for src, dst in connections:
        lines.append(f"    {src} --> {dst}")

    # Add all styles at the end (after all node/subgraph definitions)
    for style in styles:
        lines.append(f"    {style}")

    return "\n".join(lines)


def render_ascii(ir: WorkflowIR) -> str:
    """Convert WorkflowIR to ASCII tree representation.

    Shows the agent hierarchy with indentation for wrapper agents.
    """
    lines: list[str] = []

    # Get workflow name from metadata or project path
    name = ir.metadata.get("name", "Workflow")
    if ir.project_path:
        name = ir.project_path.rstrip("/").split("/")[-1]
    lines.append(name)

    def render_agent(
        agent: AgentIR, prefix: str = "", is_last: bool = True, depth: int = 0
    ) -> None:
        """Recursively render an agent and its subagents."""
        connector = "└── " if is_last else "├── "
        child_prefix = prefix + ("    " if is_last else "│   ")

        if agent.is_composite():
            # Composite agent header
            wrapper_info = _get_wrapper_info(agent)
            lines.append(f"{prefix}{connector}{wrapper_info}")

            # Render subagents
            for i, subagent in enumerate(agent.subagents):
                is_last_child = i == len(agent.subagents) - 1
                render_agent(subagent, child_prefix, is_last_child, depth + 1)
        else:
            # LLM agent
            agent_info = _get_agent_info(agent)
            lines.append(f"{prefix}{connector}{agent_info}")

    # Check if root is a wrapper or single agent
    if ir.root_agent.is_composite():
        wrapper_info = _get_wrapper_info(ir.root_agent)
        lines.append(wrapper_info)
        for i, subagent in enumerate(ir.root_agent.subagents):
            is_last = i == len(ir.root_agent.subagents) - 1 and not ir.user_inputs
            render_agent(subagent, "", is_last, 0)
    else:
        agent_info = _get_agent_info(ir.root_agent)
        lines.append(f"├── {agent_info}")

    # Add user input pause points
    pause_inputs = [ui for ui in ir.user_inputs if not ui.is_trigger]
    for i, ui in enumerate(pause_inputs):
        is_last_ui = i == len(pause_inputs) - 1 and not ir.output_files
        connector = "└── " if is_last_ui else "├── "
        lines.append(f"{connector}{_get_user_input_info(ui)}")

        # Render downstream agents
        for j, agent_id in enumerate(ui.outgoing_agent_ids):
            agent = ir.get_agent(agent_id)
            if agent:
                is_last_downstream = j == len(ui.outgoing_agent_ids) - 1
                child_prefix = "    " if is_last_ui else "│   "
                render_agent(agent, child_prefix, is_last_downstream, 1)

    # Add output files
    for i, out_file in enumerate(ir.output_files):
        is_last = i == len(ir.output_files) - 1
        connector = "└── " if is_last else "├── "
        lines.append(f"{connector}→ {out_file.file_path}")

    return "\n".join(lines)


def _get_wrapper_label(agent: AgentIR) -> str:
    """Get Mermaid label for a wrapper agent.

    Note: Avoid emojis and special characters - they break Mermaid parsing.
    """
    if agent.type == "sequential":
        return "SequentialAgent"
    elif agent.type == "parallel":
        return "ParallelAgent"
    elif agent.type == "loop":
        return f"LoopAgent max:{agent.max_iterations}"
    return agent.name


def _get_wrapper_info(agent: AgentIR) -> str:
    """Get ASCII info line for a wrapper agent."""
    if agent.type == "sequential":
        return "SequentialAgent"
    elif agent.type == "parallel":
        return "ParallelAgent"
    elif agent.type == "loop":
        return f"LoopAgent (max_iterations: {agent.max_iterations})"
    return agent.name


def _escape_mermaid(text: str) -> str:
    """Escape special characters that break Mermaid parsing.

    Mermaid uses {} for rhombus shapes, so we must escape them.
    Also escapes other problematic characters.
    """
    # Replace curly braces with parentheses (Mermaid uses {} for shapes)
    text = text.replace("{", "(").replace("}", ")")
    # Remove any other problematic characters
    text = text.replace('"', "'").replace("<", "").replace(">", "")
    return text


def _get_agent_label(agent: AgentIR) -> str:
    """Get Mermaid label for an LLM agent."""
    label = agent.name
    if agent.output_key:
        # Escape output_key since it often contains curly braces like {poem}
        escaped_key = _escape_mermaid(agent.output_key)
        label += f" {escaped_key}"
    return label


def _get_agent_info(agent: AgentIR) -> str:
    """Get ASCII info line for an LLM agent."""
    parts = [f"{agent.name} ({agent.type}, {agent.model})"]
    if agent.output_key:
        parts[0] += f" → {agent.output_key}"
    return parts[0]


def _get_user_input_label(ui: UserInputIR) -> str:
    """Get Mermaid label for a user input node.

    Note: Avoid emojis - they break Mermaid parsing.
    """
    return f"UserInput: {ui.name} {int(ui.timeout_seconds)}s"


def _get_user_input_info(ui: UserInputIR) -> str:
    """Get ASCII info line for a user input node."""
    behavior = ui.timeout_behavior
    return f"⏸ {ui.name} (timeout: {int(ui.timeout_seconds)}s, on_timeout: {behavior})"
