"""Node data creation functions for ReactFlow nodes."""

from scripts.generate_flow.models import AgentData, generate_node_id


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
