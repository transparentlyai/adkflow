"""Callback protocol and base implementations."""

from typing import Protocol

from adkflow_runner.runner.workflow_runner import RunEvent


class RunnerCallbacks(Protocol):
    """Protocol for execution callbacks.

    Implement this protocol to receive events during workflow execution.
    """

    async def on_event(self, event: RunEvent) -> None:
        """Called when an event occurs during execution.

        Args:
            event: The execution event
        """
        ...


class CompositeCallbacks:
    """Combines multiple callback handlers.

    Events are dispatched to all handlers in order.
    """

    def __init__(self, *handlers: RunnerCallbacks):
        self.handlers: list[RunnerCallbacks] = list(handlers)

    def add(self, handler: RunnerCallbacks) -> None:
        """Add a callback handler."""
        self.handlers.append(handler)

    def remove(self, handler: RunnerCallbacks) -> None:
        """Remove a callback handler."""
        if handler in self.handlers:
            self.handlers.remove(handler)

    async def on_event(self, event: RunEvent) -> None:
        """Dispatch event to all handlers."""
        for handler in self.handlers:
            try:
                await handler.on_event(event)
            except Exception as e:
                # Log but don't stop other handlers
                print(f"Callback error: {e}")


class NoOpCallbacks:
    """No-op callbacks that do nothing."""

    async def on_event(self, event: RunEvent) -> None:
        pass
