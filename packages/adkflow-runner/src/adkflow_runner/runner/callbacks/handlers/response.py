"""Handler for emitting the final response from an agent.

Priority 450: Emits the agent's final response after model completion.
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


class ResponseHandler(BaseHandler):
    """Emits the final response from an agent.

    Captures the LLM response after model completion and emits an
    AGENT_RESPONSE event containing the response text. Also stores
    the response for retrieval by output handles.

    Priority: 450 (after EmitHandler at 400)
    """

    DEFAULT_PRIORITY = 450

    def __init__(
        self,
        emit: EmitFn | None,
        priority: int | None = None,
        on_error: str = "continue",
    ):
        """Initialize the response handler.

        Args:
            emit: Async function to emit RunEvent (or None for no-op)
            priority: Execution priority (default 450)
            on_error: Error handling policy
        """
        super().__init__(priority=priority, on_error=on_error)
        self.emit = emit
        self._last_response: str | None = None

    @property
    def last_response(self) -> str | None:
        """Get the last response text.

        Returns:
            The last response text, or None if not yet set.
        """
        return self._last_response

    def _extract_response_text(self, llm_response: Any) -> str | None:
        """Extract text content from LLM response.

        Args:
            llm_response: The ADK LLM response object

        Returns:
            Extracted text or None if no text found
        """
        if llm_response is None:
            return None

        # Handle ADK LlmResponse structure
        # The response has candidates, each with content.parts
        candidates = getattr(llm_response, "candidates", None)
        if not candidates:
            return None

        text_parts = []
        for candidate in candidates:
            content = getattr(candidate, "content", None)
            if not content:
                continue

            parts = getattr(content, "parts", None)
            if not parts:
                continue

            for part in parts:
                text = getattr(part, "text", None)
                if text:
                    text_parts.append(text)

        return "".join(text_parts) if text_parts else None

    def _emit_event(self, event: "RunEvent") -> None:
        """Fire-and-forget event emission.

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

    def after_model(
        self,
        callback_context: Any,
        llm_response: Any,
        agent_name: str,
    ) -> HandlerResult | None:
        """Emit AGENT_RESPONSE event after LLM completion.

        Also stores the response text for output handle retrieval.

        Args:
            callback_context: ADK callback context
            llm_response: The LLM response object
            agent_name: Name of the agent

        Returns:
            None (continues chain)
        """
        # Extract response text
        response_text = self._extract_response_text(llm_response)

        # Store for output handle
        self._last_response = response_text

        # Emit event if emit function is provided and we have text
        if self.emit and response_text:
            from adkflow_runner.runner.workflow_runner import EventType, RunEvent

            self._emit_event(
                RunEvent(
                    type=EventType.AGENT_RESPONSE,
                    timestamp=time.time(),
                    agent_name=agent_name,
                    data={"response": response_text},
                )
            )

        return None
