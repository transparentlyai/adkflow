"""Callback executor for running handler chains.

Executes handlers in priority order with flow control support.
"""

from __future__ import annotations

import asyncio
import inspect
from typing import TYPE_CHECKING, Any

from adkflow_runner.logging import get_logger
from adkflow_runner.runner.callbacks.types import (
    ErrorPolicy,
    FlowControl,
    HandlerResult,
)

if TYPE_CHECKING:
    from collections.abc import Awaitable

    from adkflow_runner.runner.callbacks.registry import CallbackRegistry

_log = get_logger("runner.callbacks")


def _schedule_fire_and_forget(coro: "Awaitable[Any]", context: str = "") -> bool:
    """Schedule coroutine as fire-and-forget with error handling.

    Used for side-effect operations (emit, hooks) that don't affect flow control.

    Args:
        coro: Awaitable to schedule
        context: Description for error logging

    Returns:
        True if scheduled, False if no running loop
    """
    try:
        loop = asyncio.get_running_loop()

        async def _safe_execute() -> None:
            try:
                await coro
            except Exception as e:
                _log.warning(
                    f"Fire-and-forget task failed: {e}",
                    context=context,
                    exception=e,
                )

        loop.create_task(_safe_execute())
        return True
    except RuntimeError:
        return False


class CallbackExecutor:
    """Executes callback handler chains with flow control.

    Runs handlers in priority order, respecting flow control actions
    (CONTINUE, SKIP, ABORT, REPLACE) and per-handler error policies.

    Flow Control:
        - CONTINUE: Run next handler
        - SKIP: Stop chain, skip the ADK operation
        - ABORT: Stop chain, raise error
        - REPLACE: Use modified data, continue to next handler

    Error Handling:
        - on_error="continue": Log warning, run next handler
        - on_error="abort": Stop chain, propagate error
    """

    def __init__(self, registry: "CallbackRegistry"):
        """Initialize the executor.

        Args:
            registry: The callback registry to execute handlers from
        """
        self.registry = registry
        self.agent_name = registry.agent_name

    def _execute_sync_chain(
        self,
        method_name: str,
        **kwargs: Any,
    ) -> HandlerResult:
        """Execute synchronous handler chain (before_model, after_model).

        Args:
            method_name: Name of the handler method to call
            **kwargs: Arguments to pass to handlers

        Returns:
            Final HandlerResult from chain

        Raises:
            RuntimeError: If a handler returns ABORT
            TypeError: If a handler returns an awaitable in sync context
        """
        handlers = self.registry.get_handlers_for(method_name)

        for handler in handlers:
            method = getattr(handler, method_name, None)
            if method is None:
                continue

            try:
                result = method(agent_name=self.agent_name, **kwargs)

                # CRITICAL: Reject awaitables in sync context
                if inspect.isawaitable(result):
                    _log.error(
                        f"Handler {handler.__class__.__name__}.{method_name}() "
                        f"returned awaitable in sync context",
                        handler=handler.__class__.__name__,
                        method=method_name,
                    )
                    raise TypeError(
                        f"{handler.__class__.__name__}.{method_name}() returned "
                        f"awaitable. Sync callbacks (before_model, after_model) "
                        f"MUST be synchronous."
                    )

                # Handle None as CONTINUE
                if result is None:
                    continue

                if result.action == FlowControl.SKIP:
                    _log.debug(
                        f"Handler {handler.__class__.__name__} returned SKIP",
                        handler=handler.__class__.__name__,
                        method=method_name,
                    )
                    return result

                elif result.action == FlowControl.ABORT:
                    error_msg = (
                        result.error or f"Aborted by {handler.__class__.__name__}"
                    )
                    _log.warning(
                        f"Handler {handler.__class__.__name__} returned ABORT: {error_msg}",
                        handler=handler.__class__.__name__,
                        method=method_name,
                    )
                    raise RuntimeError(error_msg)

                elif result.action == FlowControl.REPLACE:
                    # Update kwargs for next handler
                    if "llm_request" in kwargs and result.modified_data is not None:
                        kwargs["llm_request"] = result.modified_data
                    elif "llm_response" in kwargs and result.modified_data is not None:
                        kwargs["llm_response"] = result.modified_data

                # CONTINUE: proceed to next handler

            except (RuntimeError, TypeError):
                # Re-raise ABORT errors and programming errors (awaitable in sync)
                raise
            except Exception as e:
                if handler.on_error == ErrorPolicy.ABORT:
                    _log.error(
                        f"Handler {handler.__class__.__name__} error (abort policy): {e}",
                        handler=handler.__class__.__name__,
                        method=method_name,
                        exception=e,
                    )
                    raise
                else:
                    _log.warning(
                        f"Handler {handler.__class__.__name__} error (continue policy): {e}",
                        handler=handler.__class__.__name__,
                        method=method_name,
                    )

        return HandlerResult.continue_()

    async def _execute_async_chain(
        self,
        method_name: str,
        **kwargs: Any,
    ) -> tuple[HandlerResult, Any]:
        """Execute async handler chain (before_tool, after_tool).

        Args:
            method_name: Name of the handler method to call
            **kwargs: Arguments to pass to handlers

        Returns:
            Tuple of (final HandlerResult, current data)

        Raises:
            RuntimeError: If a handler returns ABORT
        """
        handlers = self.registry.get_handlers_for(method_name)
        current_data = kwargs.get("args") or kwargs.get("tool_response")

        for handler in handlers:
            method = getattr(handler, method_name, None)
            if method is None:
                continue

            try:
                # Handle both sync and async methods
                result = method(agent_name=self.agent_name, **kwargs)
                if inspect.isawaitable(result):
                    result = await result

                # Handle None as CONTINUE
                if result is None:
                    continue

                if result.action == FlowControl.SKIP:
                    _log.debug(
                        f"Handler {handler.__class__.__name__} returned SKIP",
                        handler=handler.__class__.__name__,
                        method=method_name,
                    )
                    return result, current_data

                elif result.action == FlowControl.ABORT:
                    error_msg = (
                        result.error or f"Aborted by {handler.__class__.__name__}"
                    )
                    _log.warning(
                        f"Handler {handler.__class__.__name__} returned ABORT: {error_msg}",
                        handler=handler.__class__.__name__,
                        method=method_name,
                    )
                    raise RuntimeError(error_msg)

                elif result.action == FlowControl.REPLACE:
                    current_data = result.modified_data
                    # Update kwargs for next handler
                    if "args" in kwargs:
                        kwargs["args"] = current_data
                    elif "tool_response" in kwargs:
                        kwargs["tool_response"] = current_data

                # CONTINUE: proceed to next handler

            except RuntimeError:
                # Re-raise ABORT errors
                raise
            except Exception as e:
                if handler.on_error == ErrorPolicy.ABORT:
                    _log.error(
                        f"Handler {handler.__class__.__name__} error (abort policy): {e}",
                        handler=handler.__class__.__name__,
                        method=method_name,
                        exception=e,
                    )
                    raise
                else:
                    _log.warning(
                        f"Handler {handler.__class__.__name__} error (continue policy): {e}",
                        handler=handler.__class__.__name__,
                        method=method_name,
                    )

        return HandlerResult.continue_(), current_data

    def _execute_agent_callback(
        self,
        method_name: str,
        callback_context: Any,
    ) -> None:
        """Execute agent callback chain (before_agent, after_agent).

        Agent callbacks MUST be synchronous to preserve sequential execution.
        Awaitables are warned and ignored.

        Args:
            method_name: "before_agent" or "after_agent"
            callback_context: ADK CallbackContext
        """
        handlers = self.registry.get_handlers_for(method_name)

        for handler in handlers:
            method = getattr(handler, method_name, None)
            if method is None:
                continue

            try:
                result = method(
                    callback_context=callback_context,
                    agent_name=self.agent_name,
                )

                # Reject awaitables - they break sequential execution
                if inspect.isawaitable(result):
                    _log.warning(
                        f"Handler {handler.__class__.__name__}.{method_name}() "
                        f"returned awaitable. Agent callbacks must be sync to "
                        f"preserve sequential execution. Awaitable ignored.",
                        handler=handler.__class__.__name__,
                        method=method_name,
                    )
                    continue  # Skip, don't schedule

                # Handle None as CONTINUE
                if result is None:
                    continue

                if result.action == FlowControl.SKIP:
                    return
                elif result.action == FlowControl.ABORT:
                    error_msg = (
                        result.error or f"Aborted by {handler.__class__.__name__}"
                    )
                    raise RuntimeError(error_msg)

            except RuntimeError:
                raise
            except Exception as e:
                if handler.on_error == ErrorPolicy.ABORT:
                    raise
                else:
                    _log.warning(
                        f"Handler {handler.__class__.__name__} error: {e}",
                        handler=handler.__class__.__name__,
                        method=method_name,
                    )

    def create_adk_callbacks(self) -> dict[str, Any]:
        """Create ADK-compatible callback functions.

        Returns:
            Dict of callback functions to pass to ADK Agent constructor
        """
        # Freeze registry during execution
        self.registry.freeze()

        def before_agent_callback(callback_context: Any) -> None:
            """ADK before_agent_callback wrapper."""
            self._execute_agent_callback("before_agent", callback_context)
            return None

        def after_agent_callback(callback_context: Any) -> None:
            """ADK after_agent_callback wrapper."""
            self._execute_agent_callback("after_agent", callback_context)
            return None

        def before_model_callback(callback_context: Any, llm_request: Any) -> None:
            """ADK before_model_callback wrapper (SYNC ONLY)."""
            self._execute_sync_chain(
                "before_model",
                callback_context=callback_context,
                llm_request=llm_request,
            )
            return None

        def after_model_callback(callback_context: Any, llm_response: Any) -> None:
            """ADK after_model_callback wrapper (SYNC ONLY)."""
            self._execute_sync_chain(
                "after_model",
                callback_context=callback_context,
                llm_response=llm_response,
            )
            return None

        async def before_tool_callback(
            *, tool: Any, args: dict[str, Any], tool_context: Any
        ) -> dict[str, Any] | None:
            """ADK before_tool_callback wrapper (async)."""
            result, modified_args = await self._execute_async_chain(
                "before_tool",
                tool=tool,
                args=args,
                tool_context=tool_context,
            )

            if result.action == FlowControl.SKIP:
                return {
                    "skipped": True,
                    "reason": result.metadata.get("reason", "Skipped by handler"),
                }
            if result.action == FlowControl.REPLACE:
                return modified_args

            return None

        async def after_tool_callback(
            *, tool: Any, args: dict[str, Any], tool_context: Any, tool_response: Any
        ) -> dict[str, Any] | None:
            """ADK after_tool_callback wrapper (async)."""
            result, modified_response = await self._execute_async_chain(
                "after_tool",
                tool=tool,
                args=args,
                tool_context=tool_context,
                tool_response=tool_response,
            )

            if result.action == FlowControl.REPLACE:
                return modified_response

            return None

        return {
            "before_agent_callback": before_agent_callback,
            "after_agent_callback": after_agent_callback,
            "before_model_callback": before_model_callback,
            "after_model_callback": after_model_callback,
            "before_tool_callback": before_tool_callback,
            "after_tool_callback": after_tool_callback,
        }
