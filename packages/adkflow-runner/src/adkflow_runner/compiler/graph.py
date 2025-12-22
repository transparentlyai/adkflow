"""Graph building and analysis.

Builds a dependency graph from parsed flows and resolves
cross-tab connections via teleporters.
"""

from dataclasses import dataclass, field
from typing import Any

from adkflow_runner.compiler.parser import ParsedEdge, ParsedNode, ParsedProject
from adkflow_runner.config import EdgeSemantics, ExecutionConfig, get_default_config
from adkflow_runner.errors import CycleDetectedError, ErrorLocation, TeleporterError


@dataclass
class GraphEdge:
    """An edge in the dependency graph with resolved semantics."""

    source_id: str
    target_id: str
    semantics: EdgeSemantics
    source_handle: str | None = None
    target_handle: str | None = None
    original_edge: ParsedEdge | None = None

    def is_data_flow(self) -> bool:
        """Check if this edge represents data flow (prompt, tool, context)."""
        return self.semantics in (
            EdgeSemantics.INSTRUCTION,
            EdgeSemantics.TOOL,
            EdgeSemantics.CONTEXT,
        )

    def is_agent_flow(self) -> bool:
        """Check if this edge connects agents."""
        return self.semantics in (
            EdgeSemantics.SEQUENTIAL,
            EdgeSemantics.PARALLEL,
            EdgeSemantics.SUBAGENT,
        )


@dataclass
class GraphNode:
    """A node in the dependency graph."""

    id: str
    type: str
    name: str
    tab_id: str
    data: dict[str, Any]
    parsed_node: ParsedNode

    # Resolved connections
    incoming: list[GraphEdge] = field(default_factory=list)
    outgoing: list[GraphEdge] = field(default_factory=list)

    def get_incoming_by_semantics(self, semantics: EdgeSemantics) -> list[GraphEdge]:
        """Get incoming edges with specific semantics."""
        return [e for e in self.incoming if e.semantics == semantics]

    def get_outgoing_by_semantics(self, semantics: EdgeSemantics) -> list[GraphEdge]:
        """Get outgoing edges with specific semantics."""
        return [e for e in self.outgoing if e.semantics == semantics]


@dataclass
class TeleporterPair:
    """A matched pair of teleporter nodes."""

    name: str
    output_node: GraphNode
    input_node: GraphNode


@dataclass
class WorkflowGraph:
    """Complete workflow graph with resolved connections."""

    nodes: dict[str, GraphNode]
    edges: list[GraphEdge]
    teleporter_pairs: list[TeleporterPair]
    entry_nodes: list[GraphNode]  # Nodes with no incoming agent flow

    def get_node(self, node_id: str) -> GraphNode | None:
        """Get a node by ID."""
        return self.nodes.get(node_id)

    def get_agent_nodes(self) -> list[GraphNode]:
        """Get all agent nodes."""
        return [n for n in self.nodes.values() if n.type == "agent"]

    def get_root_agents(self) -> list[GraphNode]:
        """Get agents with no incoming sequential edges."""
        roots = []
        for node in self.get_agent_nodes():
            has_incoming_sequential = any(
                e.semantics == EdgeSemantics.SEQUENTIAL for e in node.incoming
            )
            if not has_incoming_sequential:
                roots.append(node)
        return roots

    def topological_sort(self) -> list[str]:
        """Return node IDs in topological order.

        Raises:
            CycleDetectedError: If a cycle is detected
        """
        visited: set[str] = set()
        temp_visited: set[str] = set()
        result: list[str] = []

        def visit(node_id: str, path: list[str]) -> None:
            if node_id in temp_visited:
                cycle_start = path.index(node_id)
                cycle = path[cycle_start:] + [node_id]
                raise CycleDetectedError(
                    cycle_nodes=cycle,
                    location=ErrorLocation(node_id=node_id),
                )
            if node_id in visited:
                return

            temp_visited.add(node_id)
            node = self.nodes.get(node_id)
            if node:
                for edge in node.outgoing:
                    if edge.semantics == EdgeSemantics.SEQUENTIAL:
                        visit(edge.target_id, path + [node_id])

            temp_visited.remove(node_id)
            visited.add(node_id)
            result.append(node_id)

        for node_id in self.nodes:
            if node_id not in visited:
                visit(node_id, [])

        return list(reversed(result))


class GraphBuilder:
    """Builds a dependency graph from parsed flows."""

    def __init__(self, config: ExecutionConfig | None = None):
        self.config = config or get_default_config()

    def build(self, parsed: ParsedProject) -> WorkflowGraph:
        """Build a complete workflow graph.

        Args:
            parsed: Parsed project with all flows

        Returns:
            WorkflowGraph with resolved connections
        """
        # Create graph nodes
        nodes = self._create_nodes(parsed)

        # Create edges with resolved semantics
        edges = self._create_edges(parsed, nodes)

        # Connect edges to nodes
        for edge in edges:
            source_node = nodes.get(edge.source_id)
            target_node = nodes.get(edge.target_id)
            if source_node:
                source_node.outgoing.append(edge)
            if target_node:
                target_node.incoming.append(edge)

        # Resolve teleporters
        teleporter_pairs = self._resolve_teleporters(nodes)

        # Add cross-tab edges for teleporters
        for pair in teleporter_pairs:
            # Find what's connected to the output teleporter
            for edge in pair.output_node.incoming:
                source_node = nodes.get(edge.source_id)
                if source_node and source_node.type == "agent":
                    # Find what the input teleporter connects to
                    for out_edge in pair.input_node.outgoing:
                        target_node = nodes.get(out_edge.target_id)
                        if target_node and target_node.type == "agent":
                            # Create a sequential edge across tabs
                            cross_edge = GraphEdge(
                                source_id=source_node.id,
                                target_id=target_node.id,
                                semantics=EdgeSemantics.SEQUENTIAL,
                            )
                            edges.append(cross_edge)
                            source_node.outgoing.append(cross_edge)
                            target_node.incoming.append(cross_edge)

        # Find entry nodes (agents with no incoming sequential edges)
        entry_nodes = []
        for node in nodes.values():
            if node.type == "agent":
                has_sequential_incoming = any(
                    e.semantics == EdgeSemantics.SEQUENTIAL for e in node.incoming
                )
                if not has_sequential_incoming:
                    entry_nodes.append(node)

        return WorkflowGraph(
            nodes=nodes,
            edges=edges,
            teleporter_pairs=teleporter_pairs,
            entry_nodes=entry_nodes,
        )

    def _create_nodes(self, parsed: ParsedProject) -> dict[str, GraphNode]:
        """Create graph nodes from parsed nodes."""
        nodes = {}
        for tab_id, flow in parsed.flows.items():
            for parsed_node in flow.nodes:
                nodes[parsed_node.id] = GraphNode(
                    id=parsed_node.id,
                    type=parsed_node.type,
                    name=parsed_node.name,
                    tab_id=tab_id,
                    data=parsed_node.data,
                    parsed_node=parsed_node,
                )
        return nodes

    def _create_edges(
        self, parsed: ParsedProject, nodes: dict[str, GraphNode]
    ) -> list[GraphEdge]:
        """Create graph edges with resolved semantics."""
        edges = []
        for flow in parsed.flows.values():
            for parsed_edge in flow.edges:
                source_node = nodes.get(parsed_edge.source)
                target_node = nodes.get(parsed_edge.target)

                if not source_node or not target_node:
                    continue

                semantics = self.config.get_edge_semantics(
                    source_type=source_node.type,
                    target_type=target_node.type,
                    source_handle=parsed_edge.source_handle,
                    target_handle=parsed_edge.target_handle,
                )

                edges.append(
                    GraphEdge(
                        source_id=parsed_edge.source,
                        target_id=parsed_edge.target,
                        semantics=semantics,
                        source_handle=parsed_edge.source_handle,
                        target_handle=parsed_edge.target_handle,
                        original_edge=parsed_edge,
                    )
                )

        return edges

    def _resolve_teleporters(self, nodes: dict[str, GraphNode]) -> list[TeleporterPair]:
        """Match teleporter input/output pairs by name."""
        outputs: dict[str, GraphNode] = {}
        inputs: dict[str, GraphNode] = {}

        for node in nodes.values():
            if node.type == "teleportOut":
                name = node.data.get("name", "")
                if name:
                    if name in outputs:
                        raise TeleporterError(
                            f"Duplicate teleportOut with name '{name}'",
                            location=ErrorLocation(node_id=node.id, tab_id=node.tab_id),
                        )
                    outputs[name] = node
            elif node.type == "teleportIn":
                name = node.data.get("name", "")
                if name:
                    if name in inputs:
                        raise TeleporterError(
                            f"Duplicate teleportIn with name '{name}'",
                            location=ErrorLocation(node_id=node.id, tab_id=node.tab_id),
                        )
                    inputs[name] = node

        pairs = []
        for name, output_node in outputs.items():
            input_node = inputs.get(name)
            if input_node:
                pairs.append(
                    TeleporterPair(
                        name=name,
                        output_node=output_node,
                        input_node=input_node,
                    )
                )

        return pairs
