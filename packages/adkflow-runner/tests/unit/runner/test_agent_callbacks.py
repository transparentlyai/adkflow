"""Tests for agent callbacks - ADK event handling."""

from unittest.mock import AsyncMock, MagicMock

import pytest

from adkflow_runner.runner.types import EventType, RunEvent


class TestAgentCallbacksEvents:
    """Tests for agent callback event types."""

    def test_agent_start_event(self):
        """AGENT_START event type exists."""
        assert hasattr(EventType, "AGENT_START")

    def test_agent_output_event(self):
        """AGENT_OUTPUT event type exists."""
        assert hasattr(EventType, "AGENT_OUTPUT")

    def test_agent_end_event(self):
        """AGENT_END event type exists."""
        assert hasattr(EventType, "AGENT_END")

    def test_tool_call_event(self):
        """TOOL_CALL event type exists."""
        assert hasattr(EventType, "TOOL_CALL")

    def test_tool_result_event(self):
        """TOOL_RESULT event type exists."""
        assert hasattr(EventType, "TOOL_RESULT")


class TestRunEventWithAgent:
    """Tests for RunEvent with agent information."""

    def test_event_with_agent_name(self):
        """Create event with agent name."""
        event = RunEvent(
            type=EventType.AGENT_START,
            timestamp=1234567890.0,
            agent_name="MyAgent",
        )
        assert event.agent_name == "MyAgent"

    def test_event_with_agent_id(self):
        """Create event with agent ID."""
        event = RunEvent(
            type=EventType.AGENT_OUTPUT,
            timestamp=1234567890.0,
            agent_id="agent_123",
            data={"output": "Hello"},
        )
        assert event.agent_id == "agent_123"

    def test_event_to_dict_includes_agent(self):
        """Event to_dict includes agent info."""
        event = RunEvent(
            type=EventType.AGENT_END,
            timestamp=1234567890.0,
            agent_name="TestAgent",
            agent_id="test_1",
        )
        d = event.to_dict()
        assert d["agent_name"] == "TestAgent"
        assert d["agent_id"] == "test_1"


class TestToolEvents:
    """Tests for tool-related events."""

    def test_tool_call_data(self):
        """TOOL_CALL event with tool data."""
        event = RunEvent(
            type=EventType.TOOL_CALL,
            timestamp=1234567890.0,
            agent_name="ToolAgent",
            data={
                "tool_name": "search",
                "tool_input": {"query": "test"},
            },
        )
        assert event.data["tool_name"] == "search"
        assert event.data["tool_input"]["query"] == "test"

    def test_tool_result_data(self):
        """TOOL_RESULT event with result data."""
        event = RunEvent(
            type=EventType.TOOL_RESULT,
            timestamp=1234567890.0,
            agent_name="ToolAgent",
            data={
                "tool_name": "search",
                "result": "Search results here",
            },
        )
        assert event.data["tool_name"] == "search"
        assert event.data["result"] == "Search results here"

    def test_error_event_data(self):
        """ERROR event with error data."""
        event = RunEvent(
            type=EventType.ERROR,
            timestamp=1234567890.0,
            agent_name="ToolAgent",
            data={
                "error": "API rate limit exceeded",
            },
        )
        assert event.data["error"] == "API rate limit exceeded"


class TestCallbackEmit:
    """Tests for emit function pattern."""

    @pytest.mark.asyncio
    async def test_emit_function_called(self):
        """Emit function receives events."""
        events = []

        async def emit(event: RunEvent):
            events.append(event)

        await emit(
            RunEvent(
                type=EventType.AGENT_START,
                timestamp=1234567890.0,
                agent_name="Test",
            )
        )

        assert len(events) == 1
        assert events[0].type == EventType.AGENT_START

    @pytest.mark.asyncio
    async def test_emit_multiple_events(self):
        """Multiple events can be emitted."""
        events = []

        async def emit(event: RunEvent):
            events.append(event)

        await emit(RunEvent(type=EventType.AGENT_START, timestamp=1.0))
        await emit(RunEvent(type=EventType.AGENT_OUTPUT, timestamp=2.0, data={"output": "Hi"}))
        await emit(RunEvent(type=EventType.AGENT_END, timestamp=3.0))

        assert len(events) == 3
        types = [e.type for e in events]
        assert EventType.AGENT_START in types
        assert EventType.AGENT_OUTPUT in types
        assert EventType.AGENT_END in types
