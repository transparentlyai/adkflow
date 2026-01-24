"""Shared fixtures for compiler tests.

These fixtures are specific to transformer testing and use data.config
instead of data.agent for node configuration.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import pytest

from adkflow_runner.compiler.graph import (
    GraphEdge,
    GraphNode,
    TeleporterPair,
    WorkflowGraph,
)
from adkflow_runner.compiler.loader import LoadedProject, LoadedTab
from adkflow_runner.compiler.parser import ParsedNode
from adkflow_runner.compiler.transformer import IRTransformer
from adkflow_runner.config import EdgeSemantics


@pytest.fixture
def transformer() -> IRTransformer:
    """Create a default transformer instance."""
    return IRTransformer()


@pytest.fixture
def mock_project(tmp_path: Path) -> LoadedProject:
    """Create a mock loaded project."""
    return LoadedProject(
        path=tmp_path,
        name="test-project",
        version="3.0",
        tabs=[
            LoadedTab(
                id="tab1",
                name="Main",
                order=0,
                flow_data={"nodes": [], "edges": []},
            )
        ],
    )


@pytest.fixture
def make_graph_node_with_config():
    """Factory to create GraphNode instances for testing.

    Note: Node configuration is stored in data.config, not data.agent.
    This is specific to transformer tests.
    """

    def _make(
        node_id: str,
        node_type: str = "agent",
        name: str | None = None,
        tab_id: str = "tab1",
        **config_kwargs: Any,
    ) -> GraphNode:
        name = name or node_id.upper()

        # Build config dict - all node configs go in data.config
        config: dict[str, Any] = {"name": name}
        if node_type == "agent":
            config["type"] = "llm"
        config.update(config_kwargs)

        data: dict[str, Any] = {"config": config, "tabId": tab_id}

        parsed = ParsedNode(
            id=node_id,
            type=node_type,
            position=(0.0, 0.0),
            data=data,
        )

        return GraphNode(
            id=node_id,
            type=node_type,
            name=name,
            tab_id=tab_id,
            data=data,
            parsed_node=parsed,
        )

    return _make


@pytest.fixture
def make_graph_edge_connected():
    """Factory to create GraphEdge instances for testing.

    Also connects the edge to the source and target nodes.
    """

    def _make(
        source: GraphNode,
        target: GraphNode,
        semantics: EdgeSemantics = EdgeSemantics.SEQUENTIAL,
    ) -> GraphEdge:
        edge = GraphEdge(
            source_id=source.id,
            target_id=target.id,
            semantics=semantics,
        )
        source.outgoing.append(edge)
        target.incoming.append(edge)
        return edge

    return _make


@pytest.fixture
def make_workflow_graph_for_transformer():
    """Factory to create WorkflowGraph instances for testing."""

    def _make(
        nodes: list[GraphNode],
        edges: list[GraphEdge],
        teleporter_pairs: list[TeleporterPair] | None = None,
    ) -> WorkflowGraph:
        nodes_dict = {n.id: n for n in nodes}

        # Find entry nodes (agents with no incoming sequential edges)
        entry_nodes = []
        for node in nodes:
            if node.type == "agent":
                has_sequential = any(
                    e.semantics == EdgeSemantics.SEQUENTIAL for e in node.incoming
                )
                if not has_sequential:
                    entry_nodes.append(node)

        return WorkflowGraph(
            nodes=nodes_dict,
            edges=edges,
            teleporter_pairs=teleporter_pairs or [],
            entry_nodes=entry_nodes,
        )

    return _make
