"""Markdown parsing functions for agents.md."""

import re

from scripts.generate_flow.models import AgentData, ToolData, SPECIALIST_NAMES


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
