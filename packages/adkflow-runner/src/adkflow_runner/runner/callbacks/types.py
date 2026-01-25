"""Core types for the callback registry system.

Defines flow control actions, handler results, and the handler protocol.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import TYPE_CHECKING, Any, Protocol, runtime_checkable

if TYPE_CHECKING:
    from collections.abc import Awaitable


class FlowControl(str, Enum):
    """Flow control actions for handler chain execution.

    Handlers return these to control whether subsequent handlers execute.
    """

    CONTINUE = "continue"  # Proceed to next handler
    SKIP = "skip"  # Stop chain, skip the ADK operation
    ABORT = "abort"  # Stop chain with error
    REPLACE = "replace"  # Use modified data, continue to next handler


@dataclass
class HandlerResult:
    """Result from a callback handler.

    Contains the flow control action and optional data for REPLACE/ABORT actions.
    """

    action: FlowControl = FlowControl.CONTINUE
    modified_data: Any = None  # Used with REPLACE action
    error: str | None = None  # Used with ABORT action
    metadata: dict[str, Any] = field(default_factory=dict)  # Optional metadata

    @classmethod
    def continue_(cls, metadata: dict[str, Any] | None = None) -> HandlerResult:
        """Create a CONTINUE result."""
        return cls(action=FlowControl.CONTINUE, metadata=metadata or {})

    @classmethod
    def skip(cls, reason: str | None = None) -> HandlerResult:
        """Create a SKIP result."""
        return cls(
            action=FlowControl.SKIP,
            metadata={"reason": reason} if reason else {},
        )

    @classmethod
    def abort(cls, error: str) -> HandlerResult:
        """Create an ABORT result with error message."""
        return cls(action=FlowControl.ABORT, error=error)

    @classmethod
    def replace(
        cls, data: Any, metadata: dict[str, Any] | None = None
    ) -> HandlerResult:
        """Create a REPLACE result with modified data."""
        return cls(
            action=FlowControl.REPLACE,
            modified_data=data,
            metadata=metadata or {},
        )


class ErrorPolicy(str, Enum):
    """Error handling policy for handlers."""

    CONTINUE = "continue"  # Log warning, proceed to next handler
    ABORT = "abort"  # Stop chain, propagate error


@runtime_checkable
class CallbackHandler(Protocol):
    """Protocol for callback handlers.

    Handlers implement methods for each callback type they want to handle.
    Methods not implemented are treated as no-ops.

    SYNC/ASYNC CONTRACT:

    STRICTLY SYNCHRONOUS (TypeError raised if awaitable returned):
        - before_model(): ADK constraint - no async support
        - after_model(): ADK constraint - no async support

    STRICTLY SYNCHRONOUS (awaitables ignored with warning):
        - before_agent(): Must be sync for sequential execution
        - after_agent(): Must be sync for sequential execution

    ASYNC ALLOWED (properly awaited):
        - before_tool(): Can be sync or async
        - after_tool(): Can be sync or async

    FLOW CONTROL:
        - Return None or HandlerResult.continue_(): proceed to next handler
        - Return HandlerResult.skip(reason): stop chain, skip ADK operation
        - Return HandlerResult.abort(error): stop chain, raise RuntimeError
        - Return HandlerResult.replace(data): modify data, continue chain

    Attributes:
        priority: Execution order (lower = earlier). Auto-assigned if not set.
        on_error: Error handling policy ("continue" or "abort").
    """

    priority: int
    on_error: str

    def before_agent(
        self,
        callback_context: Any,
        agent_name: str,
    ) -> HandlerResult | None:
        """Called before agent execution starts.

        This is a sync callback but can return an awaitable.

        Args:
            callback_context: ADK CallbackContext
            agent_name: Name of the agent

        Returns:
            HandlerResult or None to continue
        """
        ...

    def after_agent(
        self,
        callback_context: Any,
        agent_name: str,
    ) -> HandlerResult | None:
        """Called after agent execution completes.

        This is a sync callback but can return an awaitable.

        Args:
            callback_context: ADK CallbackContext
            agent_name: Name of the agent

        Returns:
            HandlerResult or None to continue
        """
        ...

    def before_model(
        self,
        callback_context: Any,
        llm_request: Any,
        agent_name: str,
    ) -> HandlerResult | None:
        """Called before sending request to LLM.

        IMPORTANT: This MUST be synchronous. ADK does not support async here.

        Args:
            callback_context: ADK CallbackContext
            llm_request: The LLM request being sent
            agent_name: Name of the agent

        Returns:
            HandlerResult or None to continue
        """
        ...

    def after_model(
        self,
        callback_context: Any,
        llm_response: Any,
        agent_name: str,
    ) -> HandlerResult | None:
        """Called after receiving response from LLM.

        IMPORTANT: This MUST be synchronous. ADK does not support async here.

        Args:
            callback_context: ADK CallbackContext
            llm_response: The LLM response received
            agent_name: Name of the agent

        Returns:
            HandlerResult or None to continue
        """
        ...

    def before_tool(
        self,
        tool: Any,
        args: dict[str, Any],
        tool_context: Any,
        agent_name: str,
    ) -> HandlerResult | Awaitable[HandlerResult | None] | None:
        """Called before tool execution.

        Can be sync or async.

        Args:
            tool: The tool being called
            args: Arguments to the tool
            tool_context: ADK ToolContext
            agent_name: Name of the agent

        Returns:
            HandlerResult or None to continue (or awaitable of same)
        """
        ...

    def after_tool(
        self,
        tool: Any,
        args: dict[str, Any],
        tool_context: Any,
        tool_response: Any,
        agent_name: str,
    ) -> HandlerResult | Awaitable[HandlerResult | None] | None:
        """Called after tool execution.

        Can be sync or async.

        Args:
            tool: The tool that was called
            args: Arguments that were passed
            tool_context: ADK ToolContext
            tool_response: Result from the tool
            agent_name: Name of the agent

        Returns:
            HandlerResult or None to continue (or awaitable of same)
        """
        ...
