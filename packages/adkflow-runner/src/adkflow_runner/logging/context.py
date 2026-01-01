"""Context managers for timing and scoping log operations."""

from __future__ import annotations

import time
from contextlib import contextmanager
from typing import TYPE_CHECKING, Any, Generator

from adkflow_runner.logging.constants import LogLevel

if TYPE_CHECKING:
    from adkflow_runner.logging.logger import Logger


@contextmanager
def log_timing(
    logger: Logger,
    operation: str,
    level: str | LogLevel = LogLevel.DEBUG,
    **extra_context: Any,
) -> Generator[dict[str, Any], None, None]:
    """Context manager for timing operations.

    Logs the operation completion with duration_ms.
    Yields a context dict that can be updated with additional info.

    Usage:
        log = get_logger("compiler.loader")
        with log_timing(log, "loading project", project_path=path) as ctx:
            # do work
            ctx["node_count"] = len(nodes)
        # Logs: "loading project completed" with duration_ms and node_count

    Args:
        logger: Logger instance to use
        operation: Description of the operation (e.g., "compile", "load project")
        level: Log level for the completion message
        **extra_context: Additional context to include in the log

    Yields:
        A dict that can be updated with additional context before logging
    """
    context: dict[str, Any] = dict(extra_context)
    start = time.perf_counter()
    success = True

    try:
        yield context
    except Exception:
        success = False
        raise
    finally:
        elapsed_ms = (time.perf_counter() - start) * 1000

        if isinstance(level, str):
            level = LogLevel[level.upper()]

        if success:
            logger._emit(
                level,
                f"{operation} completed",
                duration_ms=elapsed_ms,
                **context,
            )
        else:
            logger._emit(
                LogLevel.ERROR,
                f"{operation} failed",
                duration_ms=elapsed_ms,
                **context,
            )


@contextmanager
def log_scope(
    logger: Logger,
    scope_name: str,
    level: str | LogLevel = LogLevel.DEBUG,
    **extra_context: Any,
) -> Generator[Logger, None, None]:
    """Context manager for scoped logging.

    Creates a child logger with additional context.
    Logs entry and exit of the scope.

    Usage:
        log = get_logger("runner.agent")
        with log_scope(log, "executing", agent_name="reviewer") as scoped:
            scoped.info("Starting execution")
            # All logs have agent_name="reviewer" in context

    Args:
        logger: Logger instance to use
        scope_name: Name of the scope (e.g., "execute", "transform")
        level: Log level for entry/exit messages
        **extra_context: Additional context for all logs in this scope

    Yields:
        A child logger with the extra context attached
    """
    if isinstance(level, str):
        level = LogLevel[level.upper()]

    logger._emit(level, f"Entering: {scope_name}", **extra_context)

    # Create scoped logger with inherited context
    scoped = logger.with_context(**extra_context)

    try:
        yield scoped
    finally:
        logger._emit(level, f"Exiting: {scope_name}", **extra_context)


class LogContext:
    """A reusable logging context that can be passed around.

    Useful for carrying context through multiple function calls.

    Usage:
        ctx = LogContext(run_id="abc123", project="my-project")
        log.info("Starting", **ctx.data)
        # Later...
        ctx.update(agent_name="reviewer")
        log.info("Agent starting", **ctx.data)
    """

    def __init__(self, **initial_context: Any) -> None:
        self._data: dict[str, Any] = dict(initial_context)

    @property
    def data(self) -> dict[str, Any]:
        """Get the current context data."""
        return self._data.copy()

    def update(self, **context: Any) -> LogContext:
        """Update context and return self for chaining."""
        self._data.update(context)
        return self

    def with_updates(self, **context: Any) -> LogContext:
        """Create a new context with additional data (immutable)."""
        return LogContext(**{**self._data, **context})

    def __repr__(self) -> str:
        return f"LogContext({self._data})"
