"""Resolution helpers for IR transformation.

Extracts and resolves data from connected nodes in the workflow graph.
"""

from typing import Literal

from adkflow_runner.compiler.graph import GraphNode, WorkflowGraph
from adkflow_runner.compiler.loader import LoadedProject
from adkflow_runner.compiler.node_config import get_node_config
from adkflow_runner.config import EdgeSemantics
from adkflow_runner.errors import CompilationError, ErrorLocation
from adkflow_runner.ir import OutputFileIR, ToolIR
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
