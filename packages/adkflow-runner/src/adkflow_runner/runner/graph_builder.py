"""Build ExecutionGraph from WorkflowIR.

This module converts the compiled WorkflowIR into a unified ExecutionGraph
that contains custom nodes with their connections as edges.

Agents are NOT included in the execution graph - they are executed separately
by the workflow runner. Custom nodes that depend on agent outputs receive
those outputs as pre-populated external results.
"""

from adkflow_runner.ir import WorkflowIR
from adkflow_runner.runner.graph_executor import (
    ExecutionEdge,
    ExecutionGraph,
    ExecutionNode,
)


class GraphBuilder:
    """Builds ExecutionGraph from WorkflowIR for custom nodes only."""

    def build(
        self,
        ir: WorkflowIR,
        custom_node_ids: set[str] | None = None,
    ) -> ExecutionGraph:
        """Build an execution graph from workflow IR.

        Args:
            ir: The compiled workflow intermediate representation
            custom_node_ids: Optional set of custom node IDs to include.
                If None, all custom nodes are included.

        Returns:
            ExecutionGraph with custom nodes only (no agents)
        """
        nodes: dict[str, ExecutionNode] = {}
        edges: list[ExecutionEdge] = []

        # Collect agent IDs for reference (to identify external dependencies)
        agent_ids = set(ir.all_agents.keys())

        # Add custom nodes (filtered if custom_node_ids provided)
        for custom_ir in ir.custom_nodes:
            if custom_node_ids is not None and custom_ir.id not in custom_node_ids:
                continue
            nodes[custom_ir.id] = ExecutionNode(
                id=custom_ir.id,
                node_type="custom",
                ir=custom_ir,
            )

        # Add edges from custom node input connections
        # Only add edges where source is also a custom node in the graph
        for custom_ir in ir.custom_nodes:
            if custom_ir.id not in nodes:
                continue
            for port_id, source_ids in custom_ir.input_connections.items():
                for source_id in source_ids:
                    # Skip edges from agents - those are external dependencies
                    if source_id in agent_ids:
                        continue
                    # Skip edges from custom nodes not in this graph
                    if source_id not in nodes:
                        continue
                    source_port = self._find_source_port(source_id, ir)
                    edges.append(
                        ExecutionEdge(
                            source_id=source_id,
                            source_port=source_port,
                            target_id=custom_ir.id,
                            target_port=port_id,
                        )
                    )

        # Add edges from custom node output connections
        # Only add edges where target is also a custom node in the graph
        for custom_ir in ir.custom_nodes:
            if custom_ir.id not in nodes:
                continue
            for port_id, target_ids in custom_ir.output_connections.items():
                for target_id in target_ids:
                    # Skip edges to agents
                    if target_id in agent_ids:
                        continue
                    # Skip edges to custom nodes not in this graph
                    if target_id not in nodes:
                        continue
                    target_port = self._find_target_port(target_id, ir)
                    edges.append(
                        ExecutionEdge(
                            source_id=custom_ir.id,
                            source_port=port_id,
                            target_id=target_id,
                            target_port=target_port,
                        )
                    )

        return ExecutionGraph(nodes=nodes, edges=edges)

    def _find_source_port(self, source_id: str, ir: WorkflowIR) -> str:
        """Find the output port ID for a source node."""
        for custom_ir in ir.custom_nodes:
            if custom_ir.id == source_id:
                schema = self._get_custom_node_schema(custom_ir.unit_id)
                if schema and schema.get("outputs"):
                    return schema["outputs"][0].get("id", "output")
                return "output"
        return "output"

    def _find_target_port(self, target_id: str, ir: WorkflowIR) -> str:
        """Find the input port ID for a target node."""
        for custom_ir in ir.custom_nodes:
            if custom_ir.id == target_id:
                schema = self._get_custom_node_schema(custom_ir.unit_id)
                if schema and schema.get("inputs"):
                    return schema["inputs"][0].get("id", "input")
                return "input"
        return "input"

    def _get_custom_node_schema(self, unit_id: str) -> dict | None:
        """Get the schema for a custom node by unit_id."""
        try:
            from adkflow_runner.extensions import get_registry

            registry = get_registry()
            return registry.get_schema(unit_id)
        except Exception:
            return None


def partition_custom_nodes(
    ir: WorkflowIR,
) -> tuple[set[str], set[str]]:
    """Partition custom nodes into pre-agent and post-agent groups.

    Pre-agent nodes: Have no dependencies on agents (can run before agents)
    Post-agent nodes: Depend on agent outputs (must run after agents)

    Args:
        ir: The compiled workflow IR

    Returns:
        Tuple of (pre_agent_node_ids, post_agent_node_ids)
    """
    agent_ids = set(ir.all_agents.keys())

    # Find nodes that directly depend on agents
    direct_agent_dependents: set[str] = set()
    for custom_ir in ir.custom_nodes:
        for source_ids in custom_ir.input_connections.values():
            for source_id in source_ids:
                if source_id in agent_ids:
                    direct_agent_dependents.add(custom_ir.id)
                    break

    # Now find transitive dependencies (nodes that depend on agent-dependent nodes)
    post_agent_nodes: set[str] = set(direct_agent_dependents)
    changed = True
    while changed:
        changed = False
        for custom_ir in ir.custom_nodes:
            if custom_ir.id in post_agent_nodes:
                continue
            for source_ids in custom_ir.input_connections.values():
                for source_id in source_ids:
                    if source_id in post_agent_nodes:
                        post_agent_nodes.add(custom_ir.id)
                        changed = True
                        break

    # Pre-agent nodes are all custom nodes not in post_agent_nodes
    all_custom_ids = {cn.id for cn in ir.custom_nodes}
    pre_agent_nodes = all_custom_ids - post_agent_nodes

    return pre_agent_nodes, post_agent_nodes


def build_execution_graph(
    ir: WorkflowIR,
    custom_node_ids: set[str] | None = None,
) -> ExecutionGraph:
    """Convenience function to build an execution graph.

    Args:
        ir: The compiled workflow IR
        custom_node_ids: Optional set of custom node IDs to include.
            If None, all custom nodes are included.

    Returns:
        ExecutionGraph ready for execution
    """
    builder = GraphBuilder()
    return builder.build(ir, custom_node_ids=custom_node_ids)
