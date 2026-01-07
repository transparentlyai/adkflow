"""Hook chain executor with sync/async support."""

import asyncio
import inspect
from typing import Any

from adkflow_runner.hooks.types import (
    HookAction,
    HookContext,
    HookResult,
    HookSpec,
)
from adkflow_runner.hooks.registry import HooksRegistry, get_hooks_registry


class HookAbortError(Exception):
    """Raised when a hook returns ABORT action."""

    def __init__(self, message: str, hook_name: str, extension_id: str | None = None):
        super().__init__(message)
        self.hook_name = hook_name
        self.extension_id = extension_id


class HookTimeoutError(Exception):
    """Raised when a hook exceeds its timeout."""

    def __init__(self, hook_name: str, extension_id: str | None, timeout: float):
        super().__init__(
            f"Hook '{hook_name}' from '{extension_id}' timed out after {timeout}s"
        )
        self.hook_name = hook_name
        self.extension_id = extension_id
        self.timeout = timeout


class HookExecutor:
    """Executes hook chains with priority ordering and flow control.

    Handles both sync and async hooks, timeouts, and error handling.

    Example:
        executor = HookExecutor()

        # Execute hooks and get final result
        result, final_data = await executor.execute(
            hook_name="before_tool_call",
            context=ctx,
            initial_data={"tool_name": "search", "args": {...}}
        )

        if result.action == HookAction.ABORT:
            raise HookAbortError(result.error)
        elif result.action == HookAction.SKIP:
            return None  # Skip the tool call
        elif result.action == HookAction.REPLACE:
            data = result.modified_data
    """

    def __init__(self, registry: HooksRegistry | None = None):
        """Initialize the executor.

        Args:
            registry: HooksRegistry to use. If None, uses global registry.
        """
        self.registry = registry or get_hooks_registry()

    async def execute(
        self,
        hook_name: str,
        context: HookContext,
        initial_data: Any = None,
    ) -> tuple[HookResult, Any]:
        """Execute all hooks for a hook point in priority order.

        Hooks are executed sequentially. If a hook returns an action other
        than CONTINUE, the chain stops and that result is returned.

        Args:
            hook_name: The hook point to execute
            context: HookContext with run state and services
            initial_data: Initial data that hooks can modify

        Returns:
            Tuple of (final HookResult, final data after modifications)

        Raises:
            HookAbortError: If a hook returns ABORT (optional, see raise_on_abort)
            HookTimeoutError: If a hook exceeds its timeout
        """
        hooks = self.registry.get_hooks(hook_name)

        if not hooks:
            return HookResult.continue_(), initial_data

        current_data = initial_data
        accumulated_metadata: dict[str, Any] = {}

        # Update context with hook name
        ctx = HookContext(
            hook_name=hook_name,
            run_id=context.run_id,
            session_id=context.session_id,
            project_path=context.project_path,
            phase=context.phase,
            node_id=context.node_id,
            node_name=context.node_name,
            agent_name=context.agent_name,
            data=context.data,
            metadata=accumulated_metadata,
            _state=context._state,
            _emit=context._emit,
        )

        for spec in hooks:
            try:
                result = await self._execute_single(spec, ctx)
            except asyncio.TimeoutError:
                raise HookTimeoutError(
                    hook_name=hook_name,
                    extension_id=spec.extension_id,
                    timeout=spec.timeout_seconds,
                )
            except Exception as e:
                # Try to invoke on_hook_error if available
                error_result = await self._handle_hook_error(spec, ctx, e)
                if error_result is not None:
                    result = error_result
                else:
                    raise

            # Accumulate metadata from all hooks
            accumulated_metadata.update(result.metadata)

            # Handle non-CONTINUE actions
            if result.action == HookAction.SKIP:
                return result, current_data

            elif result.action == HookAction.ABORT:
                return result, current_data

            elif result.action == HookAction.REPLACE:
                current_data = result.modified_data
                # Update context data for next hook
                ctx = ctx.with_data(**{"_replaced_data": current_data})

            elif result.action == HookAction.RETRY:
                # Return retry result - caller handles retry logic
                return result, current_data

            # CONTINUE: proceed to next hook
            ctx = ctx.with_metadata(**result.metadata)

        # All hooks returned CONTINUE
        return HookResult.continue_(metadata=accumulated_metadata), current_data

    async def execute_with_retry(
        self,
        hook_name: str,
        context: HookContext,
        initial_data: Any,
        operation: Any,  # Callable to execute if hooks allow
        max_retries: int = 3,
    ) -> tuple[HookResult, Any]:
        """Execute hooks with automatic retry handling.

        If a hook returns RETRY, the operation is retried according to
        the retry configuration.

        Args:
            hook_name: The hook point to execute
            context: HookContext with run state
            initial_data: Initial data for hooks
            operation: Async callable to execute after before_* hooks
            max_retries: Maximum retry attempts

        Returns:
            Tuple of (final HookResult, operation result or modified data)
        """
        attempt = 0
        current_data = initial_data

        while attempt <= max_retries:
            result, current_data = await self.execute(hook_name, context, current_data)

            if result.action == HookAction.RETRY:
                attempt += 1
                if attempt > max_retries:
                    return HookResult.abort(
                        f"Max retries ({max_retries}) exceeded"
                    ), current_data

                # Apply retry config modifications
                if (
                    result.retry_config
                    and result.retry_config.modified_data is not None
                ):
                    current_data = result.retry_config.modified_data

                # Wait before retry
                if result.retry_config:
                    delay = result.retry_config.delay_seconds * (
                        result.retry_config.backoff_multiplier ** (attempt - 1)
                    )
                    await asyncio.sleep(delay)

                continue

            # Not a retry, return the result
            return result, current_data

        return HookResult.continue_(), current_data

    async def _execute_single(self, spec: HookSpec, context: HookContext) -> HookResult:
        """Execute a single hook with timeout support.

        Handles both sync and async hooks automatically.
        """
        handler = spec.handler

        # Wrap sync handlers to run in thread pool
        if not inspect.iscoroutinefunction(handler):
            coro = asyncio.get_event_loop().run_in_executor(
                None, lambda: handler(context)
            )
        else:
            coro = handler(context)

        # Apply timeout
        result = await asyncio.wait_for(coro, timeout=spec.timeout_seconds)

        # Ensure result is HookResult
        if result is None:
            return HookResult.continue_()
        if not isinstance(result, HookResult):
            # If handler returns something else, treat as modified data
            return HookResult.replace(result)

        return result

    async def _handle_hook_error(
        self, spec: HookSpec, context: HookContext, error: Exception
    ) -> HookResult | None:
        """Handle an error from a hook by invoking on_hook_error hooks.

        Returns:
            HookResult if error was handled, None to re-raise
        """
        error_hooks = self.registry.get_hooks("on_hook_error")
        if not error_hooks:
            return None

        error_context = HookContext(
            hook_name="on_hook_error",
            run_id=context.run_id,
            session_id=context.session_id,
            project_path=context.project_path,
            phase=context.phase,
            node_id=context.node_id,
            node_name=context.node_name,
            agent_name=context.agent_name,
            data={
                "failed_hook": spec.hook_name,
                "failed_extension": spec.extension_id,
                "error": str(error),
                "error_type": type(error).__name__,
            },
            metadata=context.metadata,
            _state=context._state,
            _emit=context._emit,
        )

        for error_spec in error_hooks:
            try:
                result = await self._execute_single(error_spec, error_context)
                if result.action != HookAction.CONTINUE:
                    return result
            except Exception:
                # Error in error handler - give up
                pass

        return None

    def has_hooks(self, hook_name: str) -> bool:
        """Check if any hooks are registered for a hook point.

        Useful for skipping hook execution overhead when no hooks exist.
        """
        return self.registry.has_hooks(hook_name)


# Convenience functions for common patterns


async def invoke_hooks(
    hook_name: str,
    context: HookContext,
    data: Any = None,
    registry: HooksRegistry | None = None,
) -> tuple[HookResult, Any]:
    """Convenience function to invoke hooks.

    Args:
        hook_name: Hook point to invoke
        context: Hook context
        data: Initial data for hooks
        registry: Optional registry (uses global if not provided)

    Returns:
        Tuple of (HookResult, final data)
    """
    executor = HookExecutor(registry)
    return await executor.execute(hook_name, context, data)


def create_hook_context(
    hook_name: str,
    run_id: str,
    session_id: str,
    project_path: Any,
    phase: str,
    data: dict[str, Any] | None = None,
    node_id: str | None = None,
    node_name: str | None = None,
    agent_name: str | None = None,
    state: Any = None,
    emit: Any = None,
) -> HookContext:
    """Create a HookContext with the given parameters.

    Convenience function for creating contexts in integration code.
    """
    from pathlib import Path

    return HookContext(
        hook_name=hook_name,
        run_id=run_id,
        session_id=session_id,
        project_path=Path(project_path)
        if not isinstance(project_path, Path)
        else project_path,
        phase=phase,
        node_id=node_id,
        node_name=node_name,
        agent_name=agent_name,
        data=data or {},
        metadata={},
        _state=state,
        _emit=emit,
    )
