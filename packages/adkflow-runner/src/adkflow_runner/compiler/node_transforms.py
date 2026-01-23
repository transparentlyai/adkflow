"""Node transformation helpers for IR transformation.

Transforms specific node types (UserInput, Custom) to their IR representations.
"""

import re
from typing import Any

from adkflow_runner.compiler.graph import WorkflowGraph
from adkflow_runner.compiler.node_config import get_node_config
from adkflow_runner.config import EdgeSemantics
from adkflow_runner.ir import (
    ConnectionSource,
    ContextAggregatorIR,
    CustomNodeIR,
    UserInputIR,
)


def sanitize_variable_name(name: str) -> str:
    """Convert a node name to a valid variable name.

    Example: "Review Step" -> "review_step_input"
    """
    # Convert to lowercase, replace spaces/hyphens with underscores
    sanitized = name.lower().replace(" ", "_").replace("-", "_")
    # Remove any invalid characters
    sanitized = re.sub(r"[^a-z0-9_]", "", sanitized)
    # Ensure it starts with letter or underscore
    if sanitized and not sanitized[0].isalpha() and sanitized[0] != "_":
        sanitized = "_" + sanitized
    # Default and add suffix
    return (sanitized or "user") + "_input"


def transform_user_inputs(
    graph: WorkflowGraph,
    all_agents: dict[str, Any],
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
        variable_name = sanitize_variable_name(name)

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


def transform_custom_nodes(graph: WorkflowGraph) -> list[CustomNodeIR]:
    """Transform custom FlowUnit nodes to IR.

    Handles two types of FlowUnit nodes:
    - Custom nodes with type "custom:unit_id" (from extensions)
    - Builtin FlowUnit nodes with type matching their short name (e.g., "monitor")
    """
    custom_nodes: list[CustomNodeIR] = []

    # Mapping from builtin node types to their unit IDs
    # These are FlowUnit nodes defined in the frontend with short types
    # but need to be executed as FlowUnits with their full unit_id
    # Note: shellTool is NOT here - it's handled like a regular tool node
    # via resolve_tools() at compile time
    builtin_flowunit_types: dict[str, str] = {
        "monitor": "builtin.monitor",
    }

    # Import registry to get FlowUnit class metadata
    try:
        from adkflow_runner.extensions import get_registry

        registry = get_registry()
    except ImportError:
        registry = None

    for node in graph.nodes.values():
        # Determine the unit_id based on node type
        unit_id: str | None = None

        if node.type.startswith("custom:"):
            unit_id = node.data.get("_unit_id") or node.type[7:]
        elif node.type in builtin_flowunit_types:
            unit_id = builtin_flowunit_types[node.type]

        if unit_id:
            # Gather input connections with source handle info
            input_connections: dict[str, list[ConnectionSource]] = {}
            for edge in node.incoming:
                target_handle = edge.target_handle or "input"
                source_handle = edge.source_handle or "output"
                if target_handle not in input_connections:
                    input_connections[target_handle] = []
                input_connections[target_handle].append(
                    ConnectionSource(node_id=edge.source_id, handle=source_handle)
                )

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


def transform_context_aggregators(graph: WorkflowGraph) -> list[ContextAggregatorIR]:
    """Transform context_aggregator nodes to IR.

    Context aggregators collect content from files, directories, URLs, and
    connected nodes into named variables for agent template substitution.
    """
    aggregators: list[ContextAggregatorIR] = []

    for node in graph.nodes.values():
        if node.type == "context_aggregator":
            # Gather input connections (for "node" type dynamic inputs)
            input_connections: dict[str, list[str]] = {}
            for edge in node.incoming:
                target_handle = edge.target_handle or "input"
                if target_handle not in input_connections:
                    input_connections[target_handle] = []
                input_connections[target_handle].append(edge.source_id)

            # Get name from config or use default
            config = node.data.get("config", {})
            name = config.get("name", node.name or "Context Aggregator")

            aggregators.append(
                ContextAggregatorIR(
                    id=node.id,
                    name=name,
                    config=config,
                    input_connections=input_connections,
                )
            )

    return aggregators
