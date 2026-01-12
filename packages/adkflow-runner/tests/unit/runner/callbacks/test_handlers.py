"""Tests for callback handlers."""

from unittest.mock import MagicMock, AsyncMock
import pytest

from adkflow_runner.runner.callbacks.handlers import (
    BaseHandler,
    EmitHandler,
    ExtensionHooksHandler,
    FinishReasonError,
    FinishReasonHandler,
    LoggingHandler,
    StripContentsHandler,
    TracingHandler,
    UserCallbackHandler,
)
from adkflow_runner.runner.callbacks.types import FlowControl


class TestBaseHandler:
    """Tests for BaseHandler abstract class."""

    def test_default_priority_is_none(self):
        """BaseHandler has no default priority."""

        class TestHandler(BaseHandler):
            pass

        handler = TestHandler()
        assert handler.has_priority() is False

    def test_priority_from_init(self):
        """Priority can be set in __init__."""

        class TestHandler(BaseHandler):
            pass

        handler = TestHandler(priority=150)
        assert handler.priority == 150

    def test_priority_from_class_default(self):
        """Priority can come from DEFAULT_PRIORITY."""

        class TestHandler(BaseHandler):
            DEFAULT_PRIORITY = 250

        handler = TestHandler()
        assert handler.priority == 250

    def test_priority_getter_raises_when_unset(self):
        """Accessing priority raises when not set."""

        class TestHandler(BaseHandler):
            pass

        handler = TestHandler()
        with pytest.raises(ValueError, match="Priority not set"):
            _ = handler.priority

    def test_default_error_policy_is_continue(self):
        """Default error policy is continue."""

        class TestHandler(BaseHandler):
            pass

        handler = TestHandler()
        assert handler.on_error == "continue"

    def test_default_methods_return_none(self):
        """All default callback methods return None."""

        class TestHandler(BaseHandler):
            DEFAULT_PRIORITY = 100

        handler = TestHandler()
        assert handler.before_agent(None, "test") is None
        assert handler.after_agent(None, "test") is None
        assert handler.before_model(None, None, "test") is None
        assert handler.after_model(None, None, "test") is None

    @pytest.mark.asyncio
    async def test_default_async_methods_return_none(self):
        """Async callback methods return None."""

        class TestHandler(BaseHandler):
            DEFAULT_PRIORITY = 100

        handler = TestHandler()
        assert await handler.before_tool(None, {}, None, "test") is None
        assert await handler.after_tool(None, {}, None, None, "test") is None


class TestStripContentsHandler:
    """Tests for StripContentsHandler."""

    def test_default_priority(self):
        """StripContentsHandler has priority 100."""
        handler = StripContentsHandler()
        assert handler.priority == 100

    def test_strips_injected_context(self):
        """Strips '[agent] said:' patterns from content."""
        handler = StripContentsHandler()

        # Mock LLM request with injected context
        part_injected = MagicMock()
        part_injected.text = "[SomeAgent] said: Hello world"

        part_clean = MagicMock()
        part_clean.text = "Clean content"

        content = MagicMock()
        content.parts = [part_injected, part_clean]

        llm_request = MagicMock()
        llm_request.contents = [content]

        handler.before_model(None, llm_request, "TestAgent")

        # Should have removed injected part
        assert len(llm_request.contents[0].parts) == 1
        assert llm_request.contents[0].parts[0].text == "Clean content"

    def test_disabled_does_nothing(self):
        """Disabled handler doesn't modify content."""
        handler = StripContentsHandler(enabled=False)

        part = MagicMock()
        part.text = "[SomeAgent] said: Hello"

        content = MagicMock()
        content.parts = [part]

        llm_request = MagicMock()
        llm_request.contents = [content]

        handler.before_model(None, llm_request, "TestAgent")

        # Should still have injected content
        assert len(llm_request.contents[0].parts) == 1


class TestTracingHandler:
    """Tests for TracingHandler."""

    def test_default_priority(self):
        """TracingHandler has priority 200."""
        handler = TracingHandler()
        assert handler.priority == 200


class TestLoggingHandler:
    """Tests for LoggingHandler."""

    def test_default_priority(self):
        """LoggingHandler has priority 300."""
        handler = LoggingHandler()
        assert handler.priority == 300


class TestEmitHandler:
    """Tests for EmitHandler."""

    def test_default_priority(self):
        """EmitHandler has priority 400."""
        handler = EmitHandler(None)
        assert handler.priority == 400

    def test_no_emit_does_nothing(self):
        """Handler with no emit function does nothing."""
        handler = EmitHandler(None)
        result = handler.before_agent(None, "TestAgent")
        assert result is None

    @pytest.mark.asyncio
    async def test_emit_called_for_tool_events(self):
        """Emit is awaited for tool callbacks."""
        emit = AsyncMock()
        handler = EmitHandler(emit)

        tool = MagicMock()
        tool.name = "test_tool"

        await handler.before_tool(tool, {"arg": "value"}, None, "TestAgent")
        emit.assert_called_once()


class TestExtensionHooksHandler:
    """Tests for ExtensionHooksHandler."""

    def test_default_priority(self):
        """ExtensionHooksHandler has priority 500."""
        handler = ExtensionHooksHandler(None)
        assert handler.priority == 500

    def test_no_hooks_does_nothing(self):
        """Handler with no hooks does nothing."""
        handler = ExtensionHooksHandler(None)
        result = handler.before_model(None, None, "TestAgent")
        assert result is None


class TestUserCallbackHandler:
    """Tests for UserCallbackHandler."""

    def test_default_priority(self):
        """UserCallbackHandler has priority 600."""
        handler = UserCallbackHandler()
        assert handler.priority == 600

    def test_no_callbacks_does_nothing(self):
        """Handler with no callbacks does nothing."""
        handler = UserCallbackHandler()
        result = handler.before_model(None, None, "TestAgent")
        assert result is None

    def test_calls_user_callback(self):
        """Calls user-provided callback function."""
        user_cb = MagicMock(return_value=None)
        handler = UserCallbackHandler(callbacks={"before_model_callback": user_cb})

        handler.before_model("ctx", "req", "TestAgent")
        user_cb.assert_called_once_with("ctx", "req", "TestAgent")

    def test_converts_skip_action(self):
        """Converts dict with action='skip' to HandlerResult."""
        user_cb = MagicMock(return_value={"action": "skip", "reason": "test"})
        handler = UserCallbackHandler(callbacks={"before_model_callback": user_cb})

        result = handler.before_model("ctx", "req", "TestAgent")
        assert result.action == FlowControl.SKIP  # type: ignore[union-attr]

    def test_converts_abort_action(self):
        """Converts dict with action='abort' to HandlerResult."""
        user_cb = MagicMock(return_value={"action": "abort", "error": "test error"})
        handler = UserCallbackHandler(callbacks={"before_model_callback": user_cb})

        result = handler.before_model("ctx", "req", "TestAgent")
        assert result.action == FlowControl.ABORT  # type: ignore[union-attr]
        assert result.error == "test error"  # type: ignore[union-attr]

    def test_converts_replace_action(self):
        """Converts dict with action='replace' to HandlerResult."""
        user_cb = MagicMock(
            return_value={"action": "replace", "modified_data": {"new": True}}
        )
        handler = UserCallbackHandler(callbacks={"before_model_callback": user_cb})

        result = handler.before_model("ctx", "req", "TestAgent")
        assert result.action == FlowControl.REPLACE  # type: ignore[union-attr]
        assert result.modified_data == {"new": True}  # type: ignore[union-attr]


class TestFinishReasonHandler:
    """Tests for FinishReasonHandler."""

    def test_default_priority(self):
        """FinishReasonHandler has priority 350."""
        handler = FinishReasonHandler()
        assert handler.priority == 350

    def test_fail_fast_disabled_by_default(self):
        """fail_fast is disabled by default."""
        handler = FinishReasonHandler()
        assert handler.fail_fast is False

    def test_fail_fast_enabled_in_constructor(self):
        """fail_fast can be enabled in constructor."""
        handler = FinishReasonHandler(fail_fast=True)
        assert handler.fail_fast is True

    def test_stores_finish_reason_data_for_stop(self):
        """Stores finish reason data when finish_reason is STOP."""
        handler = FinishReasonHandler()

        # Mock LLM response with STOP finish_reason
        finish_reason = MagicMock()
        finish_reason.name = "STOP"
        llm_response = MagicMock()
        llm_response.finish_reason = finish_reason

        handler.after_model(None, llm_response, "TestAgent")

        assert handler.last_finish_reason is not None
        assert handler.last_finish_reason["name"] == "STOP"
        assert handler.last_finish_reason["description"] == "Natural completion"

    def test_stores_finish_reason_data_for_max_tokens(self):
        """Stores finish reason data when finish_reason is MAX_TOKENS."""
        handler = FinishReasonHandler()

        finish_reason = MagicMock()
        finish_reason.name = "MAX_TOKENS"
        llm_response = MagicMock()
        llm_response.finish_reason = finish_reason

        handler.after_model(None, llm_response, "TestAgent")

        assert handler.last_finish_reason["name"] == "MAX_TOKENS"  # type: ignore[index]
        assert "truncated" in handler.last_finish_reason["description"].lower()  # type: ignore[index]

    def test_fail_fast_allows_stop(self):
        """Fail fast allows STOP to pass without error."""
        handler = FinishReasonHandler(fail_fast=True)

        finish_reason = MagicMock()
        finish_reason.name = "STOP"
        llm_response = MagicMock()
        llm_response.finish_reason = finish_reason

        # Should not raise
        result = handler.after_model(None, llm_response, "TestAgent")
        assert result is None

    def test_fail_fast_raises_on_max_tokens(self):
        """Fail fast raises FinishReasonError on MAX_TOKENS."""
        handler = FinishReasonHandler(fail_fast=True)

        finish_reason = MagicMock()
        finish_reason.name = "MAX_TOKENS"
        llm_response = MagicMock()
        llm_response.finish_reason = finish_reason

        with pytest.raises(FinishReasonError) as exc_info:
            handler.after_model(None, llm_response, "TestAgent")

        assert exc_info.value.finish_reason == "MAX_TOKENS"
        assert "MAX_TOKENS" in str(exc_info.value)
        assert "TestAgent" in str(exc_info.value)

    def test_fail_fast_raises_on_safety(self):
        """Fail fast raises FinishReasonError on SAFETY."""
        handler = FinishReasonHandler(fail_fast=True)

        finish_reason = MagicMock()
        finish_reason.name = "SAFETY"
        llm_response = MagicMock()
        llm_response.finish_reason = finish_reason

        with pytest.raises(FinishReasonError) as exc_info:
            handler.after_model(None, llm_response, "TestAgent")

        assert exc_info.value.finish_reason == "SAFETY"
        assert "safety" in exc_info.value.description.lower()

    def test_fail_fast_disabled_allows_any(self):
        """With fail_fast=False, any finish_reason passes."""
        handler = FinishReasonHandler(fail_fast=False)

        finish_reason = MagicMock()
        finish_reason.name = "MAX_TOKENS"
        llm_response = MagicMock()
        llm_response.finish_reason = finish_reason

        # Should not raise
        result = handler.after_model(None, llm_response, "TestAgent")
        assert result is None

    def test_handles_missing_finish_reason(self):
        """Handles responses without finish_reason."""
        handler = FinishReasonHandler(fail_fast=True)

        llm_response = MagicMock()
        llm_response.finish_reason = None

        # Should not raise
        result = handler.after_model(None, llm_response, "TestAgent")
        assert result is None
        assert handler.last_finish_reason["name"] == "UNKNOWN"  # type: ignore[index]

    def test_error_contains_description(self):
        """FinishReasonError contains human-readable description."""
        handler = FinishReasonHandler(fail_fast=True)

        finish_reason = MagicMock()
        finish_reason.name = "MALFORMED_FUNCTION_CALL"
        llm_response = MagicMock()
        llm_response.finish_reason = finish_reason

        with pytest.raises(FinishReasonError) as exc_info:
            handler.after_model(None, llm_response, "TestAgent")

        assert "syntactically invalid" in exc_info.value.description.lower()
