"""Tests for the ReactFlow parser module.

Tests parsing of ReactFlow JSON into typed Python objects.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from adkflow_runner.compiler.loader import LoadedProject, LoadedTab
from adkflow_runner.compiler.parser import (
    FlowParser,
    ParsedEdge,
    ParsedFlow,
    ParsedHandle,
    ParsedNode,
    ParsedProject,
)


class TestParsedNode:
    """Tests for ParsedNode dataclass."""

    def test_node_creation(self):
        """Create a basic parsed node."""
        node = ParsedNode(
            id="node-1",
            type="agent",
            position=(100.0, 200.0),
            data={"config": {"name": "TestAgent"}},
        )
        assert node.id == "node-1"
        assert node.type == "agent"
        assert node.position == (100.0, 200.0)

    def test_node_name_from_config(self):
        """Node name comes from data.config.name."""
        node = ParsedNode(
            id="node-1",
            type="agent",
            position=(0, 0),
            data={"config": {"name": "MyAgent"}},
        )
        assert node.name == "MyAgent"

    def test_node_name_fallback(self):
        """Node name fallback when no config name."""
        node = ParsedNode(
            id="abcd1234-5678",
            type="prompt",
            position=(0, 0),
            data={},
        )
        assert node.name == "prompt_abcd1234"

    def test_node_with_parent(self):
        """Node with parent (inside a group)."""
        node = ParsedNode(
            id="child-1",
            type="agent",
            position=(50, 50),
            data={},
            parent_id="group-1",
            extent="parent",
        )
        assert node.parent_id == "group-1"
        assert node.extent == "parent"

    def test_node_with_measured_dimensions(self):
        """Node with measured dimensions."""
        node = ParsedNode(
            id="node-1",
            type="agent",
            position=(0, 0),
            data={},
            measured=(200.0, 150.0),
        )
        assert node.measured == (200.0, 150.0)

    def test_node_get_handle_positions(self):
        """Get custom handle positions."""
        node = ParsedNode(
            id="node-1",
            type="agent",
            position=(0, 0),
            data={
                "handlePositions": {
                    "input-1": {"edge": "left", "percent": 30.0},
                    "output-1": {"edge": "right", "percent": 70.0},
                }
            },
        )
        handles = node.get_handle_positions()
        assert len(handles) == 2
        assert handles["input-1"].edge == "left"
        assert handles["input-1"].percent == 30.0
        assert handles["output-1"].edge == "right"

    def test_node_get_handle_positions_empty(self):
        """Get empty handle positions when none defined."""
        node = ParsedNode(id="node-1", type="agent", position=(0, 0), data={})
        handles = node.get_handle_positions()
        assert len(handles) == 0


class TestParsedEdge:
    """Tests for ParsedEdge dataclass."""

    def test_edge_creation(self):
        """Create a basic parsed edge."""
        edge = ParsedEdge(
            id="edge-1",
            source="node-1",
            target="node-2",
            source_handle="output",
            target_handle="input",
        )
        assert edge.id == "edge-1"
        assert edge.source == "node-1"
        assert edge.target == "node-2"

    def test_edge_is_link_edge_source(self):
        """Detect link edge from source handle."""
        edge = ParsedEdge(
            id="edge-1",
            source="node-1",
            target="node-2",
            source_handle="link-top",
        )
        assert edge.is_link_edge()

    def test_edge_is_link_edge_target(self):
        """Detect link edge from target handle."""
        edge = ParsedEdge(
            id="edge-1",
            source="node-1",
            target="node-2",
            target_handle="link-bottom",
        )
        assert edge.is_link_edge()

    def test_edge_is_not_link_edge(self):
        """Regular edge is not a link edge."""
        edge = ParsedEdge(
            id="edge-1",
            source="node-1",
            target="node-2",
            source_handle="sequential",
            target_handle="sequential",
        )
        assert not edge.is_link_edge()

    def test_edge_animated(self):
        """Edge with animation."""
        edge = ParsedEdge(
            id="edge-1",
            source="node-1",
            target="node-2",
            animated=True,
        )
        assert edge.animated is True


class TestParsedFlow:
    """Tests for ParsedFlow dataclass."""

    def test_flow_creation(self):
        """Create a parsed flow."""
        nodes = [
            ParsedNode(id="n1", type="agent", position=(0, 0), data={}),
            ParsedNode(id="n2", type="agent", position=(100, 0), data={}),
        ]
        edges = [ParsedEdge(id="e1", source="n1", target="n2")]
        flow = ParsedFlow(
            tab_id="tab1",
            tab_name="Main",
            nodes=nodes,
            edges=edges,
            viewport=(0, 0, 1),
        )
        assert flow.tab_id == "tab1"
        assert len(flow.nodes) == 2
        assert len(flow.edges) == 1

    def test_flow_get_node(self):
        """Get node by ID."""
        nodes = [
            ParsedNode(id="n1", type="agent", position=(0, 0), data={}),
            ParsedNode(id="n2", type="prompt", position=(100, 0), data={}),
        ]
        flow = ParsedFlow(
            tab_id="tab1",
            tab_name="Main",
            nodes=nodes,
            edges=[],
            viewport=(0, 0, 1),
        )
        node = flow.get_node("n1")
        assert node is not None
        assert node.type == "agent"

    def test_flow_get_node_not_found(self):
        """Get nonexistent node returns None."""
        flow = ParsedFlow(
            tab_id="tab1",
            tab_name="Main",
            nodes=[],
            edges=[],
            viewport=(0, 0, 1),
        )
        assert flow.get_node("nonexistent") is None

    def test_flow_get_nodes_by_type(self):
        """Get nodes filtered by type."""
        nodes = [
            ParsedNode(id="a1", type="agent", position=(0, 0), data={}),
            ParsedNode(id="a2", type="agent", position=(100, 0), data={}),
            ParsedNode(id="p1", type="prompt", position=(0, 100), data={}),
        ]
        flow = ParsedFlow(
            tab_id="tab1",
            tab_name="Main",
            nodes=nodes,
            edges=[],
            viewport=(0, 0, 1),
        )
        agents = flow.get_nodes_by_type("agent")
        assert len(agents) == 2

    def test_flow_get_edges_from(self):
        """Get edges originating from a node."""
        edges = [
            ParsedEdge(id="e1", source="n1", target="n2"),
            ParsedEdge(id="e2", source="n1", target="n3"),
            ParsedEdge(id="e3", source="n2", target="n3"),
        ]
        flow = ParsedFlow(
            tab_id="tab1",
            tab_name="Main",
            nodes=[],
            edges=edges,
            viewport=(0, 0, 1),
        )
        from_n1 = flow.get_edges_from("n1")
        assert len(from_n1) == 2

    def test_flow_get_edges_to(self):
        """Get edges targeting a node."""
        edges = [
            ParsedEdge(id="e1", source="n1", target="n3"),
            ParsedEdge(id="e2", source="n2", target="n3"),
        ]
        flow = ParsedFlow(
            tab_id="tab1",
            tab_name="Main",
            nodes=[],
            edges=edges,
            viewport=(0, 0, 1),
        )
        to_n3 = flow.get_edges_to("n3")
        assert len(to_n3) == 2

    def test_flow_get_children(self):
        """Get children of a group node."""
        nodes = [
            ParsedNode(id="group", type="group", position=(0, 0), data={}),
            ParsedNode(id="c1", type="agent", position=(10, 10), data={}, parent_id="group"),
            ParsedNode(id="c2", type="agent", position=(20, 20), data={}, parent_id="group"),
            ParsedNode(id="other", type="agent", position=(200, 0), data={}),
        ]
        flow = ParsedFlow(
            tab_id="tab1",
            tab_name="Main",
            nodes=nodes,
            edges=[],
            viewport=(0, 0, 1),
        )
        children = flow.get_children("group")
        assert len(children) == 2


class TestParsedProject:
    """Tests for ParsedProject dataclass."""

    def test_project_get_flow(self):
        """Get flow by tab ID."""
        flow1 = ParsedFlow(
            tab_id="tab1", tab_name="Tab 1", nodes=[], edges=[], viewport=(0, 0, 1)
        )
        flow2 = ParsedFlow(
            tab_id="tab2", tab_name="Tab 2", nodes=[], edges=[], viewport=(0, 0, 1)
        )
        # Create a minimal LoadedProject
        loaded = LoadedProject(
            path=Path("/test"),
            name="test",
            version="3.0",
            tabs=[],
        )
        project = ParsedProject(project=loaded, flows={"tab1": flow1, "tab2": flow2})

        assert project.get_flow("tab1") == flow1
        assert project.get_flow("nonexistent") is None

    def test_project_get_all_nodes(self):
        """Get all nodes across flows."""
        nodes1 = [ParsedNode(id="n1", type="agent", position=(0, 0), data={})]
        nodes2 = [ParsedNode(id="n2", type="agent", position=(0, 0), data={})]
        flow1 = ParsedFlow(
            tab_id="tab1", tab_name="Tab 1", nodes=nodes1, edges=[], viewport=(0, 0, 1)
        )
        flow2 = ParsedFlow(
            tab_id="tab2", tab_name="Tab 2", nodes=nodes2, edges=[], viewport=(0, 0, 1)
        )
        loaded = LoadedProject(path=Path("/test"), name="test", version="3.0", tabs=[])
        project = ParsedProject(project=loaded, flows={"tab1": flow1, "tab2": flow2})

        all_nodes = project.get_all_nodes()
        assert len(all_nodes) == 2

    def test_project_find_node(self):
        """Find a node across all tabs."""
        node = ParsedNode(id="target", type="agent", position=(0, 0), data={})
        flow = ParsedFlow(
            tab_id="tab2", tab_name="Tab 2", nodes=[node], edges=[], viewport=(0, 0, 1)
        )
        loaded = LoadedProject(path=Path("/test"), name="test", version="3.0", tabs=[])
        project = ParsedProject(project=loaded, flows={"tab2": flow})

        result = project.find_node("target")
        assert result is not None
        found_node, tab_id = result
        assert found_node.id == "target"
        assert tab_id == "tab2"

    def test_project_find_node_not_found(self):
        """Find nonexistent node returns None."""
        loaded = LoadedProject(path=Path("/test"), name="test", version="3.0", tabs=[])
        project = ParsedProject(project=loaded, flows={})
        assert project.find_node("nonexistent") is None


class TestFlowParser:
    """Tests for FlowParser class."""

    def test_parse_simple_node(self):
        """Parse a simple node."""
        parser = FlowParser()
        tab = LoadedTab(
            id="tab1",
            name="Main",
            order=0,
            flow_data={
                "nodes": [
                    {
                        "id": "agent-1",
                        "type": "agent",
                        "position": {"x": 100, "y": 200},
                        "data": {"config": {"name": "TestAgent"}},
                    }
                ],
                "edges": [],
                "viewport": {"x": 0, "y": 0, "zoom": 1},
            },
        )
        flow = parser.parse_tab(tab)

        assert len(flow.nodes) == 1
        assert flow.nodes[0].id == "agent-1"
        assert flow.nodes[0].type == "agent"
        assert flow.nodes[0].position == (100, 200)
        assert flow.nodes[0].tab_id == "tab1"

    def test_parse_node_with_parent(self):
        """Parse a node inside a group."""
        parser = FlowParser()
        tab = LoadedTab(
            id="tab1",
            name="Main",
            order=0,
            flow_data={
                "nodes": [
                    {
                        "id": "child",
                        "type": "agent",
                        "position": {"x": 50, "y": 50},
                        "parentId": "group-1",
                        "extent": "parent",
                        "data": {},
                    }
                ],
                "edges": [],
            },
        )
        flow = parser.parse_tab(tab)

        assert flow.nodes[0].parent_id == "group-1"
        assert flow.nodes[0].extent == "parent"

    def test_parse_edge(self):
        """Parse an edge."""
        parser = FlowParser()
        tab = LoadedTab(
            id="tab1",
            name="Main",
            order=0,
            flow_data={
                "nodes": [],
                "edges": [
                    {
                        "id": "edge-1",
                        "source": "n1",
                        "target": "n2",
                        "sourceHandle": "output",
                        "targetHandle": "input",
                        "animated": True,
                    }
                ],
            },
        )
        flow = parser.parse_tab(tab)

        assert len(flow.edges) == 1
        assert flow.edges[0].source == "n1"
        assert flow.edges[0].target == "n2"
        assert flow.edges[0].source_handle == "output"
        assert flow.edges[0].animated is True

    def test_parse_viewport(self):
        """Parse viewport settings."""
        parser = FlowParser()
        tab = LoadedTab(
            id="tab1",
            name="Main",
            order=0,
            flow_data={
                "nodes": [],
                "edges": [],
                "viewport": {"x": 100, "y": 200, "zoom": 1.5},
            },
        )
        flow = parser.parse_tab(tab)

        assert flow.viewport == (100, 200, 1.5)

    def test_parse_custom_node(self):
        """Parse a custom node (prefixed with 'custom:')."""
        parser = FlowParser()
        tab = LoadedTab(
            id="tab1",
            name="Main",
            order=0,
            flow_data={
                "nodes": [
                    {
                        "id": "custom-1",
                        "type": "custom:tools.web_search",
                        "position": {"x": 0, "y": 0},
                        "data": {"config": {"query": "test"}},
                    }
                ],
                "edges": [],
            },
        )
        flow = parser.parse_tab(tab)

        assert flow.nodes[0].type == "custom:tools.web_search"
        assert flow.nodes[0].data["_unit_id"] == "tools.web_search"

    def test_parse_project(self):
        """Parse a complete project with multiple tabs."""
        parser = FlowParser()
        tab1 = LoadedTab(
            id="tab1",
            name="Tab 1",
            order=0,
            flow_data={
                "nodes": [{"id": "n1", "type": "agent", "position": {"x": 0, "y": 0}, "data": {}}],
                "edges": [],
            },
        )
        tab2 = LoadedTab(
            id="tab2",
            name="Tab 2",
            order=1,
            flow_data={
                "nodes": [{"id": "n2", "type": "agent", "position": {"x": 0, "y": 0}, "data": {}}],
                "edges": [],
            },
        )
        loaded = LoadedProject(
            path=Path("/test"),
            name="test",
            version="3.0",
            tabs=[tab1, tab2],
        )

        parsed = parser.parse_project(loaded)

        assert len(parsed.flows) == 2
        assert "tab1" in parsed.flows
        assert "tab2" in parsed.flows
        assert len(parsed.get_all_nodes()) == 2


class TestParsedHandle:
    """Tests for ParsedHandle dataclass."""

    def test_handle_creation(self):
        """Create a handle with custom position."""
        handle = ParsedHandle(id="input-1", edge="left", percent=25.0)
        assert handle.id == "input-1"
        assert handle.edge == "left"
        assert handle.percent == 25.0

    def test_handle_default_percent(self):
        """Handle has default percent of 50."""
        handle = ParsedHandle(id="output", edge="right")
        assert handle.percent == 50.0
