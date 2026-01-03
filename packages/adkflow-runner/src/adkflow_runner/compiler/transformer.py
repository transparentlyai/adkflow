"""IR Transformer.

Transforms the workflow graph into Intermediate Representation (IR)
that can be executed by the Runner.
"""

from typing import Literal

from adkflow_runner.compiler.graph import GraphNode, WorkflowGraph
from adkflow_runner.compiler.hierarchy import HierarchyBuilder
from adkflow_runner.compiler.loader import LoadedProject
from adkflow_runner.compiler.node_config import get_node_config
from adkflow_runner.config import EdgeSemantics, ExecutionConfig, get_default_config
from adkflow_runner.errors import CompilationError, ErrorLocation
from adkflow_runner.ir import (
    AgentIR,
    CallbackConfig,
    CodeExecutorConfig,
    CustomNodeIR,
    HttpOptionsConfig,
    OutputFileIR,
    PlannerConfig,
    TeleporterIR,
    ToolIR,
    UserInputIR,
    WorkflowIR,
)
from adkflow_runner.logging import get_logger

_log = get_logger("compiler.transformer")


def _sanitize_variable_name(name: str) -> str:
    """Convert a node name to a valid variable name.

    Example: "Review Step" -> "review_step_input"
    """
    import re

    # Convert to lowercase, replace spaces/hyphens with underscores
    sanitized = name.lower().replace(" ", "_").replace("-", "_")
    # Remove any invalid characters
    sanitized = re.sub(r"[^a-z0-9_]", "", sanitized)
    # Ensure it starts with letter or underscore
    if sanitized and not sanitized[0].isalpha() and sanitized[0] != "_":
        sanitized = "_" + sanitized
    # Default and add suffix
    return (sanitized or "user") + "_input"


class IRTransformer:
    """Transforms workflow graph to IR."""

    def __init__(self, config: ExecutionConfig | None = None):
        self.config = config or get_default_config()

    def transform(
        self,
        graph: WorkflowGraph,
        project: LoadedProject,
    ) -> WorkflowIR:
        """Transform a workflow graph to IR.

        Args:
            graph: The workflow graph to transform
            project: Loaded project with file contents

        Returns:
            WorkflowIR ready for execution
        """
        _log.debug(
            "Starting IR transformation",
            node_count=len(graph.nodes),
            edge_count=len(graph.edges),
        )

        # Transform all agents
        all_agents: dict[str, AgentIR] = {}
        for node in graph.get_agent_nodes():
            agent_ir = self._transform_agent(node, graph, project)
            all_agents[agent_ir.id] = agent_ir

        # Build agent hierarchy (sequential chains, parallel groups)
        self._build_agent_hierarchy(graph, all_agents)

        # Find root agent(s)
        root_agents = graph.get_root_agents()
        if not root_agents:
            raise CompilationError(
                "No root agent found (all agents have incoming edges)"
            )

        # Build agent hierarchy recursively with merge point detection
        # This properly handles diamond/fork-join patterns where parallel
        # branches converge to a single downstream agent
        hierarchy_builder = HierarchyBuilder(graph, all_agents)
        root_agent = hierarchy_builder.build(root_agents)

        if not root_agent:
            raise CompilationError("Failed to build agent hierarchy from root agents")

        # Transform teleporters
        teleporters = {
            pair.name: TeleporterIR(
                name=pair.name,
                direction="output",
                tab_id=pair.output_node.tab_id,
                node_id=pair.output_node.id,
            )
            for pair in graph.teleporter_pairs
        }

        # Resolve output files
        output_files = self._resolve_output_files(graph)

        # Transform user input nodes
        user_inputs = self._transform_user_inputs(graph, all_agents)

        # Transform custom nodes
        custom_nodes = self._transform_custom_nodes(graph)

        # Detect flow control nodes (for topology visualization)
        has_start_node = any(n.type == "start" for n in graph.nodes.values())
        has_end_node = any(n.type == "end" for n in graph.nodes.values())

        # Log transformation results
        _log.info(
            "IR transformation complete",
            agents=len(all_agents),
            teleporters=len(teleporters),
            output_files=len(output_files),
            user_inputs=len(user_inputs),
            custom_nodes=len(custom_nodes),
        )

        _log.debug(
            "IR details",
            root_agent=root_agent.name,
            root_type=root_agent.type,
            agent_names=[a.name for a in all_agents.values()],
        )

        return WorkflowIR(
            root_agent=root_agent,
            all_agents=all_agents,
            output_files=output_files,
            teleporters=teleporters,
            user_inputs=user_inputs,
            custom_nodes=custom_nodes,
            has_start_node=has_start_node,
            has_end_node=has_end_node,
            project_path=str(project.path),
            tab_ids=[tab.id for tab in project.tabs],
            metadata={
                "project_name": project.name,
                "version": project.version,
            },
        )

    def _transform_agent(
        self,
        node: GraphNode,
        graph: WorkflowGraph,
        project: LoadedProject,
    ) -> AgentIR:
        """Transform a single agent node to IR."""
        agent_data = get_node_config(node.data)

        # Resolve instruction from connected prompts
        instruction = self._resolve_instruction(node, graph, project)

        # Resolve tools from connected tool nodes
        tools = self._resolve_tools(node, graph, project)

        # Extract planner config (flat keys: planner_type, or nested: planner.type)
        planner_data = agent_data.get("planner", {})
        planner = PlannerConfig(
            type=agent_data.get("planner_type") or planner_data.get("type", "none"),
            thinking_budget=agent_data.get("thinking_budget")
            or planner_data.get("thinking_budget"),
            include_thoughts=agent_data.get("include_thoughts", False)
            if "include_thoughts" in agent_data
            else planner_data.get("include_thoughts", False),
        )

        # Extract code executor config (flat keys: code_executor_enabled, or nested)
        code_exec_data = agent_data.get("code_executor", {})
        # Default delimiters
        default_code_delimiters = [
            ("```tool_code\n", "\n```"),
            ("```python\n", "\n```"),
        ]
        default_result_delimiters = ("```tool_output\n", "\n```")
        code_executor = CodeExecutorConfig(
            enabled=agent_data.get("code_executor_enabled", False)
            if "code_executor_enabled" in agent_data
            else code_exec_data.get("enabled", False),
            stateful=agent_data.get("code_executor_stateful", False)
            if "code_executor_stateful" in agent_data
            else code_exec_data.get("stateful", False),
            error_retry_attempts=agent_data.get("code_executor_error_retry", 2)
            if "code_executor_error_retry" in agent_data
            else code_exec_data.get("error_retry_attempts", 2),
            optimize_data_file=agent_data.get("code_executor_optimize_data_file", False)
            if "code_executor_optimize_data_file" in agent_data
            else code_exec_data.get("optimize_data_file", False),
            code_block_delimiters=agent_data.get(
                "code_executor_code_block_delimiters", default_code_delimiters
            )
            if "code_executor_code_block_delimiters" in agent_data
            else code_exec_data.get("code_block_delimiters", default_code_delimiters),
            execution_result_delimiters=tuple(
                agent_data.get(
                    "code_executor_execution_result_delimiters",
                    default_result_delimiters,
                )
            )
            if "code_executor_execution_result_delimiters" in agent_data
            else tuple(
                code_exec_data.get(
                    "execution_result_delimiters", default_result_delimiters
                )
            ),
        )

        # Extract HTTP options (flat keys: http_timeout, or nested: http_options.timeout)
        http_data = agent_data.get("http_options", {})
        http_options = HttpOptionsConfig(
            timeout=agent_data.get("http_timeout", 30000)
            if "http_timeout" in agent_data
            else http_data.get("timeout", 30000),
            max_retries=agent_data.get("http_max_retries", 3)
            if "http_max_retries" in agent_data
            else http_data.get("max_retries", 3),
            retry_delay=agent_data.get("http_retry_delay", 1000)
            if "http_retry_delay" in agent_data
            else http_data.get("retry_delay", 1000),
            retry_backoff_multiplier=agent_data.get("http_backoff_multiplier", 2.0)
            if "http_backoff_multiplier" in agent_data
            else http_data.get("retry_backoff_multiplier", 2.0),
        )

        # Extract callbacks
        callbacks = CallbackConfig(
            before_model=agent_data.get("before_model_callback"),
            after_model=agent_data.get("after_model_callback"),
            before_tool=agent_data.get("before_tool_callback"),
            after_tool=agent_data.get("after_tool_callback"),
        )

        return AgentIR(
            id=node.id,
            name=agent_data.get("name", node.id),
            type=agent_data.get("type", "llm"),
            model=agent_data.get("model", self.config.default_model),
            instruction=instruction,
            temperature=agent_data.get("temperature", self.config.default_temperature),
            tools=tools,
            output_key=agent_data.get("output_key"),
            output_schema=agent_data.get("output_schema"),
            input_schema=agent_data.get("input_schema"),
            include_contents=self._resolve_include_contents(agent_data),
            strip_contents=agent_data.get("strip_contents", False),
            max_iterations=agent_data.get("max_iterations", 5),
            disallow_transfer_to_parent=agent_data.get(
                "disallow_transfer_to_parent", False
            ),
            disallow_transfer_to_peers=agent_data.get(
                "disallow_transfer_to_peers", False
            ),
            planner=planner,
            code_executor=code_executor,
            http_options=http_options,
            callbacks=callbacks,
            description=agent_data.get("description"),
            source_node_id=node.id,
        )

    def _resolve_instruction(
        self,
        node: GraphNode,
        graph: WorkflowGraph,
        project: LoadedProject,
    ) -> str | None:
        """Resolve instruction from connected prompts and context nodes."""
        parts: list[str] = []

        for edge in node.incoming:
            if edge.semantics in (EdgeSemantics.INSTRUCTION, EdgeSemantics.CONTEXT):
                source_node = graph.get_node(edge.source_id)
                if not source_node:
                    continue

                if source_node.type == "prompt":
                    config = get_node_config(source_node.data)
                    file_path = config.get("file_path")
                    if file_path:
                        loaded = project.get_prompt(file_path)
                        if loaded:
                            parts.append(loaded.content)
                        else:
                            raise CompilationError(
                                f"Prompt file not loaded: {file_path}",
                                location=ErrorLocation(
                                    node_id=source_node.id,
                                    file_path=file_path,
                                ),
                            )

                elif source_node.type == "context":
                    config = get_node_config(source_node.data)
                    file_path = config.get("file_path")
                    if file_path:
                        loaded = project.get_prompt(file_path)
                        if loaded:
                            parts.append(f"## Context\n{loaded.content}")

                elif source_node.type == "variable":
                    config = get_node_config(source_node.data)
                    var_name = config.get("name", "")
                    var_value = config.get("value", "")
                    if var_name and var_value:
                        parts.append(f"{{{var_name}}}: {var_value}")

        return "\n\n".join(parts) if parts else None

    def _resolve_include_contents(
        self,
        agent_data: dict,
    ) -> Literal["default", "none"]:
        """Resolve include_contents from boolean or string.

        Frontend uses checkbox (boolean), backend expects "default" or "none".

        Returns:
            Literal "default" or "none"
        """
        value = agent_data.get("include_contents", True)
        # Handle boolean (new format)
        if isinstance(value, bool):
            return "default" if value else "none"
        # Handle string (legacy format)
        if value == "none":
            return "none"
        return "default"

    def _resolve_tools(
        self,
        node: GraphNode,
        graph: WorkflowGraph,
        project: LoadedProject,
    ) -> list[ToolIR]:
        """Resolve tools from connected tool nodes."""
        tools: list[ToolIR] = []

        for edge in node.incoming:
            if edge.semantics == EdgeSemantics.TOOL:
                source_node = graph.get_node(edge.source_id)
                if not source_node:
                    continue

                if source_node.type in ("tool", "agentTool"):
                    config = get_node_config(source_node.data)
                    file_path = config.get("file_path")
                    error_behavior = config.get("error_behavior", "fail_fast")
                    if file_path:
                        loaded = project.get_tool(file_path)
                        if loaded:
                            tools.append(
                                ToolIR(
                                    name=loaded.name,
                                    file_path=file_path,
                                    code=loaded.code,
                                    error_behavior=error_behavior,
                                )
                            )
                    else:
                        # Inline code
                        code = config.get("code")
                        if code:
                            tools.append(
                                ToolIR(
                                    name=config.get(
                                        "name", f"tool_{source_node.id[:8]}"
                                    ),
                                    code=code,
                                    error_behavior=error_behavior,
                                )
                            )

        # Also add tools from agent's own tools array
        agent_data = get_node_config(node.data)
        for tool_ref in agent_data.get("tools", []):
            if isinstance(tool_ref, str):
                # Built-in tool reference
                tools.append(
                    ToolIR(
                        name=tool_ref,
                        code=f"# Built-in tool: {tool_ref}",
                    )
                )

        return tools

    def _build_agent_hierarchy(
        self,
        graph: WorkflowGraph,
        all_agents: dict[str, AgentIR],
    ) -> None:
        """Build agent hierarchy from sequential edges.

        This modifies agents in place to set up subagent relationships
        for composite agent types.
        """
        # For sequential agents: find chains and build subagent lists
        for agent_ir in all_agents.values():
            if agent_ir.type == "sequential":
                # Find all agents connected via sequential edges
                node = graph.get_node(agent_ir.id)
                if not node:
                    continue

                chain = self._find_sequential_chain(node, graph, all_agents)
                agent_ir.subagents = chain

            elif agent_ir.type == "parallel":
                # Find all agents connected via parallel edges
                node = graph.get_node(agent_ir.id)
                if not node:
                    continue

                parallel = self._find_parallel_agents(node, graph, all_agents)
                agent_ir.subagents = parallel

    def _find_sequential_chain(
        self,
        start_node: GraphNode,
        graph: WorkflowGraph,
        all_agents: dict[str, AgentIR],
    ) -> list[AgentIR]:
        """Find sequential chain starting from a node."""
        chain: list[AgentIR] = []
        visited: set[str] = set()

        def traverse(node: GraphNode) -> None:
            if node.id in visited:
                return
            visited.add(node.id)

            if node.type == "agent" and node.id in all_agents:
                # Don't add the starting sequential agent itself
                if node.id != start_node.id:
                    chain.append(all_agents[node.id])

            for edge in node.outgoing:
                if edge.semantics == EdgeSemantics.SEQUENTIAL:
                    target = graph.get_node(edge.target_id)
                    if target:
                        traverse(target)

        traverse(start_node)
        return chain

    def _find_parallel_agents(
        self,
        node: GraphNode,
        graph: WorkflowGraph,
        all_agents: dict[str, AgentIR],
    ) -> list[AgentIR]:
        """Find agents connected in parallel to a node."""
        parallel: list[AgentIR] = []

        for edge in node.outgoing:
            if edge.semantics == EdgeSemantics.PARALLEL:
                target = graph.get_node(edge.target_id)
                if target and target.type == "agent" and target.id in all_agents:
                    parallel.append(all_agents[target.id])

        return parallel

    def _build_sequential_chain_from_root(
        self,
        root_node: GraphNode,
        graph: WorkflowGraph,
        all_agents: dict[str, AgentIR],
    ) -> list[AgentIR]:
        """Build ordered list of agents following SEQUENTIAL edges from root.

        Traverses the graph starting from root_node, following SEQUENTIAL edges
        to build a chain of agents that should execute in order.

        Args:
            root_node: Starting agent node (has no incoming SEQUENTIAL edges)
            graph: The workflow graph
            all_agents: Map of agent ID to AgentIR

        Returns:
            Ordered list of AgentIR to execute sequentially
        """
        chain: list[AgentIR] = []
        visited: set[str] = set()
        current = root_node

        while current and current.id not in visited:
            visited.add(current.id)

            # Add current agent to chain
            if current.id in all_agents:
                chain.append(all_agents[current.id])

            # Find next agent via SEQUENTIAL edge
            seq_edges = current.get_outgoing_by_semantics(EdgeSemantics.SEQUENTIAL)
            next_node = None
            for edge in seq_edges:
                target = graph.get_node(edge.target_id)
                if target and target.type == "agent" and target.id not in visited:
                    next_node = target
                    break

            current = next_node

        return chain

    def _resolve_output_files(self, graph: WorkflowGraph) -> list[OutputFileIR]:
        """Resolve output file connections from agents."""
        output_files: list[OutputFileIR] = []

        for node in graph.nodes.values():
            if node.type == "outputFile":
                # Find the agent connected to this output file
                for edge in node.incoming:
                    if edge.semantics == EdgeSemantics.OUTPUT_FILE:
                        source = graph.get_node(edge.source_id)
                        if source and source.type == "agent":
                            config = get_node_config(node.data)
                            file_path = config.get("file_path", "")
                            name = config.get("name", "output")
                            if file_path:
                                output_files.append(
                                    OutputFileIR(
                                        name=name,
                                        file_path=file_path,
                                        agent_id=source.id,
                                    )
                                )

        return output_files

    def _transform_user_inputs(
        self,
        graph: WorkflowGraph,
        all_agents: dict[str, AgentIR],
    ) -> list[UserInputIR]:
        """Transform userInput nodes to IR.

        UserInput nodes can operate in two modes:
        - Trigger mode: No incoming connections, acts like a Start node
        - Pause mode: Has incoming connections, pauses execution for user input

        Only includes UserInput nodes that are connected to the flow
        (have at least one outgoing connection to an agent).
        """
        user_inputs: list[UserInputIR] = []

        for node in graph.get_user_input_nodes():
            # Get node config
            config = get_node_config(node.data)
            name = config.get("name", f"user_input_{node.id[:8]}")
            variable_name = _sanitize_variable_name(name)

            # Find incoming agents (SEQUENTIAL edges)
            incoming_agent_ids: list[str] = []
            for edge in node.incoming:
                if edge.semantics == EdgeSemantics.SEQUENTIAL:
                    source = graph.get_node(edge.source_id)
                    if source and source.type == "agent":
                        incoming_agent_ids.append(source.id)

            # Find outgoing agents (SEQUENTIAL edges)
            outgoing_agent_ids: list[str] = []
            for edge in node.outgoing:
                if edge.semantics == EdgeSemantics.SEQUENTIAL:
                    target = graph.get_node(edge.target_id)
                    if target and target.type == "agent":
                        outgoing_agent_ids.append(target.id)

            # Skip UserInput nodes that aren't connected to any agents
            # A UserInput node must have at least one outgoing connection to be useful
            if not outgoing_agent_ids:
                continue

            # Determine if trigger mode (no incoming connections)
            is_trigger = len(incoming_agent_ids) == 0

            # Get timeout configuration from node config
            timeout_seconds = float(config.get("timeout", 300.0))
            timeout_behavior = config.get("timeoutBehavior", "error")
            predefined_text = config.get("predefinedText", "")

            user_inputs.append(
                UserInputIR(
                    id=node.id,
                    name=name,
                    variable_name=variable_name,
                    is_trigger=is_trigger,
                    timeout_seconds=timeout_seconds,
                    timeout_behavior=timeout_behavior,
                    predefined_text=predefined_text,
                    incoming_agent_ids=incoming_agent_ids,
                    outgoing_agent_ids=outgoing_agent_ids,
                    source_node_id=node.id,
                )
            )

        return user_inputs

    def _transform_custom_nodes(self, graph: WorkflowGraph) -> list[CustomNodeIR]:
        """Transform custom FlowUnit nodes to IR."""
        custom_nodes: list[CustomNodeIR] = []

        # Import registry to get FlowUnit class metadata
        try:
            from adkflow_runner.extensions import get_registry

            registry = get_registry()
        except ImportError:
            registry = None

        for node in graph.nodes.values():
            if node.type.startswith("custom:"):
                unit_id = node.data.get("_unit_id") or node.type[7:]

                # Gather input connections
                input_connections: dict[str, list[str]] = {}
                for edge in node.incoming:
                    target_handle = edge.target_handle or "input"
                    if target_handle not in input_connections:
                        input_connections[target_handle] = []
                    input_connections[target_handle].append(edge.source_id)

                # Gather output connections
                output_connections: dict[str, list[str]] = {}
                for edge in node.outgoing:
                    source_handle = edge.source_handle or "output"
                    if source_handle not in output_connections:
                        output_connections[source_handle] = []
                    output_connections[source_handle].append(edge.target_id)

                # Get execution control properties from FlowUnit class
                output_node = False
                always_execute = False
                lazy_inputs: list[str] = []

                if registry:
                    flow_unit_cls = registry.get_unit(unit_id)
                    if flow_unit_cls:
                        output_node = getattr(flow_unit_cls, "OUTPUT_NODE", False)
                        always_execute = getattr(flow_unit_cls, "ALWAYS_EXECUTE", False)

                        # Find lazy input ports from UI schema
                        try:
                            ui_schema = flow_unit_cls.setup_interface()
                            lazy_inputs = [
                                port.id for port in ui_schema.inputs if port.lazy
                            ]
                        except Exception:
                            pass

                custom_nodes.append(
                    CustomNodeIR(
                        id=node.id,
                        unit_id=unit_id,
                        name=node.name or unit_id,
                        config=node.data.get("config", {}),
                        source_node_id=node.id,
                        input_connections=input_connections,
                        output_connections=output_connections,
                        output_node=output_node,
                        always_execute=always_execute,
                        lazy_inputs=lazy_inputs,
                    )
                )

        return custom_nodes
