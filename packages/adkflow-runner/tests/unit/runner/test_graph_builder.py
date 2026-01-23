"""Tests for GraphBuilder - builds ExecutionGraph from WorkflowIR.

Note: GraphBuilder only includes custom nodes in the execution graph.
Agents are executed separately by the workflow runner, not by the GraphExecutor.
"""

import pytest

from adkflow_runner.ir import AgentIR, ConnectionSource, CustomNodeIR, WorkflowIR
from adkflow_runner.runner.graph_builder import (
    GraphBuilder,
    partition_custom_nodes,
    build_execution_graph,
)
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
    """Create IR with custom nodes that depend on an agent."""
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
        input_connections={
            "input": [ConnectionSource(node_id="agent_1")]
        },  # Depends on agent
        output_connections={},
    )
    return WorkflowIR(
        project_path="/test",
        root_agent=root,
        all_agents={"agent_1": root},
        custom_nodes=[custom],
    )


@pytest.fixture
def ir_with_independent_custom_nodes():
    """Create IR with custom nodes that don't depend on agents."""
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
        input_connections={},  # No agent dependency
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

    def test_build_excludes_agents(self, simple_ir):
        """Agents are NOT included in the execution graph."""
        builder = GraphBuilder()
        graph = builder.build(simple_ir)
        # Graph should be empty - only agents, no custom nodes
        assert "agent_1" not in graph.nodes
        assert len(graph.nodes) == 0

    def test_build_includes_custom_nodes(self, ir_with_independent_custom_nodes):
        """Custom nodes are added to the graph."""
        builder = GraphBuilder()
        graph = builder.build(ir_with_independent_custom_nodes)
        assert "custom_1" in graph.nodes
        assert graph.nodes["custom_1"].node_type == "custom"

    def test_build_skips_edges_from_agents(self, ir_with_custom_nodes):
        """Edges from agents are skipped (agents are external dependencies)."""
        builder = GraphBuilder()
        graph = builder.build(ir_with_custom_nodes)
        # Custom node should be in graph
        assert "custom_1" in graph.nodes
        # But no edges from the agent (agent is external)
        assert len(graph.edges) == 0

    def test_build_empty_custom_nodes(self):
        """Build with no custom nodes returns empty graph."""
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
        assert len(graph.nodes) == 0

    def test_build_with_custom_node_filter(self):
        """Build can filter to specific custom node IDs."""
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

        # Build with only c1
        graph = builder.build(ir, custom_node_ids={"c1"})
        assert "c1" in graph.nodes
        assert "c2" not in graph.nodes


class TestGraphBuilderEdgeCases:
    """Edge case tests for GraphBuilder."""

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

    def test_custom_node_chain(self):
        """Build with custom nodes connected to each other."""
        root = AgentIR(id="root", name="Root", type="llm", model="gemini-2.0-flash")
        custom1 = CustomNodeIR(
            id="c1",
            unit_id="unit1",
            name="Custom1",
            source_node_id="c1_src",
            config={},
            input_connections={},
            output_connections={"output": ["c2"]},
        )
        custom2 = CustomNodeIR(
            id="c2",
            unit_id="unit2",
            name="Custom2",
            source_node_id="c2_src",
            config={},
            input_connections={"input": [ConnectionSource(node_id="c1")]},
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

        # Both nodes should be in graph
        assert "c1" in graph.nodes
        assert "c2" in graph.nodes

        # Edge from c1 to c2
        edge = next(
            (e for e in graph.edges if e.source_id == "c1" and e.target_id == "c2"),
            None,
        )
        assert edge is not None


class TestGraphBuilderPortResolution:
    """Tests for port resolution methods."""

    def test_find_source_port_default(self):
        """Find source port returns 'output' by default."""
        builder = GraphBuilder()
        root = AgentIR(id="root", name="Root", type="llm", model="gemini-2.0-flash")
        ir = WorkflowIR(
            project_path="/test",
            root_agent=root,
            all_agents={"root": root},
            custom_nodes=[],
        )
        port = builder._find_source_port("unknown", ir)
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

    def test_find_target_port_default(self):
        """Find target port returns 'input' by default."""
        builder = GraphBuilder()
        root = AgentIR(id="root", name="Root", type="llm", model="gemini-2.0-flash")
        ir = WorkflowIR(
            project_path="/test",
            root_agent=root,
            all_agents={"root": root},
            custom_nodes=[],
        )
        port = builder._find_target_port("unknown", ir)
        assert port == "input"

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


class TestPartitionCustomNodes:
    """Tests for partition_custom_nodes function."""

    def test_partition_no_custom_nodes(self):
        """Empty partition when no custom nodes."""
        root = AgentIR(id="root", name="Root", type="llm", model="gemini-2.0-flash")
        ir = WorkflowIR(
            project_path="/test",
            root_agent=root,
            all_agents={"root": root},
            custom_nodes=[],
        )
        pre, post = partition_custom_nodes(ir)
        assert pre == set()
        assert post == set()

    def test_partition_independent_nodes(self):
        """Nodes without agent dependencies are pre-agent."""
        root = AgentIR(id="root", name="Root", type="llm", model="gemini-2.0-flash")
        custom = CustomNodeIR(
            id="c1",
            unit_id="unit1",
            name="Custom1",
            source_node_id="c1_src",
            config={},
            input_connections={},  # No dependencies
            output_connections={},
        )
        ir = WorkflowIR(
            project_path="/test",
            root_agent=root,
            all_agents={"root": root},
            custom_nodes=[custom],
        )
        pre, post = partition_custom_nodes(ir)
        assert pre == {"c1"}
        assert post == set()

    def test_partition_agent_dependent_nodes(self):
        """Nodes with agent dependencies are post-agent."""
        root = AgentIR(id="agent_1", name="Root", type="llm", model="gemini-2.0-flash")
        custom = CustomNodeIR(
            id="c1",
            unit_id="unit1",
            name="Custom1",
            source_node_id="c1_src",
            config={},
            input_connections={
                "input": [ConnectionSource(node_id="agent_1")]
            },  # Depends on agent
            output_connections={},
        )
        ir = WorkflowIR(
            project_path="/test",
            root_agent=root,
            all_agents={"agent_1": root},
            custom_nodes=[custom],
        )
        pre, post = partition_custom_nodes(ir)
        assert pre == set()
        assert post == {"c1"}

    def test_partition_transitive_dependencies(self):
        """Transitive dependencies are correctly classified."""
        root = AgentIR(id="agent_1", name="Root", type="llm", model="gemini-2.0-flash")
        # c1 depends on agent, c2 depends on c1
        custom1 = CustomNodeIR(
            id="c1",
            unit_id="unit1",
            name="Custom1",
            source_node_id="c1_src",
            config={},
            input_connections={"input": [ConnectionSource(node_id="agent_1")]},
            output_connections={"output": ["c2"]},
        )
        custom2 = CustomNodeIR(
            id="c2",
            unit_id="unit2",
            name="Custom2",
            source_node_id="c2_src",
            config={},
            input_connections={
                "input": [ConnectionSource(node_id="c1")]
            },  # Depends on c1 (transitively on agent)
            output_connections={},
        )
        ir = WorkflowIR(
            project_path="/test",
            root_agent=root,
            all_agents={"agent_1": root},
            custom_nodes=[custom1, custom2],
        )
        pre, post = partition_custom_nodes(ir)
        assert pre == set()
        assert post == {"c1", "c2"}  # Both are post-agent

    def test_partition_mixed(self):
        """Mixed pre-agent and post-agent nodes."""
        root = AgentIR(id="agent_1", name="Root", type="llm", model="gemini-2.0-flash")
        # c1 is independent, c2 depends on agent
        custom1 = CustomNodeIR(
            id="c1",
            unit_id="unit1",
            name="Custom1",
            source_node_id="c1_src",
            config={},
            input_connections={},  # Independent
            output_connections={},
        )
        custom2 = CustomNodeIR(
            id="c2",
            unit_id="unit2",
            name="Custom2",
            source_node_id="c2_src",
            config={},
            input_connections={
                "input": [ConnectionSource(node_id="agent_1")]
            },  # Depends on agent
            output_connections={},
        )
        ir = WorkflowIR(
            project_path="/test",
            root_agent=root,
            all_agents={"agent_1": root},
            custom_nodes=[custom1, custom2],
        )
        pre, post = partition_custom_nodes(ir)
        assert pre == {"c1"}
        assert post == {"c2"}


class TestBuildExecutionGraphFunction:
    """Tests for the convenience function."""

    def test_build_execution_graph(self):
        """Convenience function builds graph."""
        root = AgentIR(id="root", name="Root", type="llm", model="gemini-2.0-flash")
        custom = CustomNodeIR(
            id="c1",
            unit_id="unit1",
            name="Custom1",
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

        graph = build_execution_graph(ir)
        assert isinstance(graph, ExecutionGraph)
        assert "c1" in graph.nodes

    def test_build_execution_graph_with_filter(self):
        """Convenience function accepts custom_node_ids filter."""
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

        graph = build_execution_graph(ir, custom_node_ids={"c2"})
        assert "c1" not in graph.nodes
        assert "c2" in graph.nodes


class TestGraphBuilderCustomNodeEdges:
    """Tests for custom node edge building."""

    def test_edges_between_custom_nodes(self):
        """Edges are created between custom nodes."""
        builder = GraphBuilder()
        root = AgentIR(id="root", name="Root", type="llm", model="gemini-2.0-flash")
        custom1 = CustomNodeIR(
            id="c1",
            unit_id="test_unit",
            name="Custom1",
            source_node_id="c1_src",
            config={},
            input_connections={},
            output_connections={"output": ["c2"]},
        )
        custom2 = CustomNodeIR(
            id="c2",
            unit_id="test_unit",
            name="Custom2",
            source_node_id="c2_src",
            config={},
            input_connections={"input": [ConnectionSource(node_id="c1")]},
            output_connections={},
        )
        ir = WorkflowIR(
            project_path="/test",
            root_agent=root,
            all_agents={"root": root},
            custom_nodes=[custom1, custom2],
        )

        graph = builder.build(ir)

        # Should have edge from c1 to c2
        edge = next(
            (e for e in graph.edges if e.source_id == "c1" and e.target_id == "c2"),
            None,
        )
        assert edge is not None
        assert edge.source_port == "output"
        assert edge.target_port == "input"

    def test_edges_to_agents_are_skipped(self):
        """Edges from custom nodes to agents are skipped."""
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
            output_connections={"output": ["a1"]},  # Output to agent
        )
        ir = WorkflowIR(
            project_path="/test",
            root_agent=root,
            all_agents={"root": root, "a1": agent1},
            custom_nodes=[custom],
        )

        graph = builder.build(ir)

        # Custom node should be in graph
        assert "c1" in graph.nodes
        # But no edges to agent (agent is not in graph)
        assert len(graph.edges) == 0
