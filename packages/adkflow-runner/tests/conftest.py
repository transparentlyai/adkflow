"""Conftest for adkflow-runner tests."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any
from unittest.mock import MagicMock

import pytest

from adkflow_runner.compiler.graph import GraphEdge, GraphNode, WorkflowGraph
from adkflow_runner.compiler.parser import ParsedNode
from adkflow_runner.config import EdgeSemantics
from adkflow_runner.ir import AgentIR


# =============================================================================
# Parser/Graph Test Fixtures
# =============================================================================


@pytest.fixture
def make_parsed_node():
    """Factory to create ParsedNode instances for testing."""

    def _make(
        node_id: str,
        node_type: str = "agent",
        name: str | None = None,
        position: tuple[float, float] = (0.0, 0.0),
        **data_kwargs: Any,
    ) -> ParsedNode:
        name = name or node_id.upper()
        data: dict[str, Any] = {}

        if node_type == "agent":
            data["agent"] = {"name": name, "type": "llm", **data_kwargs}
        else:
            data = data_kwargs

        return ParsedNode(
            id=node_id,
            type=node_type,
            position=position,
            data=data,
        )

    return _make


@pytest.fixture
def make_graph_node(make_parsed_node):
    """Factory to create GraphNode instances for testing."""

    def _make(
        node_id: str,
        node_type: str = "agent",
        name: str | None = None,
        tab_id: str = "tab1",
        **data_kwargs: Any,
    ) -> GraphNode:
        name = name or node_id.upper()
        parsed = make_parsed_node(node_id, node_type, name, **data_kwargs)

        data: dict[str, Any] = {}
        if node_type == "agent":
            data["agent"] = {"name": name, "type": "llm", **data_kwargs}

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
def make_graph_edge():
    """Factory to create GraphEdge instances for testing."""

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
def make_workflow_graph():
    """Factory to create WorkflowGraph instances for testing."""

    def _make(
        nodes: list[GraphNode],
        edges: list[GraphEdge],
        teleporter_pairs: list[tuple[str, str]] | None = None,
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


# =============================================================================
# IR Test Fixtures
# =============================================================================


@pytest.fixture
def make_agent_ir():
    """Factory to create AgentIR instances for testing."""

    def _make(
        agent_id: str,
        name: str | None = None,
        agent_type: str = "llm",
        **kwargs: Any,
    ) -> AgentIR:
        return AgentIR(
            id=agent_id,
            name=name or agent_id.upper(),
            type=agent_type,
            **kwargs,
        )

    return _make


# =============================================================================
# Project Fixtures
# =============================================================================


@pytest.fixture
def minimal_project(tmp_path: Path) -> Path:
    """Create a minimal valid project structure."""
    manifest = {
        "name": "minimal-project",
        "version": "3.0",
        "tabs": [{"id": "tab1", "name": "Main", "isDefault": True}],
        "nodes": [],
        "edges": [],
        "settings": {},
    }
    (tmp_path / "manifest.json").write_text(json.dumps(manifest, indent=2))
    return tmp_path


@pytest.fixture
def project_with_prompt(tmp_path: Path) -> Path:
    """Create a project with a prompt file."""
    manifest = {
        "name": "prompt-project",
        "version": "3.0",
        "tabs": [{"id": "tab1", "name": "Main", "isDefault": True}],
        "nodes": [
            {
                "id": "prompt-1",
                "type": "prompt",
                "position": {"x": 100, "y": 100},
                "data": {
                    "tabId": "tab1",
                    "config": {
                        "name": "TestPrompt",
                        "file_path": "test.prompt.md",
                    }
                },
            }
        ],
        "edges": [],
        "settings": {},
    }
    (tmp_path / "manifest.json").write_text(json.dumps(manifest, indent=2))
    (tmp_path / "prompts").mkdir()
    (tmp_path / "prompts" / "test.prompt.md").write_text("# Test Prompt\n\nHello, {name}!")
    return tmp_path


@pytest.fixture
def project_with_tool(tmp_path: Path) -> Path:
    """Create a project with a tool file."""
    manifest = {
        "name": "tool-project",
        "version": "3.0",
        "tabs": [{"id": "tab1", "name": "Main", "isDefault": True}],
        "nodes": [
            {
                "id": "tool-1",
                "type": "tool",
                "position": {"x": 100, "y": 100},
                "data": {
                    "tabId": "tab1",
                    "config": {
                        "name": "TestTool",
                        "file_path": "test_tool.py",
                    }
                },
            }
        ],
        "edges": [],
        "settings": {},
    }
    (tmp_path / "manifest.json").write_text(json.dumps(manifest, indent=2))
    (tmp_path / "tools").mkdir()
    (tmp_path / "tools" / "test_tool.py").write_text(
        '''"""Test tool."""

def test_tool(query: str) -> str:
    """A test tool that echoes the input."""
    return f"Echo: {query}"
'''
    )
    return tmp_path


# =============================================================================
# Callback Fixtures
# =============================================================================


@pytest.fixture
def mock_callback():
    """Create a mock callback for testing event emission."""
    callback = MagicMock()
    callback.on_run_start = MagicMock()
    callback.on_run_end = MagicMock()
    callback.on_agent_start = MagicMock()
    callback.on_agent_end = MagicMock()
    callback.on_tool_call = MagicMock()
    callback.on_tool_result = MagicMock()
    callback.on_error = MagicMock()
    return callback
