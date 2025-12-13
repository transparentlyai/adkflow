"""
Pydantic models for ADKFlow Scanner state management

These models represent the data structures used throughout the scanning,
discovery, analysis, and generation phases.
"""

from typing import Any

from pydantic import BaseModel, Field


class AgentDiscovery(BaseModel):
    """Represents a discovered agent in the codebase"""

    name: str = Field(..., description="Agent name")
    file_path: str = Field(..., description="Absolute path to agent file")
    type: str = Field(default="llm", description="Agent type (llm, etc.)")
    model: str | None = Field(None, description="LLM model name")
    tools: list[str] = Field(default_factory=list, description="List of tool names")
    sub_agents: list[str] = Field(default_factory=list, description="List of sub-agent names")
    prompt_file: str | None = Field(None, description="Path to prompt file")
    module: str | None = Field(None, description="Module/package this agent belongs to")


class PromptDiscovery(BaseModel):
    """Represents a discovered prompt file"""

    name: str = Field(..., description="Prompt name")
    file_path: str = Field(..., description="Absolute path to prompt file")
    associated_agent: str | None = Field(
        None, description="Agent name this prompt is associated with"
    )


class ToolDiscovery(BaseModel):
    """Represents a discovered tool"""

    name: str = Field(..., description="Tool name")
    file_path: str = Field(..., description="Absolute path to tool file")
    docstring: str | None = Field(None, description="Tool docstring/description")


class DiscoveryResults(BaseModel):
    """Results from the discovery phase"""

    agents: list[AgentDiscovery] = Field(default_factory=list, description="All discovered agents")
    prompts: list[PromptDiscovery] = Field(
        default_factory=list, description="All discovered prompts"
    )
    tools: list[ToolDiscovery] = Field(default_factory=list, description="All discovered tools")
    modules: list[str] = Field(default_factory=list, description="All discovered modules")


class GroupAnalysis(BaseModel):
    """Represents a logical group of agents"""

    name: str = Field(..., description="Group name")
    agents: list[str] = Field(default_factory=list, description="Agent names in this group")
    suggested_tab: str | None = Field(None, description="Suggested tab/page for this group")


class Relationships(BaseModel):
    """Represents relationships between agents, prompts, and tools"""

    agent_prompts: dict[str, list[str]] = Field(
        default_factory=dict,
        description="Mapping of agent names to their prompt file paths",
    )
    agent_tools: dict[str, list[str]] = Field(
        default_factory=dict,
        description="Mapping of agent names to their tool names",
    )
    parent_child: dict[str, list[str]] = Field(
        default_factory=dict,
        description="Mapping of parent agent names to child agent names",
    )


class AnalysisResults(BaseModel):
    """Results from the analysis phase"""

    groups: list[GroupAnalysis] = Field(default_factory=list, description="All identified groups")
    relationships: Relationships = Field(
        default_factory=Relationships, description="Relationships between entities"
    )
    proposed_tabs: list[str] = Field(default_factory=list, description="Proposed tab names")
    questions: list[str] = Field(
        default_factory=list,
        description="Questions to ask user for clarification",
    )


class TabDefinition(BaseModel):
    """Represents a tab/page in the ADKFlow project"""

    id: str = Field(..., description="Unique tab identifier (e.g., 'page_docprep')")
    name: str = Field(..., description="Display name for the tab")
    order: int = Field(..., description="Order/position of the tab")
    groups: list[str] = Field(
        default_factory=list, description="Group names that belong to this tab"
    )


class GeneratedProject(BaseModel):
    """Represents the final generated ADKFlow project"""

    output_path: str = Field(..., description="Absolute path to output directory")
    files: dict[str, Any] = Field(
        default_factory=dict,
        description="Generated files (manifest.json, page files, etc.)",
    )
