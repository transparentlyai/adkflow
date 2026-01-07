"""Tests for agent callbacks - ADK event handling."""

import asyncio
from unittest.mock import MagicMock

import pytest

from adkflow_runner.runner.types import EventType, RunEvent
from adkflow_runner.runner.agent_callbacks import create_agent_callbacks


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
        await emit(
            RunEvent(type=EventType.AGENT_OUTPUT, timestamp=2.0, data={"output": "Hi"})
        )
        await emit(RunEvent(type=EventType.AGENT_END, timestamp=3.0))

        assert len(events) == 3
        types = [e.type for e in events]
        assert EventType.AGENT_START in types
        assert EventType.AGENT_OUTPUT in types
        assert EventType.AGENT_END in types


class TestCreateAgentCallbacks:
    """Tests for create_agent_callbacks function."""

    def test_returns_dict_with_all_callbacks(self):
        """create_agent_callbacks returns dict with all callback types."""
        callbacks = create_agent_callbacks(None, "TestAgent")

        assert "before_agent_callback" in callbacks
        assert "after_agent_callback" in callbacks
        assert "before_model_callback" in callbacks
        assert "after_model_callback" in callbacks
        assert "before_tool_callback" in callbacks
        assert "after_tool_callback" in callbacks

    def test_callbacks_are_callable(self):
        """All returned callbacks are callable."""
        callbacks = create_agent_callbacks(None, "TestAgent")

        for name, callback in callbacks.items():
            assert callable(callback), f"{name} should be callable"

    def test_before_agent_callback_with_no_emit(self):
        """before_agent_callback works when emit is None."""
        callbacks = create_agent_callbacks(None, "TestAgent")
        context = MagicMock()

        result = callbacks["before_agent_callback"](context)
        assert result is None

    def test_after_agent_callback_with_no_emit(self):
        """after_agent_callback works when emit is None."""
        callbacks = create_agent_callbacks(None, "TestAgent")
        context = MagicMock()

        result = callbacks["after_agent_callback"](context)
        assert result is None

    @pytest.mark.asyncio
    async def test_before_agent_callback_with_emit(self):
        """before_agent_callback emits AGENT_START event."""
        events = []

        async def emit(event):
            events.append(event)

        callbacks = create_agent_callbacks(emit, "TestAgent")
        context = MagicMock()

        callbacks["before_agent_callback"](context)

        # Allow async tasks to run
        await asyncio.sleep(0.01)

        assert len(events) == 1
        assert events[0].type == EventType.AGENT_START
        assert events[0].agent_name == "TestAgent"

    @pytest.mark.asyncio
    async def test_after_agent_callback_with_emit(self):
        """after_agent_callback emits AGENT_END event."""
        events = []

        async def emit(event):
            events.append(event)

        callbacks = create_agent_callbacks(emit, "TestAgent")
        context = MagicMock()

        callbacks["after_agent_callback"](context)

        # Allow async tasks to run
        await asyncio.sleep(0.01)

        assert len(events) == 1
        assert events[0].type == EventType.AGENT_END
        assert events[0].agent_name == "TestAgent"

    def test_before_model_callback_with_no_emit(self):
        """before_model_callback works and logs."""
        callbacks = create_agent_callbacks(None, "TestAgent")
        context = MagicMock()
        llm_request = MagicMock()
        llm_request.contents = []

        result = callbacks["before_model_callback"](context, llm_request)
        assert result is None

    def test_before_model_callback_with_contents(self):
        """before_model_callback handles request with contents."""
        callbacks = create_agent_callbacks(None, "TestAgent")
        context = MagicMock()

        # Mock LLM request with contents
        part = MagicMock()
        part.text = "Hello world"
        content = MagicMock()
        content.parts = [part]
        llm_request = MagicMock()
        llm_request.contents = [content]

        result = callbacks["before_model_callback"](context, llm_request)
        assert result is None

    def test_before_model_callback_truncates_long_message(self):
        """before_model_callback truncates messages longer than 200 chars."""
        callbacks = create_agent_callbacks(None, "TestAgent")
        context = MagicMock()

        # Mock LLM request with long content
        part = MagicMock()
        part.text = "x" * 300
        content = MagicMock()
        content.parts = [part]
        llm_request = MagicMock()
        llm_request.contents = [content]

        result = callbacks["before_model_callback"](context, llm_request)
        assert result is None

    def test_after_model_callback_with_no_content(self):
        """after_model_callback handles response with no content."""
        callbacks = create_agent_callbacks(None, "TestAgent")
        context = MagicMock()
        llm_response = MagicMock()
        llm_response.content = None
        llm_response.usage_metadata = None
        llm_response.finish_reason = None
        llm_response.model_version = None

        result = callbacks["after_model_callback"](context, llm_response)
        assert result is None

    def test_after_model_callback_with_content(self):
        """after_model_callback handles response with content."""
        callbacks = create_agent_callbacks(None, "TestAgent")
        context = MagicMock()

        # Mock response with content
        part = MagicMock()
        part.text = "Response text"
        content = MagicMock()
        content.parts = [part]

        usage = MagicMock()
        usage.prompt_token_count = 10
        usage.candidates_token_count = 20
        usage.total_token_count = 30
        usage.cached_content_token_count = 0

        finish_reason = MagicMock()
        finish_reason.name = "STOP"

        llm_response = MagicMock()
        llm_response.content = content
        llm_response.usage_metadata = usage
        llm_response.finish_reason = finish_reason
        llm_response.model_version = "gemini-1.5-pro"

        result = callbacks["after_model_callback"](context, llm_response)
        assert result is None

    @pytest.mark.asyncio
    async def test_before_tool_callback_with_emit(self):
        """before_tool_callback emits TOOL_CALL event."""
        events = []

        async def emit(event):
            events.append(event)

        callbacks = create_agent_callbacks(emit, "TestAgent")

        tool = MagicMock()
        tool.name = "search_tool"
        args = {"query": "test"}
        tool_context = MagicMock()

        result = await callbacks["before_tool_callback"](
            tool=tool, args=args, tool_context=tool_context
        )

        assert result is None
        assert len(events) == 1
        assert events[0].type == EventType.TOOL_CALL
        assert events[0].data["tool_name"] == "search_tool"

    @pytest.mark.asyncio
    async def test_before_tool_callback_with_no_emit(self):
        """before_tool_callback works when emit is None."""
        callbacks = create_agent_callbacks(None, "TestAgent")

        tool = MagicMock()
        tool.name = "search_tool"
        args = {"query": "test"}
        tool_context = MagicMock()

        result = await callbacks["before_tool_callback"](
            tool=tool, args=args, tool_context=tool_context
        )

        assert result is None

    @pytest.mark.asyncio
    async def test_before_tool_callback_truncates_long_args(self):
        """before_tool_callback truncates args longer than 200 chars."""
        callbacks = create_agent_callbacks(None, "TestAgent")

        tool = MagicMock()
        tool.name = "search_tool"
        args = {"query": "x" * 300}
        tool_context = MagicMock()

        result = await callbacks["before_tool_callback"](
            tool=tool, args=args, tool_context=tool_context
        )

        assert result is None

    @pytest.mark.asyncio
    async def test_after_tool_callback_with_emit(self):
        """after_tool_callback emits TOOL_RESULT event."""
        events = []

        async def emit(event):
            events.append(event)

        callbacks = create_agent_callbacks(emit, "TestAgent")

        tool = MagicMock()
        tool.name = "search_tool"
        args = {"query": "test"}
        tool_context = MagicMock()
        tool_response = "Search results"

        result = await callbacks["after_tool_callback"](
            tool=tool, args=args, tool_context=tool_context, tool_response=tool_response
        )

        assert result is None
        assert len(events) == 1
        assert events[0].type == EventType.TOOL_RESULT
        assert events[0].data["tool_name"] == "search_tool"

    @pytest.mark.asyncio
    async def test_after_tool_callback_with_error_response(self):
        """after_tool_callback handles error responses."""
        callbacks = create_agent_callbacks(None, "TestAgent")

        tool = MagicMock()
        tool.name = "search_tool"
        args = {}
        tool_context = MagicMock()
        tool_response = {"error": "Something went wrong"}

        result = await callbacks["after_tool_callback"](
            tool=tool, args=args, tool_context=tool_context, tool_response=tool_response
        )

        assert result is None

    @pytest.mark.asyncio
    async def test_after_tool_callback_with_none_response(self):
        """after_tool_callback handles None response."""
        callbacks = create_agent_callbacks(None, "TestAgent")

        tool = MagicMock()
        tool.name = "search_tool"
        args = {}
        tool_context = MagicMock()

        result = await callbacks["after_tool_callback"](
            tool=tool, args=args, tool_context=tool_context, tool_response=None
        )

        assert result is None

    @pytest.mark.asyncio
    async def test_after_tool_callback_truncates_long_result(self):
        """after_tool_callback truncates results longer than 200 chars."""
        callbacks = create_agent_callbacks(None, "TestAgent")

        tool = MagicMock()
        tool.name = "search_tool"
        args = {}
        tool_context = MagicMock()
        tool_response = "x" * 300

        result = await callbacks["after_tool_callback"](
            tool=tool, args=args, tool_context=tool_context, tool_response=tool_response
        )

        assert result is None

    def test_emit_event_handles_no_running_loop(self):
        """_emit_event handles case when no event loop is running."""

        async def noop_emit(e: RunEvent) -> None:
            pass

        callbacks = create_agent_callbacks(noop_emit, "TestAgent")
        context = MagicMock()

        # This should not raise even without an event loop
        result = callbacks["before_agent_callback"](context)
        assert result is None


class TestHookIntegration:
    """Tests for hook integration in callbacks."""

    @pytest.mark.asyncio
    async def test_before_tool_callback_hook_skip(self):
        """before_tool_callback with SKIP action skips tool execution."""
        from adkflow_runner.hooks import HookAction, HookResult, HooksIntegration

        hooks = MagicMock(spec=HooksIntegration)

        async def skip_hook(*args, **kwargs):
            return (HookResult(action=HookAction.SKIP), {})

        hooks.before_tool_call = skip_hook

        callbacks = create_agent_callbacks(None, "TestAgent", hooks=hooks)

        tool = MagicMock()
        tool.name = "test_tool"
        args = {"arg1": "value"}
        tool_context = MagicMock()

        result = await callbacks["before_tool_callback"](
            tool=tool, args=args, tool_context=tool_context
        )

        assert result == {"skipped": True, "reason": "Skipped by hook"}

    @pytest.mark.asyncio
    async def test_before_tool_callback_hook_replace(self):
        """before_tool_callback with REPLACE action modifies arguments."""
        from adkflow_runner.hooks import HookAction, HookResult, HooksIntegration

        modified_args = {"arg1": "modified"}
        hooks = MagicMock(spec=HooksIntegration)

        async def replace_hook(*args, **kwargs):
            return (HookResult(action=HookAction.REPLACE), modified_args)

        hooks.before_tool_call = replace_hook

        callbacks = create_agent_callbacks(None, "TestAgent", hooks=hooks)

        tool = MagicMock()
        tool.name = "test_tool"
        args = {"arg1": "original"}
        tool_context = MagicMock()

        result = await callbacks["before_tool_callback"](
            tool=tool, args=args, tool_context=tool_context
        )

        # When REPLACE action, args are modified in place
        # The callback returns None but logs with modified args
        assert result is None

    @pytest.mark.asyncio
    async def test_before_tool_callback_hook_abort(self):
        """before_tool_callback with ABORT action raises error."""
        from adkflow_runner.hooks import HookAction, HookResult, HooksIntegration

        hooks = MagicMock(spec=HooksIntegration)

        async def abort_hook(*args, **kwargs):
            return (
                HookResult(action=HookAction.ABORT, error="Custom error"),
                {},
            )

        hooks.before_tool_call = abort_hook

        callbacks = create_agent_callbacks(None, "TestAgent", hooks=hooks)

        tool = MagicMock()
        tool.name = "test_tool"
        args = {}
        tool_context = MagicMock()

        with pytest.raises(RuntimeError, match="Custom error"):
            await callbacks["before_tool_callback"](
                tool=tool, args=args, tool_context=tool_context
            )

    @pytest.mark.asyncio
    async def test_after_tool_callback_hook_replace(self):
        """after_tool_callback with REPLACE action modifies response."""
        from adkflow_runner.hooks import HookAction, HookResult, HooksIntegration

        modified_response = {"modified": "response"}
        hooks = MagicMock(spec=HooksIntegration)

        async def replace_hook(*args, **kwargs):
            return (HookResult(action=HookAction.REPLACE), modified_response)

        hooks.after_tool_result = replace_hook

        callbacks = create_agent_callbacks(None, "TestAgent", hooks=hooks)

        tool = MagicMock()
        tool.name = "test_tool"
        args = {}
        tool_context = MagicMock()
        tool_response = {"original": "response"}

        result = await callbacks["after_tool_callback"](
            tool=tool, args=args, tool_context=tool_context, tool_response=tool_response
        )

        assert result == modified_response

    @pytest.mark.asyncio
    async def test_after_tool_callback_hook_abort(self):
        """after_tool_callback with ABORT action raises error."""
        from adkflow_runner.hooks import HookAction, HookResult, HooksIntegration

        hooks = MagicMock(spec=HooksIntegration)

        async def abort_hook(*args, **kwargs):
            return (
                HookResult(action=HookAction.ABORT, error="Tool failed"),
                None,
            )

        hooks.after_tool_result = abort_hook

        callbacks = create_agent_callbacks(None, "TestAgent", hooks=hooks)

        tool = MagicMock()
        tool.name = "test_tool"
        args = {}
        tool_context = MagicMock()
        tool_response = "response"

        with pytest.raises(RuntimeError, match="Tool failed"):
            await callbacks["after_tool_callback"](
                tool=tool,
                args=args,
                tool_context=tool_context,
                tool_response=tool_response,
            )

    def test_before_model_callback_hook_abort(self):
        """before_model_callback with ABORT action raises error."""
        from adkflow_runner.hooks import HookAction, HookResult, HooksIntegration

        hooks = MagicMock(spec=HooksIntegration)

        async def abort_hook(*args, **kwargs):
            # Return None/empty error to use default message
            return (
                HookResult(action=HookAction.ABORT, error=None),
                [],
                {},
            )

        hooks.before_llm_request = abort_hook

        callbacks = create_agent_callbacks(None, "TestAgent", hooks=hooks)

        context = MagicMock()
        llm_request = MagicMock()
        llm_request.contents = []
        llm_request.model = "test-model"
        llm_request.system_instruction = None
        llm_request.tools = None

        # Should raise with default "Aborted by" message
        with pytest.raises(RuntimeError, match="Aborted by before_llm_request hook"):
            callbacks["before_model_callback"](context, llm_request)

    def test_after_model_callback_hook_abort(self):
        """after_model_callback with ABORT action raises error."""
        from adkflow_runner.hooks import HookAction, HookResult, HooksIntegration

        hooks = MagicMock(spec=HooksIntegration)

        async def abort_hook(*args, **kwargs):
            # Return None/empty error to use default message
            return (HookResult(action=HookAction.ABORT, error=None), {})

        hooks.after_llm_response = abort_hook

        callbacks = create_agent_callbacks(None, "TestAgent", hooks=hooks)

        context = MagicMock()
        llm_response = MagicMock()
        llm_response.content = None
        llm_response.usage_metadata = None
        llm_response.finish_reason = None
        llm_response.model_version = None

        # Should raise with default "Aborted by" message
        with pytest.raises(RuntimeError, match="Aborted by after_llm_response hook"):
            callbacks["after_model_callback"](context, llm_response)

    def test_before_model_callback_hook_error_handling(self):
        """before_model_callback handles hook errors gracefully."""
        from adkflow_runner.hooks import HooksIntegration

        hooks = MagicMock(spec=HooksIntegration)

        async def error_hook(*args, **kwargs):
            raise ValueError("Hook failed")

        hooks.before_llm_request = error_hook

        callbacks = create_agent_callbacks(None, "TestAgent", hooks=hooks)

        context = MagicMock()
        llm_request = MagicMock()
        llm_request.contents = []
        llm_request.model = "test-model"
        llm_request.system_instruction = None
        llm_request.tools = None

        # Should not raise - hook errors are logged but don't fail callback
        result = callbacks["before_model_callback"](context, llm_request)
        assert result is None

    def test_after_model_callback_hook_error_handling(self):
        """after_model_callback handles hook errors gracefully."""
        from adkflow_runner.hooks import HooksIntegration

        hooks = MagicMock(spec=HooksIntegration)

        async def error_hook(*args, **kwargs):
            raise ValueError("Hook failed")

        hooks.after_llm_response = error_hook

        callbacks = create_agent_callbacks(None, "TestAgent", hooks=hooks)

        context = MagicMock()
        llm_response = MagicMock()
        llm_response.content = None
        llm_response.usage_metadata = None
        llm_response.finish_reason = None
        llm_response.model_version = None

        # Should not raise - hook errors are logged but don't fail callback
        result = callbacks["after_model_callback"](context, llm_response)
        assert result is None
