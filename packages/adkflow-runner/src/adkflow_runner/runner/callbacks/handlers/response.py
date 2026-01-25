"""Response handler for capturing the last LLM response.

Priority 450: Runs after EmitHandler (400) to ensure events are emitted
before response capture, but before ExtensionHooksHandler (500).
"""

from __future__ import annotations

from typing import Any

from adkflow_runner.runner.callbacks.handlers.base import BaseHandler
from adkflow_runner.runner.callbacks.types import ErrorPolicy, HandlerResult


class ResponseHandler(BaseHandler):
    """Captures the last LLM response text for output handles.

    Extracts text from llm_response.content.parts[].text and stores it
    for retrieval by output handles after agent execution completes.

    Priority: 450 (after EmitHandler at 400)

    Example:
        handler = ResponseHandler()
        registry.register(handler)
        # After execution:
        text = handler.last_response
    """

    DEFAULT_PRIORITY = 450

    def __init__(
        self,
        priority: int | None = None,
        on_error: str = ErrorPolicy.CONTINUE,
    ):
        """Initialize the response handler.

        Args:
            priority: Execution priority (default 450)
            on_error: Error handling policy (default CONTINUE)
        """
        super().__init__(priority=priority, on_error=on_error)
        self._last_response: str | None = None

    @property
    def last_response(self) -> str | None:
        """Get the last captured response text.

        Returns:
            Concatenated text from all parts, or None if no text was found.
        """
        return self._last_response

    def after_model(
        self,
        callback_context: Any,
        llm_response: Any,
        agent_name: str,
    ) -> HandlerResult | None:
        """Extract and store response text from LLM response.

        Extracts text from llm_response.content.parts[].text and
        concatenates all text parts into a single string.

        Args:
            callback_context: ADK callback context (unused)
            llm_response: The LLM response object
            agent_name: Name of the agent (unused)

        Returns:
            None to continue the handler chain
        """
        content = getattr(llm_response, "content", None)
        if not content:
            self._last_response = None
            return None

        parts = getattr(content, "parts", None)
        if not parts:
            self._last_response = None
            return None

        text_parts: list[str] = []
        for part in parts:
            text = getattr(part, "text", None)
            if text:
                text_parts.append(text)

        self._last_response = "".join(text_parts) if text_parts else None
        return None
