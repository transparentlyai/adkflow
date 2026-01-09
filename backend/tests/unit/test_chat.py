"""Tests for chat data models.

Tests Pydantic models for chat messages, sessions, and API request/response types.
"""

from __future__ import annotations

from datetime import datetime

import pytest
from pydantic import ValidationError

from backend.src.models.chat import (
    ChatMessage,
    ChatSession,
    ChatSessionConfig,
    ChatStreamEvent,
    CreateSessionRequest,
    CreateSessionResponse,
    DeleteSessionResponse,
    GetSessionResponse,
    SendMessageRequest,
)


class TestChatMessage:
    """Tests for ChatMessage model."""

    def test_create_message_with_defaults(self):
        """Create message with default timestamp."""
        msg = ChatMessage(role="user", content="Hello")
        assert msg.role == "user"
        assert msg.content == "Hello"
        assert isinstance(msg.timestamp, datetime)

    def test_create_message_with_custom_timestamp(self):
        """Create message with custom timestamp."""
        custom_time = datetime(2024, 1, 1, 12, 0, 0)
        msg = ChatMessage(role="assistant", content="Hi", timestamp=custom_time)
        assert msg.timestamp == custom_time

    def test_role_validation(self):
        """Validate role must be user, assistant, or system."""
        # Valid roles
        ChatMessage(role="user", content="test")
        ChatMessage(role="assistant", content="test")
        ChatMessage(role="system", content="test")

        # Invalid role should fail
        with pytest.raises(ValidationError):
            ChatMessage(role="invalid", content="test")


class TestChatSessionConfig:
    """Tests for ChatSessionConfig model."""

    def test_create_empty_config(self):
        """Create config with all defaults."""
        config = ChatSessionConfig()
        assert config.system_prompt is None
        assert config.context is None
        assert config.model is None

    def test_create_config_with_system_prompt(self):
        """Create config with system prompt."""
        config = ChatSessionConfig(system_prompt="You are a helpful assistant")
        assert config.system_prompt == "You are a helpful assistant"

    def test_create_config_with_context(self):
        """Create config with arbitrary context."""
        context = {"user_id": "123", "preferences": {"theme": "dark"}}
        config = ChatSessionConfig(context=context)
        assert config.context == context

    def test_create_config_with_model_override(self):
        """Create config with model override."""
        config = ChatSessionConfig(model="gemini-1.5-pro")
        assert config.model == "gemini-1.5-pro"

    def test_config_alias_support(self):
        """Support camelCase alias for system_prompt."""
        config = ChatSessionConfig.model_validate({"systemPrompt": "test prompt"})
        assert config.system_prompt == "test prompt"


class TestChatSession:
    """Tests for ChatSession model."""

    def test_create_session_with_defaults(self):
        """Create session with default values."""
        session = ChatSession(id="session-1")
        assert session.id == "session-1"
        assert isinstance(session.config, ChatSessionConfig)
        assert session.messages == []
        assert isinstance(session.created_at, datetime)
        assert isinstance(session.updated_at, datetime)

    def test_create_session_with_config(self):
        """Create session with custom config."""
        config = ChatSessionConfig(system_prompt="You are helpful")
        session = ChatSession(id="session-1", config=config)
        assert session.config.system_prompt == "You are helpful"

    def test_create_session_with_messages(self):
        """Create session with message history."""
        messages = [
            ChatMessage(role="user", content="Hello"),
            ChatMessage(role="assistant", content="Hi there"),
        ]
        session = ChatSession(id="session-1", messages=messages)
        assert len(session.messages) == 2
        assert session.messages[0].content == "Hello"

    def test_session_serialization_aliases(self):
        """Session should serialize with camelCase aliases."""
        session = ChatSession(id="session-1")
        data = session.model_dump(by_alias=True)
        assert "createdAt" in data
        assert "updatedAt" in data


class TestCreateSessionRequest:
    """Tests for CreateSessionRequest model."""

    def test_create_request_minimal(self):
        """Create request with minimal data."""
        request = CreateSessionRequest(session_id="session-1")
        assert request.session_id == "session-1"
        assert isinstance(request.config, ChatSessionConfig)

    def test_create_request_with_config(self):
        """Create request with config."""
        config = ChatSessionConfig(system_prompt="test")
        request = CreateSessionRequest(session_id="session-1", config=config)
        assert request.config.system_prompt == "test"

    def test_create_request_alias_support(self):
        """Support sessionId camelCase alias."""
        request = CreateSessionRequest.model_validate({"sessionId": "session-1"})
        assert request.session_id == "session-1"


class TestCreateSessionResponse:
    """Tests for CreateSessionResponse model."""

    def test_create_response(self):
        """Create response with session."""
        session = ChatSession(id="session-1")
        response = CreateSessionResponse(session=session)
        assert response.session.id == "session-1"


class TestGetSessionResponse:
    """Tests for GetSessionResponse model."""

    def test_get_response(self):
        """Create response with session."""
        session = ChatSession(id="session-1")
        response = GetSessionResponse(session=session)
        assert response.session.id == "session-1"


class TestDeleteSessionResponse:
    """Tests for DeleteSessionResponse model."""

    def test_delete_response_success(self):
        """Create successful delete response."""
        response = DeleteSessionResponse(success=True, message="Deleted")
        assert response.success is True
        assert response.message == "Deleted"

    def test_delete_response_failure(self):
        """Create failed delete response."""
        response = DeleteSessionResponse(success=False, message="Not found")
        assert response.success is False
        assert response.message == "Not found"


class TestSendMessageRequest:
    """Tests for SendMessageRequest model."""

    def test_send_message_request(self):
        """Create send message request."""
        request = SendMessageRequest(content="Hello world")
        assert request.content == "Hello world"

    def test_send_message_request_validation(self):
        """Validate content is required."""
        with pytest.raises(ValidationError):
            SendMessageRequest()


class TestChatStreamEvent:
    """Tests for ChatStreamEvent model."""

    def test_content_event(self):
        """Create content event."""
        event = ChatStreamEvent(type="content", content="Hello")
        assert event.type == "content"
        assert event.content == "Hello"
        assert event.error is None

    def test_done_event(self):
        """Create done event."""
        event = ChatStreamEvent(type="done")
        assert event.type == "done"
        assert event.content is None
        assert event.error is None

    def test_error_event(self):
        """Create error event."""
        event = ChatStreamEvent(type="error", error="Something went wrong")
        assert event.type == "error"
        assert event.error == "Something went wrong"
        assert event.content is None

    def test_event_type_validation(self):
        """Validate event type must be content, done, or error."""
        with pytest.raises(ValidationError):
            ChatStreamEvent(type="invalid")

    def test_event_serialization_exclude_none(self):
        """Serialization should exclude None fields."""
        event = ChatStreamEvent(type="content", content="test")
        data = event.model_dump(exclude_none=True)
        assert "error" not in data
        assert "content" in data
