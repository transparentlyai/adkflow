"""Tests for GraphBuilder - builds ExecutionGraph from WorkflowIR."""

import pytest

from adkflow_runner.ir import AgentIR, CustomNodeIR, WorkflowIR
from adkflow_runner.runner.graph_builder import GraphBuilder
from adkflow_runner.runner.graph_executor import ExecutionGraph


@pytest.fixture
def simple_ir():
    """Create a simple workflow IR with one agent."""
    root = AgentIR(
        id="agent_1",
        name="TestAgent",
        type="llm",
        model="gemini-2.0-flash",
    )
    return WorkflowIR(
        project_path="/test",
        root_agent=root,
        all_agents={"agent_1": root},
        custom_nodes=[],
    )


@pytest.fixture
def ir_with_custom_nodes():
    """Create IR with custom nodes."""
    root = AgentIR(
        id="agent_1",
        name="TestAgent",
        type="llm",
        model="gemini-2.0-flash",
    )
    custom = CustomNodeIR(
        id="custom_1",
        unit_id="my_unit",
        name="Custom Node",
        source_node_id="custom_1_src",
        config={"value": 42},
        input_connections={"input": ["agent_1"]},
        output_connections={},
    )
    return WorkflowIR(
        project_path="/test",
        root_agent=root,
        all_agents={"agent_1": root},
        custom_nodes=[custom],
    )


class TestGraphBuilder:
    """Tests for GraphBuilder class."""

    def test_build_creates_execution_graph(self, simple_ir):
        """Build returns ExecutionGraph."""
        builder = GraphBuilder()
        graph = builder.build(simple_ir)
        assert isinstance(graph, ExecutionGraph)

    def test_build_includes_agents_as_nodes(self, simple_ir):
        """Agents are added as nodes in the graph."""
        builder = GraphBuilder()
        graph = builder.build(simple_ir)
        assert "agent_1" in graph.nodes
        assert graph.nodes["agent_1"].node_type == "agent"

    def test_build_includes_custom_nodes(self, ir_with_custom_nodes):
        """Custom nodes are added to the graph."""
        builder = GraphBuilder()
        graph = builder.build(ir_with_custom_nodes)
        assert "custom_1" in graph.nodes
        assert graph.nodes["custom_1"].node_type == "custom"

    def test_build_creates_edges_from_connections(self, ir_with_custom_nodes):
        """Edges are created from input/output connections."""
        builder = GraphBuilder()
        graph = builder.build(ir_with_custom_nodes)
        # Should have edge from agent_1 to custom_1
        assert len(graph.edges) >= 1
        edge = next(
            (e for e in graph.edges if e.target_id == "custom_1"),
            None,
        )
        assert edge is not None
        assert edge.source_id == "agent_1"

    def test_build_empty_ir(self):
        """Build with minimal IR."""
        root = AgentIR(
            id="root",
            name="Root",
            type="llm",
            model="gemini-2.0-flash",
        )
        ir = WorkflowIR(
            project_path="/test",
            root_agent=root,
            all_agents={"root": root},
            custom_nodes=[],
        )
        builder = GraphBuilder()
        graph = builder.build(ir)
        assert len(graph.nodes) == 1


class TestGraphBuilderEdgeCases:
    """Edge case tests for GraphBuilder."""

    def test_multiple_agents(self):
        """Build with multiple agents."""
        agent1 = AgentIR(id="a1", name="Agent1", type="llm", model="gemini-2.0-flash")
        agent2 = AgentIR(id="a2", name="Agent2", type="llm", model="gemini-2.0-flash")
        root = AgentIR(
            id="seq",
            name="Seq",
            type="sequential",
            subagents=[agent1, agent2],
        )
        ir = WorkflowIR(
            project_path="/test",
            root_agent=root,
            all_agents={"seq": root, "a1": agent1, "a2": agent2},
            custom_nodes=[],
        )
        builder = GraphBuilder()
        graph = builder.build(ir)
        assert len(graph.nodes) == 3

    def test_multiple_custom_nodes(self):
        """Build with multiple custom nodes."""
        root = AgentIR(id="root", name="Root", type="llm", model="gemini-2.0-flash")
        custom1 = CustomNodeIR(
            id="c1",
            unit_id="unit1",
            name="Custom1",
            source_node_id="c1_src",
            config={},
            input_connections={},
            output_connections={},
        )
        custom2 = CustomNodeIR(
            id="c2",
            unit_id="unit2",
            name="Custom2",
            source_node_id="c2_src",
            config={},
            input_connections={},
            output_connections={},
        )
        ir = WorkflowIR(
            project_path="/test",
            root_agent=root,
            all_agents={"root": root},
            custom_nodes=[custom1, custom2],
        )
        builder = GraphBuilder()
        graph = builder.build(ir)
        assert "c1" in graph.nodes
        assert "c2" in graph.nodes


class TestGraphBuilderPortResolution:
    """Tests for port resolution methods."""

    def test_find_source_port_for_agent(self):
        """Find source port for agent returns 'output'."""
        builder = GraphBuilder()
        root = AgentIR(id="root", name="Root", type="llm", model="gemini-2.0-flash")
        ir = WorkflowIR(
            project_path="/test",
            root_agent=root,
            all_agents={"root": root},
            custom_nodes=[],
        )
        port = builder._find_source_port("root", ir)
        assert port == "output"

    def test_find_source_port_for_custom_node(self):
        """Find source port for custom node."""
        builder = GraphBuilder()
        root = AgentIR(id="root", name="Root", type="llm", model="gemini-2.0-flash")
        custom = CustomNodeIR(
            id="c1",
            unit_id="test_unit",
            name="Custom",
            source_node_id="c1_src",
            config={},
            input_connections={},
            output_connections={},
        )
        ir = WorkflowIR(
            project_path="/test",
            root_agent=root,
            all_agents={"root": root},
            custom_nodes=[custom],
        )
        port = builder._find_source_port("c1", ir)
        assert port == "output"  # Default when no schema

    def test_find_target_port_for_agent(self):
        """Find target port for agent returns 'instruction'."""
        builder = GraphBuilder()
        root = AgentIR(id="root", name="Root", type="llm", model="gemini-2.0-flash")
        ir = WorkflowIR(
            project_path="/test",
            root_agent=root,
            all_agents={"root": root},
            custom_nodes=[],
        )
        port = builder._find_target_port("root", ir)
        assert port == "instruction"

    def test_find_target_port_for_custom_node(self):
        """Find target port for custom node."""
        builder = GraphBuilder()
        root = AgentIR(id="root", name="Root", type="llm", model="gemini-2.0-flash")
        custom = CustomNodeIR(
            id="c1",
            unit_id="test_unit",
            name="Custom",
            source_node_id="c1_src",
            config={},
            input_connections={},
            output_connections={},
        )
        ir = WorkflowIR(
            project_path="/test",
            root_agent=root,
            all_agents={"root": root},
            custom_nodes=[custom],
        )
        port = builder._find_target_port("c1", ir)
        assert port == "input"  # Default when no schema

    def test_find_target_port_unknown_node(self):
        """Find target port for unknown node returns 'input'."""
        builder = GraphBuilder()
        root = AgentIR(id="root", name="Root", type="llm", model="gemini-2.0-flash")
        ir = WorkflowIR(
            project_path="/test",
            root_agent=root,
            all_agents={"root": root},
            custom_nodes=[],
        )
        port = builder._find_target_port("unknown_id", ir)
        assert port == "input"


class TestGraphBuilderAgentEdges:
    """Tests for agent edge building."""

    def test_sequential_agent_edges(self):
        """Sequential agents have edges between them."""
        builder = GraphBuilder()
        agent1 = AgentIR(id="a1", name="Agent1", type="llm", model="gemini-2.0-flash")
        agent2 = AgentIR(id="a2", name="Agent2", type="llm", model="gemini-2.0-flash")
        seq = AgentIR(
            id="seq",
            name="Sequential",
            type="sequential",
            subagents=[agent1, agent2],
        )
        ir = WorkflowIR(
            project_path="/test",
            root_agent=seq,
            all_agents={"seq": seq, "a1": agent1, "a2": agent2},
            custom_nodes=[],
        )

        edges = builder._build_agent_edges(ir)

        assert len(edges) >= 1
        edge = next(
            (e for e in edges if e.source_id == "a1" and e.target_id == "a2"), None
        )
        assert edge is not None
        assert edge.source_port == "output"
        assert edge.target_port == "input"

    def test_loop_agent_edges(self):
        """Loop agents have edges from loop to subagents."""
        builder = GraphBuilder()
        agent1 = AgentIR(id="a1", name="Agent1", type="llm", model="gemini-2.0-flash")
        loop = AgentIR(
            id="loop",
            name="Loop",
            type="loop",
            subagents=[agent1],
        )
        ir = WorkflowIR(
            project_path="/test",
            root_agent=loop,
            all_agents={"loop": loop, "a1": agent1},
            custom_nodes=[],
        )

        edges = builder._build_agent_edges(ir)

        assert len(edges) >= 1
        edge = next(
            (e for e in edges if e.source_id == "loop" and e.target_id == "a1"), None
        )
        assert edge is not None
        assert edge.source_port == "loop_control"

    def test_parallel_agent_no_inter_edges(self):
        """Parallel agents have no edges between subagents."""
        builder = GraphBuilder()
        agent1 = AgentIR(id="a1", name="Agent1", type="llm", model="gemini-2.0-flash")
        agent2 = AgentIR(id="a2", name="Agent2", type="llm", model="gemini-2.0-flash")
        parallel = AgentIR(
            id="par",
            name="Parallel",
            type="parallel",
            subagents=[agent1, agent2],
        )
        ir = WorkflowIR(
            project_path="/test",
            root_agent=parallel,
            all_agents={"par": parallel, "a1": agent1, "a2": agent2},
            custom_nodes=[],
        )

        edges = builder._build_agent_edges(ir)

        # No direct edges between a1 and a2
        inter_edges = [
            e
            for e in edges
            if (e.source_id in ("a1", "a2") and e.target_id in ("a1", "a2"))
        ]
        assert len(inter_edges) == 0


class TestBuildExecutionGraphFunction:
    """Tests for the convenience function."""

    def test_build_execution_graph(self):
        """Convenience function builds graph."""
        from adkflow_runner.runner.graph_builder import build_execution_graph

        root = AgentIR(id="root", name="Root", type="llm", model="gemini-2.0-flash")
        ir = WorkflowIR(
            project_path="/test",
            root_agent=root,
            all_agents={"root": root},
            custom_nodes=[],
        )

        graph = build_execution_graph(ir)
        assert isinstance(graph, ExecutionGraph)
        assert "root" in graph.nodes


class TestGraphBuilderOutputConnections:
    """Tests for output connection edge building."""

    def test_output_connections_create_edges(self):
        """Output connections create edges to target nodes."""
        builder = GraphBuilder()
        root = AgentIR(id="root", name="Root", type="llm", model="gemini-2.0-flash")
        agent1 = AgentIR(id="a1", name="Agent1", type="llm", model="gemini-2.0-flash")
        custom = CustomNodeIR(
            id="c1",
            unit_id="test_unit",
            name="Custom",
            source_node_id="c1_src",
            config={},
            input_connections={},
            output_connections={"output": ["a1"]},
        )
        ir = WorkflowIR(
            project_path="/test",
            root_agent=root,
            all_agents={"root": root, "a1": agent1},
            custom_nodes=[custom],
        )

        graph = builder.build(ir)

        # Should have edge from c1 to a1
        edge = next(
            (e for e in graph.edges if e.source_id == "c1" and e.target_id == "a1"),
            None,
        )
        assert edge is not None
        assert edge.source_port == "output"
