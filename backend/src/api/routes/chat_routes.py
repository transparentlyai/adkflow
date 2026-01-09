"""API routes for AI chat service.

Provides endpoints for:
- Creating chat sessions
- Getting session with history
- Sending messages (with SSE streaming)
- Deleting sessions
"""

import json

from fastapi import APIRouter, HTTPException, Query, status
from sse_starlette.sse import EventSourceResponse

from backend.src.models.chat import (
    CreateSessionRequest,
    CreateSessionResponse,
    DeleteSessionResponse,
    GetSessionResponse,
    SendMessageRequest,
)
from backend.src.services.chat_service import chat_service


router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("/sessions", response_model=CreateSessionResponse)
async def create_session(request: CreateSessionRequest) -> CreateSessionResponse:
    """Create a new chat session.

    Args:
        request: Session creation request with session_id and config

    Returns:
        CreateSessionResponse with the created session

    Raises:
        HTTPException 409: If session already exists
    """
    try:
        session = chat_service.create_session(
            session_id=request.session_id,
            config=request.config,
        )
        return CreateSessionResponse(session=session)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e),
        )


@router.get("/sessions/{session_id}", response_model=GetSessionResponse)
async def get_session(session_id: str) -> GetSessionResponse:
    """Get a chat session with its message history.

    Args:
        session_id: Session identifier

    Returns:
        GetSessionResponse with the session

    Raises:
        HTTPException 404: If session not found
    """
    session = chat_service.get_session(session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session not found: {session_id}",
        )
    return GetSessionResponse(session=session)


@router.delete("/sessions/{session_id}", response_model=DeleteSessionResponse)
async def delete_session(session_id: str) -> DeleteSessionResponse:
    """Delete a chat session.

    Args:
        session_id: Session identifier

    Returns:
        DeleteSessionResponse with success status

    Raises:
        HTTPException 404: If session not found
    """
    deleted = chat_service.delete_session(session_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session not found: {session_id}",
        )
    return DeleteSessionResponse(success=True, message="Session deleted")


@router.post("/sessions/{session_id}/messages")
async def send_message(
    session_id: str,
    request: SendMessageRequest,
    project_path: str | None = Query(None, description="Project path for model config"),
):
    """Send a message and stream the response via SSE.

    Args:
        session_id: Session identifier
        request: Message request with content
        project_path: Optional project path for model config lookup

    Returns:
        EventSourceResponse with streaming chat events

    Events:
        - content: Text chunk from assistant
        - done: Stream complete
        - error: Error occurred
    """
    # Verify session exists before starting stream
    session = chat_service.get_session(session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session not found: {session_id}",
        )

    async def event_generator():
        async for event in chat_service.send_message(
            session_id=session_id,
            content=request.content,
            project_path=project_path,
        ):
            yield {
                "event": event.type,
                "data": json.dumps(event.model_dump(exclude_none=True)),
            }

    return EventSourceResponse(event_generator())
