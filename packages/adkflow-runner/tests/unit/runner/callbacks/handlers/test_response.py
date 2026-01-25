"""Tests for ResponseHandler."""

from unittest.mock import MagicMock

from adkflow_runner.runner.callbacks.handlers import ResponseHandler


class TestResponseHandler:
    """Tests for ResponseHandler."""

    def test_default_priority(self):
        """ResponseHandler has priority 450."""
        handler = ResponseHandler()
        assert handler.priority == 450

    def test_last_response_initially_none(self):
        """last_response is None before any model call."""
        handler = ResponseHandler()
        assert handler.last_response is None

    def test_extracts_text_from_single_part(self):
        """Extracts text from a single part."""
        handler = ResponseHandler()

        part = MagicMock()
        part.text = "Hello, world!"

        content = MagicMock()
        content.parts = [part]

        llm_response = MagicMock()
        llm_response.content = content

        result = handler.after_model(None, llm_response, "TestAgent")

        assert result is None
        assert handler.last_response == "Hello, world!"

    def test_concatenates_multiple_text_parts(self):
        """Concatenates text from multiple parts."""
        handler = ResponseHandler()

        part1 = MagicMock()
        part1.text = "Hello, "

        part2 = MagicMock()
        part2.text = "world!"

        content = MagicMock()
        content.parts = [part1, part2]

        llm_response = MagicMock()
        llm_response.content = content

        handler.after_model(None, llm_response, "TestAgent")

        assert handler.last_response == "Hello, world!"

    def test_handles_missing_content(self):
        """Sets last_response to None when content is missing."""
        handler = ResponseHandler()

        llm_response = MagicMock()
        llm_response.content = None

        handler.after_model(None, llm_response, "TestAgent")

        assert handler.last_response is None

    def test_handles_missing_parts(self):
        """Sets last_response to None when parts is missing."""
        handler = ResponseHandler()

        content = MagicMock()
        content.parts = None

        llm_response = MagicMock()
        llm_response.content = content

        handler.after_model(None, llm_response, "TestAgent")

        assert handler.last_response is None

    def test_handles_empty_parts(self):
        """Sets last_response to None when parts is empty."""
        handler = ResponseHandler()

        content = MagicMock()
        content.parts = []

        llm_response = MagicMock()
        llm_response.content = content

        handler.after_model(None, llm_response, "TestAgent")

        assert handler.last_response is None

    def test_skips_parts_without_text(self):
        """Skips parts that don't have text attribute."""
        handler = ResponseHandler()

        part_with_text = MagicMock()
        part_with_text.text = "Hello"

        part_without_text = MagicMock(spec=[])  # No text attribute

        content = MagicMock()
        content.parts = [part_without_text, part_with_text]

        llm_response = MagicMock()
        llm_response.content = content

        handler.after_model(None, llm_response, "TestAgent")

        assert handler.last_response == "Hello"

    def test_returns_none_to_continue_chain(self):
        """Returns None to continue the handler chain."""
        handler = ResponseHandler()

        part = MagicMock()
        part.text = "Response"

        content = MagicMock()
        content.parts = [part]

        llm_response = MagicMock()
        llm_response.content = content

        result = handler.after_model(None, llm_response, "TestAgent")

        assert result is None

    def test_overwrites_previous_response(self):
        """Subsequent calls overwrite the previous response."""
        handler = ResponseHandler()

        # First response
        part1 = MagicMock()
        part1.text = "First response"

        content1 = MagicMock()
        content1.parts = [part1]

        llm_response1 = MagicMock()
        llm_response1.content = content1

        handler.after_model(None, llm_response1, "TestAgent")
        assert handler.last_response == "First response"

        # Second response
        part2 = MagicMock()
        part2.text = "Second response"

        content2 = MagicMock()
        content2.parts = [part2]

        llm_response2 = MagicMock()
        llm_response2.content = content2

        handler.after_model(None, llm_response2, "TestAgent")
        assert handler.last_response == "Second response"

    def test_handles_none_text_in_parts(self):
        """Handles parts with text=None."""
        handler = ResponseHandler()

        part_none = MagicMock()
        part_none.text = None

        part_valid = MagicMock()
        part_valid.text = "Valid text"

        content = MagicMock()
        content.parts = [part_none, part_valid]

        llm_response = MagicMock()
        llm_response.content = content

        handler.after_model(None, llm_response, "TestAgent")

        assert handler.last_response == "Valid text"

    def test_handles_empty_text_in_parts(self):
        """Handles parts with empty text."""
        handler = ResponseHandler()

        part_empty = MagicMock()
        part_empty.text = ""

        part_valid = MagicMock()
        part_valid.text = "Valid"

        content = MagicMock()
        content.parts = [part_empty, part_valid]

        llm_response = MagicMock()
        llm_response.content = content

        handler.after_model(None, llm_response, "TestAgent")

        # Empty string is falsy, so it's skipped
        assert handler.last_response == "Valid"
