"""Tests for callback types."""

from adkflow_runner.runner.callbacks.types import (
    ErrorPolicy,
    FlowControl,
    HandlerResult,
)


class TestFlowControl:
    """Tests for FlowControl enum."""

    def test_enum_values(self):
        """FlowControl has expected string values."""
        assert FlowControl.CONTINUE == "continue"
        assert FlowControl.SKIP == "skip"
        assert FlowControl.ABORT == "abort"
        assert FlowControl.REPLACE == "replace"

    def test_is_string_enum(self):
        """FlowControl inherits from str."""
        assert isinstance(FlowControl.CONTINUE, str)


class TestErrorPolicy:
    """Tests for ErrorPolicy enum."""

    def test_enum_values(self):
        """ErrorPolicy has expected string values."""
        assert ErrorPolicy.CONTINUE == "continue"
        assert ErrorPolicy.ABORT == "abort"


class TestHandlerResult:
    """Tests for HandlerResult dataclass."""

    def test_default_values(self):
        """HandlerResult has sensible defaults."""
        result = HandlerResult()
        assert result.action == FlowControl.CONTINUE
        assert result.modified_data is None
        assert result.error is None
        assert result.metadata == {}

    def test_continue_factory(self):
        """continue_() creates CONTINUE result."""
        result = HandlerResult.continue_()
        assert result.action == FlowControl.CONTINUE
        assert result.modified_data is None

    def test_continue_with_metadata(self):
        """continue_() accepts metadata."""
        result = HandlerResult.continue_(metadata={"key": "value"})
        assert result.action == FlowControl.CONTINUE
        assert result.metadata == {"key": "value"}

    def test_skip_factory(self):
        """skip() creates SKIP result."""
        result = HandlerResult.skip()
        assert result.action == FlowControl.SKIP

    def test_skip_with_reason(self):
        """skip() stores reason in metadata."""
        result = HandlerResult.skip(reason="test reason")
        assert result.action == FlowControl.SKIP
        assert result.metadata.get("reason") == "test reason"

    def test_abort_factory(self):
        """abort() creates ABORT result with error."""
        result = HandlerResult.abort("error message")
        assert result.action == FlowControl.ABORT
        assert result.error == "error message"

    def test_replace_factory(self):
        """replace() creates REPLACE result with data."""
        data = {"modified": True}
        result = HandlerResult.replace(data)
        assert result.action == FlowControl.REPLACE
        assert result.modified_data == data

    def test_replace_with_metadata(self):
        """replace() accepts metadata."""
        result = HandlerResult.replace({"data": 1}, metadata={"source": "test"})
        assert result.action == FlowControl.REPLACE
        assert result.metadata == {"source": "test"}
