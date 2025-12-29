"""Execution engine for running workflows."""

import time
import uuid
from pathlib import Path
from typing import Any

from google.adk.runners import Runner
from google.genai import types

from adkflow_runner.ir import WorkflowIR
from adkflow_runner.runner.types import (
    RunConfig,
    RunEvent,
    EventType,
)
from adkflow_runner.runner.graph_builder import GraphBuilder
from adkflow_runner.runner.graph_executor import GraphExecutor


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

    Returns:
        Dict mapping node IDs to their output values
    """
    if not ir.custom_nodes:
        return {}

    # Create emit wrapper that converts graph executor events to RunEvents
    async def graph_emit(event: dict[str, Any]) -> None:
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

    # Build execution graph from IR
    graph_builder = GraphBuilder()
    execution_graph = graph_builder.build(ir)

    # Create graph executor
    actual_cache_dir = cache_dir or (config.project_path / ".cache" / "custom_nodes")
    executor = GraphExecutor(
        emit=graph_emit,
        cache_dir=actual_cache_dir,
        enable_cache=enable_cache,
    )

    # Generate session_id
    session_id = str(uuid.uuid4())[:8]

    # Execute the graph
    results = await executor.execute(
        graph=execution_graph,
        session_state=session_state,
        project_path=config.project_path,
        session_id=session_id,
        run_id=run_id,
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
) -> str | None:
    """Process an ADK event and emit corresponding RunEvent.

    Returns the current author for tracking agent changes.
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
                    data={"output": text[:2000], "is_final": is_final},
                )
            )

    # Note: TOOL_CALL/TOOL_RESULT are emitted via ADK callbacks in agent_factory.py

    return author if author and author != "user" else last_author
