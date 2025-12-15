"""YAML workflow parser and validator for ADKFlow."""

import yaml
from pathlib import Path
from typing import Any
from rich.console import Console

console = Console()


def parse_workflow(yaml_path: str) -> dict:
    """Parse a workflow YAML file.

    Args:
        yaml_path: Path to the workflow YAML file

    Returns:
        Parsed workflow as a dictionary

    Raises:
        FileNotFoundError: If the file doesn't exist
        yaml.YAMLError: If the file is not valid YAML
    """
    path = Path(yaml_path)

    if not path.exists():
        raise FileNotFoundError(f"Workflow file not found: {yaml_path}")

    with open(path, "r") as f:
        try:
            workflow = yaml.safe_load(f)
            if workflow is None:
                raise ValueError("Empty YAML file")
            return workflow
        except yaml.YAMLError as e:
            raise ValueError(f"Invalid YAML: {str(e)}")


def validate_workflow(workflow: dict) -> bool:
    """Validate a parsed workflow dictionary.

    Args:
        workflow: Parsed workflow dictionary

    Returns:
        True if valid, False otherwise
    """
    if not isinstance(workflow, dict):
        console.print("[red]Error: Workflow must be a dictionary[/red]")
        return False

    # Check required top-level fields
    if "name" not in workflow:
        console.print("[red]Error: Workflow must have a 'name' field[/red]")
        return False

    if "agents" not in workflow:
        console.print("[red]Error: Workflow must have an 'agents' field[/red]")
        return False

    # Validate agents structure
    agents = workflow["agents"]
    if not isinstance(agents, list):
        console.print("[red]Error: 'agents' must be a list[/red]")
        return False

    if len(agents) == 0:
        console.print("[red]Error: Workflow must have at least one agent[/red]")
        return False

    # Validate each agent
    for i, agent in enumerate(agents):
        if not isinstance(agent, dict):
            console.print(f"[red]Error: Agent {i} must be a dictionary[/red]")
            return False

        # Check required agent fields
        if "name" not in agent:
            console.print(f"[red]Error: Agent {i} must have a 'name' field[/red]")
            return False

        if "type" not in agent:
            console.print(f"[red]Error: Agent {i} must have a 'type' field[/red]")
            return False

        # Validate agent type
        valid_types = ["sequential", "parallel", "llm"]
        if agent["type"] not in valid_types:
            console.print(f"[red]Error: Agent {i} has invalid type '{agent['type']}'. Must be one of: {', '.join(valid_types)}[/red]")
            return False

        # For sequential/parallel agents, check for steps
        if agent["type"] in ["sequential", "parallel"]:
            if "steps" not in agent:
                console.print(f"[red]Error: Agent {i} (type={agent['type']}) must have 'steps'[/red]")
                return False

            if not isinstance(agent["steps"], list):
                console.print(f"[red]Error: Agent {i} 'steps' must be a list[/red]")
                return False

        # For llm agents, check for required fields
        if agent["type"] == "llm":
            if "model" not in agent:
                console.print(f"[red]Error: Agent {i} (type=llm) must have 'model' field[/red]")
                return False

            if "instruction" not in agent:
                console.print(f"[red]Error: Agent {i} (type=llm) must have 'instruction' field[/red]")
                return False

    return True


def extract_variables(workflow: dict) -> list:
    """Extract all variable placeholders from a workflow.

    Scans the workflow dictionary for {variable} patterns and returns
    a list of unique variable names.

    Args:
        workflow: Parsed workflow dictionary

    Returns:
        List of unique variable names found in the workflow
    """
    from adkflow.variable_resolver import extract_variable_names

    variables = set()

    def scan_value(value: Any):
        """Recursively scan a value for variable patterns."""
        if isinstance(value, str):
            variables.update(extract_variable_names(value))
        elif isinstance(value, dict):
            for v in value.values():
                scan_value(v)
        elif isinstance(value, list):
            for item in value:
                scan_value(item)

    scan_value(workflow)
    return sorted(list(variables))
