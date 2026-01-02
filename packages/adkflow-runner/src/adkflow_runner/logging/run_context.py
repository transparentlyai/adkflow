"""Run context for propagating run_id through async code.

This module uses Python's contextvars to automatically propagate run_id
through async execution without requiring changes to function signatures.

Usage:
    from adkflow_runner.logging.run_context import run_context, get_run_id

    # Set run_id for an execution scope
    with run_context("abc123"):
        # All logs emitted here will automatically include run_id
        await run_workflow()

    # Get current run_id (returns None if not in a run context)
    current_run_id = get_run_id()
"""

from __future__ import annotations

from contextlib import contextmanager
from contextvars import ContextVar
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from collections.abc import Generator

# ContextVar for run_id - automatically propagates through async/await
_run_id_var: ContextVar[str | None] = ContextVar("run_id", default=None)


def get_run_id() -> str | None:
    """Get the current run_id from context.

    Returns:
        The current run_id, or None if not in a run context.
    """
    return _run_id_var.get()


def set_run_id(run_id: str | None) -> None:
    """Set the run_id in the current context.

    Args:
        run_id: The run_id to set, or None to clear.
    """
    _run_id_var.set(run_id)


@contextmanager
def run_context(run_id: str) -> Generator[None, None, None]:
    """Context manager to set run_id for a scope.

    The run_id is automatically available in all async code within this context,
    including callbacks and nested function calls.

    Args:
        run_id: The run identifier to propagate.

    Yields:
        None

    Example:
        with run_context("abc123"):
            # All logs emitted here will have run_id="abc123"
            await execute_workflow()
    """
    token = _run_id_var.set(run_id)
    try:
        yield
    finally:
        _run_id_var.reset(token)
