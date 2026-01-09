"""Chat service for AI conversations.

Provides:
- Session management (in-memory storage)
- LLM integration with Google AI / Vertex AI
- Streaming responses
"""

import json
import os
from collections.abc import AsyncGenerator
from datetime import datetime
from pathlib import Path

from google import genai
from google.genai import types

from backend.src.models.chat import (
    ChatMessage,
    ChatSession,
    ChatSessionConfig,
    ChatStreamEvent,
)
from backend.src.api.routes.settings_routes import parse_env_file


class ChatService:
    """Service for managing chat sessions and LLM interactions."""

    def __init__(self) -> None:
        """Initialize the chat service with in-memory session storage."""
        self._sessions: dict[str, ChatSession] = {}

    def create_session(self, session_id: str, config: ChatSessionConfig) -> ChatSession:
        """Create a new chat session.

        Args:
            session_id: Unique session identifier (provided by caller)
            config: Session configuration

        Returns:
            The created ChatSession

        Raises:
            ValueError: If session already exists
        """
        if session_id in self._sessions:
            raise ValueError(f"Session already exists: {session_id}")

        session = ChatSession(
            id=session_id,
            config=config,
            messages=[],  # System prompt stays in config, not in messages
        )

        self._sessions[session_id] = session
        return session

    def get_session(self, session_id: str) -> ChatSession | None:
        """Get a chat session by ID.

        Args:
            session_id: Session identifier

        Returns:
            ChatSession if found, None otherwise
        """
        return self._sessions.get(session_id)

    def delete_session(self, session_id: str) -> bool:
        """Delete a chat session.

        Args:
            session_id: Session identifier

        Returns:
            True if deleted, False if not found
        """
        if session_id in self._sessions:
            del self._sessions[session_id]
            return True
        return False

    def list_sessions(self) -> list[ChatSession]:
        """List all active sessions.

        Returns:
            List of all ChatSessions
        """
        return list(self._sessions.values())

    async def send_message(
        self,
        session_id: str,
        content: str,
        project_path: str | None = None,
    ) -> AsyncGenerator[ChatStreamEvent, None]:
        """Send a message and stream the response.

        Args:
            session_id: Session identifier
            content: User message content
            project_path: Optional project path for model config lookup

        Yields:
            ChatStreamEvent for each content chunk, done, or error

        Raises:
            ValueError: If session not found
        """
        session = self._sessions.get(session_id)
        if not session:
            yield ChatStreamEvent(
                type="error", error=f"Session not found: {session_id}"
            )
            return

        # Add user message to history
        user_message = ChatMessage(
            role="user",
            content=content,
            timestamp=datetime.utcnow(),
        )
        session.messages.append(user_message)
        session.updated_at = datetime.utcnow()

        try:
            # Get model and client configuration
            model_name = self._resolve_model(session.config.model, project_path)
            client = self._create_client(project_path)

            # Build messages for LLM
            llm_messages = self._build_llm_messages(session)

            # Stream response from LLM
            assistant_content = ""

            # The stream method is a coroutine that returns an AsyncIterator
            stream = await client.aio.models.generate_content_stream(
                model=model_name,
                contents=llm_messages,
            )
            async for chunk in stream:
                if chunk.text:
                    assistant_content += chunk.text
                    yield ChatStreamEvent(type="content", content=chunk.text)

            # Add assistant message to history
            assistant_message = ChatMessage(
                role="assistant",
                content=assistant_content,
                timestamp=datetime.utcnow(),
            )
            session.messages.append(assistant_message)
            session.updated_at = datetime.utcnow()

            yield ChatStreamEvent(type="done")

        except Exception as e:
            yield ChatStreamEvent(type="error", error=str(e))

    def _resolve_model(self, config_model: str | None, project_path: str | None) -> str:
        """Resolve the model to use.

        Priority:
        1. Model from session config
        2. Default model from project settings
        3. Fallback default

        Args:
            config_model: Model from session config
            project_path: Project path for settings lookup

        Returns:
            Model name to use
        """
        if config_model:
            return config_model

        if project_path:
            try:
                manifest_path = Path(project_path) / "manifest.json"
                if manifest_path.exists():
                    with open(manifest_path) as f:
                        manifest = json.load(f)
                        settings = manifest.get("settings", {})
                        default_model = settings.get("defaultModel")
                        if default_model:
                            return default_model
            except Exception:
                pass  # Fall through to default

        return "gemini-2.5-flash"

    def _create_client(self, project_path: str | None) -> genai.Client:
        """Create a Google GenAI client with appropriate configuration.

        Reads configuration from:
        1. Project .env file (if project_path provided)
        2. System environment variables

        Args:
            project_path: Optional project path for .env lookup

        Returns:
            Configured genai.Client
        """
        env_vars: dict[str, str] = {}

        # Load from project .env if available
        if project_path:
            env_file = Path(project_path) / ".env"
            if env_file.exists():
                env_vars = parse_env_file(env_file)

        # Determine auth mode
        use_vertex = (
            env_vars.get(
                "GOOGLE_GENAI_USE_VERTEXAI",
                os.environ.get("GOOGLE_GENAI_USE_VERTEXAI", "false"),
            ).lower()
            == "true"
        )

        if use_vertex:
            # Vertex AI configuration
            project = env_vars.get(
                "GOOGLE_CLOUD_PROJECT",
                os.environ.get("GOOGLE_CLOUD_PROJECT"),
            )
            location = env_vars.get(
                "GOOGLE_CLOUD_LOCATION",
                os.environ.get("GOOGLE_CLOUD_LOCATION", "us-central1"),
            )
            return genai.Client(vertexai=True, project=project, location=location)
        else:
            # API Key configuration
            api_key = env_vars.get(
                "GOOGLE_API_KEY",
                os.environ.get("GOOGLE_API_KEY"),
            )
            return genai.Client(api_key=api_key)

    def _build_llm_messages(self, session: ChatSession) -> list[types.Content]:
        """Build messages array for LLM from session history.

        Converts ChatMessage list to google.genai Content format.
        Prepends system prompt from config if provided.

        Args:
            session: Chat session with message history

        Returns:
            List of Content objects for the LLM
        """
        contents: list[types.Content] = []

        # Add system prompt from config as the first message pair
        if session.config.system_prompt:
            content_text = session.config.system_prompt
            if session.config.context:
                context_str = json.dumps(session.config.context, indent=2)
                content_text = (
                    f"{content_text}\n\nContext:\n```json\n{context_str}\n```"
                )
            contents.append(
                types.Content(
                    role="user",
                    parts=[types.Part.from_text(text=content_text)],
                )
            )
            # Add a placeholder model response to maintain conversation flow
            contents.append(
                types.Content(
                    role="model",
                    parts=[
                        types.Part.from_text(
                            text="Understood. I'll follow these instructions."
                        )
                    ],
                )
            )

        # Add conversation messages
        for msg in session.messages:
            if msg.role == "user":
                contents.append(
                    types.Content(
                        role="user",
                        parts=[types.Part.from_text(text=msg.content)],
                    )
                )
            elif msg.role == "assistant":
                contents.append(
                    types.Content(
                        role="model",
                        parts=[types.Part.from_text(text=msg.content)],
                    )
                )

        return contents


# Singleton instance
chat_service = ChatService()
