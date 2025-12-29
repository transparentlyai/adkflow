"""Node configuration access utilities.

All node types store their user-entered configuration in data.config.
This module provides a single source of truth for accessing node configuration.
"""

from typing import Any


def get_node_config(data: dict[str, Any]) -> dict[str, Any]:
    """Get node configuration from data.config.

    Args:
        data: The node's data dict (node.data or raw data from JSON)

    Returns:
        Configuration dict with node settings
    """
    return data.get("config", {})


def get_config_field(data: dict[str, Any], field: str, default: Any = None) -> Any:
    """Get a specific config field.

    Args:
        data: The node's data dict
        field: Field name to retrieve
        default: Default value if not found

    Returns:
        Field value or default
    """
    return get_node_config(data).get(field, default)
