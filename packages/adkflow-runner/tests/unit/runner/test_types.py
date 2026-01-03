"""Tests for runner type definitions.

Tests RunStatus, EventType, RunEvent, RunResult, and RunConfig.
"""

from __future__ import annotations

import time
from pathlib import Path

import pytest

from adkflow_runner.runner.types import (
    EventType,
    NoOpCallbacks,
    RunConfig,
    RunEvent,
    RunResult,
    RunStatus,
    UserInputRequest,
)


class TestRunStatus:
    """Tests for RunStatus enum."""

    def test_all_statuses(self):
        """All expected statuses exist."""
        assert RunStatus.PENDING.value == "pending"
        assert RunStatus.RUNNING.value == "running"
        assert RunStatus.COMPLETED.value == "completed"
        assert RunStatus.FAILED.value == "failed"
        assert RunStatus.CANCELLED.value == "cancelled"

    def test_status_count(self):
        """Correct number of statuses."""
        assert len(RunStatus) == 5


class TestEventType:
    """Tests for EventType enum."""

    def test_core_events(self):
        """Core execution events exist."""
        assert EventType.RUN_START.value == "run_start"
        assert EventType.AGENT_START.value == "agent_start"
        assert EventType.AGENT_OUTPUT.value == "agent_output"
        assert EventType.AGENT_END.value == "agent_end"
        assert EventType.RUN_COMPLETE.value == "run_complete"

    def test_tool_events(self):
        """Tool-related events exist."""
        assert EventType.TOOL_CALL.value == "tool_call"
        assert EventType.TOOL_RESULT.value == "tool_result"

    def test_user_input_events(self):
        """User input events exist."""
        assert EventType.USER_INPUT_REQUIRED.value == "user_input_required"
        assert EventType.USER_INPUT_RECEIVED.value == "user_input_received"
        assert EventType.USER_INPUT_TIMEOUT.value == "user_input_timeout"

    def test_custom_node_events(self):
        """Custom node events exist."""
        assert EventType.CUSTOM_NODE_START.value == "custom_node_start"
        assert EventType.CUSTOM_NODE_END.value == "custom_node_end"
        assert EventType.CUSTOM_NODE_ERROR.value == "custom_node_error"

    def test_error_event(self):
        """Error event exists."""
        assert EventType.ERROR.value == "run_error"

    def test_thinking_event(self):
        """Thinking event exists."""
        assert EventType.THINKING.value == "thinking"


class TestRunEvent:
    """Tests for RunEvent dataclass."""

    def test_event_creation(self):
        """Create a basic event."""
        event = RunEvent(
            type=EventType.RUN_START,
            timestamp=1234567890.123,
        )
        assert event.type == EventType.RUN_START
        assert event.timestamp == 1234567890.123
        assert event.agent_id is None
        assert event.agent_name is None
        assert event.data == {}

    def test_event_with_agent(self):
        """Create event with agent info."""
        event = RunEvent(
            type=EventType.AGENT_START,
            timestamp=time.time(),
            agent_id="agent-123",
            agent_name="MyAgent",
        )
        assert event.agent_id == "agent-123"
        assert event.agent_name == "MyAgent"

    def test_event_with_data(self):
        """Create event with custom data."""
        event = RunEvent(
            type=EventType.TOOL_CALL,
            timestamp=time.time(),
            data={"tool_name": "search", "args": {"query": "test"}},
        )
        assert event.data["tool_name"] == "search"
        assert event.data["args"]["query"] == "test"

    def test_event_to_dict(self):
        """Serialize event to dictionary."""
        event = RunEvent(
            type=EventType.AGENT_OUTPUT,
            timestamp=1234567890.0,
            agent_id="a1",
            agent_name="Agent1",
            data={"output": "Hello"},
        )
        d = event.to_dict()

        assert d["type"] == "agent_output"
        assert d["timestamp"] == 1234567890.0
        assert d["agent_id"] == "a1"
        assert d["agent_name"] == "Agent1"
        assert d["data"]["output"] == "Hello"


class TestRunResult:
    """Tests for RunResult dataclass."""

    def test_result_creation(self):
        """Create a basic result."""
        result = RunResult(
            run_id="run-123",
            status=RunStatus.COMPLETED,
        )
        assert result.run_id == "run-123"
        assert result.status == RunStatus.COMPLETED
        assert result.output is None
        assert result.error is None
        assert result.events == []
        assert result.duration_ms == 0

    def test_result_with_output(self):
        """Create result with output."""
        result = RunResult(
            run_id="run-123",
            status=RunStatus.COMPLETED,
            output="The answer is 42",
            duration_ms=1500.5,
        )
        assert result.output == "The answer is 42"
        assert result.duration_ms == 1500.5

    def test_result_with_error(self):
        """Create result with error."""
        result = RunResult(
            run_id="run-123",
            status=RunStatus.FAILED,
            error="Something went wrong",
        )
        assert result.error == "Something went wrong"
        assert result.status == RunStatus.FAILED

    def test_result_with_events(self):
        """Create result with events."""
        events = [
            RunEvent(type=EventType.RUN_START, timestamp=1.0),
            RunEvent(type=EventType.AGENT_START, timestamp=2.0),
            RunEvent(type=EventType.RUN_COMPLETE, timestamp=3.0),
        ]
        result = RunResult(
            run_id="run-123",
            status=RunStatus.COMPLETED,
            events=events,
        )
        assert len(result.events) == 3

    def test_result_to_dict(self):
        """Serialize result to dictionary."""
        events = [
            RunEvent(type=EventType.RUN_START, timestamp=1.0),
        ]
        result = RunResult(
            run_id="run-123",
            status=RunStatus.COMPLETED,
            output="Done",
            events=events,
            duration_ms=500.0,
            metadata={"version": "1.0"},
        )
        d = result.to_dict()

        assert d["run_id"] == "run-123"
        assert d["status"] == "completed"
        assert d["output"] == "Done"
        assert len(d["events"]) == 1
        assert d["events"][0]["type"] == "run_start"
        assert d["duration_ms"] == 500.0
        assert d["metadata"]["version"] == "1.0"


class TestUserInputRequest:
    """Tests for UserInputRequest dataclass."""

    def test_request_creation(self):
        """Create user input request."""
        request = UserInputRequest(
            request_id="req-123",
            node_id="ui-1",
            node_name="UserInput",
            variable_name="user_input",
            previous_output=None,
            is_trigger=True,
            timeout_seconds=300.0,
            timeout_behavior="error",
            predefined_text="",
        )
        assert request.request_id == "req-123"
        assert request.is_trigger is True
        assert request.timeout_behavior == "error"

    def test_request_with_previous_output(self):
        """Create request with previous output."""
        request = UserInputRequest(
            request_id="req-123",
            node_id="ui-1",
            node_name="Review",
            variable_name="review_input",
            previous_output="Previous agent said hello",
            is_trigger=False,
            timeout_seconds=60.0,
            timeout_behavior="pass_through",
            predefined_text="",
        )
        assert request.previous_output == "Previous agent said hello"
        assert request.is_trigger is False

    def test_request_to_dict(self):
        """Serialize request to dictionary."""
        request = UserInputRequest(
            request_id="req-123",
            node_id="ui-1",
            node_name="Input",
            variable_name="user_input",
            previous_output=None,
            is_trigger=True,
            timeout_seconds=300.0,
            timeout_behavior="predefined_text",
            predefined_text="Default value",
        )
        d = request.to_dict()

        assert d["request_id"] == "req-123"
        assert d["node_id"] == "ui-1"
        assert d["timeout_behavior"] == "predefined_text"
        assert d["predefined_text"] == "Default value"


class TestRunConfig:
    """Tests for RunConfig dataclass."""

    def test_config_creation(self, tmp_path):
        """Create basic config."""
        config = RunConfig(project_path=tmp_path)

        assert config.project_path == tmp_path
        assert config.tab_id is None
        assert config.input_data == {}
        assert config.callbacks is None
        assert config.timeout_seconds == 300
        assert config.validate is True

    def test_config_with_options(self, tmp_path):
        """Create config with all options."""
        config = RunConfig(
            project_path=tmp_path,
            tab_id="tab1",
            input_data={"query": "test"},
            timeout_seconds=60,
            validate=False,
            run_id="custom-run-id",
        )

        assert config.tab_id == "tab1"
        assert config.input_data["query"] == "test"
        assert config.timeout_seconds == 60
        assert config.validate is False
        assert config.run_id == "custom-run-id"


class TestNoOpCallbacks:
    """Tests for NoOpCallbacks implementation."""

    @pytest.mark.asyncio
    async def test_noop_on_event(self):
        """NoOpCallbacks.on_event does nothing."""
        callbacks = NoOpCallbacks()
        event = RunEvent(type=EventType.RUN_START, timestamp=time.time())

        # Should not raise
        await callbacks.on_event(event)
