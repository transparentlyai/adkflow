"""Code Analysis Tools for ADKFlow Scanner

This module provides tools for deep analysis of agent code, extracting
configuration details, and determining relationships between agents, prompts,
and tools.

These tools use Python AST parsing to extract structured information from
agent definitions and build a comprehensive understanding of the agent architecture.
"""

import ast
from pathlib import Path
from typing import Any

from google.adk.tools import ToolContext


def analyze_agent_code(
    tool_context: ToolContext,
    file_path: str,
    agent_name: str | None = None,
) -> dict[str, Any]:
    """Deep analyze an agent definition to extract configuration.

    Parses Python AST to extract detailed agent configuration including:
    - name, model, temperature
    - tools list
    - sub_agents list
    - instruction/prompt references
    - output_schema, output_key
    - planner config
    - callbacks

    Args:
        tool_context: ToolContext containing state with 'codebase_path'
        file_path: Path to Python file containing agent definition
        agent_name: Optional specific agent name to analyze (if file has multiple)

    Returns:
        dict: {
            "status": "success" | "error",
            "agents": [
                {
                    "name": str,
                    "type": str,  # "LlmAgent", "SequentialAgent", etc.
                    "model": str | None,
                    "temperature": float | None,
                    "tools": list[str],
                    "sub_agents": list[str],
                    "instruction": str | None,  # Direct instruction text
                    "prompt_file": str | None,  # Path to prompt file
                    "output_schema": str | None,
                    "output_key": str | None,
                    "planner": dict | None,  # Planner configuration
                    "callbacks": list[str],  # Callback function names
                    "other_params": dict,  # Other parameters found
                },
                ...
            ],
            "imports": list[str],  # Import statements found
            "error": str  # Only present if status="error"
        }

    Example:
        >>> analyze_agent_code(context, "workflow/agent.py")
        {
            "status": "success",
            "agents": [
                {
                    "name": "researcher",
                    "type": "LlmAgent",
                    "model": "gemini-2.0-flash-exp",
                    "temperature": 0.7,
                    "tools": ["search", "read_file"],
                    "sub_agents": [],
                    "prompt_file": "prompts/researcher.prompt.md",
                    ...
                }
            ],
            "imports": ["from google.adk import LlmAgent", ...]
        }
    """
    try:
        # Get codebase path from context state
        codebase_path = Path(tool_context.state.get("codebase_path", "."))

        # Resolve file path
        target_path = Path(file_path)
        if not target_path.is_absolute():
            target_path = codebase_path / target_path

        # Verify file exists
        if not target_path.exists():
            return {
                "status": "error",
                "error": f"File does not exist: {file_path}",
                "agents": [],
                "imports": [],
            }

        # Read and parse file
        try:
            with open(target_path, encoding="utf-8") as f:
                source_code = f.read()

            tree = ast.parse(source_code, filename=str(target_path))
        except SyntaxError as e:
            return {
                "status": "error",
                "error": f"Syntax error in file: {e}",
                "agents": [],
                "imports": [],
            }

        # Extract imports
        imports = []
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    imports.append(f"import {alias.name}")
            elif isinstance(node, ast.ImportFrom):
                module = node.module or ""
                for alias in node.names:
                    imports.append(f"from {module} import {alias.name}")

        # Find agent instantiations
        agents = []
        agent_types = [
            "LlmAgent",
            "Agent",
            "SequentialAgent",
            "ParallelAgent",
            "LoopAgent",
        ]

        for node in ast.walk(tree):
            # Look for function calls that match agent types
            if isinstance(node, ast.Call):
                agent_type = None

                # Check if it's a direct agent constructor call
                if isinstance(node.func, ast.Name) and node.func.id in agent_types:
                    agent_type = node.func.id
                # Check if it's a module.Agent call (e.g., adk.LlmAgent)
                elif isinstance(node.func, ast.Attribute) and node.func.attr in agent_types:
                    agent_type = node.func.attr

                if agent_type:
                    agent_config = _extract_agent_config(node, agent_type, source_code)

                    # Filter by agent_name if specified
                    if agent_name is None or agent_config.get("name") == agent_name:
                        agents.append(agent_config)

        return {
            "status": "success",
            "agents": agents,
            "imports": imports,
        }

    except Exception as e:
        return {
            "status": "error",
            "error": f"Unexpected error analyzing agent code: {str(e)}",
            "agents": [],
            "imports": [],
        }


def _extract_agent_config(call_node: ast.Call, agent_type: str, source_code: str) -> dict[str, Any]:
    """Extract configuration from an Agent() call node.

    Args:
        call_node: AST Call node representing agent instantiation
        agent_type: Type of agent (e.g., "LlmAgent")
        source_code: Original source code for extracting string values

    Returns:
        dict: Agent configuration dictionary
    """
    config = {
        "type": agent_type,
        "name": None,
        "model": None,
        "temperature": None,
        "tools": [],
        "sub_agents": [],
        "instruction": None,
        "prompt_file": None,
        "output_schema": None,
        "output_key": None,
        "planner": None,
        "callbacks": [],
        "other_params": {},
    }

    # Extract keyword arguments
    for keyword in call_node.keywords:
        arg_name = keyword.arg
        arg_value = keyword.value

        if arg_name == "name":
            config["name"] = _extract_value(arg_value, source_code)
        elif arg_name == "model":
            config["model"] = _extract_value(arg_value, source_code)
        elif arg_name == "temperature":
            config["temperature"] = _extract_value(arg_value, source_code)
        elif arg_name == "tools":
            config["tools"] = _extract_list_values(arg_value, source_code)
        elif arg_name == "sub_agents":
            config["sub_agents"] = _extract_list_values(arg_value, source_code)
        elif arg_name == "instruction":
            config["instruction"] = _extract_value(arg_value, source_code)
        elif arg_name == "prompt":
            # Prompt can be a file path or inline text
            prompt_value = _extract_value(arg_value, source_code)
            if prompt_value and ".prompt.md" in prompt_value:
                config["prompt_file"] = prompt_value
            else:
                config["instruction"] = prompt_value
        elif arg_name == "output_schema":
            config["output_schema"] = _extract_value(arg_value, source_code)
        elif arg_name == "output_key":
            config["output_key"] = _extract_value(arg_value, source_code)
        elif arg_name == "planner":
            config["planner"] = _extract_dict_values(arg_value, source_code)
        elif arg_name in ["on_success", "on_error", "on_complete"]:
            callback_value = _extract_value(arg_value, source_code)
            if callback_value:
                config["callbacks"].append(f"{arg_name}: {callback_value}")
        else:
            # Store other parameters
            config["other_params"][arg_name] = _extract_value(arg_value, source_code)

    return config


def _extract_value(node: ast.AST, source_code: str) -> Any:
    """Extract value from an AST node.

    Args:
        node: AST node to extract value from
        source_code: Original source code

    Returns:
        Extracted value (str, int, float, bool, or None)
    """
    if isinstance(node, ast.Constant):
        return node.value
    elif isinstance(node, ast.Str):  # Python 3.7 compatibility
        return node.s
    elif isinstance(node, ast.Num):  # Python 3.7 compatibility
        return node.n
    elif isinstance(node, ast.Name):
        return node.id
    elif isinstance(node, ast.Attribute):
        # For things like Path("file.txt") or module.CONSTANT
        return ast.get_source_segment(source_code, node) or str(node.attr)
    elif isinstance(node, ast.Call):
        # For function calls like Path("file.txt")
        segment = ast.get_source_segment(source_code, node)
        if segment:
            return segment
        return None
    else:
        # Try to get source segment for complex expressions
        segment = ast.get_source_segment(source_code, node)
        return segment if segment else None


def _extract_list_values(node: ast.AST, source_code: str) -> list[Any]:
    """Extract list values from an AST node.

    Args:
        node: AST node representing a list
        source_code: Original source code

    Returns:
        List of extracted values
    """
    if isinstance(node, ast.List | ast.Tuple):
        return [_extract_value(elem, source_code) for elem in node.elts]
    elif isinstance(node, ast.Name):
        # Reference to a list variable
        return [node.id]
    else:
        # Try to extract as source segment
        segment = ast.get_source_segment(source_code, node)
        return [segment] if segment else []


def _extract_dict_values(node: ast.AST, source_code: str) -> dict[str, Any] | None:
    """Extract dictionary values from an AST node.

    Args:
        node: AST node representing a dict
        source_code: Original source code

    Returns:
        Dictionary of extracted values or None
    """
    if isinstance(node, ast.Dict):
        result = {}
        for key, value in zip(node.keys, node.values, strict=True):
            key_str = _extract_value(key, source_code)
            value_val = _extract_value(value, source_code)
            if key_str:
                result[str(key_str)] = value_val
        return result
    else:
        # Return source segment for complex dict expressions
        segment = ast.get_source_segment(source_code, node)
        return {"_raw": segment} if segment else None


def extract_relationships(
    tool_context: ToolContext,
    agents: list[dict],
) -> dict[str, Any]:
    """Extract relationships between discovered agents.

    Analyzes agent configurations to determine:
    - Parent-child relationships (via sub_agents)
    - Agent-prompt associations
    - Agent-tool associations
    - Logical groupings (by module/directory)

    Args:
        tool_context: ToolContext (for consistency, though not currently used)
        agents: List of agent configuration dictionaries from analyze_agent_code

    Returns:
        dict: {
            "status": "success" | "error",
            "parent_child": list[tuple[str, str]],  # [(parent, child), ...]
            "agent_prompts": list[tuple[str, str]],  # [(agent, prompt_path), ...]
            "agent_tools": list[tuple[str, str]],  # [(agent, tool_name), ...]
            "groups": [
                {
                    "name": str,  # Group name (e.g., module or directory)
                    "members": list[str],  # Agent names in this group
                },
                ...
            ],
            "error": str  # Only present if status="error"
        }

    Example:
        >>> extract_relationships(context, agents)
        {
            "status": "success",
            "parent_child": [
                ("orchestrator", "researcher"),
                ("orchestrator", "writer")
            ],
            "agent_prompts": [
                ("researcher", "prompts/research.prompt.md")
            ],
            "agent_tools": [
                ("researcher", "search"),
                ("researcher", "read_file")
            ],
            "groups": [
                {
                    "name": "workflow",
                    "members": ["orchestrator", "researcher", "writer"]
                }
            ]
        }
    """
    try:
        parent_child = []
        agent_prompts = []
        agent_tools = []
        groups_dict = {}

        for agent in agents:
            agent_name = agent.get("name")
            if not agent_name:
                continue

            # Extract parent-child relationships
            sub_agents = agent.get("sub_agents", [])
            for sub_agent in sub_agents:
                if sub_agent:
                    parent_child.append((agent_name, sub_agent))

            # Extract agent-prompt associations
            prompt_file = agent.get("prompt_file")
            if prompt_file:
                agent_prompts.append((agent_name, prompt_file))

            # Extract agent-tool associations
            tools = agent.get("tools", [])
            for tool in tools:
                if tool:
                    agent_tools.append((agent_name, tool))

            # Group agents by module/directory
            # Use the file_path if available in agent dict, otherwise use "default"
            file_path = agent.get("file_path", "")
            if file_path:
                # Extract module name from file path (e.g., "workflow/agent.py" -> "workflow")
                parts = Path(file_path).parts
                module = parts[0] if len(parts) > 1 else "root"
            else:
                module = "ungrouped"

            if module not in groups_dict:
                groups_dict[module] = []
            groups_dict[module].append(agent_name)

        # Convert groups dict to list format
        groups = [{"name": name, "members": members} for name, members in groups_dict.items()]

        return {
            "status": "success",
            "parent_child": parent_child,
            "agent_prompts": agent_prompts,
            "agent_tools": agent_tools,
            "groups": groups,
        }

    except Exception as e:
        return {
            "status": "error",
            "error": f"Unexpected error extracting relationships: {str(e)}",
            "parent_child": [],
            "agent_prompts": [],
            "agent_tools": [],
            "groups": [],
        }
