"""Tests for GraphExecutor and execution graph structures."""

import pytest
from pathlib import Path

from adkflow_runner.runner.graph_executor import (
    ExecutionNode,
    ExecutionEdge,
    ExecutionGraph,
    ExecutionCache,
)
from adkflow_runner.ir import AgentIR, CustomNodeIR


class TestExecutionNode:
    """Tests for ExecutionNode dataclass."""

    def test_agent_node_creation(self):
        """Create agent execution node."""
        agent_ir = AgentIR(
            id="agent_1",
            name="TestAgent",
            type="llm",
            model="gemini-2.0-flash",
        )
        node = ExecutionNode(id="agent_1", node_type="agent", ir=agent_ir)
        assert node.id == "agent_1"
        assert node.node_type == "agent"
        assert node.ir == agent_ir

    def test_custom_node_creation(self):
        """Create custom execution node."""
        custom_ir = CustomNodeIR(
            id="custom_1",
            unit_id="my_unit",
            name="Custom Node",
            source_node_id="custom_1_src",
            config={"value": 42},
            input_connections={},
            output_connections={},
        )
        node = ExecutionNode(id="custom_1", node_type="custom", ir=custom_ir)
        assert node.id == "custom_1"
        assert node.node_type == "custom"


class TestExecutionEdge:
    """Tests for ExecutionEdge dataclass."""

    def test_edge_creation(self):
        """Create execution edge."""
        edge = ExecutionEdge(
            source_id="node_1",
            source_port="output",
            target_id="node_2",
            target_port="input",
        )
        assert edge.source_id == "node_1"
        assert edge.source_port == "output"
        assert edge.target_id == "node_2"
        assert edge.target_port == "input"


class TestExecutionGraph:
    """Tests for ExecutionGraph dataclass."""

    def test_empty_graph(self):
        """Create empty execution graph."""
        graph = ExecutionGraph()
        assert graph.nodes == {}
        assert graph.edges == []

    def test_graph_with_nodes_and_edges(self):
        """Create graph with nodes and edges."""
        agent_ir = AgentIR(id="a1", name="A1", type="llm", model="gemini-2.0-flash")
        node = ExecutionNode(id="a1", node_type="agent", ir=agent_ir)
        edge = ExecutionEdge(
            source_id="a1",
            source_port="output",
            target_id="a2",
            target_port="input",
        )
        graph = ExecutionGraph(nodes={"a1": node}, edges=[edge])
        assert "a1" in graph.nodes
        assert len(graph.edges) == 1


class TestExecutionCache:
    """Tests for ExecutionCache class."""

    def test_cache_creation(self):
        """Create execution cache."""
        cache = ExecutionCache()
        assert cache._memory_cache == {}

    def test_cache_with_directory(self, tmp_path):
        """Create cache with directory."""
        cache = ExecutionCache(cache_dir=tmp_path)
        assert cache.cache_dir == tmp_path

    def test_compute_key(self):
        """Compute cache key from inputs."""
        cache = ExecutionCache()
        key1 = cache.compute_key(
            node_id="node_1",
            inputs={"a": 1},
            config={"b": 2},
            is_changed_value="v1",
        )
        assert isinstance(key1, str)
        assert len(key1) == 64  # SHA256 hex

    def test_compute_key_different_inputs(self):
        """Different inputs produce different keys."""
        cache = ExecutionCache()
        key1 = cache.compute_key("n1", {"a": 1}, {}, None)
        key2 = cache.compute_key("n1", {"a": 2}, {}, None)
        assert key1 != key2

    def test_compute_key_different_config(self):
        """Different config produces different keys."""
        cache = ExecutionCache()
        key1 = cache.compute_key("n1", {}, {"c": 1}, None)
        key2 = cache.compute_key("n1", {}, {"c": 2}, None)
        assert key1 != key2

    def test_compute_key_different_is_changed(self):
        """Different is_changed produces different keys."""
        cache = ExecutionCache()
        key1 = cache.compute_key("n1", {}, {}, "v1")
        key2 = cache.compute_key("n1", {}, {}, "v2")
        assert key1 != key2

    def test_compute_key_same_inputs(self):
        """Same inputs produce same key."""
        cache = ExecutionCache()
        key1 = cache.compute_key("n1", {"a": 1}, {"b": 2}, "v")
        key2 = cache.compute_key("n1", {"a": 1}, {"b": 2}, "v")
        assert key1 == key2

    def test_make_hashable_dict(self):
        """Convert dict to hashable."""
        cache = ExecutionCache()
        result = cache._make_hashable({"b": 2, "a": 1})
        assert isinstance(result, tuple)

    def test_make_hashable_list(self):
        """Convert list to hashable tuple of strings."""
        cache = ExecutionCache()
        result = cache._make_hashable([1, 2, 3])
        # Integers are converted to strings
        assert result == ("1", "2", "3")

    def test_make_hashable_nested(self):
        """Convert nested structures."""
        cache = ExecutionCache()
        result = cache._make_hashable({"list": [1, {"nested": True}]})
        assert isinstance(result, tuple)
