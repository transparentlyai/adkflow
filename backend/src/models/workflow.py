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
