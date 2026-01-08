"""Handler for RunEvent emission to UI.

Priority 400: Emits events for real-time UI updates.
"""

from __future__ import annotations

import asyncio
import time
from typing import TYPE_CHECKING, Any, Awaitable, Callable

from adkflow_runner.runner.callbacks.handlers.base import BaseHandler
from adkflow_runner.runner.callbacks.types import HandlerResult

if TYPE_CHECKING:
    from adkflow_runner.runner.workflow_runner import RunEvent

# Type alias for emit function
EmitFn = Callable[["RunEvent"], Awaitable[None]]


class EmitHandler(BaseHandler):
    """Emits RunEvents for real-time UI updates.

    Tool callbacks await emit to ensure events are sent before/after execution.
    Agent callbacks use fire-and-forget since timing is less critical.

    Priority: 400
    """

    DEFAULT_PRIORITY = 400

    def __init__(
        self,
        emit: EmitFn | None,
        priority: int | None = None,
        on_error: str = "continue",
    ):
        """Initialize the emit handler.

        Args:
            emit: Async function to emit RunEvent (or None for no-op)
            priority: Execution priority (default 400)
            on_error: Error handling policy
        """
        super().__init__(priority=priority, on_error=on_error)
        self.emit = emit

    def _emit_event(self, event: "RunEvent") -> None:
        """Fire-and-forget event emission for agent callbacks.

        Args:
            event: The RunEvent to emit
        """
        if not self.emit:
            return

        async def _do_emit() -> None:
            if self.emit:
                await self.emit(event)

        try:
            loop = asyncio.get_running_loop()
            loop.create_task(_do_emit())
        except RuntimeError:
            pass

    def before_agent(
        self,
        callback_context: Any,
        agent_name: str,
    ) -> HandlerResult | None:
        """Emit AGENT_START event.

        Args:
            callback_context: ADK callback context
            agent_name: Name of the agent

        Returns:
            None
        """
        if not self.emit:
            return None

        from adkflow_runner.runner.workflow_runner import EventType, RunEvent

        self._emit_event(
            RunEvent(
                type=EventType.AGENT_START,
                timestamp=time.time(),
                agent_name=agent_name,
                data={"source": "callback"},
            )
        )
        return None

    def after_agent(
        self,
        callback_context: Any,
        agent_name: str,
    ) -> HandlerResult | None:
        """Emit AGENT_END event.

        Args:
            callback_context: ADK callback context
            agent_name: Name of the agent

        Returns:
            None
        """
        if not self.emit:
            return None

        from adkflow_runner.runner.workflow_runner import EventType, RunEvent

        self._emit_event(
            RunEvent(
                type=EventType.AGENT_END,
                timestamp=time.time(),
                agent_name=agent_name,
                data={"source": "callback"},
            )
        )
        return None

    async def before_tool(
        self,
        tool: Any,
        args: dict[str, Any],
        tool_context: Any,
        agent_name: str,
    ) -> HandlerResult | None:
        """Emit TOOL_CALL event before tool execution.

        Awaits emit to ensure event is sent before tool executes.

        Args:
            tool: The tool being called
            args: Tool arguments
            tool_context: ADK tool context
            agent_name: Name of the agent

        Returns:
            None
        """
        if not self.emit:
            return None

        from adkflow_runner.runner.workflow_runner import EventType, RunEvent

        tool_name = getattr(tool, "name", str(tool))

        # Format args preview
        args_preview = ""
        if args:
            args_str = str(args)
            args_preview = args_str[:200] + "..." if len(args_str) > 200 else args_str

        await self.emit(
            RunEvent(
                type=EventType.TOOL_CALL,
                timestamp=time.time(),
                agent_name=agent_name,
                data={"tool_name": tool_name, "args": args_preview},
            )
        )
        return None

    async def after_tool(
        self,
        tool: Any,
        args: dict[str, Any],
        tool_context: Any,
        tool_response: Any,
        agent_name: str,
    ) -> HandlerResult | None:
        """Emit TOOL_RESULT event after tool execution.

        Awaits emit to ensure event is sent after tool completes.

        Args:
            tool: The tool that was called
            args: Tool arguments
            tool_context: ADK tool context
            tool_response: The tool response
            agent_name: Name of the agent

        Returns:
            None
        """
        if not self.emit:
            return None

        from adkflow_runner.runner.workflow_runner import EventType, RunEvent

        tool_name = getattr(tool, "name", str(tool))

        # Format result preview
        result_preview = ""
        if tool_response is not None:
            result_str = str(tool_response)
            result_preview = (
                result_str[:200] + "..." if len(result_str) > 200 else result_str
            )

        await self.emit(
            RunEvent(
                type=EventType.TOOL_RESULT,
                timestamp=time.time(),
                agent_name=agent_name,
                data={"tool_name": tool_name, "result": result_preview},
            )
        )
        return None
