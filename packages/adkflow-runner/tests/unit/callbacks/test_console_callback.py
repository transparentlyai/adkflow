"""Tests for console callbacks."""

from unittest.mock import MagicMock, patch

import pytest

from adkflow_runner.runner.types import EventType, RunEvent


class TestConsoleCallbacksImport:
    """Tests for ConsoleCallbacks import."""

    def test_import_console_callbacks(self):
        """Import ConsoleCallbacks."""
        from adkflow_runner.callbacks.console import ConsoleCallbacks
        assert ConsoleCallbacks is not None

    def test_has_rich_flag(self):
        """HAS_RICH flag exists."""
        from adkflow_runner.callbacks.console import HAS_RICH
        assert isinstance(HAS_RICH, bool)


class TestConsoleCallbacksCreation:
    """Tests for ConsoleCallbacks initialization."""

    def test_default_creation(self):
        """Create with defaults."""
        from adkflow_runner.callbacks.console import ConsoleCallbacks
        cb = ConsoleCallbacks()
        assert cb.verbose is False
        assert cb.quiet is False

    def test_verbose_mode(self):
        """Create in verbose mode."""
        from adkflow_runner.callbacks.console import ConsoleCallbacks
        cb = ConsoleCallbacks(verbose=True)
        assert cb.verbose is True

    def test_quiet_mode(self):
        """Create in quiet mode."""
        from adkflow_runner.callbacks.console import ConsoleCallbacks
        cb = ConsoleCallbacks(quiet=True)
        assert cb.quiet is True

    def test_creates_console_with_rich(self):
        """Creates Rich console when available."""
        from adkflow_runner.callbacks.console import ConsoleCallbacks, HAS_RICH
        cb = ConsoleCallbacks()
        if HAS_RICH:
            assert cb.console is not None
        else:
            assert cb.console is None


class TestConsoleCallbacksEvents:
    """Tests for event handling."""

    @pytest.mark.asyncio
    async def test_on_event_quiet_mode(self):
        """Quiet mode ignores events."""
        from adkflow_runner.callbacks.console import ConsoleCallbacks
        cb = ConsoleCallbacks(quiet=True)

        event = RunEvent(
            type=EventType.AGENT_START,
            timestamp=1234567890.0,
            agent_name="TestAgent",
        )

        # Should not raise
        await cb.on_event(event)

    @pytest.mark.asyncio
    async def test_on_event_run_start(self):
        """Handle RUN_START event."""
        from adkflow_runner.callbacks.console import ConsoleCallbacks
        cb = ConsoleCallbacks()

        event = RunEvent(
            type=EventType.RUN_START,
            timestamp=1234567890.0,
            data={"project_path": "/test", "run_id": "run_123"},
        )

        # Should not raise
        await cb.on_event(event)

    @pytest.mark.asyncio
    async def test_on_event_agent_start(self):
        """Handle AGENT_START event."""
        from adkflow_runner.callbacks.console import ConsoleCallbacks
        cb = ConsoleCallbacks()

        event = RunEvent(
            type=EventType.AGENT_START,
            timestamp=1234567890.0,
            agent_name="MyAgent",
        )

        await cb.on_event(event)
        assert cb._current_agent == "MyAgent"

    @pytest.mark.asyncio
    async def test_on_event_agent_output(self):
        """Handle AGENT_OUTPUT event."""
        from adkflow_runner.callbacks.console import ConsoleCallbacks
        cb = ConsoleCallbacks()

        event = RunEvent(
            type=EventType.AGENT_OUTPUT,
            timestamp=1234567890.0,
            data={"output": "Hello, world!"},
        )

        # Should not raise
        await cb.on_event(event)


class TestConsoleCallbacksPlainMode:
    """Tests for plain text output (no Rich)."""

    @pytest.mark.asyncio
    async def test_plain_output_without_rich(self):
        """Plain output when Rich not available."""
        from adkflow_runner.callbacks.console import ConsoleCallbacks

        with patch(
            "adkflow_runner.callbacks.console.HAS_RICH",
            False,
        ):
            cb = ConsoleCallbacks()
            cb.console = None

            event = RunEvent(
                type=EventType.RUN_START,
                timestamp=1234567890.0,
                data={"run_id": "test"},
            )

            # Should fall back to plain output
            await cb.on_event(event)


class TestConsoleCallbacksEventTypes:
    """Tests for various event type handling."""

    @pytest.fixture
    def callbacks(self):
        """Create ConsoleCallbacks."""
        from adkflow_runner.callbacks.console import ConsoleCallbacks
        return ConsoleCallbacks()

    @pytest.mark.asyncio
    async def test_run_complete_event(self, callbacks):
        """Handle RUN_COMPLETE event."""
        event = RunEvent(
            type=EventType.RUN_COMPLETE,
            timestamp=1234567890.0,
            data={"output": "Done"},
        )
        await callbacks.on_event(event)

    @pytest.mark.asyncio
    async def test_error_event(self, callbacks):
        """Handle ERROR event."""
        event = RunEvent(
            type=EventType.ERROR,
            timestamp=1234567890.0,
            data={"error": "Something failed"},
        )
        await callbacks.on_event(event)

    @pytest.mark.asyncio
    async def test_tool_call_event(self, callbacks):
        """Handle TOOL_CALL event."""
        event = RunEvent(
            type=EventType.TOOL_CALL,
            timestamp=1234567890.0,
            data={"tool_name": "search", "tool_input": {}},
        )
        await callbacks.on_event(event)

    @pytest.mark.asyncio
    async def test_tool_result_event(self, callbacks):
        """Handle TOOL_RESULT event."""
        event = RunEvent(
            type=EventType.TOOL_RESULT,
            timestamp=1234567890.0,
            data={"tool_name": "search", "result": "Found it"},
        )
        await callbacks.on_event(event)
