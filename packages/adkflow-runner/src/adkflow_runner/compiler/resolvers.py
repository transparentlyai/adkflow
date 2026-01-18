"""Resolution helpers for IR transformation.

Extracts and resolves data from connected nodes in the workflow graph.
"""

from typing import Literal

from adkflow_runner.compiler.graph import GraphNode, WorkflowGraph
from adkflow_runner.compiler.loader import LoadedProject
from adkflow_runner.compiler.node_config import get_node_config
from adkflow_runner.config import EdgeSemantics
from adkflow_runner.errors import CompilationError, ErrorLocation
from adkflow_runner.ir import (
    CallbackConfig,
    CallbackSourceIR,
    OutputFileIR,
    SchemaSourceIR,
    ToolIR,
)
from adkflow_runner.logging import get_logger

_log = get_logger("compiler.resolvers")


def resolve_instruction(
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


def resolve_include_contents(
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


def resolve_tools(
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
                                name=config.get("name", f"tool_{source_node.id[:8]}"),
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


def resolve_context_var_sources(
    node: GraphNode,
    graph: WorkflowGraph,
) -> list[str]:
    """Resolve source node IDs that provide context variables.

    These are nodes connected via CONTEXT_VARS edges (e.g., Context Aggregator).
    The actual variable values are resolved at runtime from execution outputs.

    Args:
        node: The agent node to resolve sources for
        graph: The workflow graph

    Returns:
        List of source node IDs that provide context variables
    """
    sources: list[str] = []

    for edge in node.incoming:
        if edge.semantics == EdgeSemantics.CONTEXT_VARS:
            source_node = graph.get_node(edge.source_id)
            if source_node:
                sources.append(source_node.id)
                _log.debug(
                    "Found context var source",
                    agent_id=node.id,
                    source_id=source_node.id,
                    source_type=source_node.type,
                )

    return sources


def resolve_upstream_output_keys(
    node: GraphNode,
    graph: WorkflowGraph,
) -> list[str]:
    """Resolve output_keys from upstream agents connected via SEQUENTIAL edges.

    These are the output_key values from agents that feed into this agent.
    ADK handles substitution of these placeholders at runtime via state.

    Args:
        node: The agent node to resolve upstream output_keys for
        graph: The workflow graph

    Returns:
        List of output_key values from upstream SEQUENTIAL agents
    """
    output_keys: list[str] = []

    for edge in node.incoming:
        if edge.semantics == EdgeSemantics.SEQUENTIAL:
            source_node = graph.get_node(edge.source_id)
            if source_node and source_node.type == "agent":
                config = get_node_config(source_node.data)
                output_key = config.get("output_key")
                if output_key:
                    # Normalize: strip curly braces if user entered them
                    output_key = output_key.strip("{}")
                    output_keys.append(output_key)
                    _log.debug(
                        "Found upstream output_key",
                        agent_id=node.id,
                        source_id=source_node.id,
                        output_key=output_key,
                    )

    return output_keys


def resolve_output_files(graph: WorkflowGraph) -> list[OutputFileIR]:
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


# Mapping from source handle IDs (on AgentNode) to callback type names
CALLBACK_HANDLE_TO_TYPE = {
    "before_agent_callback": "before_agent",
    "after_agent_callback": "after_agent",
    "before_model_callback": "before_model",
    "after_model_callback": "after_model",
    "before_tool_callback": "before_tool",
    "after_tool_callback": "after_tool",
}


def resolve_callbacks(
    node: GraphNode,
    graph: WorkflowGraph,
    agent_data: dict,
) -> CallbackConfig:
    """Resolve callbacks from connected CallbackNodes and text field values.

    Connected CallbackNodes take precedence over text field values.
    Connections go from AgentNode (source) to CallbackNode (target).
    The callback type is determined by the source handle on the AgentNode
    (e.g., before_model_callback → before_model).

    Args:
        node: The agent node to resolve callbacks for
        graph: The workflow graph
        agent_data: Agent node configuration data

    Returns:
        CallbackConfig with resolved callback sources
    """
    # Start with text field values (file paths)
    config = CallbackConfig(
        before_agent=_make_callback_source(agent_data.get("before_agent_callback")),
        after_agent=_make_callback_source(agent_data.get("after_agent_callback")),
        before_model=_make_callback_source(agent_data.get("before_model_callback")),
        after_model=_make_callback_source(agent_data.get("after_model_callback")),
        before_tool=_make_callback_source(agent_data.get("before_tool_callback")),
        after_tool=_make_callback_source(agent_data.get("after_tool_callback")),
    )

    # Override with connected CallbackNodes (takes precedence)
    # Edge direction: AgentNode (source) → CallbackNode (target)
    for edge in node.outgoing:
        if edge.semantics == EdgeSemantics.CALLBACK:
            target_node = graph.get_node(edge.target_id)
            if not target_node or target_node.type != "callback":
                continue

            # Get callback type from source handle (on AgentNode)
            callback_type = CALLBACK_HANDLE_TO_TYPE.get(edge.source_handle or "")
            if not callback_type:
                _log.warning(
                    "Unknown callback handle",
                    agent_id=node.id,
                    source_handle=edge.source_handle,
                    target_node_id=target_node.id,
                )
                continue

            # Extract code and name from the CallbackNode
            target_config = get_node_config(target_node.data)
            code = target_config.get("code", "")
            target_name = target_config.get("name", "")

            if code:
                callback_source = CallbackSourceIR(
                    code=code,
                    source_node_id=target_node.id,
                    source_node_name=target_name or f"callback_{target_node.id[:8]}",
                )

                # Set the appropriate callback field
                setattr(config, callback_type, callback_source)

                _log.debug(
                    "Resolved callback from connected node",
                    agent_id=node.id,
                    callback_type=callback_type,
                    callback_node_id=target_node.id,
                )

    return config


def _make_callback_source(file_path: str | None) -> CallbackSourceIR | None:
    """Create a CallbackSourceIR from a file path if provided."""
    if file_path:
        return CallbackSourceIR(file_path=file_path)
    return None


# Mapping from target handle IDs (on AgentNode) to schema field names
SCHEMA_HANDLE_TO_FIELD = {
    "input_schema": "input_schema",
    "output_schema": "output_schema",
}


def resolve_schemas(
    node: GraphNode,
    graph: WorkflowGraph,
    agent_data: dict,
) -> tuple[SchemaSourceIR | None, SchemaSourceIR | None]:
    """Resolve schemas from connected SchemaNodes and file picker field values.

    Connected SchemaNodes take precedence over file picker field values.
    Connections go from SchemaNode (source) to AgentNode (target).
    The schema type is determined by the target handle on the AgentNode
    (e.g., input_schema, output_schema).

    Args:
        node: The agent node to resolve schemas for
        graph: The workflow graph
        agent_data: Agent node configuration data

    Returns:
        Tuple of (input_schema, output_schema) SchemaSourceIR objects
    """
    # Start with file picker field values (file paths)
    input_schema = _make_schema_source(agent_data.get("input_schema"))
    output_schema = _make_schema_source(agent_data.get("output_schema"))

    # Override with connected SchemaNodes (takes precedence)
    # Edge direction: SchemaNode (source) → AgentNode (target)
    for edge in node.incoming:
        if edge.semantics == EdgeSemantics.SCHEMA:
            source_node = graph.get_node(edge.source_id)
            if not source_node or source_node.type != "schema":
                continue

            # Get schema field from target handle (on AgentNode)
            schema_field = SCHEMA_HANDLE_TO_FIELD.get(edge.target_handle or "")
            if not schema_field:
                _log.warning(
                    "Unknown schema handle",
                    agent_id=node.id,
                    target_handle=edge.target_handle,
                    source_node_id=source_node.id,
                )
                continue

            # Extract code, class name, and name from the SchemaNode
            source_config = get_node_config(source_node.data)
            code = source_config.get("code", "")
            class_name = source_config.get("schema_class", "")
            source_name = source_config.get("name", "")

            if code:
                schema_source = SchemaSourceIR(
                    code=code,
                    class_name=class_name or None,
                    source_node_id=source_node.id,
                    source_node_name=source_name or f"schema_{source_node.id[:8]}",
                )

                # Set the appropriate schema field
                if schema_field == "input_schema":
                    input_schema = schema_source
                elif schema_field == "output_schema":
                    output_schema = schema_source

                _log.debug(
                    "Resolved schema from connected node",
                    agent_id=node.id,
                    schema_field=schema_field,
                    schema_node_id=source_node.id,
                    class_name=class_name,
                )

    return input_schema, output_schema


def _make_schema_source(file_path: str | None) -> SchemaSourceIR | None:
    """Create a SchemaSourceIR from a file path if provided."""
    if file_path:
        return SchemaSourceIR(file_path=file_path)
    return None
