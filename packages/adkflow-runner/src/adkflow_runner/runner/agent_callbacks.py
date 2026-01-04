"""Callback factories for ADK agents.

Creates callbacks for real-time event emission and API logging.
"""

from __future__ import annotations

import time
from typing import TYPE_CHECKING, Any, Awaitable, Callable

from google.adk.agents import Agent, LoopAgent, ParallelAgent, SequentialAgent
from opentelemetry import trace

from adkflow_runner.logging import get_logger
from adkflow_runner.runner.agent_serialization import (
    flatten_agent_config,
    serialize_agent_config,
    serialize_workflow_agent_config,
)

if TYPE_CHECKING:
    from adkflow_runner.runner.workflow_runner import RunEvent

# Type alias for emit function
EmitFn = Callable[["RunEvent"], Awaitable[None]]

# Loggers for different categories
_tool_log = get_logger("runner.tool")
_api_request_log = get_logger("api.request")
_api_response_log = get_logger("api.response")


def create_agent_callbacks(
    emit: EmitFn | None,
    agent_name: str,
) -> dict[str, Any]:
    """Create ADK callbacks that emit RunEvents for real-time updates.

    Tool callbacks are async and await the emit to ensure events are sent
    before/after tool execution. Agent callbacks use fire-and-forget since
    their timing is less critical.

    Also integrates logging for API requests/responses and tool execution.

    Args:
        emit: Async function to emit RunEvent (or None for no-op)
        agent_name: Name of the agent for event attribution

    Returns:
        Dict of callback functions to pass to Agent constructor
    """
    import asyncio

    from adkflow_runner.runner.workflow_runner import EventType, RunEvent

    async def _do_emit(event: "RunEvent") -> None:
        if emit:
            await emit(event)

    def _emit_event(event: "RunEvent") -> None:
        if not emit:
            return
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(_do_emit(event))
        except RuntimeError:
            pass

    def before_agent_callback(callback_context: Any) -> None:
        # Add agent config attributes to current span
        span = trace.get_current_span()
        if span.is_recording():
            agent = callback_context._invocation_context.agent

            # Serialize based on agent type
            if isinstance(agent, (SequentialAgent, ParallelAgent, LoopAgent)):
                config = serialize_workflow_agent_config(agent)
            elif isinstance(agent, Agent):
                config = serialize_agent_config(agent)
            else:
                config = {}

            # Flatten and set attributes
            for key, value in flatten_agent_config(config).items():
                span.set_attribute(key, value)

        if emit:
            _emit_event(
                RunEvent(
                    type=EventType.AGENT_START,
                    timestamp=time.time(),
                    agent_name=agent_name,
                    data={"source": "callback"},
                )
            )
        return None

    def after_agent_callback(callback_context: Any) -> None:
        if emit:
            _emit_event(
                RunEvent(
                    type=EventType.AGENT_END,
                    timestamp=time.time(),
                    agent_name=agent_name,
                    data={"source": "callback"},
                )
            )
        return None

    def before_model_callback(callback_context: Any, llm_request: Any) -> None:
        """Log LLM API request before sending to Gemini."""
        # Extract content from request
        contents = getattr(llm_request, "contents", []) or []
        message_count = len(contents)

        # Get last message preview
        last_msg = ""
        if contents:
            last_content = contents[-1]
            if hasattr(last_content, "parts") and last_content.parts:
                for part in last_content.parts:
                    if hasattr(part, "text") and part.text:
                        last_msg = part.text
                        break

        preview = last_msg[:200] + "..." if len(last_msg) > 200 else last_msg

        _api_request_log.info(
            f"LLM request: {agent_name}",
            agent=agent_name,
            message_count=message_count,
            preview=preview,
        )

        _api_request_log.debug(
            "Full LLM request",
            agent=agent_name,
            contents=lambda: [str(c) for c in contents],
        )
        return None

    def after_model_callback(callback_context: Any, llm_response: Any) -> None:
        """Log LLM API response from Gemini with full metadata."""
        content = getattr(llm_response, "content", None)
        text = ""
        if content and hasattr(content, "parts") and content.parts:
            for part in content.parts:
                if hasattr(part, "text") and part.text:
                    text = part.text
                    break

        preview = text[:200] + "..." if len(text) > 200 else text

        # Extract usage metadata
        usage = getattr(llm_response, "usage_metadata", None)
        usage_data = {}
        if usage:
            usage_data = {
                "input_tokens": getattr(usage, "prompt_token_count", None),
                "output_tokens": getattr(usage, "candidates_token_count", None),
                "total_tokens": getattr(usage, "total_token_count", None),
                "cached_tokens": getattr(usage, "cached_content_token_count", None),
            }

        # Extract finish reason
        finish_reason = getattr(llm_response, "finish_reason", None)
        finish_reason_str = finish_reason.name if finish_reason else None

        # Extract model version
        model_version = getattr(llm_response, "model_version", None)

        _api_response_log.info(
            f"LLM response: {agent_name}",
            agent=agent_name,
            has_content=bool(content),
            preview=preview,
            finish_reason=finish_reason_str,
            model_version=model_version,
            **usage_data,
        )

        _api_response_log.debug(
            "Full LLM response",
            agent=agent_name,
            content=lambda: str(content) if content else None,
        )
        return None

    async def before_tool_callback(
        *, tool: Any, args: dict[str, Any], tool_context: Any
    ) -> dict[str, Any] | None:
        tool_name = getattr(tool, "name", str(tool))
        # Format args preview (truncate if too long)
        args_preview = ""
        if args:
            args_str = str(args)
            args_preview = args_str[:200] + "..." if len(args_str) > 200 else args_str

        # Log tool call
        _tool_log.info(
            f"Tool call: {tool_name}",
            agent=agent_name,
            tool=tool_name,
            args_preview=args_preview,
        )
        _tool_log.debug("Tool args full", agent=agent_name, tool=tool_name, args=args)

        # Await emit to ensure event is sent before tool executes
        if emit:
            await emit(
                RunEvent(
                    type=EventType.TOOL_CALL,
                    timestamp=time.time(),
                    agent_name=agent_name,
                    data={"tool_name": tool_name, "args": args_preview},
                )
            )
        return None

    async def after_tool_callback(
        *, tool: Any, args: dict[str, Any], tool_context: Any, tool_response: Any
    ) -> dict[str, Any] | None:
        tool_name = getattr(tool, "name", str(tool))
        # Format result preview (truncate if too long)
        result_preview = ""
        if tool_response is not None:
            result_str = str(tool_response)
            result_preview = (
                result_str[:200] + "..." if len(result_str) > 200 else result_str
            )

        # Determine success
        is_error = isinstance(tool_response, dict) and "error" in tool_response

        # Log tool result
        _tool_log.info(
            f"Tool result: {tool_name}",
            agent=agent_name,
            tool=tool_name,
            success=not is_error,
            result_preview=result_preview,
        )
        _tool_log.debug(
            "Tool result full", agent=agent_name, tool=tool_name, result=tool_response
        )

        # Await emit to ensure event is sent after tool completes
        if emit:
            await emit(
                RunEvent(
                    type=EventType.TOOL_RESULT,
                    timestamp=time.time(),
                    agent_name=agent_name,
                    data={"tool_name": tool_name, "result": result_preview},
                )
            )
        return None

    return {
        "before_agent_callback": before_agent_callback,
        "after_agent_callback": after_agent_callback,
        "before_model_callback": before_model_callback,
        "after_model_callback": after_model_callback,
        "before_tool_callback": before_tool_callback,
        "after_tool_callback": after_tool_callback,
    }
