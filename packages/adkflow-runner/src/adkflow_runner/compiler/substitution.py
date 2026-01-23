"""Global variable substitution.

Substitutes {var} patterns in all string fields throughout the workflow graph
with values from global variables (unconnected Variable nodes).
"""

import re
from typing import Any

from adkflow_runner.compiler.graph import WorkflowGraph
from adkflow_runner.logging import get_logger

_log = get_logger("compiler.substitution")

# Pattern to match {variable_name} but not {var} that look like template vars
# we should leave alone (like runtime substitutions)
VARIABLE_PATTERN = re.compile(r"\{([a-zA-Z_][a-zA-Z0-9_]*)\}")


def substitute_global_variables(
    graph: WorkflowGraph,
    global_vars: dict[str, str],
) -> WorkflowGraph:
    """Substitute global variables in all string fields of the workflow graph.

    This performs build-time substitution of {var} patterns where var is
    a key in global_vars. Other {patterns} are left unchanged for runtime
    substitution (e.g., output_key references, template variables).

    Args:
        graph: The workflow graph to process
        global_vars: Dictionary of variable names to values

    Returns:
        The same graph (modified in place) with substitutions applied
    """
    if not global_vars:
        return graph

    _log.debug(
        "Substituting global variables",
        variable_count=len(global_vars),
        keys=list(global_vars.keys()),
    )

    substitution_count = 0

    for node in graph.nodes.values():
        # Substitute in node data (config values)
        count = _substitute_in_dict(node.data, global_vars)
        substitution_count += count

    _log.info(
        "Global variable substitution complete",
        substitution_count=substitution_count,
    )

    return graph


def _substitute_in_dict(data: dict[str, Any], global_vars: dict[str, str]) -> int:
    """Recursively substitute global variables in a dictionary.

    Args:
        data: Dictionary to process (modified in place)
        global_vars: Variable name to value mapping

    Returns:
        Number of substitutions made
    """
    count = 0

    for key, value in data.items():
        if isinstance(value, str):
            new_value, subs = _substitute_in_string(value, global_vars)
            if subs > 0:
                data[key] = new_value
                count += subs
        elif isinstance(value, dict):
            count += _substitute_in_dict(value, global_vars)
        elif isinstance(value, list):
            count += _substitute_in_list(value, global_vars)

    return count


def _substitute_in_list(data: list[Any], global_vars: dict[str, str]) -> int:
    """Recursively substitute global variables in a list.

    Args:
        data: List to process (modified in place)
        global_vars: Variable name to value mapping

    Returns:
        Number of substitutions made
    """
    count = 0

    for i, item in enumerate(data):
        if isinstance(item, str):
            new_value, subs = _substitute_in_string(item, global_vars)
            if subs > 0:
                data[i] = new_value
                count += subs
        elif isinstance(item, dict):
            count += _substitute_in_dict(item, global_vars)
        elif isinstance(item, list):
            count += _substitute_in_list(item, global_vars)

    return count


def _substitute_in_string(value: str, global_vars: dict[str, str]) -> tuple[str, int]:
    """Substitute global variables in a single string.

    Only substitutes {var} patterns where var is a key in global_vars.
    Other {patterns} are left unchanged.

    Args:
        value: String to process
        global_vars: Variable name to value mapping

    Returns:
        Tuple of (processed string, number of substitutions)
    """
    count = 0

    def replace_match(match: re.Match[str]) -> str:
        nonlocal count
        var_name = match.group(1)
        if var_name in global_vars:
            count += 1
            return global_vars[var_name]
        return match.group(0)  # Leave unchanged

    result = VARIABLE_PATTERN.sub(replace_match, value)
    return result, count
