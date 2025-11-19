"""YAML conversion service for workflows."""

import yaml
from typing import Any

from backend.src.models.workflow import WorkflowModel


def to_yaml(workflow: WorkflowModel) -> str:
    """
    Convert a WorkflowModel to YAML string.

    Args:
        workflow: WorkflowModel instance to convert

    Returns:
        YAML string representation of the workflow
    """
    # Convert Pydantic model to dict, excluding None values
    workflow_dict = workflow.model_dump(exclude_none=True)

    # Convert to YAML with custom formatting
    yaml_str = yaml.dump(
        workflow_dict,
        default_flow_style=False,
        sort_keys=False,
        allow_unicode=True,
        indent=2
    )

    return yaml_str


def from_yaml(yaml_str: str) -> WorkflowModel:
    """
    Parse YAML string into a WorkflowModel.

    Args:
        yaml_str: YAML string to parse

    Returns:
        WorkflowModel instance

    Raises:
        yaml.YAMLError: If YAML parsing fails
        pydantic.ValidationError: If validation fails
    """
    # Parse YAML string
    workflow_dict: dict[str, Any] = yaml.safe_load(yaml_str)

    # Validate and create WorkflowModel
    workflow = WorkflowModel(**workflow_dict)

    return workflow
