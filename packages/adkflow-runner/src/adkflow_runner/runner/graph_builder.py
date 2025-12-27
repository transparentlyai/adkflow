"""Build ExecutionGraph from WorkflowIR.

This module converts the compiled WorkflowIR into a unified ExecutionGraph
that contains both agents and custom nodes as nodes, with their connections
as edges.
"""

from adkflow_runner.ir import WorkflowIR
from adkflow_runner.runner.graph_executor import (
    ExecutionEdge,
    ExecutionGraph,
    ExecutionNode,
)


class GraphBuilder:
    """Builds unified ExecutionGraph from WorkflowIR."""

    def build(self, ir: WorkflowIR) -> ExecutionGraph:
        """Build an execution graph from workflow IR.

        Args:
            ir: The compiled workflow intermediate representation

        Returns:
            ExecutionGraph with agents and custom nodes as nodes
        """
        nodes: dict[str, ExecutionNode] = {}
        edges: list[ExecutionEdge] = []

        # Add agents as nodes
        for agent_ir in ir.all_agents.values():
            nodes[agent_ir.id] = ExecutionNode(
                id=agent_ir.id,
                node_type="agent",
                ir=agent_ir,
            )

        # Add custom nodes
        for custom_ir in ir.custom_nodes:
            nodes[custom_ir.id] = ExecutionNode(
                id=custom_ir.id,
                node_type="custom",
                ir=custom_ir,
            )

        # Add edges from custom node input connections
        for custom_ir in ir.custom_nodes:
            for port_id, source_ids in custom_ir.input_connections.items():
                for source_id in source_ids:
                    # Determine source port (use 'output' as default)
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
        for custom_ir in ir.custom_nodes:
            for port_id, target_ids in custom_ir.output_connections.items():
                for target_id in target_ids:
                    # Determine target port
                    target_port = self._find_target_port(target_id, ir)
                    edges.append(
                        ExecutionEdge(
                            source_id=custom_ir.id,
                            source_port=port_id,
                            target_id=target_id,
                            target_port=target_port,
                        )
                    )

        # Add edges from agent relationships (sequential/parallel)
        edges.extend(self._build_agent_edges(ir))

        return ExecutionGraph(nodes=nodes, edges=edges)

    def _find_source_port(self, source_id: str, ir: WorkflowIR) -> str:
        """Find the output port ID for a source node."""
        # Check if source is a custom node
        for custom_ir in ir.custom_nodes:
            if custom_ir.id == source_id:
                # Return first output port or 'output' as default
                schema = self._get_custom_node_schema(custom_ir.unit_id)
                if schema and schema.get("outputs"):
                    return schema["outputs"][0].get("id", "output")
                return "output"

        # Source is an agent
        return "output"

    def _find_target_port(self, target_id: str, ir: WorkflowIR) -> str:
        """Find the input port ID for a target node."""
        # Check if target is a custom node
        for custom_ir in ir.custom_nodes:
            if custom_ir.id == target_id:
                # Return first input port or 'input' as default
                schema = self._get_custom_node_schema(custom_ir.unit_id)
                if schema and schema.get("inputs"):
                    return schema["inputs"][0].get("id", "input")
                return "input"

        # Target is an agent - determine which input
        for agent_ir in ir.all_agents.values():
            if agent_ir.id == target_id:
                # Could be instruction, tool, context, etc.
                return "instruction"

        return "input"

    def _get_custom_node_schema(self, unit_id: str) -> dict | None:
        """Get the schema for a custom node by unit_id."""
        try:
            from adkflow_runner.extensions import get_registry

            registry = get_registry()
            return registry.get_schema(unit_id)
        except Exception:
            return None

    def _build_agent_edges(self, ir: WorkflowIR) -> list[ExecutionEdge]:
        """Build edges from agent sequential/parallel relationships."""
        edges = []

        for agent_ir in ir.all_agents.values():
            # Sequential subagents: each depends on previous
            if agent_ir.type == "sequential" and agent_ir.subagents:
                for i in range(len(agent_ir.subagents) - 1):
                    edges.append(
                        ExecutionEdge(
                            source_id=agent_ir.subagents[i].id,
                            source_port="output",
                            target_id=agent_ir.subagents[i + 1].id,
                            target_port="input",
                        )
                    )

            # Parallel subagents don't have edges between them
            # (they can execute concurrently)

            # Loop agent: subagent depends on loop controller
            if agent_ir.type == "loop" and agent_ir.subagents:
                for subagent in agent_ir.subagents:
                    edges.append(
                        ExecutionEdge(
                            source_id=agent_ir.id,
                            source_port="loop_control",
                            target_id=subagent.id,
                            target_port="input",
                        )
                    )

        return edges


def build_execution_graph(ir: WorkflowIR) -> ExecutionGraph:
    """Convenience function to build an execution graph.

    Args:
        ir: The compiled workflow IR

    Returns:
        ExecutionGraph ready for execution
    """
    builder = GraphBuilder()
    return builder.build(ir)
