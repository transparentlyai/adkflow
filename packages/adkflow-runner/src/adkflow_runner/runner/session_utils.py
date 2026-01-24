"""Session state utilities for workflow execution.

Functions for preparing and managing session state for ADK runs.
"""

import re
from typing import Any

from adkflow_runner.errors import ExecutionError
from adkflow_runner.ir import WorkflowIR


def escape_adk_variables(value: str) -> str:
    """Escape {word} patterns so ADK doesn't interpret them as variables.

    ADK's regex matches {word} patterns and tries to substitute them from
    session state. We insert a zero-width space (U+200B) after { to break
    the isidentifier() check while keeping the text visually identical.

    Args:
        value: String that may contain {word} patterns

    Returns:
        String with {word} patterns escaped as {\u200bword}
    """
    return re.sub(r"\{(\w+)\}", "{\u200b\\1}", value)


def collect_context_vars_for_session(ir: WorkflowIR) -> dict[str, Any]:
    """Collect all context_vars from agents and global variables for session state.

    This function gathers:
    1. context_vars from all agents (from connected Variable nodes/Context Aggregators)
    2. global_variables from the workflow (from unconnected Variable nodes)

    It validates for conflicts where the same variable name has different values
    across different sources. The collected variables are used to pre-populate
    ADK's session state, allowing native variable substitution at runtime.

    Args:
        ir: The workflow IR containing all agents and global variables

    Returns:
        Dict of variable names to values for session state

    Raises:
        ExecutionError: If variable name conflicts are detected (same name,
            different values from different sources)
    """
    # Track variable sources for conflict detection: {var_name: [(source_name, value), ...]}
    var_sources: dict[str, list[tuple[str, Any]]] = {}

    # Collect global variables first (from unconnected Variable nodes)
    for key, value in ir.global_variables.items():
        if key not in var_sources:
            var_sources[key] = []
        var_sources[key].append(("global", value))

    # Collect context_vars from each agent (from connected Variable nodes/Context Aggregators)
    for agent_ir in ir.all_agents.values():
        for key, value in agent_ir.context_vars.items():
            if key not in var_sources:
                var_sources[key] = []
            var_sources[key].append((agent_ir.name, value))

    # Check for conflicts (same name, different values)
    conflicts: list[str] = []
    initial_state: dict[str, Any] = {}

    for var_name, sources in var_sources.items():
        # Get unique values (compare as strings for consistency)
        unique_values = set(str(v) for _, v in sources)

        if len(unique_values) > 1:
            # Conflict detected - same variable name with different values
            source_details = ", ".join(
                f"'{agent}' provides '{value}'" for agent, value in sources
            )
            conflicts.append(f"  - '{var_name}': {source_details}")
        else:
            # No conflict - use the value, escaping any {word} patterns
            raw_value = sources[0][1]
            if isinstance(raw_value, str):
                initial_state[var_name] = escape_adk_variables(raw_value)
            else:
                initial_state[var_name] = raw_value

    if conflicts:
        raise ExecutionError(
            "Context variable conflicts detected. The same variable name is "
            "defined with different values by multiple sources:\n"
            + "\n".join(conflicts)
            + "\n\nUse unique variable names or ensure all sources provide the same value."
        )

    return initial_state
