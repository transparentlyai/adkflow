"""IR Transformer.

Transforms the workflow graph into Intermediate Representation (IR)
that can be executed by the Runner.
"""

from adkflow_runner.compiler.graph import GraphNode, WorkflowGraph
from adkflow_runner.compiler.loader import LoadedProject
from adkflow_runner.config import EdgeSemantics, ExecutionConfig, get_default_config
from adkflow_runner.errors import CompilationError, ErrorLocation
from adkflow_runner.ir import (
    AgentIR,
    CallbackConfig,
    CodeExecutorConfig,
    HttpOptionsConfig,
    OutputFileIR,
    PlannerConfig,
    TeleporterIR,
    ToolIR,
    WorkflowIR,
)


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
        # Transform all agents
        all_agents: dict[str, AgentIR] = {}
        for node in graph.get_agent_nodes():
            agent_ir = self._transform_agent(node, graph, project)
            all_agents[agent_ir.id] = agent_ir

        # Build agent hierarchy (sequential chains, parallel groups)
        self._build_agent_hierarchy(graph, all_agents)

        # Find root agent(s) and build sequential chains
        root_agents = graph.get_root_agents()
        if not root_agents:
            raise CompilationError(
                "No root agent found (all agents have incoming edges)"
            )

        # Build sequential chains starting from each root
        chains: list[AgentIR] = []
        for root in root_agents:
            chain = self._build_sequential_chain_from_root(root, graph, all_agents)
            if len(chain) == 1:
                # Single agent, no wrapper needed
                chains.append(chain[0])
            else:
                # Multiple agents in sequence, wrap in SequentialAgent
                seq_agent = AgentIR(
                    id=f"__seq_{root.id}__",
                    name=f"seq_{chain[0].name}",
                    type="sequential",
                    subagents=chain,
                )
                all_agents[seq_agent.id] = seq_agent
                chains.append(seq_agent)

        # If multiple chains, wrap in a parallel agent
        if len(chains) == 1:
            root_agent = chains[0]
        else:
            root_agent = AgentIR(
                id="__root__",
                name="root",
                type="parallel",
                subagents=chains,
            )
            all_agents["__root__"] = root_agent

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

        return WorkflowIR(
            root_agent=root_agent,
            all_agents=all_agents,
            output_files=output_files,
            teleporters=teleporters,
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
        agent_data = node.data.get("agent", {})

        # Resolve instruction from connected prompts
        instruction = self._resolve_instruction(node, graph, project)

        # Resolve tools from connected tool nodes
        tools = self._resolve_tools(node, graph, project)

        # Extract planner config
        planner_data = agent_data.get("planner", {})
        planner = PlannerConfig(
            type=planner_data.get("type", "none"),
            thinking_budget=planner_data.get("thinking_budget"),
            include_thoughts=planner_data.get("include_thoughts", False),
        )

        # Extract code executor config
        code_exec_data = agent_data.get("code_executor", {})
        code_executor = CodeExecutorConfig(
            enabled=code_exec_data.get("enabled", False),
            stateful=code_exec_data.get("stateful", False),
            error_retry_attempts=code_exec_data.get("error_retry_attempts", 3),
        )

        # Extract HTTP options
        http_data = agent_data.get("http_options", {})
        http_options = HttpOptionsConfig(
            timeout=http_data.get("timeout", 30000),
            max_retries=http_data.get("max_retries", 3),
            retry_delay=http_data.get("retry_delay", 1000),
            retry_backoff_multiplier=http_data.get("retry_backoff_multiplier", 2.0),
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
            name=agent_data.get("name", f"agent_{node.id[:8]}"),
            type=agent_data.get("type", "llm"),
            model=agent_data.get("model", self.config.default_model),
            instruction=instruction,
            temperature=agent_data.get("temperature", self.config.default_temperature),
            tools=tools,
            output_key=agent_data.get("output_key"),
            output_schema=agent_data.get("output_schema"),
            input_schema=agent_data.get("input_schema"),
            include_contents=agent_data.get("include_contents", "default"),
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
                    prompt_data = source_node.data.get("prompt", {})
                    file_path = prompt_data.get("file_path")
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
                    context_data = source_node.data.get("prompt", source_node.data)
                    file_path = context_data.get("file_path")
                    if file_path:
                        loaded = project.get_prompt(file_path)
                        if loaded:
                            parts.append(f"## Context\n{loaded.content}")

                elif source_node.type == "variable":
                    var_name = source_node.data.get("name", "")
                    var_value = source_node.data.get("value", "")
                    if var_name and var_value:
                        parts.append(f"{{{var_name}}}: {var_value}")

        return "\n\n".join(parts) if parts else None

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
                    file_path = source_node.data.get("file_path")
                    if file_path:
                        loaded = project.get_tool(file_path)
                        if loaded:
                            tools.append(
                                ToolIR(
                                    name=loaded.name,
                                    file_path=file_path,
                                    code=loaded.code,
                                )
                            )
                    else:
                        # Inline code
                        code = source_node.data.get("code")
                        if code:
                            tools.append(
                                ToolIR(
                                    name=source_node.data.get(
                                        "name", f"tool_{source_node.id[:8]}"
                                    ),
                                    code=code,
                                )
                            )

        # Also add tools from agent's own tools array
        agent_data = node.data.get("agent", {})
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
                            file_path = node.data.get("file_path", "")
                            name = node.data.get("name", "output")
                            if file_path:
                                output_files.append(
                                    OutputFileIR(
                                        name=name,
                                        file_path=file_path,
                                        agent_id=source.id,
                                    )
                                )

        return output_files
