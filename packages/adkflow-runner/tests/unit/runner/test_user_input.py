"""Tests for user input handling."""

import asyncio
from pathlib import Path
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
            project_path=Path("/test"),
            user_input_provider=provider,
        )
        assert config.user_input_provider == provider

    def test_run_config_default_no_provider(self):
        """RunConfig defaults to no provider."""
        config = RunConfig(project_path=Path("/test"))
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


class TestHandleUserInput:
    """Tests for handle_user_input function."""

    @pytest.fixture
    def mock_user_input(self):
        """Create a mock UserInputIR."""
        ui = MagicMock()
        ui.id = "input_1"
        ui.name = "Test Input"
        ui.variable_name = "user_query"
        ui.is_trigger = False
        ui.timeout_seconds = 30.0
        ui.timeout_behavior = "pass_through"
        ui.predefined_text = ""
        return ui

    @pytest.fixture
    def mock_config(self):
        """Create a mock RunConfig with provider."""
        provider = AsyncMock()
        provider.request_input = AsyncMock(return_value="user response")
        return RunConfig(project_path=Path("/test"), user_input_provider=provider)

    @pytest.fixture
    def mock_config_no_provider(self):
        """Create a mock RunConfig without provider."""
        return RunConfig(project_path=Path("/test"), user_input_provider=None)

    @pytest.mark.asyncio
    async def test_handle_with_provider_returns_response(
        self, mock_user_input, mock_config
    ):
        """Handle user input with provider returns user response."""
        from adkflow_runner.runner.user_input import handle_user_input

        events = []

        async def emit(event):
            events.append(event)

        result = await handle_user_input(
            mock_user_input,
            "previous output",
            mock_config,
            emit,
        )

        assert result == "user response"
        mock_config.user_input_provider.request_input.assert_called_once()

    @pytest.mark.asyncio
    async def test_handle_emits_required_event(self, mock_user_input, mock_config):
        """Handle user input emits USER_INPUT_REQUIRED event."""
        from adkflow_runner.runner.user_input import handle_user_input

        events = []

        async def emit(event):
            events.append(event)

        await handle_user_input(mock_user_input, None, mock_config, emit)

        assert len(events) >= 1
        assert events[0].type == EventType.USER_INPUT_REQUIRED

    @pytest.mark.asyncio
    async def test_handle_emits_received_event(self, mock_user_input, mock_config):
        """Handle user input emits USER_INPUT_RECEIVED event on success."""
        from adkflow_runner.runner.user_input import handle_user_input

        events = []

        async def emit(event):
            events.append(event)

        await handle_user_input(mock_user_input, None, mock_config, emit)

        event_types = [e.type for e in events]
        assert EventType.USER_INPUT_RECEIVED in event_types

    @pytest.mark.asyncio
    async def test_handle_timeout_pass_through(self, mock_user_input, mock_config):
        """Handle timeout with pass_through behavior returns previous output."""
        from adkflow_runner.runner.user_input import handle_user_input

        mock_config.user_input_provider.request_input = AsyncMock(
            side_effect=TimeoutError
        )
        mock_user_input.timeout_behavior = "pass_through"

        events = []

        async def emit(event):
            events.append(event)

        result = await handle_user_input(
            mock_user_input,
            "previous output",
            mock_config,
            emit,
        )

        assert result == "previous output"

    @pytest.mark.asyncio
    async def test_handle_timeout_predefined_text(self, mock_user_input, mock_config):
        """Handle timeout with predefined_text returns predefined text."""
        from adkflow_runner.runner.user_input import handle_user_input

        mock_config.user_input_provider.request_input = AsyncMock(
            side_effect=TimeoutError
        )
        mock_user_input.timeout_behavior = "predefined_text"
        mock_user_input.predefined_text = "default value"

        events = []

        async def emit(event):
            events.append(event)

        result = await handle_user_input(
            mock_user_input,
            "previous output",
            mock_config,
            emit,
        )

        assert result == "default value"

    @pytest.mark.asyncio
    async def test_handle_timeout_error(self, mock_user_input, mock_config):
        """Handle timeout with error behavior raises RuntimeError."""
        from adkflow_runner.runner.user_input import handle_user_input

        mock_config.user_input_provider.request_input = AsyncMock(
            side_effect=TimeoutError
        )
        mock_user_input.timeout_behavior = "error"

        events = []

        async def emit(event):
            events.append(event)

        with pytest.raises(RuntimeError, match="User input timeout"):
            await handle_user_input(
                mock_user_input,
                "previous output",
                mock_config,
                emit,
            )

    @pytest.mark.asyncio
    async def test_handle_emits_timeout_event(self, mock_user_input, mock_config):
        """Handle timeout emits USER_INPUT_TIMEOUT event."""
        from adkflow_runner.runner.user_input import handle_user_input

        mock_config.user_input_provider.request_input = AsyncMock(
            side_effect=TimeoutError
        )
        mock_user_input.timeout_behavior = "pass_through"

        events = []

        async def emit(event):
            events.append(event)

        await handle_user_input(mock_user_input, None, mock_config, emit)

        event_types = [e.type for e in events]
        assert EventType.USER_INPUT_TIMEOUT in event_types

    @pytest.mark.asyncio
    async def test_handle_no_provider_pass_through(
        self, mock_user_input, mock_config_no_provider
    ):
        """Without provider, pass_through returns previous output."""
        from adkflow_runner.runner.user_input import handle_user_input

        mock_user_input.timeout_behavior = "pass_through"

        events = []

        async def emit(event):
            events.append(event)

        result = await handle_user_input(
            mock_user_input,
            "previous output",
            mock_config_no_provider,
            emit,
        )

        assert result == "previous output"

    @pytest.mark.asyncio
    async def test_handle_no_provider_predefined_text(
        self, mock_user_input, mock_config_no_provider
    ):
        """Without provider, predefined_text returns predefined text."""
        from adkflow_runner.runner.user_input import handle_user_input

        mock_user_input.timeout_behavior = "predefined_text"
        mock_user_input.predefined_text = "default"

        events = []

        async def emit(event):
            events.append(event)

        result = await handle_user_input(
            mock_user_input,
            None,
            mock_config_no_provider,
            emit,
        )

        assert result == "default"

    @pytest.mark.asyncio
    async def test_handle_no_provider_trigger_error(
        self, mock_user_input, mock_config_no_provider
    ):
        """Without provider, trigger input with error behavior raises."""
        from adkflow_runner.runner.user_input import handle_user_input

        mock_user_input.is_trigger = True
        mock_user_input.timeout_behavior = "error"

        events = []

        async def emit(event):
            events.append(event)

        with pytest.raises(RuntimeError, match="No user input provider"):
            await handle_user_input(
                mock_user_input,
                None,
                mock_config_no_provider,
                emit,
            )

    @pytest.mark.asyncio
    async def test_handle_no_provider_non_trigger_passes_through(
        self, mock_user_input, mock_config_no_provider
    ):
        """Without provider, non-trigger with error behavior passes through."""
        from adkflow_runner.runner.user_input import handle_user_input

        mock_user_input.is_trigger = False
        mock_user_input.timeout_behavior = "error"

        events = []

        async def emit(event):
            events.append(event)

        result = await handle_user_input(
            mock_user_input,
            "previous",
            mock_config_no_provider,
            emit,
        )

        assert result == "previous"

    @pytest.mark.asyncio
    async def test_handle_cancelled_error_propagates(
        self, mock_user_input, mock_config
    ):
        """CancelledError propagates without catching."""
        from adkflow_runner.runner.user_input import handle_user_input

        mock_config.user_input_provider.request_input = AsyncMock(
            side_effect=asyncio.CancelledError
        )

        events = []

        async def emit(event):
            events.append(event)

        with pytest.raises(asyncio.CancelledError):
            await handle_user_input(
                mock_user_input,
                None,
                mock_config,
                emit,
            )


class TestUserInputHooks:
    """Tests for hook integration in user input handling."""

    @pytest.fixture
    def mock_user_input(self):
        """Create a mock UserInputIR."""
        ui = MagicMock()
        ui.id = "input_1"
        ui.name = "Test Input"
        ui.variable_name = "user_query"
        ui.is_trigger = False
        ui.timeout_seconds = 30.0
        ui.timeout_behavior = "pass_through"
        ui.predefined_text = ""
        return ui

    @pytest.fixture
    def mock_config_with_provider(self):
        """Create a mock RunConfig with provider."""
        provider = AsyncMock()
        provider.request_input = AsyncMock(return_value="user response")
        return RunConfig(project_path=Path("/test"), user_input_provider=provider)

    @pytest.mark.asyncio
    async def test_before_user_input_hook_skip(
        self, mock_user_input, mock_config_with_provider
    ):
        """before_user_input with SKIP action returns prompt without waiting."""
        from adkflow_runner.runner.user_input import handle_user_input
        from adkflow_runner.hooks import HookAction, HookResult, HooksIntegration

        hooks = MagicMock(spec=HooksIntegration)

        async def skip_hook(*args, **kwargs):
            return (HookResult(action=HookAction.SKIP), "skipped prompt")

        hooks.before_user_input = skip_hook

        events = []

        async def emit(event):
            events.append(event)

        result = await handle_user_input(
            mock_user_input,
            "previous output",
            mock_config_with_provider,
            emit,
            hooks=hooks,
        )

        # Should return the modified prompt without waiting for user
        assert result == "skipped prompt"
        # Provider should not be called
        mock_config_with_provider.user_input_provider.request_input.assert_not_called()

    @pytest.mark.asyncio
    async def test_before_user_input_hook_abort(
        self, mock_user_input, mock_config_with_provider
    ):
        """before_user_input with ABORT action raises error."""
        from adkflow_runner.runner.user_input import handle_user_input
        from adkflow_runner.hooks import HookAction, HookResult, HooksIntegration

        hooks = MagicMock(spec=HooksIntegration)

        async def abort_hook(*args, **kwargs):
            return (HookResult(action=HookAction.ABORT, error="Input blocked"), "")

        hooks.before_user_input = abort_hook

        events = []

        async def emit(event):
            events.append(event)

        with pytest.raises(RuntimeError, match="Input blocked"):
            await handle_user_input(
                mock_user_input,
                None,
                mock_config_with_provider,
                emit,
                hooks=hooks,
            )

    @pytest.mark.asyncio
    async def test_after_user_input_hook_replace(
        self, mock_user_input, mock_config_with_provider
    ):
        """after_user_input with REPLACE action modifies response."""
        from adkflow_runner.runner.user_input import handle_user_input
        from adkflow_runner.hooks import HookAction, HookResult, HooksIntegration

        hooks = MagicMock(spec=HooksIntegration)

        async def continue_hook(*args, **kwargs):
            return (HookResult(action=HookAction.CONTINUE), kwargs["prompt"])

        async def replace_hook(*args, **kwargs):
            return (HookResult(action=HookAction.REPLACE), "modified response")

        hooks.before_user_input = continue_hook
        hooks.after_user_input = replace_hook

        events = []

        async def emit(event):
            events.append(event)

        result = await handle_user_input(
            mock_user_input,
            None,
            mock_config_with_provider,
            emit,
            hooks=hooks,
        )

        assert result == "modified response"

    @pytest.mark.asyncio
    async def test_after_user_input_hook_abort(
        self, mock_user_input, mock_config_with_provider
    ):
        """after_user_input with ABORT action raises error."""
        from adkflow_runner.runner.user_input import handle_user_input
        from adkflow_runner.hooks import HookAction, HookResult, HooksIntegration

        hooks = MagicMock(spec=HooksIntegration)

        async def continue_hook(*args, **kwargs):
            return (HookResult(action=HookAction.CONTINUE), kwargs["prompt"])

        async def abort_hook(*args, **kwargs):
            return (HookResult(action=HookAction.ABORT, error="Response rejected"), "")

        hooks.before_user_input = continue_hook
        hooks.after_user_input = abort_hook

        events = []

        async def emit(event):
            events.append(event)

        with pytest.raises(RuntimeError, match="Response rejected"):
            await handle_user_input(
                mock_user_input,
                None,
                mock_config_with_provider,
                emit,
                hooks=hooks,
            )
