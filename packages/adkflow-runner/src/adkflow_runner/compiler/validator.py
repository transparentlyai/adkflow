"""Workflow validation.

Validates workflows before execution to catch errors early.
"""

from adkflow_runner.compiler.graph import WorkflowGraph
from adkflow_runner.compiler.loader import LoadedProject
from adkflow_runner.config import EdgeSemantics
from adkflow_runner.errors import (
    CycleDetectedError,
    ErrorLocation,
    MissingReferenceError,
    ValidationError,
    ValidationResult,
)
from adkflow_runner.ir import AgentIR, WorkflowIR


class WorkflowValidator:
    """Validates workflows for common issues."""

    def __init__(self, strict: bool = True):
        self.strict = strict

    def validate_graph(
        self, graph: WorkflowGraph, project: LoadedProject
    ) -> ValidationResult:
        """Validate a workflow graph before transformation.

        Args:
            graph: The workflow graph to validate
            project: Loaded project with file references

        Returns:
            ValidationResult with errors and warnings
        """
        result = ValidationResult(valid=True)

        # Check for cycles (except in loop agents)
        self._check_cycles(graph, result)

        # Check for missing references
        self._check_missing_references(graph, project, result)

        # Check for disconnected agents
        self._check_disconnected_agents(graph, result)

        # Check for orphaned nodes
        self._check_orphaned_nodes(graph, result)

        # Check for invalid agent configurations
        self._check_agent_configs(graph, result)

        # Check sequential data flow setup
        self._check_sequential_data_flow(graph, result)

        return result

    def validate_ir(self, ir: WorkflowIR) -> ValidationResult:
        """Validate IR before execution.

        Args:
            ir: The workflow IR to validate

        Returns:
            ValidationResult with errors and warnings
        """
        result = ValidationResult(valid=True)

        # Check root agent exists
        if ir.root_agent is None:
            result.add_error(ValidationError("No root agent in workflow"))
            return result

        # Check all agents have required fields
        for agent_id, agent in ir.all_agents.items():
            self._validate_agent_ir(agent, result)

        # Check tools have code or file paths
        for tool in ir.get_all_tools():
            if not tool.code and not tool.file_path:
                result.add_error(
                    ValidationError(
                        f"Tool '{tool.name}' has neither code nor file_path",
                    )
                )

        return result

    def _check_cycles(self, graph: WorkflowGraph, result: ValidationResult) -> None:
        """Check for cycles in sequential flow."""
        try:
            graph.topological_sort()
        except CycleDetectedError as e:
            # Cycles are only errors for non-loop agents
            # TODO: Allow cycles within LoopAgent
            result.add_error(e)

    def _check_missing_references(
        self,
        graph: WorkflowGraph,
        project: LoadedProject,
        result: ValidationResult,
    ) -> None:
        """Check for missing file references."""
        for node in graph.nodes.values():
            if node.type == "prompt":
                prompt_data = node.data.get("prompt", {})
                file_path = prompt_data.get("file_path")
                if file_path and not project.get_prompt(file_path):
                    result.add_error(
                        MissingReferenceError(
                            reference_type="prompt",
                            reference_name=file_path,
                            location=ErrorLocation(
                                node_id=node.id,
                                tab_id=node.tab_id,
                                file_path=file_path,
                            ),
                        )
                    )

            elif node.type in ("tool", "agentTool"):
                file_path = node.data.get("file_path")
                if file_path and not project.get_tool(file_path):
                    result.add_error(
                        MissingReferenceError(
                            reference_type="tool",
                            reference_name=file_path,
                            location=ErrorLocation(
                                node_id=node.id,
                                tab_id=node.tab_id,
                                file_path=file_path,
                            ),
                        )
                    )

    def _check_disconnected_agents(
        self,
        graph: WorkflowGraph,
        result: ValidationResult,
    ) -> None:
        """Check for agents with no connections."""
        for node in graph.get_agent_nodes():
            has_connections = len(node.incoming) > 0 or len(node.outgoing) > 0

            if not has_connections:
                result.add_warning(
                    f"Agent '{node.name}' has no connections (isolated node)"
                )

    def _check_orphaned_nodes(
        self,
        graph: WorkflowGraph,
        result: ValidationResult,
    ) -> None:
        """Check for non-agent nodes with no connections."""
        for node in graph.nodes.values():
            if node.type in ("prompt", "tool", "context", "variable"):
                has_outgoing = len(node.outgoing) > 0
                if not has_outgoing:
                    result.add_warning(
                        f"{node.type.capitalize()} '{node.name}' is not connected to any agent"
                    )

    def _check_agent_configs(
        self,
        graph: WorkflowGraph,
        result: ValidationResult,
    ) -> None:
        """Check agent configurations for common issues."""
        for node in graph.get_agent_nodes():
            agent_data = node.data.get("agent", {})
            agent_type = agent_data.get("type", "llm")
            agent_name = agent_data.get("name", node.id)

            # LLM agents need instructions
            if agent_type == "llm":
                has_instruction = any(
                    e.semantics in (EdgeSemantics.INSTRUCTION, EdgeSemantics.CONTEXT)
                    for e in node.incoming
                )
                if not has_instruction:
                    result.add_warning(
                        f"LLM agent '{agent_name}' has no connected prompt or context"
                    )

            # Composite agents need subagents
            if agent_type in ("sequential", "parallel"):
                has_subagents = any(
                    e.semantics in (EdgeSemantics.SEQUENTIAL, EdgeSemantics.PARALLEL)
                    for e in node.outgoing
                )
                if not has_subagents:
                    result.add_warning(
                        f"{agent_type.capitalize()} agent '{agent_name}' has no subagents"
                    )

            # Loop agents need iteration limit
            if agent_type == "loop":
                max_iterations = agent_data.get("max_iterations", 5)
                if max_iterations <= 0:
                    result.add_error(
                        ValidationError(
                            f"Loop agent '{agent_name}' has invalid max_iterations: {max_iterations}",
                            location=ErrorLocation(node_id=node.id, tab_id=node.tab_id),
                        )
                    )
                elif max_iterations > 100:
                    result.add_warning(
                        f"Loop agent '{agent_name}' has high max_iterations ({max_iterations})"
                    )

    def _check_sequential_data_flow(
        self,
        graph: WorkflowGraph,
        result: ValidationResult,
    ) -> None:
        """Check that sequential connections have proper data flow setup.

        When agent A[output] connects to agent B[input], this creates a
        SEQUENTIAL relationship. For B to receive A's output:
        1. A must have output_key configured
        2. B's prompt should reference that output_key as a variable
        """
        for edge in graph.edges:
            if edge.semantics != EdgeSemantics.SEQUENTIAL:
                continue

            source = graph.get_node(edge.source_id)
            target = graph.get_node(edge.target_id)
            if not source or not target:
                continue

            # Only check agent-to-agent connections
            if source.type != "agent" or target.type != "agent":
                continue

            source_agent = source.data.get("agent", {})
            target_agent = target.data.get("agent", {})

            source_name = source_agent.get("name", source.id)
            target_name = target_agent.get("name", target.id)
            output_key = source_agent.get("output_key")

            # Check source has output_key
            if not output_key:
                result.add_warning(
                    f"Agent '{source_name}' outputs to '{target_name}' but has no output_key. "
                    f"The receiving agent won't be able to access the output."
                )

    def _validate_agent_ir(self, agent: AgentIR, result: ValidationResult) -> None:
        """Validate a single agent IR."""

        # Check name
        if not agent.name:
            result.add_error(
                ValidationError(
                    f"Agent {agent.id} has no name",
                    location=ErrorLocation(node_id=agent.source_node_id),
                )
            )

        # Check model for LLM agents
        if agent.is_llm() and not agent.model:
            result.add_error(
                ValidationError(
                    f"LLM agent '{agent.name}' has no model specified",
                    location=ErrorLocation(node_id=agent.source_node_id),
                )
            )

        # Check temperature range
        if agent.temperature < 0 or agent.temperature > 2:
            result.add_warning(
                f"Agent '{agent.name}' has unusual temperature: {agent.temperature}"
            )

        # Check subagents for composite agents
        if agent.is_composite() and not agent.subagents:
            result.add_warning(
                f"Composite agent '{agent.name}' ({agent.type}) has no subagents"
            )
