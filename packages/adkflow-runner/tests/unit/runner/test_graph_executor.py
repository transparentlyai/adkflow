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

    def test_get_and_set(self):
        """Get and set cache values."""
        cache = ExecutionCache()
        cache.set("key1", {"output": "value1"})

        assert cache.get("key1") == {"output": "value1"}
        assert cache.get("nonexistent") is None

    def test_should_execute_always_execute(self):
        """Always execute when flag is set."""
        cache = ExecutionCache()
        assert cache.should_execute("node1", "v1", always_execute=True) is True

    def test_should_execute_first_run(self):
        """Execute on first run (no previous value)."""
        cache = ExecutionCache()
        assert cache.should_execute("node1", "v1", always_execute=False) is True

    def test_should_execute_value_unchanged(self):
        """Skip execution when value unchanged."""
        cache = ExecutionCache()
        cache.update_is_changed("node1", "v1")

        assert cache.should_execute("node1", "v1", always_execute=False) is False

    def test_should_execute_value_changed(self):
        """Execute when value changed."""
        cache = ExecutionCache()
        cache.update_is_changed("node1", "v1")

        assert cache.should_execute("node1", "v2", always_execute=False) is True

    def test_should_execute_nan_always_executes(self):
        """NaN values always trigger execution."""
        cache = ExecutionCache()
        nan = float("nan")
        cache.update_is_changed("node1", nan)

        # NaN != NaN, so should always execute
        assert cache.should_execute("node1", nan, always_execute=False) is True

    def test_update_is_changed(self):
        """Update stored is_changed value."""
        cache = ExecutionCache()
        cache.update_is_changed("node1", "v1")

        assert cache._is_changed_values["node1"] == "v1"

        cache.update_is_changed("node1", "v2")
        assert cache._is_changed_values["node1"] == "v2"


class TestGraphExecutor:
    """Tests for GraphExecutor class."""

    @pytest.fixture
    def mock_emit(self):
        """Create mock emit function."""
        from unittest.mock import AsyncMock
        return AsyncMock()

    def test_executor_creation(self, mock_emit, tmp_path):
        """Create executor with emit function."""
        from adkflow_runner.runner.graph_executor import GraphExecutor

        executor = GraphExecutor(emit=mock_emit, cache_dir=tmp_path)
        assert executor.emit == mock_emit
        assert executor.enable_cache is True

    def test_executor_cache_disabled(self, mock_emit):
        """Create executor with cache disabled."""
        from adkflow_runner.runner.graph_executor import GraphExecutor

        executor = GraphExecutor(emit=mock_emit, enable_cache=False)
        assert executor.enable_cache is False

    def test_find_output_nodes_custom(self, mock_emit):
        """Find output nodes in custom node graph."""
        from adkflow_runner.runner.graph_executor import GraphExecutor
        from adkflow_runner.ir import CustomNodeIR

        custom_ir = CustomNodeIR(
            id="custom_1",
            unit_id="test.unit",
            name="Output Node",
            source_node_id="custom_1_src",
            config={},
            input_connections={},
            output_connections={},
            output_node=True,  # This is an output node
        )
        node = ExecutionNode(id="custom_1", node_type="custom", ir=custom_ir)
        graph = ExecutionGraph(nodes={"custom_1": node}, edges=[])

        executor = GraphExecutor(emit=mock_emit)
        output_nodes = executor._find_output_nodes(graph)

        assert "custom_1" in output_nodes

    def test_find_output_nodes_terminal_agent(self, mock_emit):
        """Find terminal agents as output nodes."""
        from adkflow_runner.runner.graph_executor import GraphExecutor

        agent_ir = AgentIR(id="a1", name="Agent", type="llm", model="gemini-2.0-flash")
        node = ExecutionNode(id="a1", node_type="agent", ir=agent_ir)
        graph = ExecutionGraph(nodes={"a1": node}, edges=[])  # No outgoing edges

        executor = GraphExecutor(emit=mock_emit)
        output_nodes = executor._find_output_nodes(graph)

        assert "a1" in output_nodes

    def test_find_output_nodes_non_terminal_excluded(self, mock_emit):
        """Non-terminal agents excluded from output nodes."""
        from adkflow_runner.runner.graph_executor import GraphExecutor

        agent1 = AgentIR(id="a1", name="A1", type="llm", model="gemini-2.0-flash")
        agent2 = AgentIR(id="a2", name="A2", type="llm", model="gemini-2.0-flash")

        node1 = ExecutionNode(id="a1", node_type="agent", ir=agent1)
        node2 = ExecutionNode(id="a2", node_type="agent", ir=agent2)

        edge = ExecutionEdge(source_id="a1", source_port="output", target_id="a2", target_port="input")
        graph = ExecutionGraph(nodes={"a1": node1, "a2": node2}, edges=[edge])

        executor = GraphExecutor(emit=mock_emit)
        output_nodes = executor._find_output_nodes(graph)

        assert "a1" not in output_nodes  # Has outgoing edge
        assert "a2" in output_nodes  # Terminal

    def test_trace_dependencies(self, mock_emit):
        """Trace dependencies backwards from outputs."""
        from adkflow_runner.runner.graph_executor import GraphExecutor

        # Create linear graph: a1 -> a2 -> a3
        agent1 = AgentIR(id="a1", name="A1", type="llm", model="gemini-2.0-flash")
        agent2 = AgentIR(id="a2", name="A2", type="llm", model="gemini-2.0-flash")
        agent3 = AgentIR(id="a3", name="A3", type="llm", model="gemini-2.0-flash")

        node1 = ExecutionNode(id="a1", node_type="agent", ir=agent1)
        node2 = ExecutionNode(id="a2", node_type="agent", ir=agent2)
        node3 = ExecutionNode(id="a3", node_type="agent", ir=agent3)

        edges = [
            ExecutionEdge(source_id="a1", source_port="out", target_id="a2", target_port="in"),
            ExecutionEdge(source_id="a2", source_port="out", target_id="a3", target_port="in"),
        ]
        graph = ExecutionGraph(nodes={"a1": node1, "a2": node2, "a3": node3}, edges=edges)

        executor = GraphExecutor(emit=mock_emit)
        required = executor._trace_dependencies(graph, {"a3"})

        assert required == {"a1", "a2", "a3"}

    def test_topological_layers_linear(self, mock_emit):
        """Topological sort of linear graph."""
        from adkflow_runner.runner.graph_executor import GraphExecutor

        agent1 = AgentIR(id="a1", name="A1", type="llm", model="gemini-2.0-flash")
        agent2 = AgentIR(id="a2", name="A2", type="llm", model="gemini-2.0-flash")

        node1 = ExecutionNode(id="a1", node_type="agent", ir=agent1)
        node2 = ExecutionNode(id="a2", node_type="agent", ir=agent2)

        edge = ExecutionEdge(source_id="a1", source_port="out", target_id="a2", target_port="in")
        graph = ExecutionGraph(nodes={"a1": node1, "a2": node2}, edges=[edge])

        executor = GraphExecutor(emit=mock_emit)
        layers = executor._topological_layers({"a1", "a2"}, graph)

        assert len(layers) == 2
        assert layers[0] == ["a1"]
        assert layers[1] == ["a2"]

    def test_topological_layers_parallel(self, mock_emit):
        """Topological sort groups parallel nodes."""
        from adkflow_runner.runner.graph_executor import GraphExecutor

        # a1 and a2 both feed into a3 (can run in parallel)
        agent1 = AgentIR(id="a1", name="A1", type="llm", model="gemini-2.0-flash")
        agent2 = AgentIR(id="a2", name="A2", type="llm", model="gemini-2.0-flash")
        agent3 = AgentIR(id="a3", name="A3", type="llm", model="gemini-2.0-flash")

        node1 = ExecutionNode(id="a1", node_type="agent", ir=agent1)
        node2 = ExecutionNode(id="a2", node_type="agent", ir=agent2)
        node3 = ExecutionNode(id="a3", node_type="agent", ir=agent3)

        edges = [
            ExecutionEdge(source_id="a1", source_port="out", target_id="a3", target_port="in1"),
            ExecutionEdge(source_id="a2", source_port="out", target_id="a3", target_port="in2"),
        ]
        graph = ExecutionGraph(nodes={"a1": node1, "a2": node2, "a3": node3}, edges=edges)

        executor = GraphExecutor(emit=mock_emit)
        layers = executor._topological_layers({"a1", "a2", "a3"}, graph)

        assert len(layers) == 2
        # First layer should have both a1 and a2 (parallel)
        assert set(layers[0]) == {"a1", "a2"}
        assert layers[1] == ["a3"]

    def test_topological_layers_empty(self, mock_emit):
        """Empty node set returns empty layers."""
        from adkflow_runner.runner.graph_executor import GraphExecutor

        graph = ExecutionGraph()
        executor = GraphExecutor(emit=mock_emit)
        layers = executor._topological_layers(set(), graph)

        assert layers == []

    def test_resolve_inputs_from_upstream(self, mock_emit):
        """Resolve inputs from upstream node results."""
        from adkflow_runner.runner.graph_executor import GraphExecutor
        from adkflow_runner.ir import CustomNodeIR

        custom_ir = CustomNodeIR(
            id="custom_2",
            unit_id="test.unit",
            name="Node 2",
            source_node_id="custom_2_src",
            config={},
            input_connections={"input_port": ["custom_1"]},
            output_connections={},
        )
        node = ExecutionNode(id="custom_2", node_type="custom", ir=custom_ir)

        edge = ExecutionEdge(
            source_id="custom_1", source_port="output", target_id="custom_2", target_port="input_port"
        )
        graph = ExecutionGraph(nodes={"custom_2": node}, edges=[edge])

        results = {"custom_1": {"output": "upstream_value"}}

        executor = GraphExecutor(emit=mock_emit)
        inputs = executor._resolve_inputs(node, graph, results)

        assert inputs["input_port"] == "upstream_value"

    def test_resolve_inputs_missing_upstream(self, mock_emit):
        """Handle missing upstream results gracefully."""
        from adkflow_runner.runner.graph_executor import GraphExecutor
        from adkflow_runner.ir import CustomNodeIR

        custom_ir = CustomNodeIR(
            id="custom_2",
            unit_id="test.unit",
            name="Node 2",
            source_node_id="custom_2_src",
            config={},
            input_connections={"input_port": ["custom_1"]},
            output_connections={},
        )
        node = ExecutionNode(id="custom_2", node_type="custom", ir=custom_ir)
        graph = ExecutionGraph(nodes={"custom_2": node}, edges=[])

        results = {}  # No upstream results

        executor = GraphExecutor(emit=mock_emit)
        inputs = executor._resolve_inputs(node, graph, results)

        assert "input_port" not in inputs

    @pytest.mark.asyncio
    async def test_execute_agent_raises_not_implemented(self, mock_emit, tmp_path):
        """Agent execution raises NotImplementedError."""
        from adkflow_runner.runner.graph_executor import GraphExecutor

        agent_ir = AgentIR(id="a1", name="Agent", type="llm", model="gemini-2.0-flash")
        node = ExecutionNode(id="a1", node_type="agent", ir=agent_ir)

        executor = GraphExecutor(emit=mock_emit)

        with pytest.raises(NotImplementedError):
            await executor._execute_agent(
                node, {}, {}, tmp_path, "session", "run"
            )

    @pytest.mark.asyncio
    async def test_emit_event(self, mock_emit):
        """Emit event with correct structure."""
        from adkflow_runner.runner.graph_executor import GraphExecutor

        executor = GraphExecutor(emit=mock_emit)
        await executor._emit_event("test_event", {"key": "value"})

        mock_emit.assert_called_once()
        call_args = mock_emit.call_args[0][0]
        assert call_args["type"] == "test_event"
        assert call_args["key"] == "value"
        assert "timestamp" in call_args
