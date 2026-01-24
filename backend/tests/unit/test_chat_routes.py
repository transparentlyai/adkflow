"""Tests for chat API routes.

Tests FastAPI endpoints for chat session management and message streaming.
"""

from __future__ import annotations

import json
from unittest.mock import patch

import pytest
from httpx import AsyncClient

from backend.src.models.chat import ChatStreamEvent


class TestCreateSession:
    """Tests for POST /api/chat/sessions endpoint."""

    @pytest.mark.asyncio
    async def test_create_session_minimal(self, client: AsyncClient):
        """Create session with minimal data."""
        request = {"sessionId": "session-1"}

        response = await client.post("/api/chat/sessions", json=request)

        assert response.status_code == 200
        data = response.json()
        assert "session" in data
        assert data["session"]["id"] == "session-1"
        assert data["session"]["messages"] == []

    @pytest.mark.asyncio
    async def test_create_session_with_config(self, client: AsyncClient):
        """Create session with configuration."""
        request = {
            "sessionId": "session-1",
            "config": {
                "systemPrompt": "You are a helpful assistant",
                "model": "gemini-1.5-pro",
            },
        }

        response = await client.post("/api/chat/sessions", json=request)

        assert response.status_code == 200
        data = response.json()
        session = data["session"]
        assert session["config"]["systemPrompt"] == "You are a helpful assistant"
        assert session["config"]["model"] == "gemini-1.5-pro"

    @pytest.mark.asyncio
    async def test_create_session_with_system_prompt_adds_message(
        self, client: AsyncClient
    ):
        """Create session with system prompt adds system message."""
        request = {
            "sessionId": "session-1",
            "config": {"systemPrompt": "You are helpful"},
        }

        response = await client.post("/api/chat/sessions", json=request)

        assert response.status_code == 200
        data = response.json()
        messages = data["session"]["messages"]
        assert len(messages) == 1
        assert messages[0]["role"] == "system"
        assert messages[0]["content"] == "You are helpful"

    @pytest.mark.asyncio
    async def test_create_session_with_context(self, client: AsyncClient):
        """Create session with arbitrary context."""
        request = {
            "sessionId": "session-1",
            "config": {"context": {"user_id": "123", "preferences": {"theme": "dark"}}},
        }

        response = await client.post("/api/chat/sessions", json=request)

        assert response.status_code == 200
        data = response.json()
        context = data["session"]["config"]["context"]
        assert context["user_id"] == "123"
        assert context["preferences"]["theme"] == "dark"

    @pytest.mark.asyncio
    async def test_create_session_duplicate_id(self, client: AsyncClient):
        """Creating duplicate session returns 409 Conflict."""
        request = {"sessionId": "session-1"}

        # Create first session
        response1 = await client.post("/api/chat/sessions", json=request)
        assert response1.status_code == 200

        # Try to create duplicate
        response2 = await client.post("/api/chat/sessions", json=request)
        assert response2.status_code == 409
        assert "already exists" in response2.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_create_session_validation_error(self, client: AsyncClient):
        """Invalid request data returns 422 Validation Error."""
        request = {}  # Missing required sessionId

        response = await client.post("/api/chat/sessions", json=request)
        assert response.status_code == 422


class TestGetSession:
    """Tests for GET /api/chat/sessions/{session_id} endpoint."""

    @pytest.mark.asyncio
    async def test_get_existing_session(self, client: AsyncClient):
        """Get session that exists."""
        # Create session first
        create_request = {"sessionId": "session-1"}
        await client.post("/api/chat/sessions", json=create_request)

        # Get session
        response = await client.get("/api/chat/sessions/session-1")

        assert response.status_code == 200
        data = response.json()
        assert "session" in data
        assert data["session"]["id"] == "session-1"

    @pytest.mark.asyncio
    async def test_get_session_with_messages(self, client: AsyncClient):
        """Get session returns message history."""
        # Create session with system prompt
        create_request = {
            "sessionId": "session-1",
            "config": {"systemPrompt": "You are helpful"},
        }
        await client.post("/api/chat/sessions", json=create_request)

        # Get session
        response = await client.get("/api/chat/sessions/session-1")

        assert response.status_code == 200
        data = response.json()
        messages = data["session"]["messages"]
        assert len(messages) == 1
        assert messages[0]["role"] == "system"

    @pytest.mark.asyncio
    async def test_get_nonexistent_session(self, client: AsyncClient):
        """Get nonexistent session returns 404."""
        response = await client.get("/api/chat/sessions/nonexistent")

        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()


class TestDeleteSession:
    """Tests for DELETE /api/chat/sessions/{session_id} endpoint."""

    @pytest.mark.asyncio
    async def test_delete_existing_session(self, client: AsyncClient):
        """Delete session that exists."""
        # Create session first
        create_request = {"sessionId": "session-1"}
        await client.post("/api/chat/sessions", json=create_request)

        # Delete session
        response = await client.delete("/api/chat/sessions/session-1")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "deleted" in data["message"].lower()

        # Verify session is gone
        get_response = await client.get("/api/chat/sessions/session-1")
        assert get_response.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_nonexistent_session(self, client: AsyncClient):
        """Delete nonexistent session returns 404."""
        response = await client.delete("/api/chat/sessions/nonexistent")

        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()


class TestSendMessage:
    """Tests for POST /api/chat/sessions/{session_id}/messages endpoint."""

    @pytest.mark.asyncio
    async def test_send_message_session_not_found(self, client: AsyncClient):
        """Send message to nonexistent session returns 404."""
        request = {"content": "Hello"}

        response = await client.post(
            "/api/chat/sessions/nonexistent/messages", json=request
        )

        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_send_message_validation_error(self, client: AsyncClient):
        """Invalid message request returns 422."""
        # Create session first
        await client.post("/api/chat/sessions", json={"sessionId": "session-1"})

        # Send invalid request (missing content)
        response = await client.post("/api/chat/sessions/session-1/messages", json={})

        assert response.status_code == 422

    @pytest.mark.asyncio
    @patch("backend.src.services.chat_service.ChatService.send_message")
    async def test_send_message_streams_events(
        self, mock_send_message, client: AsyncClient
    ):
        """Send message returns SSE stream with events."""

        # Mock the streaming response - need to create fresh generator each call
        async def mock_stream(*args, **kwargs):
            yield ChatStreamEvent(type="content", content="Hello")
            yield ChatStreamEvent(type="content", content=" world")
            yield ChatStreamEvent(type="done")

        mock_send_message.side_effect = lambda *args, **kwargs: mock_stream(
            *args, **kwargs
        )

        # Create session
        await client.post("/api/chat/sessions", json={"sessionId": "session-1"})

        # Send message
        request = {"content": "Hi"}
        response = await client.post(
            "/api/chat/sessions/session-1/messages", json=request
        )

        assert response.status_code == 200
        assert response.headers["content-type"] == "text/event-stream; charset=utf-8"

        # Parse SSE events - handle both \r\n and \n line endings
        events = []
        # Normalize line endings and split by double newline
        normalized = response.text.replace("\r\n", "\n")
        event_blocks = [block for block in normalized.split("\n\n") if block.strip()]

        for block in event_blocks:
            event_type = None
            event_data = None
            for line in block.split("\n"):
                line = line.strip()
                if line.startswith("event:"):
                    event_type = line.split(":", 1)[1].strip()
                elif line.startswith("data:"):
                    event_data = line.split(":", 1)[1].strip()
            if event_type and event_data:
                events.append({"event": event_type, "data": json.loads(event_data)})

        # Verify events
        assert len(events) == 3
        assert events[0]["event"] == "content"
        assert events[0]["data"]["content"] == "Hello"
        assert events[1]["event"] == "content"
        assert events[1]["data"]["content"] == " world"
        assert events[2]["event"] == "done"

    @pytest.mark.asyncio
    @patch("backend.src.services.chat_service.ChatService.send_message")
    async def test_send_message_with_project_path(
        self, mock_send_message, client: AsyncClient
    ):
        """Send message with project_path query parameter."""

        # Mock the streaming response
        async def mock_stream(*args, **kwargs):
            yield ChatStreamEvent(type="done")

        mock_send_message.return_value = mock_stream()

        # Create session
        await client.post("/api/chat/sessions", json={"sessionId": "session-1"})

        # Send message with project_path
        request = {"content": "Hi"}
        response = await client.post(
            "/api/chat/sessions/session-1/messages",
            json=request,
            params={"project_path": "/test/path"},
        )

        assert response.status_code == 200

        # Verify send_message was called with project_path
        mock_send_message.assert_called_once()
        call_kwargs = mock_send_message.call_args[1]
        assert call_kwargs["project_path"] == "/test/path"

    @pytest.mark.asyncio
    @patch("backend.src.services.chat_service.ChatService.send_message")
    async def test_send_message_error_event(
        self, mock_send_message, client: AsyncClient
    ):
        """Send message handles error events."""

        # Mock error stream
        async def mock_stream(*args, **kwargs):
            yield ChatStreamEvent(type="error", error="LLM error")

        mock_send_message.return_value = mock_stream()

        # Create session
        await client.post("/api/chat/sessions", json={"sessionId": "session-1"})

        # Send message
        request = {"content": "Hi"}
        response = await client.post(
            "/api/chat/sessions/session-1/messages", json=request
        )

        assert response.status_code == 200

        # Parse events - handle both \r\n and \n line endings
        events = []
        normalized = response.text.replace("\r\n", "\n")
        event_blocks = [block for block in normalized.split("\n\n") if block.strip()]

        for block in event_blocks:
            event_type = None
            event_data = None
            for line in block.split("\n"):
                line = line.strip()
                if line.startswith("event:"):
                    event_type = line.split(":", 1)[1].strip()
                elif line.startswith("data:"):
                    event_data = line.split(":", 1)[1].strip()
            if event_type and event_data:
                events.append({"event": event_type, "data": json.loads(event_data)})

        # Verify error event
        assert len(events) == 1
        assert events[0]["event"] == "error"
        assert events[0]["data"]["error"] == "LLM error"


class TestSessionLifecycle:
    """Integration tests for full session lifecycle."""

    @pytest.mark.asyncio
    async def test_full_session_lifecycle(self, client: AsyncClient):
        """Test create, get, and delete session workflow."""
        # Create session
        create_response = await client.post(
            "/api/chat/sessions",
            json={
                "sessionId": "lifecycle-1",
                "config": {"systemPrompt": "You are helpful"},
            },
        )
        assert create_response.status_code == 200

        # Get session
        get_response = await client.get("/api/chat/sessions/lifecycle-1")
        assert get_response.status_code == 200
        assert len(get_response.json()["session"]["messages"]) == 1

        # Delete session
        delete_response = await client.delete("/api/chat/sessions/lifecycle-1")
        assert delete_response.status_code == 200

        # Verify deleted
        final_get = await client.get("/api/chat/sessions/lifecycle-1")
        assert final_get.status_code == 404

    @pytest.mark.asyncio
    async def test_multiple_sessions_independent(self, client: AsyncClient):
        """Multiple sessions are independent."""
        # Create two sessions
        await client.post("/api/chat/sessions", json={"sessionId": "session-1"})
        await client.post(
            "/api/chat/sessions",
            json={
                "sessionId": "session-2",
                "config": {"systemPrompt": "Different prompt"},
            },
        )

        # Get both sessions
        response1 = await client.get("/api/chat/sessions/session-1")
        response2 = await client.get("/api/chat/sessions/session-2")

        assert response1.status_code == 200
        assert response2.status_code == 200

        # Verify independence
        assert len(response1.json()["session"]["messages"]) == 0
        assert len(response2.json()["session"]["messages"]) == 1

        # Delete one session
        await client.delete("/api/chat/sessions/session-1")

        # Verify other still exists
        response2_after = await client.get("/api/chat/sessions/session-2")
        assert response2_after.status_code == 200
