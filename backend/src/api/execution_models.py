"""Execution API models.

Pydantic models for execution-related requests and responses.
"""

from typing import Any

from pydantic import BaseModel, Field


class RunRequest(BaseModel):
    """Request to start a workflow run."""

    project_path: str = Field(..., description="Path to the project directory")
    tab_id: str | None = Field(None, description="Specific tab to run")
    input_data: dict[str, Any] = Field(
        default_factory=dict, description="Input data for the workflow"
    )
    timeout_seconds: float = Field(
        default=300, description="Execution timeout in seconds"
    )
    validate_workflow: bool = Field(
        default=True, description="Whether to validate before running"
    )


class RunResponse(BaseModel):
    """Response when starting a run."""

    run_id: str = Field(..., description="Unique run identifier")
    status: str = Field(..., description="Run status")
    message: str = Field(..., description="Status message")


class RunStatusResponse(BaseModel):
    """Response for run status check."""

    run_id: str
    status: str
    output: str | None = None
    error: str | None = None
    duration_ms: float = 0
    event_count: int = 0


class ValidateRequest(BaseModel):
    """Request to validate a workflow."""

    project_path: str = Field(..., description="Path to the project directory")


class ValidateResponse(BaseModel):
    """Response from workflow validation."""

    valid: bool
    errors: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    error_node_ids: list[str] = Field(default_factory=list)
    warning_node_ids: list[str] = Field(default_factory=list)
    # Node ID -> list of error/warning messages for tooltip display
    node_errors: dict[str, list[str]] = Field(default_factory=dict)
    node_warnings: dict[str, list[str]] = Field(default_factory=dict)
    agent_count: int = 0
    tab_count: int = 0
    teleporter_count: int = 0


class TopologyRequest(BaseModel):
    """Request to get workflow topology."""

    project_path: str = Field(..., description="Path to the project directory")


class TopologyResponse(BaseModel):
    """Response with workflow topology as Mermaid diagram."""

    mermaid: str = Field(..., description="Mermaid diagram source")
    ascii: str = Field(..., description="ASCII tree representation")
    agent_count: int = Field(0, description="Number of agents in workflow")


class UserInputSubmission(BaseModel):
    """Request to submit user input during a run."""

    request_id: str = Field(
        ..., description="The request ID from USER_INPUT_REQUIRED event"
    )
    user_input: str = Field(..., description="The user's input value")


class UserInputSubmissionResponse(BaseModel):
    """Response after submitting user input."""

    success: bool
    message: str
    request_id: str
