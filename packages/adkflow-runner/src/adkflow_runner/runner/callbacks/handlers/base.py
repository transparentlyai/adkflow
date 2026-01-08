"""Base handler class for callback handlers.

Provides default no-op implementations for all callback methods.
"""

from __future__ import annotations

from abc import ABC
from typing import Any

from adkflow_runner.runner.callbacks.types import ErrorPolicy, HandlerResult


class BaseHandler(ABC):
    """Abstract base class for callback handlers.

    Provides default no-op implementations for all callback methods.
    Subclasses override only the methods they need.

    Attributes:
        DEFAULT_PRIORITY: Class-level default priority (override in subclasses)
        priority: Instance priority (can override DEFAULT_PRIORITY)
        on_error: Error handling policy ("continue" or "abort")

    Example:
        class MyHandler(BaseHandler):
            DEFAULT_PRIORITY = 150  # Runs between 100 and 200

            def before_tool(self, tool, args, tool_context, agent_name):
                # Custom logic here
                return HandlerResult.continue_()
    """

    DEFAULT_PRIORITY: int | None = None  # Subclasses should set this

    def __init__(
        self,
        priority: int | None = None,
        on_error: str = ErrorPolicy.CONTINUE,
    ):
        """Initialize the handler.

        Args:
            priority: Execution priority. If None, uses DEFAULT_PRIORITY.
                     If both are None, registry will auto-assign.
            on_error: Error handling policy ("continue" or "abort").
        """
        self._priority = priority if priority is not None else self.DEFAULT_PRIORITY
        self.on_error = on_error

    @property
    def priority(self) -> int:
        """Get the handler's priority.

        Raises:
            ValueError: If priority was never set (neither at init nor by registry).
        """
        if self._priority is None:
            raise ValueError(
                f"Priority not set for {self.__class__.__name__}. "
                "Set DEFAULT_PRIORITY, pass priority to __init__, or let registry assign."
            )
        return self._priority

    @priority.setter
    def priority(self, value: int) -> None:
        """Set the handler's priority (typically called by registry)."""
        self._priority = value

    def has_priority(self) -> bool:
        """Check if priority has been set."""
        return self._priority is not None

    # Default no-op implementations for all callback methods

    def before_agent(
        self,
        callback_context: Any,
        agent_name: str,
    ) -> HandlerResult | None:
        """Called before agent execution. Override to customize."""
        return None

    def after_agent(
        self,
        callback_context: Any,
        agent_name: str,
    ) -> HandlerResult | None:
        """Called after agent execution. Override to customize."""
        return None

    def before_model(
        self,
        callback_context: Any,
        llm_request: Any,
        agent_name: str,
    ) -> HandlerResult | None:
        """Called before LLM request. MUST be sync. Override to customize."""
        return None

    def after_model(
        self,
        callback_context: Any,
        llm_response: Any,
        agent_name: str,
    ) -> HandlerResult | None:
        """Called after LLM response. MUST be sync. Override to customize."""
        return None

    async def before_tool(
        self,
        tool: Any,
        args: dict[str, Any],
        tool_context: Any,
        agent_name: str,
    ) -> HandlerResult | None:
        """Called before tool execution. Can be async. Override to customize."""
        return None

    async def after_tool(
        self,
        tool: Any,
        args: dict[str, Any],
        tool_context: Any,
        tool_response: Any,
        agent_name: str,
    ) -> HandlerResult | None:
        """Called after tool execution. Can be async. Override to customize."""
        return None

    def __repr__(self) -> str:
        priority_str = str(self._priority) if self._priority is not None else "unset"
        return f"{self.__class__.__name__}(priority={priority_str}, on_error={self.on_error})"
