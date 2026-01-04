"""Workflow validation.

Validates workflows before execution to catch errors early.
"""

from adkflow_runner.compiler.graph import GraphNode, WorkflowGraph
from adkflow_runner.compiler.loader import LoadedProject
from adkflow_runner.compiler.node_config import get_node_config
from adkflow_runner.config import EdgeSemantics
from adkflow_runner.errors import (
    CycleDetectedError,
    ErrorLocation,
    MissingReferenceError,
    ValidationError,
    ValidationResult,
)
from adkflow_runner.ir import AgentIR, WorkflowIR
from adkflow_runner.logging import get_logger

_log = get_logger("compiler.validator")


class WorkflowValidator:
    """Validates workflows for common issues."""

    def __init__(self, strict: bool = True):
        self.strict = strict
        self._project: LoadedProject | None = None

    def _make_location(
        self,
        node: GraphNode,
        file_path: str | None = None,
    ) -> ErrorLocation:
        """Create an ErrorLocation with human-readable names."""
        tab_name = None
        if self._project and node.tab_id:
            tab = self._project.get_tab(node.tab_id)
            if tab:
                tab_name = tab.name

        return ErrorLocation(
            node_id=node.id,
            node_name=node.name,
            node_type=node.type,
            tab_id=node.tab_id,
            tab_name=tab_name,
            file_path=file_path,
        )

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
        self._project = project
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

        # Check for exactly one start node
        self._check_start_node(graph, result)

        # Check for duplicate node names
        self._check_duplicate_names(graph, result)

        # Check for missing agent descriptions
        self._check_missing_descriptions(graph, result)

        # Check for potential context variable conflicts
        self._check_context_var_conflicts(graph, result)

        # Log validation results
        if result.valid:
            _log.info(
                "Validation passed",
                warnings=len(result.warnings),
            )
        else:
            _log.warning(
                "Validation failed",
                errors=len(result.errors),
                warnings=len(result.warnings),
            )

        _log.debug(
            "Validation details",
            errors=[str(e) for e in result.errors],
            warnings=[str(w) for w in result.warnings],
        )

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
            config = get_node_config(node.data)

            if node.type == "prompt":
                file_path = config.get("file_path")
                if file_path and not project.get_prompt(file_path):
                    result.add_error(
                        MissingReferenceError(
                            reference_type="prompt",
                            reference_name=file_path,
                            location=self._make_location(node, file_path=file_path),
                        )
                    )

            elif node.type in ("tool", "agentTool"):
                file_path = config.get("file_path")
                if file_path and not project.get_tool(file_path):
                    result.add_error(
                        MissingReferenceError(
                            reference_type="tool",
                            reference_name=file_path,
                            location=self._make_location(node, file_path=file_path),
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
                    f"Agent '{node.name}' has no connections (isolated node)",
                    location=self._make_location(node),
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
                        f"{node.type.capitalize()} '{node.name}' is not connected to any agent",
                        location=self._make_location(node),
                    )

    def _check_agent_configs(
        self,
        graph: WorkflowGraph,
        result: ValidationResult,
    ) -> None:
        """Check agent configurations for common issues."""
        for node in graph.get_agent_nodes():
            agent_data = get_node_config(node.data)
            agent_type = agent_data.get("type", "llm")
            agent_name = node.name  # Use node.name which checks config.name first

            # LLM agents need instructions
            if agent_type == "llm":
                has_instruction = any(
                    e.semantics in (EdgeSemantics.INSTRUCTION, EdgeSemantics.CONTEXT)
                    for e in node.incoming
                )
                if not has_instruction:
                    result.add_warning(
                        f"LLM agent '{agent_name}' has no connected prompt or context",
                        location=self._make_location(node),
                    )

            # Composite agents need subagents
            if agent_type in ("sequential", "parallel"):
                has_subagents = any(
                    e.semantics in (EdgeSemantics.SEQUENTIAL, EdgeSemantics.PARALLEL)
                    for e in node.outgoing
                )
                if not has_subagents:
                    result.add_warning(
                        f"{agent_type.capitalize()} agent '{agent_name}' has no subagents",
                        location=self._make_location(node),
                    )

            # Loop agents need iteration limit
            if agent_type == "loop":
                max_iterations = agent_data.get("max_iterations", 5)
                if max_iterations <= 0:
                    result.add_error(
                        ValidationError(
                            f"Loop agent '{agent_name}' has invalid max_iterations: {max_iterations}",
                            location=self._make_location(node),
                        )
                    )
                elif max_iterations > 100:
                    result.add_warning(
                        f"Loop agent '{agent_name}' has high max_iterations ({max_iterations})",
                        location=self._make_location(node),
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

            source_config = get_node_config(source.data)
            source_name = source.name
            target_name = target.name
            output_key = source_config.get("output_key")

            # Check source has output_key
            if not output_key:
                result.add_warning(
                    f"Agent '{source_name}' outputs to '{target_name}' but has no output_key. "
                    f"The receiving agent won't be able to access the output.",
                    location=self._make_location(source),
                )

    def _check_start_node(
        self,
        graph: WorkflowGraph,
        result: ValidationResult,
    ) -> None:
        """Check that exactly one start node exists."""
        start_nodes = [n for n in graph.nodes.values() if n.type == "start"]

        if len(start_nodes) == 0:
            result.add_error(
                ValidationError(
                    "Workflow has no Start node. Add a Start node to define the entry point."
                )
            )
        elif len(start_nodes) > 1:
            result.add_error(
                ValidationError(
                    f"Workflow has {len(start_nodes)} Start nodes. Only one is allowed.",
                    location=self._make_location(start_nodes[1]),
                )
            )
        elif not start_nodes[0].outgoing:
            result.add_warning(
                "Start node is not connected to any agent",
                location=self._make_location(start_nodes[0]),
            )

    def _check_duplicate_names(
        self,
        graph: WorkflowGraph,
        result: ValidationResult,
    ) -> None:
        """Check for duplicate node names across the workflow.

        File-based nodes (prompt, context, tool, process) can share names if they
        point to the same file with the same content - they're just references to
        the same resource. Other nodes (agent, variable) must have unique names.
        """
        # Node types that can share names if pointing to same file
        file_based_types = {"prompt", "context", "tool", "process", "agentTool"}
        # Node types that always require unique names
        unique_name_types = {"agent", "variable"}

        # Group nodes by name
        name_to_nodes: dict[str, list[GraphNode]] = {}

        for node in graph.nodes.values():
            if node.type not in file_based_types and node.type not in unique_name_types:
                continue

            name = node.name
            if not name:
                continue

            name_to_nodes.setdefault(name, []).append(node)

        # Check for invalid duplicates
        for name, nodes in name_to_nodes.items():
            if len(nodes) <= 1:
                continue

            # For nodes requiring unique names, all duplicates are errors
            unique_nodes = [n for n in nodes if n.type in unique_name_types]
            if unique_nodes:
                for node in unique_nodes:
                    result.add_error(
                        ValidationError(
                            f"Duplicate name '{name}' - {node.type} names must be unique",
                            location=self._make_location(node),
                        )
                    )
                # Also error if file-based nodes share name with unique-name nodes
                for node in nodes:
                    if node.type in file_based_types:
                        result.add_error(
                            ValidationError(
                                f"Duplicate name '{name}' - conflicts with {unique_nodes[0].type}",
                                location=self._make_location(node),
                            )
                        )
                continue

            # All nodes are file-based - check if they point to the same resource
            self._check_file_based_duplicates(name, nodes, result)

    def _check_file_based_duplicates(
        self,
        name: str,
        nodes: list[GraphNode],
        result: ValidationResult,
    ) -> None:
        """Check if file-based nodes with the same name point to the same resource.

        Same-name nodes are allowed if they have the same file_path and content.
        This enables reusing the same prompt/tool across multiple agents.
        """

        def get_file_info(node: GraphNode) -> tuple[str | None, str | None]:
            """Extract file_path and content from a node."""
            config = get_node_config(node.data)
            if node.type in ("prompt", "context"):
                return config.get("file_path"), config.get("content")
            elif node.type in ("tool", "process", "agentTool"):
                return config.get("file_path"), config.get("code")
            return None, None

        # Get file info for all nodes
        node_infos: list[tuple[GraphNode, str | None, str | None]] = []
        for node in nodes:
            file_path, content = get_file_info(node)
            node_infos.append((node, file_path, content))

        # Check if all nodes point to the same resource
        reference_path, reference_content = node_infos[0][1], node_infos[0][2]

        # All must have the same file_path and content
        all_same = all(
            path == reference_path and content == reference_content
            for _, path, content in node_infos
        )

        if all_same:
            # Same resource, duplicates are allowed
            return

        # Different resources - report as errors
        for node, file_path, _ in node_infos:
            result.add_error(
                ValidationError(
                    f"Duplicate name '{name}' with different content - "
                    f"rename the node or use the same file",
                    location=self._make_location(node, file_path=file_path),
                )
            )

    def _check_missing_descriptions(
        self,
        graph: WorkflowGraph,
        result: ValidationResult,
    ) -> None:
        """Check that agent nodes have descriptions.

        Agent descriptions are important for:
        - LLM routing decisions in coordinator/orchestrator patterns
        - Documentation and maintainability
        - Understanding agent purpose in complex workflows
        """
        for node in graph.get_agent_nodes():
            config = get_node_config(node.data)
            description = config.get("description", "")

            if not description or not description.strip():
                result.add_error(
                    ValidationError(
                        f"Agent '{node.name}' is missing a description",
                        location=self._make_location(node),
                    )
                )

    def _check_context_var_conflicts(
        self,
        graph: WorkflowGraph,
        result: ValidationResult,
    ) -> None:
        """Check for potential context variable conflicts.

        When multiple context sources are connected to an agent, there's a risk
        of variable name conflicts. Full key validation happens at runtime,
        but we warn here if multiple sources are detected.
        """
        for node in graph.get_agent_nodes():
            # Count context_vars edges
            context_sources: list[GraphNode] = []
            for edge in node.incoming:
                if edge.semantics == EdgeSemantics.CONTEXT_VARS:
                    source = graph.get_node(edge.source_id)
                    if source:
                        context_sources.append(source)

            if len(context_sources) > 1:
                source_names = [s.name for s in context_sources]
                result.add_warning(
                    f"Agent '{node.name}' has {len(context_sources)} context sources: "
                    f"{', '.join(source_names)}. Ensure variable names don't conflict.",
                    location=self._make_location(node),
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
                f"Agent '{agent.name}' has unusual temperature: {agent.temperature}",
                location=ErrorLocation(node_id=agent.source_node_id),
            )

        # Check subagents for composite agents
        if agent.is_composite() and not agent.subagents:
            result.add_warning(
                f"Composite agent '{agent.name}' ({agent.type}) has no subagents",
                location=ErrorLocation(node_id=agent.source_node_id),
            )
