"""Callback factories for ADK agents.

Creates callbacks for real-time event emission and API logging.
Integrates extension hooks for flow control.
"""

from __future__ import annotations

import asyncio
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
from adkflow_runner.hooks import HookAction, HooksIntegration


T = Any  # Type var for coroutine result


def _run_async_hook_sync(
    coro: Any,  # Coroutine - typed as Any to avoid variance issues
    timeout: float = 30.0,
) -> Any:
    """Run an async hook coroutine from a sync context.

    This is needed for model callbacks which are sync in ADK but need
    to call async hooks.

    Args:
        coro: Async coroutine to run
        timeout: Maximum wait time in seconds

    Returns:
        Result of the coroutine
    """
    try:
        loop = asyncio.get_running_loop()
        # We're in an async context - use thread-safe scheduling
        future = asyncio.run_coroutine_threadsafe(coro, loop)
        return future.result(timeout=timeout)
    except RuntimeError:
        # No running loop - we can use asyncio.run()
        return asyncio.run(coro)


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
    hooks: HooksIntegration | None = None,
    agent_id: str | None = None,
) -> dict[str, Any]:
    """Create ADK callbacks that emit RunEvents for real-time updates.

    .. deprecated::
        Use CallbackRegistry instead. This function is maintained for
        backwards compatibility but will be removed in a future version.
        See: adkflow_runner.runner.callbacks.CallbackRegistry

    Tool callbacks are async and await the emit to ensure events are sent
    before/after tool execution. Agent callbacks use fire-and-forget since
    their timing is less critical.

    Also integrates logging for API requests/responses and tool execution.
    Extension hooks are invoked to allow flow control.

    Args:
        emit: Async function to emit RunEvent (or None for no-op)
        agent_name: Name of the agent for event attribution
        hooks: Optional HooksIntegration for extension hooks
        agent_id: Agent ID for hook context

    Returns:
        Dict of callback functions to pass to Agent constructor
    """
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
        """Log LLM API request before sending to Gemini.

        Also invokes before_llm_request hooks for extension control.
        """
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

        # Invoke before_llm_request hooks (only if hooks are actually registered)
        # Check has_hooks BEFORE creating coroutine to avoid blocking event loop
        if hooks and hooks.executor.has_hooks("before_llm_request"):
            try:
                # Build config dict from llm_request attributes
                config = {
                    "model": getattr(llm_request, "model", None),
                    "system_instruction": getattr(
                        llm_request, "system_instruction", None
                    ),
                    "tools": getattr(llm_request, "tools", None),
                }
                hook_result, modified_messages, modified_config = _run_async_hook_sync(
                    hooks.before_llm_request(
                        messages=list(contents),
                        config=config,
                        agent_name=agent_name,
                    )
                )
                if hook_result.action == HookAction.ABORT:
                    raise RuntimeError(
                        hook_result.error or "Aborted by before_llm_request hook"
                    )
                # Note: SKIP action for LLM hooks doesn't make sense (can't skip the LLM call)
                # REPLACE action could modify contents in place if ADK supports it
            except Exception as e:
                if "Aborted by" in str(e):
                    raise
                # Log but don't fail on hook errors
                _api_request_log.warning(
                    f"before_llm_request hook error: {e}",
                    agent=agent_name,
                )

        return None

    def after_model_callback(callback_context: Any, llm_response: Any) -> None:
        """Log LLM API response from Gemini with full metadata.

        Also invokes after_llm_response hooks for extension control.
        """
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

        # Invoke after_llm_response hooks (only if hooks are actually registered)
        # Check has_hooks BEFORE creating coroutine to avoid blocking event loop
        if hooks and hooks.executor.has_hooks("after_llm_response"):
            try:
                # Build response dict with key metadata
                response_data = {
                    "content": content,
                    "text": text,
                    "finish_reason": finish_reason_str,
                    "model_version": model_version,
                    "usage": usage_data,
                }
                hook_result, _ = _run_async_hook_sync(
                    hooks.after_llm_response(
                        response=response_data,
                        agent_name=agent_name,
                    )
                )
                if hook_result.action == HookAction.ABORT:
                    raise RuntimeError(
                        hook_result.error or "Aborted by after_llm_response hook"
                    )
                # Note: REPLACE action for after_llm_response is for observation/logging
                # The response has already been received from the LLM
            except Exception as e:
                if "Aborted by" in str(e):
                    raise
                # Log but don't fail on hook errors
                _api_response_log.warning(
                    f"after_llm_response hook error: {e}",
                    agent=agent_name,
                )

        return None

    async def before_tool_callback(
        *, tool: Any, args: dict[str, Any], tool_context: Any
    ) -> dict[str, Any] | None:
        tool_name = getattr(tool, "name", str(tool))

        # Invoke before_tool_call hooks
        if hooks:
            hook_result, modified_args = await hooks.before_tool_call(
                tool_name=tool_name,
                arguments=args,
                agent_name=agent_name,
            )
            if hook_result.action == HookAction.ABORT:
                raise RuntimeError(
                    hook_result.error
                    or f"Aborted by before_tool_call hook for {tool_name}"
                )
            if hook_result.action == HookAction.SKIP:
                # Return empty result to skip tool execution
                return {"skipped": True, "reason": "Skipped by hook"}
            if hook_result.action == HookAction.REPLACE:
                args = modified_args

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

        # Invoke after_tool_result hooks
        modified_response = tool_response
        if hooks:
            hook_result, modified_response = await hooks.after_tool_result(
                tool_name=tool_name,
                arguments=args,
                result_data=tool_response,
                agent_name=agent_name,
            )
            if hook_result.action == HookAction.ABORT:
                raise RuntimeError(
                    hook_result.error
                    or f"Aborted by after_tool_result hook for {tool_name}"
                )
            # For REPLACE, use modified_response (already set above)

        # Format result preview (truncate if too long)
        result_preview = ""
        if modified_response is not None:
            result_str = str(modified_response)
            result_preview = (
                result_str[:200] + "..." if len(result_str) > 200 else result_str
            )

        # Determine success
        is_error = isinstance(modified_response, dict) and "error" in modified_response

        # Log tool result
        _tool_log.info(
            f"Tool result: {tool_name}",
            agent=agent_name,
            tool=tool_name,
            success=not is_error,
            result_preview=result_preview,
        )
        _tool_log.debug(
            "Tool result full",
            agent=agent_name,
            tool=tool_name,
            result=modified_response,
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

        # Return modified response if it was changed by hook
        if hooks and modified_response is not tool_response:
            return modified_response  # type: ignore
        return None

    return {
        "before_agent_callback": before_agent_callback,
        "after_agent_callback": after_agent_callback,
        "before_model_callback": before_model_callback,
        "after_model_callback": after_model_callback,
        "before_tool_callback": before_tool_callback,
        "after_tool_callback": after_tool_callback,
    }
