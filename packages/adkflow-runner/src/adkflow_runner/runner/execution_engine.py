"""Execution engine for running workflows."""

import json
import time
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from google.adk.runners import Runner
from google.genai import types

from adkflow_runner.errors import ExecutionError
from adkflow_runner.ir import WorkflowIR, AgentIR
from adkflow_runner.logging import get_logger
from adkflow_runner.runner.types import (
    RunConfig,
    RunEvent,
    EventType,
)
from adkflow_runner.runner.graph_builder import GraphBuilder
from adkflow_runner.runner.graph_executor import GraphExecutor
from adkflow_runner.hooks import HooksIntegration

_log = get_logger("runner.execution_engine")


@dataclass
class MonitorConnection:
    """Represents a Monitor node connected to an agent."""

    monitor_id: str
    monitor_name: str
    source_handle: str  # e.g., "response", "output"


def _collect_all_agents_recursive(
    agent: "AgentIR", result: dict[str, "AgentIR"]
) -> None:
    """Recursively collect all agents including nested subagents."""
    result[agent.id] = agent
    for subagent in agent.subagents:
        _collect_all_agents_recursive(subagent, result)


def _normalize_agent_name_for_adk(name: str) -> str:
    """Normalize agent name to match ADK's internal format.

    ADK converts spaces to underscores in agent names.
    """
    return name.replace(" ", "_")


def extract_agent_monitor_connections(
    ir: WorkflowIR,
) -> dict[str, list[MonitorConnection]]:
    """Extract mapping of agent names to connected Monitor nodes.

    Monitors connected to agent output handles will receive real-time updates
    during the ADK streaming loop, not just at flow completion.

    Args:
        ir: The compiled workflow IR

    Returns:
        Dict mapping agent name -> list of MonitorConnection
    """
    # Collect ALL agents including nested subagents
    # ir.all_agents may only contain top-level agents, so we need to
    # recursively collect subagents from Sequential/Parallel/Loop agents
    all_agents_flat: dict[str, AgentIR] = {}
    for agent_ir in ir.all_agents.values():
        _collect_all_agents_recursive(agent_ir, all_agents_flat)

    # Also traverse from root_agent in case it's not in all_agents
    _collect_all_agents_recursive(ir.root_agent, all_agents_flat)

    # Map agent ID to normalized name (ADK uses underscores instead of spaces)
    agent_id_to_name: dict[str, str] = {
        agent_id: _normalize_agent_name_for_adk(agent_ir.name)
        for agent_id, agent_ir in all_agents_flat.items()
    }
    agent_ids = set(all_agents_flat.keys())

    _log.debug(
        "Collected agents for monitor connections",
        agent_count=len(all_agents_flat),
        agent_names=list(agent_id_to_name.values()),
        agent_ids=list(agent_ids),
    )

    # Find Monitor nodes and their connections to agents
    agent_monitors: dict[str, list[MonitorConnection]] = {}

    for custom_node in ir.custom_nodes:
        if custom_node.unit_id != "builtin.monitor":
            continue

        monitor_name = custom_node.config.get("name", "Monitor")

        # Check input connections for agent sources
        for port_id, sources in custom_node.input_connections.items():
            for source in sources:
                if source.node_id in agent_ids:
                    agent_name = agent_id_to_name[source.node_id]
                    if agent_name not in agent_monitors:
                        agent_monitors[agent_name] = []
                    agent_monitors[agent_name].append(
                        MonitorConnection(
                            monitor_id=custom_node.id,
                            monitor_name=monitor_name,
                            source_handle=source.handle,
                        )
                    )

    return agent_monitors


def normalize_context_value(key: str, value: Any, source_name: str) -> str:
    """Convert a context variable value to string.

    - Strings: pass through as-is
    - Serializable values (dict, list, int, bool, float, None): convert to JSON string
    - Non-serializable: raise ExecutionError

    Args:
        key: Variable name
        value: Variable value
        source_name: Name of the source for error messages

    Returns:
        String representation of the value

    Raises:
        ExecutionError: If value is not serializable
    """
    if isinstance(value, str):
        return value

    # Try to serialize to JSON
    try:
        return json.dumps(value, ensure_ascii=False)
    except (TypeError, ValueError) as e:
        raise ExecutionError(
            f"Context variable '{key}' from '{source_name}' is not serializable: "
            f"{type(value).__name__}. Error: {e}"
        )


def merge_context_vars(
    sources: list[dict[str, Any]],
    source_names: list[str],
) -> dict[str, str]:
    """Merge context variable dicts, normalizing values and checking for conflicts.

    Args:
        sources: List of context variable dicts from source nodes
        source_names: Names of the source nodes (same order as sources)

    Returns:
        Merged dict with all variables (values normalized to strings)

    Raises:
        ExecutionError: If duplicate keys are found across sources
    """
    merged: dict[str, str] = {}
    key_sources: dict[str, str] = {}  # Track which source each key came from

    for source_dict, source_name in zip(sources, source_names):
        for key, value in source_dict.items():
            # Check for key conflicts
            if key in merged:
                raise ExecutionError(
                    f"Context variable conflict: '{key}' defined in both "
                    f"'{key_sources[key]}' and '{source_name}'"
                )

            # Normalize value to string
            merged[key] = normalize_context_value(key, value, source_name)
            key_sources[key] = source_name

    return merged


def format_error(error_msg: str, project_path: Path) -> str:
    """Format error messages with helpful instructions for common issues."""
    error_lower = error_msg.lower()

    # Check for missing API credentials - catch various error patterns
    credential_error_patterns = [
        "missing key inputs argument",
        "api_key",
        "google_api_key",
        "gemini_api_key",
        "defaultcredentialserror",
        "could not automatically determine credentials",
        "credentials not found",
        "api key not valid",
        "invalid api key",
        "authentication failed",
        "unauthorized",
        "permission denied",
        "please set the google_api_key",
        "please provide an api_key",
    ]

    is_credential_error = any(
        pattern in error_lower for pattern in credential_error_patterns
    )

    if is_credential_error:
        return f"""API credentials not configured or invalid.

To run workflows, you need to set up Google API credentials.

Option 1: Create a .env file in your project directory:
  {project_path}/.env

  Add one of these configurations:

  # For Google AI API (Gemini):
  GOOGLE_API_KEY=your-api-key-here

  # OR for Vertex AI:
  GOOGLE_GENAI_USE_VERTEXAI=true
  GOOGLE_CLOUD_PROJECT=your-project-id
  GOOGLE_CLOUD_LOCATION=us-central1

Option 2: Set environment variables before starting the server.

Get your API key at: https://aistudio.google.com/apikey

Original error: {error_msg}"""

    # Return original message for other errors
    return error_msg


async def execute_custom_nodes_graph(
    ir: WorkflowIR,
    config: RunConfig,
    emit: Any,
    session_state: dict[str, Any],
    run_id: str,
    enable_cache: bool = True,
    cache_dir: Path | None = None,
    hooks: HooksIntegration | None = None,
    custom_node_ids: set[str] | None = None,
    external_results: dict[str, dict[str, Any]] | None = None,
) -> dict[str, dict[str, Any]]:
    """Execute custom nodes using graph-based execution with topological sort.

    This method uses the GraphBuilder and GraphExecutor to execute custom
    nodes in dependency order, with parallel execution of independent nodes.

    Args:
        ir: Compiled workflow IR
        config: Run configuration
        emit: Event emitter function
        session_state: Shared state across the run
        run_id: Current run ID
        enable_cache: Whether to enable caching
        cache_dir: Cache directory path
        hooks: Hooks integration for execution events
        custom_node_ids: Optional set of custom node IDs to execute.
            If None, all custom nodes are executed.
        external_results: Pre-populated results from external sources
            (e.g., agent outputs) to satisfy dependencies.

    Returns:
        Dict mapping node IDs to their output values
    """
    if not ir.custom_nodes:
        return {}

    # Filter by custom_node_ids if provided
    if custom_node_ids is not None and not custom_node_ids:
        return {}  # Empty set means no nodes to execute

    # Create emit wrapper that converts graph executor events to RunEvents
    async def graph_emit(event: dict[str, Any] | RunEvent) -> None:
        # If already a RunEvent, pass it through directly
        if isinstance(event, RunEvent):
            await emit(event)
            return

        event_type_str = event.get("type", "")
        event_type_map = {
            "custom_node_start": EventType.CUSTOM_NODE_START,
            "custom_node_end": EventType.CUSTOM_NODE_END,
            "custom_node_error": EventType.CUSTOM_NODE_ERROR,
            "custom_node_cache_hit": EventType.CUSTOM_NODE_END,  # Treat cache hit as end
            "layer_start": EventType.AGENT_START,  # Reuse for layer events
            "layer_end": EventType.AGENT_END,
        }
        if event_type_str in event_type_map:
            await emit(
                RunEvent(
                    type=event_type_map[event_type_str],
                    timestamp=event.get("timestamp", time.time()),
                    agent_id=event.get("node_id"),
                    agent_name=event.get("node_name"),
                    data={
                        k: v for k, v in event.items() if k not in ("type", "timestamp")
                    },
                )
            )

    # Build execution graph from IR (only for specified custom nodes)
    graph_builder = GraphBuilder()
    execution_graph = graph_builder.build(ir, custom_node_ids=custom_node_ids)

    # If no nodes in graph, return empty results
    if not execution_graph.nodes:
        return {}

    # Create graph executor
    actual_cache_dir = cache_dir or (config.project_path / ".cache" / "custom_nodes")
    executor = GraphExecutor(
        emit=graph_emit,
        cache_dir=actual_cache_dir,
        enable_cache=enable_cache,
        hooks=hooks,
    )

    # Generate session_id
    session_id = str(uuid.uuid4())[:8]

    # Execute the graph with external results (e.g., agent outputs)
    results = await executor.execute(
        graph=execution_graph,
        session_state=session_state,
        project_path=config.project_path,
        session_id=session_id,
        run_id=run_id,
        external_results=external_results,
    )

    return results


async def execute_downstream_agents(
    user_input: Any,  # UserInputIR
    user_response: str,
    ir: WorkflowIR,
    config: RunConfig,
    emit: Any,
    session_service: Any,
    factory: Any,
) -> str | None:
    """Execute agents connected downstream of a UserInput node.

    Args:
        user_input: The UserInputIR with outgoing agent connections
        user_response: The user's response to use as input
        ir: Complete workflow IR with all agents
        config: Run configuration
        emit: Event emitter function
        session_service: Session service for runner
        factory: Agent factory for creating agents

    Returns:
        Output from downstream agents, or None if no downstream agents
    """
    if not user_input.outgoing_agent_ids:
        return None

    output_parts: list[str] = []

    for agent_id in user_input.outgoing_agent_ids:
        agent_ir = ir.all_agents.get(agent_id)
        if not agent_ir:
            continue

        # Create the downstream agent
        downstream_agent = factory.create(agent_ir)

        # Create a new runner for this segment
        downstream_runner = Runner(
            agent=downstream_agent,
            app_name="adkflow",
            session_service=session_service,
        )

        # Create a new session for this segment
        session = await session_service.create_session(
            app_name="adkflow",
            user_id="runner",
        )

        # Use user response as the prompt
        content = types.Content(
            role="user",
            parts=[types.Part(text=user_response)],
        )

        last_author: str | None = None

        try:
            async for event in downstream_runner.run_async(
                user_id="runner",
                session_id=session.id,
                new_message=content,
            ):
                last_author = await process_adk_event(event, emit, last_author)

                if hasattr(event, "content") and event.content:
                    parts = event.content.parts
                    if parts:
                        for part in parts:
                            if hasattr(part, "text") and part.text:
                                output_parts.append(part.text)
        except Exception as e:
            error_msg = str(e)
            friendly_error = format_error(error_msg, config.project_path)
            raise RuntimeError(friendly_error) from e

    return "\n".join(output_parts) if output_parts else None


async def write_output_files(
    ir: WorkflowIR,
    output: str,
    project_path: Path,
    emit: Any,
) -> None:
    """Write output to configured output files."""
    from pathlib import Path as PathLib

    for output_file in ir.output_files:
        try:
            # Resolve file path relative to project
            file_path = output_file.file_path
            if not file_path.startswith("/"):
                full_path = project_path / file_path
            else:
                full_path = PathLib(file_path)

            # Ensure parent directory exists
            full_path.parent.mkdir(parents=True, exist_ok=True)

            # Write the output
            full_path.write_text(output, encoding="utf-8")

            await emit(
                RunEvent(
                    type=EventType.AGENT_OUTPUT,
                    timestamp=time.time(),
                    data={
                        "output": f"Wrote output to {file_path}",
                        "file_path": str(full_path),
                    },
                )
            )

        except Exception as e:
            await emit(
                RunEvent(
                    type=EventType.ERROR,
                    timestamp=time.time(),
                    data={
                        "error": f"Failed to write output file {output_file.file_path}: {e}",
                    },
                )
            )


async def process_adk_event(
    event: Any,
    emit: Any,
    last_author: str | None = None,
    agent_monitors: dict[str, list[MonitorConnection]] | None = None,
) -> str | None:
    """Process an ADK event and emit corresponding RunEvent.

    Also emits MONITOR_UPDATE events for any Monitor nodes connected to the
    agent, enabling real-time updates during execution (not just at flow end).

    Args:
        event: ADK streaming event
        emit: Event emitter function
        last_author: Previous author for tracking agent changes
        agent_monitors: Mapping of agent name -> connected Monitor nodes

    Returns:
        Current author for tracking agent changes
    """
    author = getattr(event, "author", None)

    # Note: AGENT_START/AGENT_END are emitted via ADK callbacks in agent_factory.py
    # Here we only emit AGENT_OUTPUT since there's no callback for that

    # Emit agent output for non-partial events with text content
    # or for final responses (complete messages)
    is_partial = getattr(event, "partial", False)
    is_final = hasattr(event, "is_final_response") and event.is_final_response()

    if hasattr(event, "content") and event.content:
        text = ""
        parts = event.content.parts if event.content.parts else []
        for part in parts:
            if hasattr(part, "text") and part.text:
                text += part.text
        # Emit for final responses, or non-partial events with text
        if text and author and author != "user" and (is_final or not is_partial):
            await emit(
                RunEvent(
                    type=EventType.AGENT_OUTPUT,
                    timestamp=time.time(),
                    agent_name=author,
                    data={"output": text, "is_final": is_final},
                )
            )

            # Emit MONITOR_UPDATE for connected Monitor nodes (real-time updates)
            if agent_monitors and author in agent_monitors:
                timestamp_str = time.strftime("%Y-%m-%dT%H:%M:%S")
                for monitor in agent_monitors[author]:
                    # Only emit for monitors connected to "response" handle
                    if monitor.source_handle == "response":
                        await emit(
                            RunEvent(
                                type=EventType.MONITOR_UPDATE,
                                timestamp=time.time(),
                                agent_id=monitor.monitor_id,
                                agent_name=monitor.monitor_name,
                                data={
                                    "node_id": monitor.monitor_id,
                                    "value": text,
                                    "value_type": _detect_value_type(text),
                                    "timestamp": timestamp_str,
                                },
                            )
                        )

    # Note: TOOL_CALL/TOOL_RESULT are emitted via ADK callbacks in agent_factory.py

    return author if author and author != "user" else last_author


def _detect_value_type(value: str) -> str:
    """Detect content type for syntax highlighting."""
    # Check for JSON
    if value.strip().startswith(("{", "[")):
        try:
            json.loads(value)
            return "json"
        except (json.JSONDecodeError, ValueError):
            pass

    # Check for markdown indicators
    if any(pattern in value for pattern in ["# ", "## ", "**", "- ", "[", "](", "```"]):
        return "markdown"

    return "plaintext"
