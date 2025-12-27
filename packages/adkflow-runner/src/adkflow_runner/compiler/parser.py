"""ReactFlow JSON parser.

Parses ReactFlow JSON into typed Python objects for processing.
"""

from dataclasses import dataclass, field
from typing import Any

from adkflow_runner.compiler.loader import LoadedProject, LoadedTab


@dataclass
class ParsedHandle:
    """A parsed handle (connection point) on a node."""

    id: str
    edge: str  # top, right, bottom, left
    percent: float = 50.0


@dataclass
class ParsedNode:
    """A parsed ReactFlow node."""

    id: str
    type: str
    position: tuple[float, float]
    data: dict[str, Any]
    parent_id: str | None = None
    extent: str | None = None
    style: dict[str, Any] = field(default_factory=dict)
    measured: tuple[float, float] | None = None
    tab_id: str | None = None

    @property
    def name(self) -> str:
        """Get the node's display name."""
        # Different node types store name differently
        if self.type == "agent":
            agent_data = self.data.get("agent", {})
            return agent_data.get("name", f"agent_{self.id[:8]}")
        elif self.type == "prompt":
            prompt_data = self.data.get("prompt", {})
            return prompt_data.get("name", f"prompt_{self.id[:8]}")
        elif self.type == "tool":
            return self.data.get("name", f"tool_{self.id[:8]}")
        elif self.type == "group":
            return self.data.get("label", f"group_{self.id[:8]}")
        elif self.type in ("teleportIn", "teleportOut"):
            return self.data.get("name", f"teleport_{self.id[:8]}")
        elif self.type == "variable":
            return self.data.get("name", f"var_{self.id[:8]}")
        else:
            return self.data.get("name", f"{self.type}_{self.id[:8]}")

    def get_handle_positions(self) -> dict[str, ParsedHandle]:
        """Get custom handle positions."""
        positions = self.data.get("handlePositions", {})
        return {
            handle_id: ParsedHandle(
                id=handle_id,
                edge=pos.get("edge", "right"),
                percent=pos.get("percent", 50.0),
            )
            for handle_id, pos in positions.items()
        }


@dataclass
class ParsedEdge:
    """A parsed ReactFlow edge."""

    id: str
    source: str
    target: str
    source_handle: str | None = None
    target_handle: str | None = None
    animated: bool = False
    style: dict[str, Any] = field(default_factory=dict)
    tab_id: str | None = None

    def is_link_edge(self) -> bool:
        """Check if this is a link edge (link-top/link-bottom handles)."""
        return self.source_handle in (
            "link-top",
            "link-bottom",
        ) or self.target_handle in ("link-top", "link-bottom")


@dataclass
class ParsedFlow:
    """A parsed ReactFlow for a single tab."""

    tab_id: str
    tab_name: str
    nodes: list[ParsedNode]
    edges: list[ParsedEdge]
    viewport: tuple[float, float, float]  # x, y, zoom

    def get_node(self, node_id: str) -> ParsedNode | None:
        """Get a node by ID."""
        for node in self.nodes:
            if node.id == node_id:
                return node
        return None

    def get_nodes_by_type(self, node_type: str) -> list[ParsedNode]:
        """Get all nodes of a specific type."""
        return [n for n in self.nodes if n.type == node_type]

    def get_edges_from(self, node_id: str) -> list[ParsedEdge]:
        """Get all edges originating from a node."""
        return [e for e in self.edges if e.source == node_id]

    def get_edges_to(self, node_id: str) -> list[ParsedEdge]:
        """Get all edges targeting a node."""
        return [e for e in self.edges if e.target == node_id]

    def get_children(self, parent_id: str) -> list[ParsedNode]:
        """Get all direct children of a group node."""
        return [n for n in self.nodes if n.parent_id == parent_id]


@dataclass
class ParsedProject:
    """Complete parsed project."""

    project: LoadedProject
    flows: dict[str, ParsedFlow]  # tab_id -> ParsedFlow

    def get_flow(self, tab_id: str) -> ParsedFlow | None:
        """Get a flow by tab ID."""
        return self.flows.get(tab_id)

    def get_all_nodes(self) -> list[ParsedNode]:
        """Get all nodes from all flows."""
        nodes = []
        for flow in self.flows.values():
            nodes.extend(flow.nodes)
        return nodes

    def get_all_edges(self) -> list[ParsedEdge]:
        """Get all edges from all flows."""
        edges = []
        for flow in self.flows.values():
            edges.extend(flow.edges)
        return edges

    def find_node(self, node_id: str) -> tuple[ParsedNode, str] | None:
        """Find a node by ID across all tabs.

        Returns:
            Tuple of (node, tab_id) or None if not found
        """
        for tab_id, flow in self.flows.items():
            node = flow.get_node(node_id)
            if node:
                return node, tab_id
        return None


class FlowParser:
    """Parses ReactFlow JSON into typed objects."""

    def parse_project(self, project: LoadedProject) -> ParsedProject:
        """Parse all tabs in a project.

        Args:
            project: Loaded project data

        Returns:
            ParsedProject with all flows parsed
        """
        flows = {}
        for tab in project.tabs:
            flows[tab.id] = self.parse_tab(tab)
        return ParsedProject(project=project, flows=flows)

    def parse_tab(self, tab: LoadedTab) -> ParsedFlow:
        """Parse a single tab's flow data.

        Args:
            tab: Loaded tab data

        Returns:
            ParsedFlow with nodes and edges
        """
        flow_data = tab.flow_data
        nodes = [self._parse_node(n, tab.id) for n in flow_data.get("nodes", [])]
        edges = [self._parse_edge(e, tab.id) for e in flow_data.get("edges", [])]

        viewport_data = flow_data.get("viewport", {})
        viewport = (
            viewport_data.get("x", 0),
            viewport_data.get("y", 0),
            viewport_data.get("zoom", 1),
        )

        return ParsedFlow(
            tab_id=tab.id,
            tab_name=tab.name,
            nodes=nodes,
            edges=edges,
            viewport=viewport,
        )

    def _parse_node(self, node_data: dict[str, Any], tab_id: str) -> ParsedNode:
        """Parse a single node."""
        position = node_data.get("position", {})
        measured = node_data.get("measured")
        node_type = node_data.get("type", "unknown")
        data = node_data.get("data", {})

        # Handle custom node types (prefixed with "custom:")
        if node_type.startswith("custom:"):
            unit_id = node_type[7:]  # Remove "custom:" prefix
            data["_unit_id"] = unit_id

        return ParsedNode(
            id=node_data["id"],
            type=node_type,
            position=(position.get("x", 0), position.get("y", 0)),
            data=data,
            parent_id=node_data.get("parentId"),
            extent=node_data.get("extent"),
            style=node_data.get("style", {}),
            measured=(measured["width"], measured["height"]) if measured else None,
            tab_id=tab_id,
        )

    def _parse_edge(self, edge_data: dict[str, Any], tab_id: str) -> ParsedEdge:
        """Parse a single edge."""
        return ParsedEdge(
            id=edge_data["id"],
            source=edge_data["source"],
            target=edge_data["target"],
            source_handle=edge_data.get("sourceHandle"),
            target_handle=edge_data.get("targetHandle"),
            animated=edge_data.get("animated", False),
            style=edge_data.get("style", {}),
            tab_id=tab_id,
        )
