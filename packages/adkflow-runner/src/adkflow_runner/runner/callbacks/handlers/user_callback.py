"""Handler for user-defined callbacks loaded from IR.

Priority 600: Runs user callbacks loaded from file paths in CallbackConfig.
"""

from __future__ import annotations

import asyncio
import inspect
import time
from typing import TYPE_CHECKING, Any, Awaitable, Callable

from adkflow_runner.logging import get_logger
from adkflow_runner.runner.callbacks.handlers.base import BaseHandler
from adkflow_runner.runner.callbacks.types import HandlerResult

if TYPE_CHECKING:
    from adkflow_runner.runner.workflow_runner import RunEvent

# Type alias for emit function
EmitFn = Callable[["RunEvent"], Awaitable[None]]

_log = get_logger("runner.callbacks")


class UserCallbackHandler(BaseHandler):
    """Wraps user-defined callback functions from loaded modules.

    Executes callbacks loaded from file paths specified in CallbackConfig.
    Each callback method is optional - only invokes if provided.

    Priority: 600 (runs last)
    """

    DEFAULT_PRIORITY = 600

    def __init__(
        self,
        callbacks: dict[str, Any] | None = None,
        callback_metadata: dict[str, dict[str, str]] | None = None,
        emit: EmitFn | None = None,
        priority: int | None = None,
        on_error: str = "continue",
    ):
        """Initialize the user callback handler.

        Args:
            callbacks: Dict mapping callback names to functions:
                - before_agent_callback: (callback_context, agent_name) -> None | dict
                - after_agent_callback: (callback_context, agent_name) -> None | dict
                - before_model_callback: (callback_context, llm_request, agent_name) -> None | dict
                - after_model_callback: (callback_context, llm_response, agent_name) -> None | dict
                - before_tool_callback: (tool, args, tool_context, agent_name) -> None | dict
                - after_tool_callback: (tool, args, tool_context, tool_response, agent_name) -> None | dict
            callback_metadata: Dict mapping callback names to metadata:
                - { "callback_name": {"name": "...", "type": "..."} }
            emit: Async function to emit RunEvent for UI updates
            priority: Execution priority (default 600)
            on_error: Error handling policy
        """
        super().__init__(priority=priority, on_error=on_error)
        self.callbacks = callbacks or {}
        self.callback_metadata = callback_metadata or {}
        self.emit = emit

    def _emit_callback_event(
        self,
        callback_key: str,
        event_type: str,
        agent_name: str,
        error: str | None = None,
    ) -> None:
        """Emit a callback event for UI updates.

        Args:
            callback_key: The callback key (e.g., "before_agent_callback")
            event_type: Event type ("start", "end", or "error")
            agent_name: Name of the agent executing the callback
            error: Error message if event_type is "error"
        """
        if not self.emit:
            return

        from adkflow_runner.runner.types import EventType, RunEvent

        # Get callback metadata
        metadata = self.callback_metadata.get(callback_key, {})
        callback_name = metadata.get("name", callback_key)
        callback_type = metadata.get("type", callback_key.replace("_callback", ""))

        # Map event type to EventType enum
        type_map = {
            "start": EventType.CALLBACK_START,
            "end": EventType.CALLBACK_END,
            "error": EventType.CALLBACK_ERROR,
        }
        evt_type = type_map.get(event_type, EventType.CALLBACK_START)

        data: dict[str, Any] = {
            "callback_name": callback_name,
            "callback_type": callback_type,
        }
        if error:
            data["error"] = error

        event = RunEvent(
            type=evt_type,
            timestamp=time.time(),
            agent_name=agent_name,
            data=data,
        )

        # Fire-and-forget emission
        async def _do_emit() -> None:
            if self.emit:
                await self.emit(event)

        try:
            loop = asyncio.get_running_loop()
            loop.create_task(_do_emit())
        except RuntimeError:
            pass

    def _convert_result(self, result: Any) -> HandlerResult | None:
        """Convert user callback result to HandlerResult.

        User callbacks can return:
        - None: Continue execution
        - dict with "action": Flow control action
        - dict with "modified_data": Replace data
        - Any other value: Treated as replacement data

        Args:
            result: Return value from user callback

        Returns:
            HandlerResult or None
        """
        if result is None:
            return None

        if isinstance(result, dict):
            action = result.get("action", "continue")
            if action == "skip":
                return HandlerResult.skip(reason=result.get("reason"))
            elif action == "abort":
                return HandlerResult.abort(
                    error=result.get("error", "Aborted by user callback")
                )
            elif action == "replace" or "modified_data" in result:
                return HandlerResult.replace(result.get("modified_data", result))
            return None

        # Non-dict, non-None result treated as replacement
        return HandlerResult.replace(result)

    def before_agent(
        self,
        callback_context: Any,
        agent_name: str,
    ) -> HandlerResult | None:
        """Invoke user's before_agent_callback if provided.

        Args:
            callback_context: ADK callback context
            agent_name: Name of the agent

        Returns:
            HandlerResult or None
        """
        callback = self.callbacks.get("before_agent_callback")
        if not callback:
            return None

        self._emit_callback_event("before_agent_callback", "start", agent_name)
        try:
            result = callback(callback_context, agent_name)
            self._emit_callback_event("before_agent_callback", "end", agent_name)
            return self._convert_result(result)
        except Exception as e:
            self._emit_callback_event(
                "before_agent_callback", "error", agent_name, str(e)
            )
            _log.warning(f"User before_agent_callback error: {e}", agent=agent_name)
            raise

    def after_agent(
        self,
        callback_context: Any,
        agent_name: str,
    ) -> HandlerResult | None:
        """Invoke user's after_agent_callback if provided.

        Args:
            callback_context: ADK callback context
            agent_name: Name of the agent

        Returns:
            HandlerResult or None
        """
        callback = self.callbacks.get("after_agent_callback")
        if not callback:
            return None

        self._emit_callback_event("after_agent_callback", "start", agent_name)
        try:
            result = callback(callback_context, agent_name)
            self._emit_callback_event("after_agent_callback", "end", agent_name)
            return self._convert_result(result)
        except Exception as e:
            self._emit_callback_event(
                "after_agent_callback", "error", agent_name, str(e)
            )
            _log.warning(f"User after_agent_callback error: {e}", agent=agent_name)
            raise

    def before_model(
        self,
        callback_context: Any,
        llm_request: Any,
        agent_name: str,
    ) -> HandlerResult | None:
        """Invoke user's before_model_callback if provided.

        Args:
            callback_context: ADK callback context
            llm_request: The LLM request object
            agent_name: Name of the agent

        Returns:
            HandlerResult or None
        """
        callback = self.callbacks.get("before_model_callback")
        if not callback:
            return None

        self._emit_callback_event("before_model_callback", "start", agent_name)
        try:
            result = callback(callback_context, llm_request, agent_name)
            self._emit_callback_event("before_model_callback", "end", agent_name)
            return self._convert_result(result)
        except Exception as e:
            self._emit_callback_event(
                "before_model_callback", "error", agent_name, str(e)
            )
            _log.warning(f"User before_model_callback error: {e}", agent=agent_name)
            raise

    def after_model(
        self,
        callback_context: Any,
        llm_response: Any,
        agent_name: str,
    ) -> HandlerResult | None:
        """Invoke user's after_model_callback if provided.

        Args:
            callback_context: ADK callback context
            llm_response: The LLM response object
            agent_name: Name of the agent

        Returns:
            HandlerResult or None
        """
        callback = self.callbacks.get("after_model_callback")
        if not callback:
            return None

        self._emit_callback_event("after_model_callback", "start", agent_name)
        try:
            result = callback(callback_context, llm_response, agent_name)
            self._emit_callback_event("after_model_callback", "end", agent_name)
            return self._convert_result(result)
        except Exception as e:
            self._emit_callback_event(
                "after_model_callback", "error", agent_name, str(e)
            )
            _log.warning(f"User after_model_callback error: {e}", agent=agent_name)
            raise

    async def before_tool(
        self,
        tool: Any,
        args: dict[str, Any],
        tool_context: Any,
        agent_name: str,
    ) -> HandlerResult | None:
        """Invoke user's before_tool_callback if provided.

        Args:
            tool: The tool being called
            args: Tool arguments
            tool_context: ADK tool context
            agent_name: Name of the agent

        Returns:
            HandlerResult or None
        """
        callback = self.callbacks.get("before_tool_callback")
        if not callback:
            return None

        self._emit_callback_event("before_tool_callback", "start", agent_name)
        try:
            result = callback(tool, args, tool_context, agent_name)
            # Handle async callbacks
            if inspect.isawaitable(result):
                result = await result
            self._emit_callback_event("before_tool_callback", "end", agent_name)
            return self._convert_result(result)
        except Exception as e:
            self._emit_callback_event(
                "before_tool_callback", "error", agent_name, str(e)
            )
            _log.warning(f"User before_tool_callback error: {e}", agent=agent_name)
            raise

    async def after_tool(
        self,
        tool: Any,
        args: dict[str, Any],
        tool_context: Any,
        tool_response: Any,
        agent_name: str,
    ) -> HandlerResult | None:
        """Invoke user's after_tool_callback if provided.

        Args:
            tool: The tool that was called
            args: Tool arguments
            tool_context: ADK tool context
            tool_response: The tool response
            agent_name: Name of the agent

        Returns:
            HandlerResult or None
        """
        callback = self.callbacks.get("after_tool_callback")
        if not callback:
            return None

        self._emit_callback_event("after_tool_callback", "start", agent_name)
        try:
            result = callback(tool, args, tool_context, tool_response, agent_name)
            # Handle async callbacks
            if inspect.isawaitable(result):
                result = await result
            self._emit_callback_event("after_tool_callback", "end", agent_name)
            return self._convert_result(result)
        except Exception as e:
            self._emit_callback_event(
                "after_tool_callback", "error", agent_name, str(e)
            )
            _log.warning(f"User after_tool_callback error: {e}", agent=agent_name)
            raise
