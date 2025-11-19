"""Variable resolution utilities for ADKFlow workflows."""

import re
from typing import Any


def resolve_variables(text: str, variables: dict) -> str:
    """Resolve variable placeholders in a text string.

    Replaces {variable} patterns with values from the variables dictionary.

    Args:
        text: Text containing {variable} placeholders
        variables: Dictionary of variable name -> value mappings

    Returns:
        Text with variables resolved

    Example:
        >>> resolve_variables("Hello {name}!", {"name": "World"})
        'Hello World!'
    """
    if not isinstance(text, str):
        return text

    # Pattern to match {variable_name}
    pattern = r'\{([a-zA-Z_][a-zA-Z0-9_]*)\}'

    def replace_var(match):
        var_name = match.group(1)
        if var_name in variables:
            return str(variables[var_name])
        else:
            # Keep the placeholder if variable not found
            return match.group(0)

    return re.sub(pattern, replace_var, text)


def extract_variable_names(text: str) -> list:
    """Extract variable names from text containing {variable} patterns.

    Uses regex to find all {variable} patterns and returns the variable names.

    Args:
        text: Text to scan for variable patterns

    Returns:
        List of variable names found (without braces)

    Example:
        >>> extract_variable_names("Hello {name}, you have {count} messages")
        ['name', 'count']
    """
    if not isinstance(text, str):
        return []

    # Pattern to match {variable_name}
    pattern = r'\{([a-zA-Z_][a-zA-Z0-9_]*)\}'
    matches = re.findall(pattern, text)
    return matches


def resolve_dict_variables(data: Any, variables: dict) -> Any:
    """Recursively resolve variables in a dictionary or list structure.

    Args:
        data: Dictionary, list, or other data structure
        variables: Dictionary of variable name -> value mappings

    Returns:
        Data structure with all string values having variables resolved
    """
    if isinstance(data, dict):
        return {k: resolve_dict_variables(v, variables) for k, v in data.items()}
    elif isinstance(data, list):
        return [resolve_dict_variables(item, variables) for item in data]
    elif isinstance(data, str):
        return resolve_variables(data, variables)
    else:
        return data
