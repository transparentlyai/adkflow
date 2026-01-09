"""Chat service data models using Pydantic v2.

Provides models for:
- Chat messages and sessions
- Session configuration
- API request/response models
- SSE stream events
"""

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    """Single message in a chat session."""

    role: Literal["user", "assistant", "system"] = Field(
        ..., description="Message role"
    )
    content: str = Field(..., description="Message content")
    timestamp: datetime = Field(
        default_factory=datetime.utcnow, description="Message timestamp"
    )


class ChatSessionConfig(BaseModel):
    """Configuration for a chat session."""

    model_config = {"populate_by_name": True}

    system_prompt: str | None = Field(
        default=None,
        alias="systemPrompt",
        serialization_alias="systemPrompt",
        description="System prompt for the chat session",
    )
    context: dict[str, Any] | None = Field(
        default=None, description="Arbitrary context data passed by the caller"
    )
    model: str | None = Field(
        default=None, description="Model override (uses project default if not set)"
    )


class ChatSession(BaseModel):
    """A chat session with message history."""

    model_config = {"populate_by_name": True}

    id: str = Field(..., description="Session identifier")
    config: ChatSessionConfig = Field(
        default_factory=ChatSessionConfig, description="Session configuration"
    )
    messages: list[ChatMessage] = Field(
        default_factory=list, description="Message history"
    )
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        alias="createdAt",
        serialization_alias="createdAt",
        description="Session creation timestamp",
    )
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        alias="updatedAt",
        serialization_alias="updatedAt",
        description="Last update timestamp",
    )


# API Request/Response Models


class CreateSessionRequest(BaseModel):
    """Request to create a new chat session."""

    model_config = {"populate_by_name": True}

    session_id: str = Field(
        ...,
        alias="sessionId",
        description="Caller-provided session identifier",
    )
    config: ChatSessionConfig = Field(
        default_factory=ChatSessionConfig, description="Session configuration"
    )


class CreateSessionResponse(BaseModel):
    """Response after creating a chat session."""

    session: ChatSession


class GetSessionResponse(BaseModel):
    """Response for getting a chat session."""

    session: ChatSession


class DeleteSessionResponse(BaseModel):
    """Response after deleting a chat session."""

    success: bool
    message: str


class SendMessageRequest(BaseModel):
    """Request to send a message in a chat session."""

    content: str = Field(..., description="Message content")


class ChatStreamEvent(BaseModel):
    """SSE event for streaming chat responses."""

    type: Literal["content", "done", "error"] = Field(..., description="Event type")
    content: str | None = Field(
        default=None, description="Content chunk (for type='content')"
    )
    error: str | None = Field(
        default=None, description="Error message (for type='error')"
    )
