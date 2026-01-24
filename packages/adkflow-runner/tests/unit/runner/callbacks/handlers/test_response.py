"""Tests for ResponseHandler."""

from unittest.mock import MagicMock

from adkflow_runner.runner.callbacks.handlers.response import ResponseHandler
from adkflow_runner.runner.types import EventType


class TestResponseHandler:
    """Tests for ResponseHandler class."""

    def test_default_priority(self):
        """Default priority is 450."""
        handler = ResponseHandler(emit=None)
        assert handler.priority == 450

    def test_custom_priority(self):
        """Can set custom priority."""
        handler = ResponseHandler(emit=None, priority=500)
        assert handler.priority == 500

    def test_last_response_initially_none(self):
        """last_response is None initially."""
        handler = ResponseHandler(emit=None)
        assert handler.last_response is None

    def test_after_model_stores_response(self):
        """after_model stores the response text."""
        handler = ResponseHandler(emit=None)

        # Create mock response with text content
        mock_part = MagicMock()
        mock_part.text = "Hello, world!"

        mock_content = MagicMock()
        mock_content.parts = [mock_part]

        mock_candidate = MagicMock()
        mock_candidate.content = mock_content

        mock_response = MagicMock()
        mock_response.candidates = [mock_candidate]

        handler.after_model(
            callback_context=MagicMock(),
            llm_response=mock_response,
            agent_name="test_agent",
        )

        assert handler.last_response == "Hello, world!"

    def test_after_model_no_emit(self):
        """Returns None when emit is None."""
        handler = ResponseHandler(emit=None)
        result = handler.after_model(
            callback_context=MagicMock(),
            llm_response=MagicMock(),
            agent_name="test_agent",
        )
        assert result is None

    def test_after_model_no_candidates(self):
        """Returns None when response has no candidates."""
        handler = ResponseHandler(emit=MagicMock())
        mock_response = MagicMock()
        mock_response.candidates = None

        result = handler.after_model(
            callback_context=MagicMock(),
            llm_response=mock_response,
            agent_name="test_agent",
        )
        assert result is None

    def test_after_model_empty_candidates(self):
        """Returns None when candidates list is empty."""
        handler = ResponseHandler(emit=MagicMock())
        mock_response = MagicMock()
        mock_response.candidates = []

        result = handler.after_model(
            callback_context=MagicMock(),
            llm_response=mock_response,
            agent_name="test_agent",
        )
        assert result is None

    def test_extract_response_text_with_content(self):
        """Extracts text from response parts."""
        handler = ResponseHandler(emit=None)

        # Create mock response with text content
        mock_part = MagicMock()
        mock_part.text = "Hello, world!"

        mock_content = MagicMock()
        mock_content.parts = [mock_part]

        mock_candidate = MagicMock()
        mock_candidate.content = mock_content

        mock_response = MagicMock()
        mock_response.candidates = [mock_candidate]

        result = handler._extract_response_text(mock_response)
        assert result == "Hello, world!"

    def test_extract_response_text_multiple_parts(self):
        """Extracts and joins text from multiple parts."""
        handler = ResponseHandler(emit=None)

        mock_part1 = MagicMock()
        mock_part1.text = "Hello, "

        mock_part2 = MagicMock()
        mock_part2.text = "world!"

        mock_content = MagicMock()
        mock_content.parts = [mock_part1, mock_part2]

        mock_candidate = MagicMock()
        mock_candidate.content = mock_content

        mock_response = MagicMock()
        mock_response.candidates = [mock_candidate]

        result = handler._extract_response_text(mock_response)
        assert result == "Hello, world!"

    def test_extract_response_text_no_text_parts(self):
        """Returns None when parts have no text."""
        handler = ResponseHandler(emit=None)

        mock_part = MagicMock(spec=[])  # No text attribute

        mock_content = MagicMock()
        mock_content.parts = [mock_part]

        mock_candidate = MagicMock()
        mock_candidate.content = mock_content

        mock_response = MagicMock()
        mock_response.candidates = [mock_candidate]

        result = handler._extract_response_text(mock_response)
        assert result is None

    def test_extract_response_text_none_response(self):
        """Returns None for None response."""
        handler = ResponseHandler(emit=None)
        result = handler._extract_response_text(None)
        assert result is None


class TestEventTypeAgentResponse:
    """Tests for AGENT_RESPONSE event type."""

    def test_agent_response_event_exists(self):
        """AGENT_RESPONSE event type exists."""
        assert hasattr(EventType, "AGENT_RESPONSE")

    def test_agent_response_event_value(self):
        """AGENT_RESPONSE event has correct value."""
        assert EventType.AGENT_RESPONSE.value == "agent_response"
