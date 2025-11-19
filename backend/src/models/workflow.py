"""Workflow data models using Pydantic v2."""

from typing import Any, Optional
from pydantic import BaseModel, Field


class WorkflowVariable(BaseModel):
    """Variable definition in a workflow."""

    name: str = Field(..., description="Variable name")
    type: str = Field(..., description="Variable type (string, number, boolean, etc.)")
    default: Optional[Any] = Field(None, description="Default value")
    description: Optional[str] = Field(None, description="Variable description")


class PromptModel(BaseModel):
    """Prompt template model."""

    id: str = Field(..., description="Unique prompt identifier")
    content: str = Field(..., description="Prompt template content")
    variables: list[str] = Field(default_factory=list, description="List of variable names used in prompt")


class SubagentModel(BaseModel):
    """Subagent configuration model."""

    id: str = Field(..., description="Unique subagent identifier")
    prompt_ref: str = Field(..., description="Reference to prompt ID")
    tools: list[str] = Field(default_factory=list, description="List of tool names available to subagent")


class AgentModel(BaseModel):
    """Agent configuration model."""

    id: str = Field(..., description="Unique agent identifier")
    type: str = Field(..., description="Agent type (e.g., 'llm', 'workflow', 'tool')")
    model: Optional[str] = Field(None, description="LLM model name (e.g., 'gemini-2.0-flash-exp')")
    temperature: Optional[float] = Field(None, description="LLM temperature setting")
    tools: list[str] = Field(default_factory=list, description="List of tool names available to agent")
    subagents: list[SubagentModel] = Field(default_factory=list, description="List of subagents")


class WorkflowConnection(BaseModel):
    """Connection between workflow components."""

    from_path: str = Field(..., description="Source path (e.g., 'agent1.output')")
    to_path: str = Field(..., description="Target path (e.g., 'agent2.input')")


class WorkflowModel(BaseModel):
    """Complete workflow model."""

    name: str = Field(..., description="Workflow name")
    description: Optional[str] = Field(None, description="Workflow description")
    version: str = Field(default="1.0.0", description="Workflow version")
    variables: dict[str, WorkflowVariable] = Field(default_factory=dict, description="Workflow variables")
    prompts: list[PromptModel] = Field(default_factory=list, description="Prompt templates")
    agents: list[AgentModel] = Field(default_factory=list, description="Agent configurations")
    connections: list[WorkflowConnection] = Field(default_factory=list, description="Connections between agents")
    metadata: Optional[dict[str, Any]] = Field(None, description="Additional metadata")
