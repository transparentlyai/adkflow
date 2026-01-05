"""Tests for the graph building and analysis module.

Tests graph construction, edge semantics, and cycle detection.
"""

from __future__ import annotations

import pytest

from adkflow_runner.compiler.graph import (
    GraphBuilder,
    GraphEdge,
    GraphNode,
    TeleporterPair,
    WorkflowGraph,
)
from adkflow_runner.config import EdgeSemantics
from adkflow_runner.errors import CycleDetectedError


class TestGraphEdge:
    """Tests for GraphEdge dataclass."""

    def test_edge_creation(self):
        """Create a graph edge."""
        edge = GraphEdge(
            source_id="n1",
            target_id="n2",
            semantics=EdgeSemantics.SEQUENTIAL,
        )
        assert edge.source_id == "n1"
        assert edge.target_id == "n2"
        assert edge.semantics == EdgeSemantics.SEQUENTIAL

    def test_edge_is_data_flow(self):
        """Check data flow edge types."""
        instruction_edge = GraphEdge(
            source_id="p1", target_id="a1", semantics=EdgeSemantics.INSTRUCTION
        )
        tool_edge = GraphEdge(
            source_id="t1", target_id="a1", semantics=EdgeSemantics.TOOL
        )
        context_edge = GraphEdge(
            source_id="c1", target_id="a1", semantics=EdgeSemantics.CONTEXT
        )

        assert instruction_edge.is_data_flow()
        assert tool_edge.is_data_flow()
        assert context_edge.is_data_flow()

    def test_edge_is_agent_flow(self):
        """Check agent flow edge types."""
        seq_edge = GraphEdge(
            source_id="a1", target_id="a2", semantics=EdgeSemantics.SEQUENTIAL
        )
        par_edge = GraphEdge(
            source_id="a1", target_id="a2", semantics=EdgeSemantics.PARALLEL
        )
        sub_edge = GraphEdge(
            source_id="a1", target_id="a2", semantics=EdgeSemantics.SUBAGENT
        )

        assert seq_edge.is_agent_flow()
        assert par_edge.is_agent_flow()
        assert sub_edge.is_agent_flow()

    def test_edge_not_data_flow(self):
        """Sequential edge is not data flow."""
        edge = GraphEdge(
            source_id="a1", target_id="a2", semantics=EdgeSemantics.SEQUENTIAL
        )
        assert not edge.is_data_flow()


class TestGraphNode:
    """Tests for GraphNode dataclass."""

    def test_node_creation(self, make_parsed_node):
        """Create a graph node."""
        parsed = make_parsed_node("agent-1", "agent", "TestAgent")
        node = GraphNode(
            id="agent-1",
            type="agent",
            name="TestAgent",
            tab_id="tab1",
            data={},
            parsed_node=parsed,
        )
        assert node.id == "agent-1"
        assert node.type == "agent"
        assert node.name == "TestAgent"

    def test_node_get_incoming_by_semantics(self, make_parsed_node):
        """Get incoming edges filtered by semantics."""
        parsed = make_parsed_node("a1", "agent")
        node = GraphNode(
            id="a1",
            type="agent",
            name="A1",
            tab_id="tab1",
            data={},
            parsed_node=parsed,
        )
        node.incoming = [
            GraphEdge(
                source_id="p1", target_id="a1", semantics=EdgeSemantics.INSTRUCTION
            ),
            GraphEdge(
                source_id="a0", target_id="a1", semantics=EdgeSemantics.SEQUENTIAL
            ),
            GraphEdge(source_id="t1", target_id="a1", semantics=EdgeSemantics.TOOL),
        ]

        instructions = node.get_incoming_by_semantics(EdgeSemantics.INSTRUCTION)
        assert len(instructions) == 1

        sequential = node.get_incoming_by_semantics(EdgeSemantics.SEQUENTIAL)
        assert len(sequential) == 1


class TestWorkflowGraph:
    """Tests for WorkflowGraph dataclass."""

    def test_graph_get_node(self, make_graph_node):
        """Get node by ID."""
        node1 = make_graph_node("n1", "agent", "Agent1")
        node2 = make_graph_node("n2", "agent", "Agent2")
        graph = WorkflowGraph(
            nodes={"n1": node1, "n2": node2},
            edges=[],
            teleporter_pairs=[],
            entry_nodes=[node1],
        )

        assert graph.get_node("n1") == node1
        assert graph.get_node("n2") == node2
        assert graph.get_node("nonexistent") is None

    def test_graph_get_agent_nodes(self, make_graph_node):
        """Get all agent nodes."""
        agent1 = make_graph_node("a1", "agent", "Agent1")
        agent2 = make_graph_node("a2", "agent", "Agent2")
        prompt = make_graph_node("p1", "prompt", "Prompt1")
        graph = WorkflowGraph(
            nodes={"a1": agent1, "a2": agent2, "p1": prompt},
            edges=[],
            teleporter_pairs=[],
            entry_nodes=[],
        )

        agents = graph.get_agent_nodes()
        assert len(agents) == 2

    def test_graph_get_user_input_nodes(self, make_graph_node):
        """Get all userInput nodes."""
        agent = make_graph_node("a1", "agent", "Agent")
        user_input = make_graph_node("ui1", "userInput", "UserInput")
        graph = WorkflowGraph(
            nodes={"a1": agent, "ui1": user_input},
            edges=[],
            teleporter_pairs=[],
            entry_nodes=[],
        )

        user_inputs = graph.get_user_input_nodes()
        assert len(user_inputs) == 1
        assert user_inputs[0].id == "ui1"

    def test_graph_get_trigger_user_inputs(self, make_graph_node, make_graph_edge):
        """Get userInput nodes that act as triggers (no incoming sequential)."""
        ui_trigger = make_graph_node("ui1", "userInput", "Trigger")
        ui_pause = make_graph_node("ui2", "userInput", "Pause")
        agent = make_graph_node("a1", "agent", "Agent")

        # ui_pause has incoming sequential edge
        edge = make_graph_edge(agent, ui_pause, EdgeSemantics.SEQUENTIAL)

        graph = WorkflowGraph(
            nodes={"ui1": ui_trigger, "ui2": ui_pause, "a1": agent},
            edges=[edge],
            teleporter_pairs=[],
            entry_nodes=[],
        )

        triggers = graph.get_trigger_user_inputs()
        assert len(triggers) == 1
        assert triggers[0].id == "ui1"

    def test_graph_get_root_agents_with_start(self, make_graph_node, make_graph_edge):
        """Root agents are those connected to start node."""
        start = make_graph_node("start", "start", "Start")
        agent1 = make_graph_node("a1", "agent", "Agent1")
        agent2 = make_graph_node("a2", "agent", "Agent2")

        edge = make_graph_edge(start, agent1, EdgeSemantics.SEQUENTIAL)

        graph = WorkflowGraph(
            nodes={"start": start, "a1": agent1, "a2": agent2},
            edges=[edge],
            teleporter_pairs=[],
            entry_nodes=[],
        )

        roots = graph.get_root_agents()
        assert len(roots) == 1
        assert roots[0].id == "a1"

    def test_graph_get_root_agents_no_start(self, make_graph_node, make_graph_edge):
        """Root agents with no incoming sequential edges."""
        agent1 = make_graph_node("a1", "agent", "Agent1")
        agent2 = make_graph_node("a2", "agent", "Agent2")

        # a1 -> a2, so a1 is root
        edge = make_graph_edge(agent1, agent2, EdgeSemantics.SEQUENTIAL)

        graph = WorkflowGraph(
            nodes={"a1": agent1, "a2": agent2},
            edges=[edge],
            teleporter_pairs=[],
            entry_nodes=[agent1],
        )

        roots = graph.get_root_agents()
        assert len(roots) == 1
        assert roots[0].id == "a1"

    def test_graph_topological_sort_simple(self, make_graph_node, make_graph_edge):
        """Topological sort of simple sequential graph."""
        a = make_graph_node("a", "agent", "A")
        b = make_graph_node("b", "agent", "B")
        c = make_graph_node("c", "agent", "C")

        e1 = make_graph_edge(a, b, EdgeSemantics.SEQUENTIAL)
        e2 = make_graph_edge(b, c, EdgeSemantics.SEQUENTIAL)

        graph = WorkflowGraph(
            nodes={"a": a, "b": b, "c": c},
            edges=[e1, e2],
            teleporter_pairs=[],
            entry_nodes=[a],
        )

        order = graph.topological_sort()
        # Order should be [a, b, c] or nodes before their dependencies
        assert order.index("a") < order.index("b")
        assert order.index("b") < order.index("c")

    def test_graph_topological_sort_cycle_detection(
        self, make_graph_node, make_graph_edge
    ):
        """Topological sort detects cycles."""
        a = make_graph_node("a", "agent", "A")
        b = make_graph_node("b", "agent", "B")

        # Create cycle: a -> b -> a
        e1 = make_graph_edge(a, b, EdgeSemantics.SEQUENTIAL)
        e2 = make_graph_edge(b, a, EdgeSemantics.SEQUENTIAL)

        graph = WorkflowGraph(
            nodes={"a": a, "b": b},
            edges=[e1, e2],
            teleporter_pairs=[],
            entry_nodes=[],
        )

        with pytest.raises(CycleDetectedError):
            graph.topological_sort()


class TestTeleporterPair:
    """Tests for TeleporterPair dataclass."""

    def test_teleporter_pair_creation(self, make_graph_node):
        """Create a teleporter pair."""
        output = make_graph_node("out", "teleportOut", "Out")
        input_node = make_graph_node("in", "teleportIn", "In")

        pair = TeleporterPair(
            name="DataChannel",
            output_node=output,
            input_node=input_node,
        )
        assert pair.name == "DataChannel"
        assert pair.output_node.id == "out"
        assert pair.input_node.id == "in"


class TestGraphBuilder:
    """Tests for GraphBuilder class."""

    def test_build_empty_graph(self, minimal_project):
        """Build graph from empty project."""
        from adkflow_runner.compiler.loader import ProjectLoader
        from adkflow_runner.compiler.parser import FlowParser

        loader = ProjectLoader()
        parser = FlowParser()
        builder = GraphBuilder()

        project = loader.load(minimal_project)
        parsed = parser.parse_project(project)
        graph = builder.build(parsed)

        assert len(graph.nodes) == 0
        assert len(graph.edges) == 0

    def test_build_simple_graph(self, tmp_path):
        """Build graph with nodes and edges."""
        import json

        from adkflow_runner.compiler.loader import ProjectLoader
        from adkflow_runner.compiler.parser import FlowParser

        manifest = {
            "name": "test",
            "version": "3.0",
            "tabs": [{"id": "tab1", "name": "Main"}],
            "nodes": [
                {
                    "id": "a1",
                    "type": "agent",
                    "position": {"x": 0, "y": 0},
                    "data": {"tabId": "tab1", "config": {"name": "Agent1"}},
                },
                {
                    "id": "a2",
                    "type": "agent",
                    "position": {"x": 200, "y": 0},
                    "data": {"tabId": "tab1", "config": {"name": "Agent2"}},
                },
            ],
            "edges": [
                {
                    "id": "e1",
                    "source": "a1",
                    "target": "a2",
                    "sourceHandle": "output",
                    "targetHandle": "agent-input",
                },
            ],
        }
        (tmp_path / "manifest.json").write_text(json.dumps(manifest))

        loader = ProjectLoader()
        parser = FlowParser()
        builder = GraphBuilder()

        project = loader.load(tmp_path)
        parsed = parser.parse_project(project)
        graph = builder.build(parsed)

        assert len(graph.nodes) == 2
        assert len(graph.edges) == 1
        assert graph.edges[0].semantics == EdgeSemantics.SEQUENTIAL
