"""Tests for HierarchyBuilder pattern handling.

Tests various workflow patterns to ensure the recursive fork-join
detection algorithm correctly builds agent hierarchies.
"""

from adkflow_runner.compiler.graph import GraphEdge, GraphNode, WorkflowGraph
from adkflow_runner.compiler.hierarchy import HierarchyBuilder
from adkflow_runner.compiler.parser import ParsedNode
from adkflow_runner.config import EdgeSemantics
from adkflow_runner.ir import AgentIR


def make_parsed_node(node_id: str, node_type: str, name: str) -> ParsedNode:
    """Create a minimal ParsedNode for testing."""
    return ParsedNode(
        id=node_id,
        type=node_type,
        position=(0.0, 0.0),
        data={"agent": {"name": name, "type": "llm"}} if node_type == "agent" else {},
    )


def make_agent_node(node_id: str, name: str, tab_id: str = "tab1") -> GraphNode:
    """Create a mock agent GraphNode."""
    parsed = make_parsed_node(node_id, "agent", name)
    return GraphNode(
        id=node_id,
        type="agent",
        name=name,
        tab_id=tab_id,
        data={"agent": {"name": name, "type": "llm"}},
        parsed_node=parsed,
    )


def make_start_node(node_id: str = "start", tab_id: str = "tab1") -> GraphNode:
    """Create a mock start GraphNode."""
    parsed = make_parsed_node(node_id, "start", "Start")
    return GraphNode(
        id=node_id,
        type="start",
        name="Start",
        tab_id=tab_id,
        data={},
        parsed_node=parsed,
    )


def connect_sequential(source: GraphNode, target: GraphNode) -> GraphEdge:
    """Create a SEQUENTIAL edge between two nodes."""
    edge = GraphEdge(
        source_id=source.id,
        target_id=target.id,
        semantics=EdgeSemantics.SEQUENTIAL,
    )
    source.outgoing.append(edge)
    target.incoming.append(edge)
    return edge


def make_workflow_graph(
    nodes: list[GraphNode],
    edges: list[GraphEdge],
) -> WorkflowGraph:
    """Create a WorkflowGraph from nodes and edges."""
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
        teleporter_pairs=[],
        entry_nodes=entry_nodes,
    )


def get_topology_string(agent: AgentIR | None, depth: int = 0) -> str:
    """Get a simple string representation of the agent hierarchy."""
    if agent is None:
        return "None"

    indent = "  " * depth
    if agent.is_composite():
        type_name = agent.type.capitalize()
        children = [get_topology_string(sa, depth + 1) for sa in agent.subagents]
        children_str = "\n".join(children)
        return f"{indent}{type_name}:\n{children_str}"
    else:
        return f"{indent}- {agent.name}"


def print_topology(agent: AgentIR | None) -> None:
    """Print the agent hierarchy."""
    print(get_topology_string(agent))


# =============================================================================
# Test Patterns
# =============================================================================


def test_simple_sequential():
    """Test: A → B → C (simple sequential chain)"""
    print("\n=== Test: Simple Sequential (A → B → C) ===")

    # Create nodes
    start = make_start_node()
    a = make_agent_node("a", "A")
    b = make_agent_node("b", "B")
    c = make_agent_node("c", "C")

    # Create edges: start → A → B → C
    edges = [
        connect_sequential(start, a),
        connect_sequential(a, b),
        connect_sequential(b, c),
    ]

    graph = make_workflow_graph([start, a, b, c], edges)

    # Get roots (should be [A] since it's connected to start)
    roots = graph.get_root_agents()
    print(f"Roots: {[r.name for r in roots]}")

    # Build hierarchy
    all_agents = {
        "a": AgentIR(id="a", name="A", type="llm"),
        "b": AgentIR(id="b", name="B", type="llm"),
        "c": AgentIR(id="c", name="C", type="llm"),
    }

    builder = HierarchyBuilder(graph, all_agents)
    root = builder.build(roots)

    print("Result:")
    print_topology(root)

    # Verify: should be Seq[A, B, C] or just the chain
    assert root is not None
    if root.is_composite():
        assert root.type == "sequential"
        assert len(root.subagents) == 3
    print("✓ PASSED")


def test_simple_diamond():
    """Test: A || B → C (simple diamond/fork-join)"""
    print("\n=== Test: Simple Diamond (A || B → C) ===")

    # Create nodes
    start = make_start_node()
    a = make_agent_node("a", "A")
    b = make_agent_node("b", "B")
    c = make_agent_node("c", "C")

    # Create edges: start → A, start → B, A → C, B → C
    edges = [
        connect_sequential(start, a),
        connect_sequential(start, b),
        connect_sequential(a, c),
        connect_sequential(b, c),
    ]

    graph = make_workflow_graph([start, a, b, c], edges)
    roots = graph.get_root_agents()
    print(f"Roots: {[r.name for r in roots]}")

    all_agents = {
        "a": AgentIR(id="a", name="A", type="llm"),
        "b": AgentIR(id="b", name="B", type="llm"),
        "c": AgentIR(id="c", name="C", type="llm"),
    }

    builder = HierarchyBuilder(graph, all_agents)
    root = builder.build(roots)

    print("Result:")
    print_topology(root)

    # Verify: should be Seq[Par[A, B], C]
    assert root is not None
    assert root.type == "sequential"
    assert len(root.subagents) == 2
    assert root.subagents[0].type == "parallel"
    assert root.subagents[1].name == "C"
    print("✓ PASSED")


def test_extended_diamond():
    """Test: A || B → C → D (extended diamond)"""
    print("\n=== Test: Extended Diamond (A || B → C → D) ===")

    start = make_start_node()
    a = make_agent_node("a", "A")
    b = make_agent_node("b", "B")
    c = make_agent_node("c", "C")
    d = make_agent_node("d", "D")

    edges = [
        connect_sequential(start, a),
        connect_sequential(start, b),
        connect_sequential(a, c),
        connect_sequential(b, c),
        connect_sequential(c, d),
    ]

    graph = make_workflow_graph([start, a, b, c, d], edges)
    roots = graph.get_root_agents()
    print(f"Roots: {[r.name for r in roots]}")

    all_agents = {
        "a": AgentIR(id="a", name="A", type="llm"),
        "b": AgentIR(id="b", name="B", type="llm"),
        "c": AgentIR(id="c", name="C", type="llm"),
        "d": AgentIR(id="d", name="D", type="llm"),
    }

    builder = HierarchyBuilder(graph, all_agents)
    root = builder.build(roots)

    print("Result:")
    print_topology(root)

    # Verify: should be Seq[Par[A, B], C, D] or Seq[Par[A, B], Seq[C, D]]
    assert root is not None
    assert root.type == "sequential"
    # The parallel part should be first
    assert root.subagents[0].type == "parallel"
    print("✓ PASSED")


def test_three_way_parallel():
    """Test: A || B || C → D (3-way parallel merge)"""
    print("\n=== Test: 3-Way Parallel (A || B || C → D) ===")

    start = make_start_node()
    a = make_agent_node("a", "A")
    b = make_agent_node("b", "B")
    c = make_agent_node("c", "C")
    d = make_agent_node("d", "D")

    edges = [
        connect_sequential(start, a),
        connect_sequential(start, b),
        connect_sequential(start, c),
        connect_sequential(a, d),
        connect_sequential(b, d),
        connect_sequential(c, d),
    ]

    graph = make_workflow_graph([start, a, b, c, d], edges)
    roots = graph.get_root_agents()
    print(f"Roots: {[r.name for r in roots]}")

    all_agents = {
        "a": AgentIR(id="a", name="A", type="llm"),
        "b": AgentIR(id="b", name="B", type="llm"),
        "c": AgentIR(id="c", name="C", type="llm"),
        "d": AgentIR(id="d", name="D", type="llm"),
    }

    builder = HierarchyBuilder(graph, all_agents)
    root = builder.build(roots)

    print("Result:")
    print_topology(root)

    # Verify: should be Seq[Par[A, B, C], D]
    assert root is not None
    assert root.type == "sequential"
    assert root.subagents[0].type == "parallel"
    assert len(root.subagents[0].subagents) == 3
    print("✓ PASSED")


def test_pure_parallel_no_merge():
    """Test: A || B (no convergence)"""
    print("\n=== Test: Pure Parallel No Merge (A || B) ===")

    start = make_start_node()
    a = make_agent_node("a", "A")
    b = make_agent_node("b", "B")

    edges = [
        connect_sequential(start, a),
        connect_sequential(start, b),
    ]

    graph = make_workflow_graph([start, a, b], edges)
    roots = graph.get_root_agents()
    print(f"Roots: {[r.name for r in roots]}")

    all_agents = {
        "a": AgentIR(id="a", name="A", type="llm"),
        "b": AgentIR(id="b", name="B", type="llm"),
    }

    builder = HierarchyBuilder(graph, all_agents)
    root = builder.build(roots)

    print("Result:")
    print_topology(root)

    # Verify: should be Par[A, B]
    assert root is not None
    assert root.type == "parallel"
    assert len(root.subagents) == 2
    print("✓ PASSED")


def test_mid_flow_fork_join():
    """Test: A → B || C → D (fork in middle)"""
    print("\n=== Test: Mid-Flow Fork-Join (A → B || C → D) ===")

    start = make_start_node()
    a = make_agent_node("a", "A")
    b = make_agent_node("b", "B")
    c = make_agent_node("c", "C")
    d = make_agent_node("d", "D")

    # start → A → B → D
    #           → C → D
    edges = [
        connect_sequential(start, a),
        connect_sequential(a, b),
        connect_sequential(a, c),
        connect_sequential(b, d),
        connect_sequential(c, d),
    ]

    graph = make_workflow_graph([start, a, b, c, d], edges)
    roots = graph.get_root_agents()
    print(f"Roots: {[r.name for r in roots]}")

    all_agents = {
        "a": AgentIR(id="a", name="A", type="llm"),
        "b": AgentIR(id="b", name="B", type="llm"),
        "c": AgentIR(id="c", name="C", type="llm"),
        "d": AgentIR(id="d", name="D", type="llm"),
    }

    builder = HierarchyBuilder(graph, all_agents)
    root = builder.build(roots)

    print("Result:")
    print_topology(root)

    # Verify: should be Seq[A, Par[B, C], D] or Seq[A, Seq[Par[B,C], D]]
    assert root is not None
    assert root.type == "sequential"
    # A should be first
    assert root.subagents[0].name == "A"
    print("✓ PASSED")


# =============================================================================
# Main
# =============================================================================

if __name__ == "__main__":
    print("=" * 60)
    print("HierarchyBuilder Pattern Tests")
    print("=" * 60)

    test_simple_sequential()
    test_simple_diamond()
    test_extended_diamond()
    test_three_way_parallel()
    test_pure_parallel_no_merge()
    test_mid_flow_fork_join()

    print("\n" + "=" * 60)
    print("All tests passed!")
    print("=" * 60)
