"""Tests for callback protocol and implementations."""

import pytest
from unittest.mock import AsyncMock, MagicMock

from adkflow_runner.callbacks.protocol import (
    CompositeCallbacks,
    NoOpCallbacks,
)
from adkflow_runner.runner.types import RunEvent, EventType


class TestNoOpCallbacks:
    """Tests for NoOpCallbacks class."""

    def test_creation(self):
        """NoOpCallbacks can be created."""
        callbacks = NoOpCallbacks()
        assert callbacks is not None

    @pytest.mark.asyncio
    async def test_on_event_does_nothing(self):
        """on_event does nothing and returns None."""
        callbacks = NoOpCallbacks()
        event = RunEvent(type=EventType.RUN_START, timestamp=1.0)
        result = await callbacks.on_event(event)
        assert result is None

    @pytest.mark.asyncio
    async def test_on_event_accepts_any_event(self):
        """on_event accepts any event type."""
        callbacks = NoOpCallbacks()
        events = [
            RunEvent(type=EventType.RUN_START, timestamp=1.0),
            RunEvent(type=EventType.AGENT_START, timestamp=2.0),
            RunEvent(type=EventType.ERROR, timestamp=3.0, data={"error": "test"}),
        ]
        for event in events:
            result = await callbacks.on_event(event)
            assert result is None


class TestCompositeCallbacks:
    """Tests for CompositeCallbacks class."""

    def test_creation_empty(self):
        """CompositeCallbacks can be created with no handlers."""
        callbacks = CompositeCallbacks()
        assert callbacks.handlers == []

    def test_creation_with_handlers(self):
        """CompositeCallbacks can be created with handlers."""
        handler1 = AsyncMock()
        handler2 = AsyncMock()
        callbacks = CompositeCallbacks(handler1, handler2)
        assert len(callbacks.handlers) == 2
        assert handler1 in callbacks.handlers
        assert handler2 in callbacks.handlers

    def test_add_handler(self):
        """add() adds a handler to the list."""
        callbacks = CompositeCallbacks()
        handler = AsyncMock()
        callbacks.add(handler)
        assert handler in callbacks.handlers
        assert len(callbacks.handlers) == 1

    def test_add_multiple_handlers(self):
        """add() can add multiple handlers."""
        callbacks = CompositeCallbacks()
        handler1 = AsyncMock()
        handler2 = AsyncMock()
        callbacks.add(handler1)
        callbacks.add(handler2)
        assert len(callbacks.handlers) == 2

    def test_remove_handler(self):
        """remove() removes a handler from the list."""
        handler = AsyncMock()
        callbacks = CompositeCallbacks(handler)
        callbacks.remove(handler)
        assert handler not in callbacks.handlers
        assert len(callbacks.handlers) == 0

    def test_remove_nonexistent_handler(self):
        """remove() does nothing if handler not in list."""
        handler1 = AsyncMock()
        handler2 = AsyncMock()
        callbacks = CompositeCallbacks(handler1)
        callbacks.remove(handler2)  # Should not raise
        assert len(callbacks.handlers) == 1
        assert handler1 in callbacks.handlers

    @pytest.mark.asyncio
    async def test_on_event_dispatches_to_all_handlers(self):
        """on_event dispatches to all handlers."""
        handler1 = AsyncMock()
        handler2 = AsyncMock()
        callbacks = CompositeCallbacks(handler1, handler2)

        event = RunEvent(type=EventType.RUN_START, timestamp=1.0)
        await callbacks.on_event(event)

        handler1.on_event.assert_called_once_with(event)
        handler2.on_event.assert_called_once_with(event)

    @pytest.mark.asyncio
    async def test_on_event_empty_handlers(self):
        """on_event works with no handlers."""
        callbacks = CompositeCallbacks()
        event = RunEvent(type=EventType.RUN_START, timestamp=1.0)
        # Should not raise
        await callbacks.on_event(event)

    @pytest.mark.asyncio
    async def test_on_event_continues_after_handler_error(self, capsys):
        """on_event continues to other handlers if one raises."""
        handler1 = AsyncMock()
        handler1.on_event = AsyncMock(side_effect=ValueError("Test error"))
        handler2 = AsyncMock()
        callbacks = CompositeCallbacks(handler1, handler2)

        event = RunEvent(type=EventType.RUN_START, timestamp=1.0)
        await callbacks.on_event(event)

        # First handler was called and raised
        handler1.on_event.assert_called_once()
        # Second handler was still called
        handler2.on_event.assert_called_once()

        # Error was printed
        captured = capsys.readouterr()
        assert "Callback error" in captured.out

    @pytest.mark.asyncio
    async def test_on_event_preserves_order(self):
        """on_event calls handlers in order added."""
        call_order = []

        async def handler1_fn(event):
            call_order.append(1)

        async def handler2_fn(event):
            call_order.append(2)

        handler1 = MagicMock()
        handler1.on_event = handler1_fn
        handler2 = MagicMock()
        handler2.on_event = handler2_fn

        callbacks = CompositeCallbacks(handler1, handler2)
        event = RunEvent(type=EventType.RUN_START, timestamp=1.0)
        await callbacks.on_event(event)

        assert call_order == [1, 2]
