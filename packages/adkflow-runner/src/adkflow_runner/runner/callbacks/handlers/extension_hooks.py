"""Handler for bridging to global extension hooks.

Priority 500: Invokes HooksIntegration for extension flow control.
"""

from __future__ import annotations

import asyncio
from typing import TYPE_CHECKING, Any

from adkflow_runner.hooks import HookAction
from adkflow_runner.logging import get_logger
from adkflow_runner.runner.callbacks.handlers.base import BaseHandler
from adkflow_runner.runner.callbacks.types import HandlerResult

if TYPE_CHECKING:
    from adkflow_runner.hooks import HooksIntegration

_log = get_logger("runner.callbacks")


def _run_async_hook_sync(
    coro: Any,
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


class ExtensionHooksHandler(BaseHandler):
    """Bridges per-agent callbacks to global extension hooks.

    Invokes HooksIntegration methods for extension flow control.
    Extensions can SKIP, ABORT, or REPLACE data through hooks.

    Priority: 500
    """

    DEFAULT_PRIORITY = 500

    def __init__(
        self,
        hooks: "HooksIntegration | None",
        priority: int | None = None,
        on_error: str = "continue",
    ):
        """Initialize the extension hooks handler.

        Args:
            hooks: HooksIntegration instance (or None for no-op)
            priority: Execution priority (default 500)
            on_error: Error handling policy
        """
        super().__init__(priority=priority, on_error=on_error)
        self.hooks = hooks

    def _has_hooks(self, hook_name: str) -> bool:
        """Check if hooks are registered for given hook name.

        Args:
            hook_name: Name of the hook to check

        Returns:
            True if hooks exist and have handlers for this hook
        """
        return bool(self.hooks and self.hooks.executor.has_hooks(hook_name))

    def before_model(
        self,
        callback_context: Any,
        llm_request: Any,
        agent_name: str,
    ) -> HandlerResult | None:
        """Invoke before_llm_request hooks for extension control.

        Args:
            callback_context: ADK callback context
            llm_request: The LLM request object
            agent_name: Name of the agent

        Returns:
            HandlerResult with flow control action
        """
        # Check has_hooks BEFORE creating coroutine to avoid blocking event loop
        if not self._has_hooks("before_llm_request"):
            return None

        try:
            # Build config dict from llm_request attributes
            contents = getattr(llm_request, "contents", []) or []
            config = {
                "model": getattr(llm_request, "model", None),
                "system_instruction": getattr(llm_request, "system_instruction", None),
                "tools": getattr(llm_request, "tools", None),
            }
            hook_result, modified_messages, modified_config = _run_async_hook_sync(
                self.hooks.before_llm_request(  # type: ignore
                    messages=list(contents),
                    config=config,
                    agent_name=agent_name,
                )
            )

            if hook_result.action == HookAction.ABORT:
                return HandlerResult.abort(
                    hook_result.error or "Aborted by before_llm_request hook"
                )
            # Note: SKIP action for LLM hooks doesn't make sense (can't skip the LLM call)
            # REPLACE action could modify contents in place if ADK supports it

        except Exception as e:
            if "Aborted by" in str(e):
                raise
            _log.warning(
                f"before_llm_request hook error: {e}",
                agent=agent_name,
            )

        return None

    def after_model(
        self,
        callback_context: Any,
        llm_response: Any,
        agent_name: str,
    ) -> HandlerResult | None:
        """Invoke after_llm_response hooks for extension control.

        Args:
            callback_context: ADK callback context
            llm_response: The LLM response object
            agent_name: Name of the agent

        Returns:
            HandlerResult with flow control action
        """
        # Check has_hooks BEFORE creating coroutine to avoid blocking event loop
        if not self._has_hooks("after_llm_response"):
            return None

        try:
            content = getattr(llm_response, "content", None)
            text = ""
            if content and hasattr(content, "parts") and content.parts:
                for part in content.parts:
                    if hasattr(part, "text") and part.text:
                        text = part.text
                        break

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

            finish_reason = getattr(llm_response, "finish_reason", None)
            finish_reason_str = finish_reason.name if finish_reason else None
            model_version = getattr(llm_response, "model_version", None)

            response_data = {
                "content": content,
                "text": text,
                "finish_reason": finish_reason_str,
                "model_version": model_version,
                "usage": usage_data,
            }
            hook_result, _ = _run_async_hook_sync(
                self.hooks.after_llm_response(  # type: ignore
                    response=response_data,
                    agent_name=agent_name,
                )
            )

            if hook_result.action == HookAction.ABORT:
                return HandlerResult.abort(
                    hook_result.error or "Aborted by after_llm_response hook"
                )

        except Exception as e:
            if "Aborted by" in str(e):
                raise
            _log.warning(
                f"after_llm_response hook error: {e}",
                agent=agent_name,
            )

        return None

    async def before_tool(
        self,
        tool: Any,
        args: dict[str, Any],
        tool_context: Any,
        agent_name: str,
    ) -> HandlerResult | None:
        """Invoke before_tool_call hooks for extension control.

        Args:
            tool: The tool being called
            args: Tool arguments
            tool_context: ADK tool context
            agent_name: Name of the agent

        Returns:
            HandlerResult with flow control action and potentially modified args
        """
        if not self.hooks:
            return None

        tool_name = getattr(tool, "name", str(tool))

        hook_result, modified_args = await self.hooks.before_tool_call(
            tool_name=tool_name,
            arguments=args,
            agent_name=agent_name,
        )

        if hook_result.action == HookAction.ABORT:
            return HandlerResult.abort(
                hook_result.error or f"Aborted by before_tool_call hook for {tool_name}"
            )
        if hook_result.action == HookAction.SKIP:
            return HandlerResult.skip(reason="Skipped by hook")
        if hook_result.action == HookAction.REPLACE:
            return HandlerResult.replace(modified_args)

        return None

    async def after_tool(
        self,
        tool: Any,
        args: dict[str, Any],
        tool_context: Any,
        tool_response: Any,
        agent_name: str,
    ) -> HandlerResult | None:
        """Invoke after_tool_result hooks for extension control.

        Args:
            tool: The tool that was called
            args: Tool arguments
            tool_context: ADK tool context
            tool_response: The tool response
            agent_name: Name of the agent

        Returns:
            HandlerResult with flow control action and potentially modified response
        """
        if not self.hooks:
            return None

        tool_name = getattr(tool, "name", str(tool))

        hook_result, modified_response = await self.hooks.after_tool_result(
            tool_name=tool_name,
            arguments=args,
            result_data=tool_response,
            agent_name=agent_name,
        )

        if hook_result.action == HookAction.ABORT:
            return HandlerResult.abort(
                hook_result.error
                or f"Aborted by after_tool_result hook for {tool_name}"
            )
        if hook_result.action == HookAction.REPLACE:
            return HandlerResult.replace(modified_response)

        return None
