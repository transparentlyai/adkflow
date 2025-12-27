"""Unified graph execution engine for agents and custom nodes.

This module implements a ComfyUI-style execution model where:
- Nodes are executed based on topological sort of the dependency graph
- OUTPUT_NODE marked nodes are identified as sinks
- Execution traces backwards from sinks to find required nodes
- Independent nodes in the same layer execute in parallel
- Caching with IS_CHANGED support for smart re-execution
"""

import asyncio
import hashlib
import json
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable, Literal

from adkflow_runner.extensions import EmitFn, ExecutionContext, get_registry
from adkflow_runner.ir import AgentIR, CustomNodeIR


@dataclass
class ExecutionNode:
    """Unified node in execution graph (can be agent or custom node)."""

    id: str
    node_type: Literal["agent", "custom"]
    ir: AgentIR | CustomNodeIR


@dataclass
class ExecutionEdge:
    """Edge in the execution graph representing data flow."""

    source_id: str
    source_port: str
    target_id: str
    target_port: str


@dataclass
class ExecutionGraph:
    """Unified execution graph containing agents and custom nodes."""

    nodes: dict[str, ExecutionNode] = field(default_factory=dict)
    edges: list[ExecutionEdge] = field(default_factory=list)


class ExecutionCache:
    """Cache for node execution results with IS_CHANGED support."""

    def __init__(self, cache_dir: Path | None = None):
        self.cache_dir = cache_dir
        self._memory_cache: dict[str, Any] = {}
        self._is_changed_values: dict[str, Any] = {}

    def compute_key(
        self,
        node_id: str,
        inputs: dict[str, Any],
        config: dict[str, Any],
        is_changed_value: Any,
    ) -> str:
        """Compute cache key from inputs, config, and is_changed value."""
        # Include is_changed_value in the hash
        data = {
            "node_id": node_id,
            "inputs": self._make_hashable(inputs),
            "config": self._make_hashable(config),
            "is_changed": str(is_changed_value),
        }
        return hashlib.sha256(json.dumps(data, sort_keys=True).encode()).hexdigest()

    def _make_hashable(self, obj: Any) -> Any:
        """Convert object to hashable representation."""
        if isinstance(obj, dict):
            return tuple(sorted((k, self._make_hashable(v)) for k, v in obj.items()))
        if isinstance(obj, list):
            return tuple(self._make_hashable(v) for v in obj)
        if isinstance(obj, set):
            return tuple(sorted(self._make_hashable(v) for v in obj))
        return str(obj)

    def get(self, key: str) -> Any | None:
        """Get cached result."""
        return self._memory_cache.get(key)

    def set(self, key: str, value: Any) -> None:
        """Cache a result."""
        self._memory_cache[key] = value

    def should_execute(
        self,
        node_id: str,
        is_changed_value: Any,
        always_execute: bool,
    ) -> bool:
        """Determine if node should execute based on IS_CHANGED."""
        if always_execute:
            return True

        # NaN never equals anything, including itself
        if is_changed_value != is_changed_value:  # NaN check
            return True

        # Compare with previous value
        prev_value = self._is_changed_values.get(node_id)
        if prev_value is None:
            return True  # First run

        return is_changed_value != prev_value

    def update_is_changed(self, node_id: str, value: Any) -> None:
        """Update stored IS_CHANGED value for next comparison."""
        self._is_changed_values[node_id] = value


class GraphExecutor:
    """Executes a unified graph of agents and custom nodes.

    Implements ComfyUI-style execution:
    1. Find OUTPUT_NODE sinks
    2. Trace dependencies backwards
    3. Topological sort into parallel layers
    4. Execute layer by layer with caching
    """

    def __init__(
        self,
        emit: Callable,
        cache_dir: Path | None = None,
        enable_cache: bool = True,
    ):
        self.emit = emit
        self.cache = ExecutionCache(cache_dir)
        self.enable_cache = enable_cache
        self.registry = get_registry()

    async def execute(
        self,
        graph: ExecutionGraph,
        session_state: dict[str, Any],
        project_path: Path,
        session_id: str = "",
        run_id: str = "",
    ) -> dict[str, dict[str, Any]]:
        """Execute graph in topological order with parallel execution.

        Args:
            graph: The execution graph to run
            session_state: Shared state across nodes
            project_path: Path to the project directory
            session_id: Current session ID
            run_id: Current run ID

        Returns:
            Dict mapping node IDs to their output values
        """
        # 1. Find output nodes (sinks)
        output_nodes = self._find_output_nodes(graph)

        if not output_nodes:
            # No output nodes - nothing to execute
            return {}

        # 2. Trace dependencies backwards from outputs
        required = self._trace_dependencies(graph, output_nodes)

        # 3. Topological sort into parallel execution layers
        layers = self._topological_layers(required, graph)

        # 4. Execute layer by layer
        results: dict[str, dict[str, Any]] = {}

        for layer_idx, layer in enumerate(layers):
            await self._emit_event("layer_start", {"layer": layer_idx, "nodes": layer})

            # Execute all nodes in layer concurrently
            layer_tasks = []
            for node_id in layer:
                node = graph.nodes[node_id]
                inputs = self._resolve_inputs(node, graph, results)

                if node.node_type == "custom":
                    task = self._execute_custom_node(
                        node, inputs, session_state, project_path, session_id, run_id
                    )
                else:
                    # Agent execution - delegate to existing agent runner
                    task = self._execute_agent(
                        node, inputs, session_state, project_path, session_id, run_id
                    )

                layer_tasks.append((node_id, task))

            # Await all tasks in parallel
            layer_results = await asyncio.gather(
                *[task for _, task in layer_tasks],
                return_exceptions=True,
            )

            # Process results
            for (node_id, _), result in zip(layer_tasks, layer_results):
                if isinstance(result, Exception):
                    await self._emit_event(
                        "node_error", {"node_id": node_id, "error": str(result)}
                    )
                    raise result
                # At this point, result is guaranteed to be dict[str, Any]
                results[node_id] = result  # type: ignore[assignment]

            await self._emit_event(
                "layer_end", {"layer": layer_idx, "node_count": len(layer)}
            )

        return results

    def _find_output_nodes(self, graph: ExecutionGraph) -> set[str]:
        """Find all output/sink nodes in the graph.

        A node is an output node if:
        - For custom nodes: OUTPUT_NODE = True
        - For agents: has no outgoing edges (terminal agent)
        """
        output_nodes = set()

        # Find nodes with outgoing edges
        nodes_with_outputs = {edge.source_id for edge in graph.edges}

        for node_id, node in graph.nodes.items():
            if node.node_type == "custom":
                ir = node.ir
                if isinstance(ir, CustomNodeIR) and ir.output_node:
                    output_nodes.add(node_id)
            else:
                # Agents: consider terminal agents as outputs
                if node_id not in nodes_with_outputs:
                    output_nodes.add(node_id)

        return output_nodes

    def _trace_dependencies(
        self, graph: ExecutionGraph, output_nodes: set[str]
    ) -> set[str]:
        """Trace backwards from output nodes to find all required nodes."""
        required = set(output_nodes)
        queue = list(output_nodes)

        # Build reverse edge map
        incoming: dict[str, list[str]] = {n: [] for n in graph.nodes}
        for edge in graph.edges:
            if edge.target_id in incoming:
                incoming[edge.target_id].append(edge.source_id)

        while queue:
            node_id = queue.pop(0)
            for source_id in incoming.get(node_id, []):
                if source_id not in required and source_id in graph.nodes:
                    required.add(source_id)
                    queue.append(source_id)

        return required

    def _topological_layers(
        self, nodes: set[str], graph: ExecutionGraph
    ) -> list[list[str]]:
        """Topological sort returning layers for parallel execution.

        Uses Kahn's algorithm, grouping nodes with same depth into layers.
        Nodes in the same layer have no dependencies on each other and
        can execute in parallel.
        """
        if not nodes:
            return []

        # Compute in-degrees for required nodes only
        in_degree = {n: 0 for n in nodes}

        for edge in graph.edges:
            if edge.target_id in nodes and edge.source_id in nodes:
                in_degree[edge.target_id] += 1

        layers = []
        remaining = set(nodes)

        while remaining:
            # Nodes with no remaining dependencies form a layer
            layer = [n for n in remaining if in_degree[n] == 0]

            if not layer:
                # This shouldn't happen in a valid DAG
                raise ValueError(
                    f"Cycle detected in execution graph. Remaining nodes: {remaining}"
                )

            layers.append(layer)

            # Remove layer nodes and update in-degrees
            for node in layer:
                remaining.remove(node)
                for edge in graph.edges:
                    if edge.source_id == node and edge.target_id in remaining:
                        in_degree[edge.target_id] -= 1

        return layers

    def _resolve_inputs(
        self,
        node: ExecutionNode,
        graph: ExecutionGraph,
        results: dict[str, dict[str, Any]],
    ) -> dict[str, Any]:
        """Resolve input values from upstream node outputs."""
        inputs: dict[str, Any] = {}

        if node.node_type == "custom":
            ir = node.ir
            if isinstance(ir, CustomNodeIR):
                for port_id, source_ids in ir.input_connections.items():
                    # Get value from first connected source
                    for source_id in source_ids:
                        if source_id in results:
                            source_outputs = results[source_id]
                            # Use first output value (or match by port)
                            if source_outputs:
                                inputs[port_id] = next(iter(source_outputs.values()))
                            break

        return inputs

    async def _execute_custom_node(
        self,
        node: ExecutionNode,
        inputs: dict[str, Any],
        session_state: dict[str, Any],
        project_path: Path,
        session_id: str,
        run_id: str,
    ) -> dict[str, Any]:
        """Execute a custom FlowUnit node with caching and lazy evaluation."""
        ir = node.ir
        if not isinstance(ir, CustomNodeIR):
            raise TypeError(f"Expected CustomNodeIR, got {type(ir)}")

        # Load FlowUnit class
        flow_unit_cls = self.registry.get_unit(ir.unit_id)
        if flow_unit_cls is None:
            raise ValueError(f"FlowUnit not found: {ir.unit_id}")

        # Check IS_CHANGED
        is_changed_value = flow_unit_cls.is_changed(ir.config, inputs)

        # Check cache (unless ALWAYS_EXECUTE)
        if self.enable_cache and not ir.always_execute:
            cache_key = self.cache.compute_key(
                ir.id, inputs, ir.config, is_changed_value
            )

            if not self.cache.should_execute(
                ir.id, is_changed_value, ir.always_execute
            ):
                cached = self.cache.get(cache_key)
                if cached is not None:
                    await self._emit_event(
                        "custom_node_cache_hit",
                        {"node_id": ir.id, "node_name": ir.name},
                    )
                    return cached

        # Handle lazy inputs if any
        if ir.lazy_inputs:
            available = {
                k: v if k not in ir.lazy_inputs else inputs.get(k)
                for k, v in inputs.items()
            }
            # Determine which lazy inputs are actually needed
            # TODO: Full lazy evaluation would re-trigger upstream nodes
            _ = flow_unit_cls.check_lazy_status(ir.config, available)

        # Execute
        await self._emit_event(
            "custom_node_start", {"node_id": ir.id, "node_name": ir.name}
        )

        start_time = time.time()

        try:
            instance = flow_unit_cls()
            context = ExecutionContext(
                session_id=session_id,
                run_id=run_id,
                node_id=ir.id,
                node_name=ir.name,
                state=session_state,
                emit=self._create_node_emit(ir.id, ir.name),
                project_path=project_path,
            )

            await instance.on_before_execute(context)
            outputs = await instance.run_process(inputs, ir.config, context)
            await instance.on_after_execute(context, outputs)

            duration = time.time() - start_time

            await self._emit_event(
                "custom_node_end",
                {
                    "node_id": ir.id,
                    "node_name": ir.name,
                    "duration": duration,
                    "output_keys": list(outputs.keys()),
                },
            )

            # Cache result
            if self.enable_cache and not ir.always_execute:
                cache_key = self.cache.compute_key(
                    ir.id, inputs, ir.config, is_changed_value
                )
                self.cache.set(cache_key, outputs)
                self.cache.update_is_changed(ir.id, is_changed_value)

            return outputs

        except Exception as e:
            await self._emit_event(
                "custom_node_error",
                {"node_id": ir.id, "node_name": ir.name, "error": str(e)},
            )
            raise

    async def _execute_agent(
        self,
        node: ExecutionNode,
        inputs: dict[str, Any],
        session_state: dict[str, Any],
        project_path: Path,
        session_id: str,
        run_id: str,
    ) -> dict[str, Any]:
        """Execute an agent node.

        This is a placeholder - full agent execution is handled by
        the existing AgentFactory and ADK Runner integration.
        """
        # For now, return empty outputs
        # Full integration would call into the existing agent execution path
        await self._emit_event(
            "agent_execute",
            {"node_id": node.id, "agent_type": "placeholder"},
        )

        return {"output": f"Agent {node.id} output placeholder"}

    def _create_node_emit(self, node_id: str, node_name: str) -> EmitFn:
        """Create an emit function scoped to a specific node."""

        async def node_emit(event: Any) -> None:
            if isinstance(event, dict):
                event = {**event, "node_id": node_id, "node_name": node_name}
            await self.emit(event)

        return node_emit  # type: ignore[return-value]

    async def _emit_event(self, event_type: str, data: dict[str, Any]) -> None:
        """Emit an execution event."""
        event = {"type": event_type, "timestamp": time.time(), **data}
        if asyncio.iscoroutinefunction(self.emit):
            await self.emit(event)
        else:
            self.emit(event)
