"""Handler for API and tool logging.

Priority 300: Logs LLM requests/responses and tool calls/results.
"""

from __future__ import annotations

from typing import Any

from adkflow_runner.logging import get_logger
from adkflow_runner.runner.callbacks.handlers.base import BaseHandler
from adkflow_runner.runner.callbacks.types import HandlerResult

# Loggers for different categories
_tool_log = get_logger("runner.tool")
_api_request_log = get_logger("api.request")
_api_response_log = get_logger("api.response")


class LoggingHandler(BaseHandler):
    """Logs LLM API requests/responses and tool calls/results.

    Provides structured logging for debugging and monitoring agent behavior.

    Priority: 300
    """

    DEFAULT_PRIORITY = 300

    def before_model(
        self,
        callback_context: Any,
        llm_request: Any,
        agent_name: str,
    ) -> HandlerResult | None:
        """Log LLM API request before sending to model.

        Args:
            callback_context: ADK callback context
            llm_request: The LLM request object
            agent_name: Name of the agent

        Returns:
            None
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

        return None

    def after_model(
        self,
        callback_context: Any,
        llm_response: Any,
        agent_name: str,
    ) -> HandlerResult | None:
        """Log LLM API response from model with metadata.

        Args:
            callback_context: ADK callback context
            llm_response: The LLM response object
            agent_name: Name of the agent

        Returns:
            None
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

        return None

    async def before_tool(
        self,
        tool: Any,
        args: dict[str, Any],
        tool_context: Any,
        agent_name: str,
    ) -> HandlerResult | None:
        """Log tool call before execution.

        Args:
            tool: The tool being called
            args: Tool arguments
            tool_context: ADK tool context
            agent_name: Name of the agent

        Returns:
            None
        """
        tool_name = getattr(tool, "name", str(tool))

        # Format args preview (truncate if too long)
        args_preview = ""
        if args:
            args_str = str(args)
            args_preview = args_str[:200] + "..." if len(args_str) > 200 else args_str

        _tool_log.info(
            f"Tool call: {tool_name}",
            agent=agent_name,
            tool=tool_name,
            args_preview=args_preview,
        )
        _tool_log.debug("Tool args full", agent=agent_name, tool=tool_name, args=args)

        return None

    async def after_tool(
        self,
        tool: Any,
        args: dict[str, Any],
        tool_context: Any,
        tool_response: Any,
        agent_name: str,
    ) -> HandlerResult | None:
        """Log tool result after execution.

        Args:
            tool: The tool that was called
            args: Tool arguments
            tool_context: ADK tool context
            tool_response: The tool response
            agent_name: Name of the agent

        Returns:
            None
        """
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
            result=tool_response,
        )

        return None
