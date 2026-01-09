"""Tests for chat service.

Tests session management, LLM integration, and message streaming.
"""

from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from backend.src.models.chat import ChatMessage, ChatSessionConfig
from backend.src.services.chat_service import ChatService


class TestChatServiceInit:
    """Tests for ChatService initialization."""

    def test_service_initialization(self):
        """Create service with empty session storage."""
        service = ChatService()
        assert service._sessions == {}


class TestCreateSession:
    """Tests for creating chat sessions."""

    def test_create_session_minimal(self):
        """Create session with minimal config."""
        service = ChatService()
        config = ChatSessionConfig()
        session = service.create_session("session-1", config)

        assert session.id == "session-1"
        assert session.config == config
        assert session.messages == []
        assert "session-1" in service._sessions

    def test_create_session_with_system_prompt(self):
        """Create session with system prompt stores it in config, not messages."""
        service = ChatService()
        config = ChatSessionConfig(system_prompt="You are helpful")  # type: ignore[call-arg]
        session = service.create_session("session-1", config)

        # System prompt is stored in config, not in messages
        assert len(session.messages) == 0
        assert session.config.system_prompt == "You are helpful"

    def test_create_session_duplicate_id(self):
        """Creating duplicate session raises ValueError."""
        service = ChatService()
        config = ChatSessionConfig()
        service.create_session("session-1", config)

        with pytest.raises(ValueError, match="Session already exists"):
            service.create_session("session-1", config)


class TestGetSession:
    """Tests for retrieving chat sessions."""

    def test_get_existing_session(self):
        """Get session that exists."""
        service = ChatService()
        config = ChatSessionConfig()
        created = service.create_session("session-1", config)

        retrieved = service.get_session("session-1")
        assert retrieved is not None
        assert retrieved.id == created.id

    def test_get_nonexistent_session(self):
        """Get session that doesn't exist returns None."""
        service = ChatService()
        retrieved = service.get_session("nonexistent")
        assert retrieved is None


class TestDeleteSession:
    """Tests for deleting chat sessions."""

    def test_delete_existing_session(self):
        """Delete session that exists returns True."""
        service = ChatService()
        service.create_session("session-1", ChatSessionConfig())

        result = service.delete_session("session-1")
        assert result is True
        assert service.get_session("session-1") is None

    def test_delete_nonexistent_session(self):
        """Delete session that doesn't exist returns False."""
        service = ChatService()
        result = service.delete_session("nonexistent")
        assert result is False


class TestListSessions:
    """Tests for listing all sessions."""

    def test_list_empty_sessions(self):
        """List sessions when none exist."""
        service = ChatService()
        sessions = service.list_sessions()
        assert sessions == []

    def test_list_multiple_sessions(self):
        """List all sessions."""
        service = ChatService()
        service.create_session("session-1", ChatSessionConfig())
        service.create_session("session-2", ChatSessionConfig())

        sessions = service.list_sessions()
        assert len(sessions) == 2
        session_ids = {s.id for s in sessions}
        assert session_ids == {"session-1", "session-2"}


class TestResolveModel:
    """Tests for model resolution logic."""

    def test_resolve_model_from_config(self):
        """Use model from session config when provided."""
        service = ChatService()
        result = service._resolve_model("gemini-1.5-pro", None)
        assert result == "gemini-1.5-pro"

    def test_resolve_model_from_project_manifest(self, tmp_path: Path):
        """Use model from project manifest when config has none."""
        manifest = {
            "name": "test",
            "version": "3.0",
            "settings": {"defaultModel": "gemini-1.5-flash"},
        }
        manifest_path = tmp_path / "manifest.json"
        manifest_path.write_text(json.dumps(manifest))

        service = ChatService()
        result = service._resolve_model(None, str(tmp_path))
        assert result == "gemini-1.5-flash"

    def test_resolve_model_fallback_default(self):
        """Use fallback default when no config or manifest."""
        service = ChatService()
        result = service._resolve_model(None, None)
        assert result == "gemini-2.5-flash"

    def test_resolve_model_manifest_missing(self, tmp_path: Path):
        """Use fallback when manifest doesn't exist."""
        service = ChatService()
        result = service._resolve_model(None, str(tmp_path))
        assert result == "gemini-2.5-flash"

    def test_resolve_model_manifest_no_settings(self, tmp_path: Path):
        """Use fallback when manifest has no settings."""
        manifest = {"name": "test", "version": "3.0"}
        manifest_path = tmp_path / "manifest.json"
        manifest_path.write_text(json.dumps(manifest))

        service = ChatService()
        result = service._resolve_model(None, str(tmp_path))
        assert result == "gemini-2.5-flash"


class TestCreateClient:
    """Tests for GenAI client creation."""

    @patch("backend.src.services.chat_service.genai.Client")
    def test_create_client_api_key_mode(self, mock_client_cls):
        """Create client in API key mode."""
        service = ChatService()
        service._create_client(None)

        mock_client_cls.assert_called_once_with(api_key=None)

    @patch("backend.src.services.chat_service.genai.Client")
    @patch.dict("os.environ", {"GOOGLE_API_KEY": "test_key"})
    def test_create_client_api_key_from_env(self, mock_client_cls):
        """Create client with API key from environment."""
        service = ChatService()
        service._create_client(None)

        mock_client_cls.assert_called_once_with(api_key="test_key")

    @patch("backend.src.services.chat_service.genai.Client")
    def test_create_client_api_key_from_project_env(
        self, mock_client_cls, tmp_path: Path
    ):
        """Create client with API key from project .env file."""
        env_file = tmp_path / ".env"
        env_file.write_text("GOOGLE_API_KEY=project_key\n")

        service = ChatService()
        service._create_client(str(tmp_path))

        mock_client_cls.assert_called_once_with(api_key="project_key")

    @patch("backend.src.services.chat_service.genai.Client")
    def test_create_client_vertex_ai_mode(self, mock_client_cls, tmp_path: Path):
        """Create client in Vertex AI mode."""
        env_file = tmp_path / ".env"
        env_file.write_text(
            "GOOGLE_GENAI_USE_VERTEXAI=true\n"
            "GOOGLE_CLOUD_PROJECT=my-project\n"
            "GOOGLE_CLOUD_LOCATION=us-west1\n"
        )

        service = ChatService()
        service._create_client(str(tmp_path))

        mock_client_cls.assert_called_once_with(
            vertexai=True,
            project="my-project",
            location="us-west1",
        )

    @patch("backend.src.services.chat_service.genai.Client")
    def test_create_client_vertex_ai_default_location(
        self, mock_client_cls, tmp_path: Path
    ):
        """Create client with default location when not specified."""
        env_file = tmp_path / ".env"
        env_file.write_text(
            "GOOGLE_GENAI_USE_VERTEXAI=true\nGOOGLE_CLOUD_PROJECT=my-project\n"
        )

        service = ChatService()
        service._create_client(str(tmp_path))

        mock_client_cls.assert_called_once_with(
            vertexai=True,
            project="my-project",
            location="us-central1",
        )


class TestBuildLLMMessages:
    """Tests for building LLM message format."""

    def test_build_messages_empty_session(self):
        """Build messages from empty session."""
        service = ChatService()
        config = ChatSessionConfig()
        session = service.create_session("session-1", config)

        messages = service._build_llm_messages(session)
        assert messages == []

    def test_build_messages_with_system_prompt(self):
        """Build messages with system prompt converts to user/model pair."""
        service = ChatService()
        config = ChatSessionConfig(system_prompt="You are helpful")  # type: ignore[call-arg]
        session = service.create_session("session-1", config)

        messages = service._build_llm_messages(session)
        assert len(messages) == 2
        assert messages[0].role == "user"
        assert messages[0].parts[0].text == "You are helpful"  # type: ignore[union-attr]
        assert messages[1].role == "model"

    def test_build_messages_with_context(self):
        """Build messages with context injects into system prompt."""
        service = ChatService()
        context = {"user_id": "123", "preferences": {"theme": "dark"}}
        config = ChatSessionConfig(system_prompt="You are helpful", context=context)  # type: ignore[call-arg]
        session = service.create_session("session-1", config)

        messages = service._build_llm_messages(session)
        assert len(messages) == 2
        first_message_text = messages[0].parts[0].text  # type: ignore[union-attr]
        assert first_message_text is not None
        assert "You are helpful" in first_message_text
        assert "Context:" in first_message_text
        assert "user_id" in first_message_text

    def test_build_messages_user_and_assistant(self):
        """Build messages with user and assistant messages."""
        service = ChatService()
        config = ChatSessionConfig()
        session = service.create_session("session-1", config)

        session.messages.append(ChatMessage(role="user", content="Hello"))
        session.messages.append(ChatMessage(role="assistant", content="Hi there"))

        messages = service._build_llm_messages(session)
        assert len(messages) == 2
        assert messages[0].role == "user"
        assert messages[0].parts[0].text == "Hello"  # type: ignore[union-attr]
        assert messages[1].role == "model"
        assert messages[1].parts[0].text == "Hi there"  # type: ignore[union-attr]


class TestSendMessage:
    """Tests for sending messages and streaming responses."""

    @pytest.mark.asyncio
    async def test_send_message_session_not_found(self):
        """Send message to nonexistent session yields error event."""
        service = ChatService()
        events = []
        async for event in service.send_message("nonexistent", "Hello"):
            events.append(event)

        assert len(events) == 1
        assert events[0].type == "error"
        assert "not found" in events[0].error.lower()

    @pytest.mark.asyncio
    @patch("backend.src.services.chat_service.ChatService._create_client")
    @patch("backend.src.services.chat_service.ChatService._resolve_model")
    async def test_send_message_adds_user_message(
        self, mock_resolve_model, mock_create_client
    ):
        """Send message adds user message to session."""
        # Setup mocks
        mock_resolve_model.return_value = "gemini-2.5-flash"
        mock_client = MagicMock()
        mock_create_client.return_value = mock_client

        # Mock the streaming response
        async def mock_stream():
            # Create an async generator that raises to stop early
            if False:
                yield
            raise Exception("Test error to stop stream")

        mock_client.aio.models.generate_content_stream = AsyncMock(
            return_value=mock_stream()
        )

        # Create session and send message
        service = ChatService()
        service.create_session("session-1", ChatSessionConfig())

        events = []
        async for event in service.send_message("session-1", "Hello"):
            events.append(event)

        # Verify user message was added
        session = service.get_session("session-1")
        assert session is not None
        assert len(session.messages) == 1
        assert session.messages[0].role == "user"
        assert session.messages[0].content == "Hello"

    @pytest.mark.asyncio
    @patch("backend.src.services.chat_service.ChatService._create_client")
    @patch("backend.src.services.chat_service.ChatService._resolve_model")
    async def test_send_message_successful_stream(
        self, mock_resolve_model, mock_create_client
    ):
        """Send message streams content and done events."""
        # Setup mocks
        mock_resolve_model.return_value = "gemini-2.5-flash"
        mock_client = MagicMock()
        mock_create_client.return_value = mock_client

        # Mock streaming chunks
        class MockChunk:
            def __init__(self, text):
                self.text = text

        async def mock_stream():
            yield MockChunk("Hello")
            yield MockChunk(" world")

        mock_client.aio.models.generate_content_stream = AsyncMock(
            return_value=mock_stream()
        )

        # Create session and send message
        service = ChatService()
        service.create_session("session-1", ChatSessionConfig())

        events = []
        async for event in service.send_message("session-1", "Hi"):
            events.append(event)

        # Verify events
        assert len(events) == 3
        assert events[0].type == "content"
        assert events[0].content == "Hello"
        assert events[1].type == "content"
        assert events[1].content == " world"
        assert events[2].type == "done"

        # Verify assistant message was added
        session = service.get_session("session-1")
        assert session is not None
        assert len(session.messages) == 2
        assert session.messages[1].role == "assistant"
        assert session.messages[1].content == "Hello world"

    @pytest.mark.asyncio
    @patch("backend.src.services.chat_service.ChatService._create_client")
    @patch("backend.src.services.chat_service.ChatService._resolve_model")
    async def test_send_message_llm_error(self, mock_resolve_model, mock_create_client):
        """Send message handles LLM errors gracefully."""
        # Setup mocks
        mock_resolve_model.return_value = "gemini-2.5-flash"
        mock_client = MagicMock()
        mock_create_client.return_value = mock_client

        # Mock error during streaming
        async def mock_stream():
            if False:
                yield
            raise Exception("LLM error")

        mock_client.aio.models.generate_content_stream = AsyncMock(
            return_value=mock_stream()
        )

        # Create session and send message
        service = ChatService()
        service.create_session("session-1", ChatSessionConfig())

        events = []
        async for event in service.send_message("session-1", "Hi"):
            events.append(event)

        # Should get error event
        assert len(events) >= 1
        assert events[-1].type == "error"
        assert "error" in events[-1].error.lower()

    @pytest.mark.asyncio
    @patch("backend.src.services.chat_service.ChatService._create_client")
    @patch("backend.src.services.chat_service.ChatService._resolve_model")
    async def test_send_message_with_project_path(
        self, mock_resolve_model, mock_create_client
    ):
        """Send message passes project_path to model resolution and client creation."""
        # Setup mocks
        mock_resolve_model.return_value = "gemini-2.5-flash"
        mock_client = MagicMock()
        mock_create_client.return_value = mock_client

        async def mock_stream():
            if False:
                yield
            raise Exception("Test stop")

        mock_client.aio.models.generate_content_stream = AsyncMock(
            return_value=mock_stream()
        )

        # Create session and send message
        service = ChatService()
        service.create_session("session-1", ChatSessionConfig())

        events = []
        async for event in service.send_message(
            "session-1", "Hi", project_path="/test/path"
        ):
            events.append(event)

        # Verify project_path was passed
        mock_resolve_model.assert_called_once_with(None, "/test/path")
        mock_create_client.assert_called_once_with("/test/path")
