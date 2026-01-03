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
            id="c1", unit_id="unit1", name="Custom1", source_node_id="c1_src",
            config={}, input_connections={}, output_connections={},
        )
        custom2 = CustomNodeIR(
            id="c2", unit_id="unit2", name="Custom2", source_node_id="c2_src",
            config={}, input_connections={}, output_connections={},
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
