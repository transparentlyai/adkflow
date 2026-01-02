"""Type definitions for the workflow runner."""

from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any, Protocol


class RunStatus(Enum):
    """Status of a workflow run."""

    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class EventType(Enum):
    """Types of execution events."""

    RUN_START = "run_start"
    AGENT_START = "agent_start"
    AGENT_OUTPUT = "agent_output"
    AGENT_END = "agent_end"
    TOOL_CALL = "tool_call"
    TOOL_RESULT = "tool_result"
    THINKING = "thinking"
    ERROR = "run_error"
    RUN_COMPLETE = "run_complete"

    # User input events
    USER_INPUT_REQUIRED = "user_input_required"
    USER_INPUT_RECEIVED = "user_input_received"
    USER_INPUT_TIMEOUT = "user_input_timeout"

    # Custom node events
    CUSTOM_NODE_START = "custom_node_start"
    CUSTOM_NODE_END = "custom_node_end"
    CUSTOM_NODE_ERROR = "custom_node_error"


@dataclass
class RunEvent:
    """An event during workflow execution."""

    type: EventType
    timestamp: float
    agent_id: str | None = None
    agent_name: str | None = None
    data: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "type": self.type.value,
            "timestamp": self.timestamp,
            "agent_id": self.agent_id,
            "agent_name": self.agent_name,
            "data": self.data,
        }


@dataclass
class RunResult:
    """Result of a workflow run."""

    run_id: str
    status: RunStatus
    output: str | None = None
    error: str | None = None
    events: list[RunEvent] = field(default_factory=list)
    duration_ms: float = 0
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "run_id": self.run_id,
            "status": self.status.value,
            "output": self.output,
            "error": self.error,
            "events": [e.to_dict() for e in self.events],
            "duration_ms": self.duration_ms,
            "metadata": self.metadata,
        }


@dataclass
class UserInputRequest:
    """Request for user input during workflow execution."""

    request_id: str
    node_id: str
    node_name: str
    variable_name: str
    previous_output: str | None  # Output from previous agent (None if trigger mode)
    is_trigger: bool  # True if no input connection
    timeout_seconds: float
    timeout_behavior: str  # "pass_through" | "predefined_text" | "error"
    predefined_text: str

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for event data."""
        return {
            "request_id": self.request_id,
            "node_id": self.node_id,
            "node_name": self.node_name,
            "variable_name": self.variable_name,
            "previous_output": self.previous_output,
            "is_trigger": self.is_trigger,
            "timeout_seconds": self.timeout_seconds,
            "timeout_behavior": self.timeout_behavior,
            "predefined_text": self.predefined_text,
        }


class UserInputProvider(Protocol):
    """Protocol for providing user input during workflow execution.

    Implementations handle the actual user interaction (CLI prompts, UI dialogs, etc.)
    """

    async def request_input(self, request: UserInputRequest) -> str | None:
        """Request user input.

        Args:
            request: The input request context

        Returns:
            User input string, or None if skipped/cancelled

        Raises:
            TimeoutError: If timeout_behavior is "error" and timeout occurs
            asyncio.CancelledError: If the request was cancelled
        """
        ...


class RunnerCallbacks(Protocol):
    """Protocol for execution callbacks."""

    async def on_event(self, event: RunEvent) -> None:
        """Called when an event occurs during execution."""
        ...


class NoOpCallbacks:
    """No-op callbacks implementation."""

    async def on_event(self, event: RunEvent) -> None:
        pass


@dataclass
class RunConfig:
    """Configuration for a workflow run."""

    project_path: Path
    tab_id: str | None = None
    input_data: dict[str, Any] = field(default_factory=dict)
    callbacks: RunnerCallbacks | None = None
    timeout_seconds: float = 300  # 5 minutes default
    validate: bool = True
    user_input_provider: UserInputProvider | None = None
    run_id: str | None = (
        None  # Optional: pass in run_id for consistency with external tracking
    )
