"""Tests for user input handling."""

import asyncio
from unittest.mock import AsyncMock, MagicMock

import pytest

from adkflow_runner.runner.types import (
    RunConfig,
    UserInputRequest,
    EventType,
)


class TestUserInputRequest:
    """Tests for UserInputRequest dataclass."""

    def test_request_creation(self):
        """Create user input request."""
        request = UserInputRequest(
            request_id="req_123",
            node_id="input_1",
            node_name="User Input",
            variable_name="user_query",
            previous_output=None,
            is_trigger=False,
            timeout_seconds=30.0,
            timeout_behavior="pass_through",
            predefined_text="",
        )
        assert request.request_id == "req_123"
        assert request.node_id == "input_1"
        assert request.node_name == "User Input"
        assert request.variable_name == "user_query"

    def test_request_with_previous_output(self):
        """Create request with previous agent output."""
        request = UserInputRequest(
            request_id="req_123",
            node_id="input_1",
            node_name="User Input",
            variable_name="query",
            previous_output="Previous agent said hello",
            is_trigger=False,
            timeout_seconds=30.0,
            timeout_behavior="pass_through",
            predefined_text="",
        )
        assert request.previous_output == "Previous agent said hello"

    def test_request_is_trigger(self):
        """Create trigger request."""
        request = UserInputRequest(
            request_id="r1",
            node_id="n1",
            node_name="Trigger",
            variable_name="trigger_input",
            previous_output=None,
            is_trigger=True,
            timeout_seconds=30.0,
            timeout_behavior="pass_through",
            predefined_text="",
        )
        assert request.is_trigger is True

    def test_request_with_timeout(self):
        """Create request with custom timeout."""
        request = UserInputRequest(
            request_id="r1",
            node_id="n1",
            node_name="Input",
            variable_name="var",
            previous_output=None,
            is_trigger=False,
            timeout_seconds=60.0,
            timeout_behavior="error",
            predefined_text="",
        )
        assert request.timeout_seconds == 60.0
        assert request.timeout_behavior == "error"

    def test_request_with_predefined_text(self):
        """Create request with predefined text."""
        request = UserInputRequest(
            request_id="r1",
            node_id="n1",
            node_name="Input",
            variable_name="var",
            previous_output=None,
            is_trigger=False,
            timeout_seconds=30.0,
            timeout_behavior="predefined_text",
            predefined_text="Default value",
        )
        assert request.predefined_text == "Default value"

    def test_request_to_dict(self):
        """Convert request to dictionary."""
        request = UserInputRequest(
            request_id="r1",
            node_id="n1",
            node_name="Input",
            variable_name="var",
            previous_output="Hello",
            is_trigger=False,
            timeout_seconds=30.0,
            timeout_behavior="pass_through",
            predefined_text="",
        )
        d = request.to_dict()
        assert d["request_id"] == "r1"
        assert d["node_id"] == "n1"
        assert d["node_name"] == "Input"
        assert d["variable_name"] == "var"
        assert d["previous_output"] == "Hello"


class TestUserInputProvider:
    """Tests for user input provider patterns."""

    def test_run_config_with_provider(self):
        """RunConfig can have user input provider."""
        provider = MagicMock()
        config = RunConfig(
            project_path="/test",
            user_input_provider=provider,
        )
        assert config.user_input_provider == provider

    def test_run_config_default_no_provider(self):
        """RunConfig defaults to no provider."""
        config = RunConfig(project_path="/test")
        assert config.user_input_provider is None


class TestUserInputEvents:
    """Tests for user input event types."""

    def test_user_input_required_event(self):
        """USER_INPUT_REQUIRED event type exists."""
        assert hasattr(EventType, "USER_INPUT_REQUIRED")

    def test_user_input_received_event(self):
        """USER_INPUT_RECEIVED event type exists."""
        assert hasattr(EventType, "USER_INPUT_RECEIVED")

    def test_user_input_timeout_event(self):
        """USER_INPUT_TIMEOUT event type exists."""
        assert hasattr(EventType, "USER_INPUT_TIMEOUT")
