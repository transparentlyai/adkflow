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
    viewport: Viewport = Field(
        default_factory=Viewport, description="Viewport state for this tab"
    )


class ProjectSettings(BaseModel):
    """Project-level settings stored in manifest.json."""

    model_config = {"populate_by_name": True}

    default_model: str = Field(
        default="gemini-2.5-flash",
        alias="defaultModel",
        serialization_alias="defaultModel",
        description="Default model for new agents",
    )


class ProjectManifest(BaseModel):
    """Manifest file for single-file projects (v3.0).

    All nodes and edges are stored at the manifest root level.
    Tabs are metadata only - nodes reference tabs via data.tabId.
    """

    version: str = Field(default="3.0", description="Manifest version")
    name: str = Field(default="Untitled Workflow", description="Project display name")
    tabs: list[TabMetadata] = Field(
        default_factory=list, description="Tab metadata (id, name, order, viewport)"
    )
    nodes: list[ReactFlowNode] = Field(
        default_factory=list, description="All nodes across all tabs"
    )
    edges: list[ReactFlowEdge] = Field(
        default_factory=list, description="All edges across all tabs"
    )
    settings: ProjectSettings = Field(
        default_factory=ProjectSettings, description="Project settings"
    )
    logging: Optional[dict[str, Any]] = Field(
        default=None, description="Debug logging configuration"
    )

    def get_tab(self, tab_id: str) -> TabMetadata | None:
        """Get tab metadata by ID."""
        for tab in self.tabs:
            if tab.id == tab_id:
                return tab
        return None

    def get_nodes_for_tab(self, tab_id: str) -> list[ReactFlowNode]:
        """Get all nodes belonging to a tab."""
        return [n for n in self.nodes if n.data.get("tabId") == tab_id]

    def get_edges_for_tab(self, tab_id: str) -> list[ReactFlowEdge]:
        """Get all edges belonging to a tab (both endpoints in tab)."""
        node_ids = {n.id for n in self.get_nodes_for_tab(tab_id)}
        return [e for e in self.edges if e.source in node_ids and e.target in node_ids]

    def get_flow_for_tab(self, tab_id: str) -> ReactFlowJSON:
        """Get ReactFlowJSON for a specific tab."""
        tab = self.get_tab(tab_id)
        viewport = tab.viewport if tab else Viewport()
        return ReactFlowJSON(
            nodes=self.get_nodes_for_tab(tab_id),
            edges=self.get_edges_for_tab(tab_id),
            viewport=viewport,
        )

    def update_flow_for_tab(
        self, tab_id: str, flow: ReactFlowJSON, update_viewport: bool = True
    ) -> None:
        """Update nodes/edges for a tab, replacing existing ones."""
        # Remove old nodes and edges for this tab
        old_node_ids = {n.id for n in self.get_nodes_for_tab(tab_id)}
        self.nodes = [n for n in self.nodes if n.data.get("tabId") != tab_id]
        self.edges = [
            e
            for e in self.edges
            if e.source not in old_node_ids or e.target not in old_node_ids
        ]

        # Ensure all new nodes have tabId set
        for node in flow.nodes:
            node.data["tabId"] = tab_id

        # Add new nodes and edges
        self.nodes.extend(flow.nodes)
        self.edges.extend(flow.edges)

        # Update viewport if requested
        if update_viewport:
            tab = self.get_tab(tab_id)
            if tab:
                tab.viewport = flow.viewport
