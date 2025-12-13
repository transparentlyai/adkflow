"""Workflow data models using Pydantic v2."""

from typing import Any, Optional
from pydantic import BaseModel, Field


class Viewport(BaseModel):
    """Viewport state for React Flow."""

    x: float = Field(default=0, description="X coordinate of viewport")
    y: float = Field(default=0, description="Y coordinate of viewport")
    zoom: float = Field(default=1, description="Zoom level")


class ReactFlowNode(BaseModel):
    """React Flow node model."""

    id: str = Field(..., description="Unique node identifier")
    type: str = Field(..., description="Node type")
    position: dict[str, float] = Field(..., description="Node position (x, y)")
    data: dict[str, Any] = Field(..., description="Node data")
    selected: Optional[bool] = Field(None, description="Whether node is selected")
    dragging: Optional[bool] = Field(None, description="Whether node is being dragged")
    # Group/parent relationship fields
    parentId: Optional[str] = Field(None, description="Parent group node ID")
    extent: Optional[str] = Field(
        None, description="Extent constraint ('parent' for grouped nodes)"
    )
    # Styling and dimensions
    style: Optional[dict[str, Any]] = Field(
        None, description="Node style (width, height, etc.)"
    )
    measured: Optional[dict[str, float]] = Field(
        None, description="Measured dimensions from DOM"
    )


class ReactFlowEdge(BaseModel):
    """React Flow edge model."""

    id: str = Field(..., description="Unique edge identifier")
    source: str = Field(..., description="Source node ID")
    target: str = Field(..., description="Target node ID")
    sourceHandle: Optional[str] = Field(None, description="Source handle ID")
    targetHandle: Optional[str] = Field(None, description="Target handle ID")
    selected: Optional[bool] = Field(None, description="Whether edge is selected")
    animated: Optional[bool] = Field(None, description="Whether edge is animated")
    style: Optional[dict[str, Any]] = Field(None, description="Edge style")


class ReactFlowJSON(BaseModel):
    """React Flow JSON object for saving/loading flows."""

    nodes: list[ReactFlowNode] = Field(default_factory=list, description="Flow nodes")
    edges: list[ReactFlowEdge] = Field(default_factory=list, description="Flow edges")
    viewport: Viewport = Field(default_factory=Viewport, description="Viewport state")


# Tab/Page Models for Multi-Tab Support


class TabMetadata(BaseModel):
    """Metadata for a single tab/page in a project."""

    id: str = Field(
        ..., description="Unique tab identifier (e.g., page_1234567890_abc123)"
    )
    name: str = Field(..., description="Display name of the tab")
    order: int = Field(..., description="Sort order (0-based)")


class ProjectManifest(BaseModel):
    """Manifest file for multi-tab projects."""

    version: str = Field(default="2.0", description="Manifest version")
    name: str = Field(default="Untitled Workflow", description="Project display name")
    tabs: list[TabMetadata] = Field(
        default_factory=list, description="List of tabs in the project"
    )
