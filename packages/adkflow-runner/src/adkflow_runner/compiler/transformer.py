"""IR Transformer.

Transforms the workflow graph into Intermediate Representation (IR)
that can be executed by the Runner.
"""

from adkflow_runner.compiler.graph import GraphNode, WorkflowGraph
from adkflow_runner.compiler.hierarchy import HierarchyBuilder
from adkflow_runner.compiler.loader import LoadedProject
from adkflow_runner.compiler.node_config import get_node_config
from adkflow_runner.compiler.node_transforms import (
    transform_context_aggregators,
    transform_custom_nodes,
    transform_user_inputs,
)
from adkflow_runner.compiler.resolvers import (
    resolve_callbacks,
    resolve_context_var_sources,
    resolve_include_contents,
    resolve_instruction,
    resolve_output_files,
    resolve_schemas,
    resolve_tools,
    resolve_upstream_output_keys,
)
from adkflow_runner.config import EdgeSemantics, ExecutionConfig, get_default_config
from adkflow_runner.errors import CompilationError
from adkflow_runner.ir import (
    AgentIR,
    CodeExecutorConfig,
    GenerateContentConfig,
    HttpOptionsConfig,
    PlannerConfig,
    SafetyConfig,
    TeleporterIR,
    WorkflowIR,
)
from adkflow_runner.logging import get_logger

_log = get_logger("compiler.transformer")


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

        # Process explicit sub-agent connections (plug → sub-agents handles)
        # This adds agents connected via SUBAGENT edges to their parent's subagents
        hierarchy_builder.process_subagent_edges()

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
        output_files = resolve_output_files(graph)

        # Transform user input nodes
        user_inputs = transform_user_inputs(graph, all_agents)

        # Transform custom nodes
        custom_nodes = transform_custom_nodes(graph)

        # Transform context aggregator nodes
        context_aggregators = transform_context_aggregators(graph)

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
            context_aggregators=len(context_aggregators),
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
            context_aggregators=context_aggregators,
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
        instruction = resolve_instruction(node, graph, project)

        # Resolve tools from connected tool nodes
        tools = resolve_tools(node, graph, project)

        # Resolve context variable sources (values resolved at runtime)
        context_var_sources = resolve_context_var_sources(node, graph)

        # Resolve upstream output_keys (from agents connected via SEQUENTIAL edges)
        upstream_output_keys = resolve_upstream_output_keys(node, graph)

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

        # Resolve callbacks from connected CallbackNodes and text field values
        # Connected CallbackNodes take precedence over text field values
        callbacks = resolve_callbacks(node, graph, agent_data)

        # Resolve schemas from connected SchemaNodes and file picker field values
        # Connected SchemaNodes take precedence over file picker field values
        input_schema, output_schema = resolve_schemas(node, graph, agent_data)

        # Extract GenerateContentConfig fields
        stop_sequences_raw = agent_data.get("stop_sequences", "")
        stop_sequences = (
            [s.strip() for s in stop_sequences_raw.split("\n") if s.strip()]
            if stop_sequences_raw
            else None
        )
        generate_content = GenerateContentConfig(
            max_output_tokens=agent_data.get("max_output_tokens"),
            top_p=agent_data.get("top_p"),
            top_k=agent_data.get("top_k"),
            stop_sequences=stop_sequences,
            presence_penalty=agent_data.get("presence_penalty"),
            frequency_penalty=agent_data.get("frequency_penalty"),
            seed=agent_data.get("seed"),
            response_mime_type=agent_data.get("response_mime_type"),
        )

        # Extract SafetyConfig fields
        safety = SafetyConfig(
            harassment=agent_data.get("safety_harassment", "default"),
            hate_speech=agent_data.get("safety_hate_speech", "default"),
            sexually_explicit=agent_data.get("safety_sexually_explicit", "default"),
            dangerous_content=agent_data.get("safety_dangerous_content", "default"),
        )

        return AgentIR(
            id=node.id,
            name=agent_data.get("name", node.id),
            type=agent_data.get("type", "llm"),
            model=agent_data.get("model", self.config.default_model),
            instruction=instruction,
            temperature=agent_data.get("temperature", self.config.default_temperature),
            tools=tools,
            # Normalize: strip curly braces if user entered them
            output_key=(agent_data.get("output_key") or "").strip("{}") or None,
            output_schema=output_schema,
            input_schema=input_schema,
            include_contents=resolve_include_contents(agent_data),
            strip_contents=agent_data.get("strip_contents", False),
            max_iterations=agent_data.get("max_iterations", 5),
            disallow_transfer_to_parent=agent_data.get(
                "disallow_transfer_to_parent", False
            ),
            disallow_transfer_to_peers=agent_data.get(
                "disallow_transfer_to_peers", False
            ),
            finish_reason_fail_fast=agent_data.get("finish_reason_fail_fast", False),
            planner=planner,
            code_executor=code_executor,
            http_options=http_options,
            callbacks=callbacks,
            generate_content=generate_content,
            safety=safety,
            context_var_sources=context_var_sources,
            upstream_output_keys=upstream_output_keys,
            description=agent_data.get("description"),
            source_node_id=node.id,
        )

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
