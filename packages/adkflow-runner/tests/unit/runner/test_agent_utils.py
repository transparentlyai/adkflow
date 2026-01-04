"""Tests for agent utility functions."""

from unittest.mock import MagicMock

from adkflow_runner.runner.agent_utils import (
    sanitize_agent_name,
    create_strip_contents_callback,
)


class TestSanitizeAgentName:
    """Tests for sanitize_agent_name function."""

    def test_simple_name(self):
        """Simple name passes through."""
        assert sanitize_agent_name("MyAgent") == "MyAgent"

    def test_name_with_spaces(self):
        """Spaces are converted to underscores."""
        assert sanitize_agent_name("My Agent") == "My_Agent"

    def test_name_with_hyphens(self):
        """Hyphens are converted to underscores."""
        assert sanitize_agent_name("my-agent") == "my_agent"

    def test_name_with_multiple_spaces(self):
        """Multiple spaces are converted to single underscore."""
        assert sanitize_agent_name("My  Agent") == "My_Agent"

    def test_name_with_special_characters(self):
        """Special characters are removed."""
        assert sanitize_agent_name("My@Agent!") == "MyAgent"

    def test_name_starting_with_number(self):
        """Names starting with number get underscore prefix."""
        assert sanitize_agent_name("123Agent") == "_123Agent"

    def test_name_starting_with_underscore(self):
        """Names starting with underscore are preserved."""
        assert sanitize_agent_name("_agent") == "_agent"

    def test_empty_name(self):
        """Empty name returns 'agent'."""
        assert sanitize_agent_name("") == "agent"

    def test_only_special_chars(self):
        """Name with only special chars returns 'agent'."""
        assert sanitize_agent_name("@#$%") == "agent"

    def test_mixed_content(self):
        """Mixed content is properly sanitized."""
        assert sanitize_agent_name("My Agent-2.0!") == "My_Agent_20"

    def test_unicode_characters(self):
        """Unicode characters are removed."""
        assert sanitize_agent_name("Agenté") == "Agent"

    def test_preserves_underscores(self):
        """Existing underscores are preserved."""
        assert sanitize_agent_name("my_agent") == "my_agent"


class TestCreateStripContentsCallback:
    """Tests for create_strip_contents_callback function."""

    def test_returns_callable(self):
        """Returns a callable callback."""
        callback = create_strip_contents_callback()
        assert callable(callback)

    def test_callback_handles_no_contents(self):
        """Callback handles request with no contents attribute."""
        callback = create_strip_contents_callback()
        llm_request = MagicMock(spec=[])  # No contents attribute
        context = MagicMock()

        result = callback(context, llm_request)
        assert result is None

    def test_callback_handles_none_contents(self):
        """Callback handles request with None contents."""
        callback = create_strip_contents_callback()
        llm_request = MagicMock()
        llm_request.contents = None
        context = MagicMock()

        result = callback(context, llm_request)
        assert result is None

    def test_callback_handles_empty_contents(self):
        """Callback handles request with empty contents."""
        callback = create_strip_contents_callback()
        llm_request = MagicMock()
        llm_request.contents = []
        context = MagicMock()

        result = callback(context, llm_request)
        assert result is None

    def test_callback_preserves_normal_content(self):
        """Callback preserves content without injected patterns."""
        callback = create_strip_contents_callback()

        part = MagicMock()
        part.text = "Hello, how can I help you?"
        content = MagicMock()
        content.parts = [part]

        llm_request = MagicMock()
        llm_request.contents = [content]
        context = MagicMock()

        callback(context, llm_request)

        assert len(llm_request.contents) == 1
        assert part in llm_request.contents[0].parts

    def test_callback_strips_for_context_prefix(self):
        """Callback strips 'For context:' prefix."""
        callback = create_strip_contents_callback()

        part = MagicMock()
        part.text = "For context: some data"
        content = MagicMock()
        content.parts = [part]

        llm_request = MagicMock()
        llm_request.contents = [content]
        context = MagicMock()

        callback(context, llm_request)

        # Content should be removed since it only had injected text
        assert len(llm_request.contents) == 0

    def test_callback_strips_agent_said_prefix(self):
        """Callback strips '[Agent] said:' prefix."""
        callback = create_strip_contents_callback()

        part = MagicMock()
        part.text = "[MyAgent] said: some response"
        content = MagicMock()
        content.parts = [part]

        llm_request = MagicMock()
        llm_request.contents = [content]
        context = MagicMock()

        callback(context, llm_request)

        assert len(llm_request.contents) == 0

    def test_callback_strips_agent_says_prefix(self):
        """Callback strips 'Agent says:' prefix."""
        callback = create_strip_contents_callback()

        part = MagicMock()
        part.text = "Agent_Name says: hello"
        content = MagicMock()
        content.parts = [part]

        llm_request = MagicMock()
        llm_request.contents = [content]
        context = MagicMock()

        callback(context, llm_request)

        assert len(llm_request.contents) == 0

    def test_callback_strips_simple_said_prefix(self):
        """Callback strips simple 'name said:' prefix."""
        callback = create_strip_contents_callback()

        part = MagicMock()
        part.text = "researcher said: the results are in"
        content = MagicMock()
        content.parts = [part]

        llm_request = MagicMock()
        llm_request.contents = [content]
        context = MagicMock()

        callback(context, llm_request)

        assert len(llm_request.contents) == 0

    def test_callback_preserves_content_without_parts(self):
        """Callback preserves content with no parts attribute."""
        callback = create_strip_contents_callback()

        content = MagicMock(spec=[])  # No parts attribute
        llm_request = MagicMock()
        llm_request.contents = [content]
        context = MagicMock()

        callback(context, llm_request)

        assert content in llm_request.contents

    def test_callback_preserves_parts_without_text(self):
        """Callback preserves parts without text attribute."""
        callback = create_strip_contents_callback()

        part = MagicMock(spec=[])  # No text attribute
        content = MagicMock()
        content.parts = [part]

        llm_request = MagicMock()
        llm_request.contents = [content]
        context = MagicMock()

        callback(context, llm_request)

        assert part in llm_request.contents[0].parts

    def test_callback_preserves_mixed_parts(self):
        """Callback preserves non-injected parts in mixed content."""
        callback = create_strip_contents_callback()

        injected_part = MagicMock()
        injected_part.text = "For context: data"

        normal_part = MagicMock()
        normal_part.text = "User query here"

        content = MagicMock()
        content.parts = [injected_part, normal_part]

        llm_request = MagicMock()
        llm_request.contents = [content]
        context = MagicMock()

        callback(context, llm_request)

        # Should have one content with only normal part
        assert len(llm_request.contents) == 1
        assert normal_part in llm_request.contents[0].parts
        assert injected_part not in llm_request.contents[0].parts

    def test_callback_case_insensitive(self):
        """Callback pattern matching is case insensitive."""
        callback = create_strip_contents_callback()

        part = MagicMock()
        part.text = "FOR CONTEXT: some data"
        content = MagicMock()
        content.parts = [part]

        llm_request = MagicMock()
        llm_request.contents = [content]
        context = MagicMock()

        callback(context, llm_request)

        assert len(llm_request.contents) == 0

    def test_callback_handles_empty_text(self):
        """Callback handles parts with empty text."""
        callback = create_strip_contents_callback()

        part = MagicMock()
        part.text = ""
        content = MagicMock()
        content.parts = [part]

        llm_request = MagicMock()
        llm_request.contents = [content]
        context = MagicMock()

        callback(context, llm_request)

        # Empty text should be preserved (doesn't match patterns)
        assert len(llm_request.contents) == 1
