"""Type definitions for the hooks system."""

from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any, Callable, Protocol


class HookAction(str, Enum):
    """Actions that a hook can return to control execution flow."""

    CONTINUE = "continue"  # Proceed normally (default)
    SKIP = "skip"  # Skip this operation, use default/empty result
    RETRY = "retry"  # Retry the operation with optional modifications
    ABORT = "abort"  # Stop the workflow with an error
    REPLACE = "replace"  # Use modified_data instead of original


@dataclass
class RetryConfig:
    """Configuration for retry behavior when action=RETRY."""

    max_attempts: int = 3
    delay_seconds: float = 1.0
    backoff_multiplier: float = 2.0
    modified_data: Any = None  # Optional modified input for retry


@dataclass
class HookResult:
    """Result returned by a hook to control execution flow.

    Attributes:
        action: The action to take (CONTINUE, SKIP, RETRY, ABORT, REPLACE)
        modified_data: Replacement data when action=REPLACE
        retry_config: Configuration when action=RETRY
        error: Error message when action=ABORT
        metadata: Additional info passed to subsequent hooks in the chain
    """

    action: HookAction = HookAction.CONTINUE
    modified_data: Any = None
    retry_config: RetryConfig | None = None
    error: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)

    @classmethod
    def continue_(cls, metadata: dict[str, Any] | None = None) -> "HookResult":
        """Create a CONTINUE result."""
        return cls(action=HookAction.CONTINUE, metadata=metadata or {})

    @classmethod
    def skip(cls, metadata: dict[str, Any] | None = None) -> "HookResult":
        """Create a SKIP result."""
        return cls(action=HookAction.SKIP, metadata=metadata or {})

    @classmethod
    def retry(
        cls,
        config: RetryConfig | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> "HookResult":
        """Create a RETRY result."""
        return cls(
            action=HookAction.RETRY,
            retry_config=config or RetryConfig(),
            metadata=metadata or {},
        )

    @classmethod
    def abort(cls, error: str, metadata: dict[str, Any] | None = None) -> "HookResult":
        """Create an ABORT result."""
        return cls(action=HookAction.ABORT, error=error, metadata=metadata or {})

    @classmethod
    def replace(cls, data: Any, metadata: dict[str, Any] | None = None) -> "HookResult":
        """Create a REPLACE result with modified data."""
        return cls(
            action=HookAction.REPLACE, modified_data=data, metadata=metadata or {}
        )


class StateAccessor(Protocol):
    """Protocol for accessing workflow state from hooks."""

    def get(self, key: str, default: Any = None) -> Any:
        """Get a value from state."""
        ...

    def set(self, key: str, value: Any) -> None:
        """Set a value in state."""
        ...

    def has(self, key: str) -> bool:
        """Check if key exists in state."""
        ...

    def delete(self, key: str) -> None:
        """Delete a key from state."""
        ...


class EmitFn(Protocol):
    """Protocol for event emission function."""

    async def __call__(self, event: Any) -> None:
        """Emit an event."""
        ...


@dataclass
class HookContext:
    """Context passed to hooks during execution.

    Provides access to the current execution state, hook-specific data,
    and services for interacting with the workflow.
    """

    # Hook identification
    hook_name: str  # e.g., "before_tool_call"

    # Run identification
    run_id: str
    session_id: str
    project_path: Path

    # Position in workflow
    phase: str  # "run", "node", "agent", "tool", "llm", "data", "user_input", "graph"
    node_id: str | None = None
    node_name: str | None = None
    agent_name: str | None = None

    # Hook-specific data (varies by hook type)
    data: dict[str, Any] = field(default_factory=dict)

    # Accumulated metadata from previous hooks in chain
    metadata: dict[str, Any] = field(default_factory=dict)

    # Services (set by executor)
    _state: StateAccessor | None = field(default=None, repr=False)
    _emit: EmitFn | None = field(default=None, repr=False)

    @property
    def state(self) -> StateAccessor:
        """Access workflow state."""
        if self._state is None:
            raise RuntimeError("State accessor not available in this context")
        return self._state

    @property
    def emit(self) -> EmitFn:
        """Emit events to callbacks."""
        if self._emit is None:
            raise RuntimeError("Emit function not available in this context")
        return self._emit

    def with_data(self, **kwargs: Any) -> "HookContext":
        """Create a new context with updated data."""
        new_data = {**self.data, **kwargs}
        return HookContext(
            hook_name=self.hook_name,
            run_id=self.run_id,
            session_id=self.session_id,
            project_path=self.project_path,
            phase=self.phase,
            node_id=self.node_id,
            node_name=self.node_name,
            agent_name=self.agent_name,
            data=new_data,
            metadata=self.metadata,
            _state=self._state,
            _emit=self._emit,
        )

    def with_metadata(self, **kwargs: Any) -> "HookContext":
        """Create a new context with updated metadata."""
        new_metadata = {**self.metadata, **kwargs}
        return HookContext(
            hook_name=self.hook_name,
            run_id=self.run_id,
            session_id=self.session_id,
            project_path=self.project_path,
            phase=self.phase,
            node_id=self.node_id,
            node_name=self.node_name,
            agent_name=self.agent_name,
            data=self.data,
            metadata=new_metadata,
            _state=self._state,
            _emit=self._emit,
        )


# Type alias for hook functions
HookFn = Callable[[HookContext], HookResult]
AsyncHookFn = Callable[[HookContext], "HookResult"]


@dataclass
class HookSpec:
    """Specification for a registered hook.

    Attributes:
        hook_name: The hook point name (e.g., "before_tool_call")
        handler: The hook function (sync or async)
        priority: Execution priority (higher = runs first)
        timeout_seconds: Maximum execution time for this hook
        extension_id: ID of the extension that registered this hook
        method_name: Name of the method if class-based
    """

    hook_name: str
    handler: Callable[[HookContext], HookResult | Any]
    priority: int = 0
    timeout_seconds: float = 30.0
    extension_id: str | None = None
    method_name: str | None = None

    def __hash__(self) -> int:
        return hash(
            (self.hook_name, self.priority, self.extension_id, self.method_name)
        )


# All valid hook names
HOOK_NAMES = frozenset(
    [
        # Run lifecycle
        "before_run",
        "after_run",
        "on_run_error",
        "on_run_cancel",
        # Custom node lifecycle
        "before_node_execute",
        "after_node_execute",
        "on_node_error",
        "on_node_skip",
        # Agent lifecycle
        "before_agent_execute",
        "after_agent_execute",
        "on_agent_error",
        "on_agent_transfer",
        # Tool lifecycle
        "before_tool_call",
        "after_tool_result",
        "on_tool_error",
        "on_tool_timeout",
        # LLM interaction
        "before_llm_request",
        "after_llm_response",
        "on_llm_stream_chunk",
        "on_llm_error",
        # Data flow
        "on_state_read",
        "on_state_write",
        "on_data_transfer",
        # User interaction
        "before_user_input",
        "after_user_input",
        "on_user_input_timeout",
        # Graph execution
        "before_layer_execute",
        "after_layer_execute",
        "on_execution_plan",
        # Meta hooks
        "on_hook_error",
    ]
)


def validate_hook_name(name: str) -> None:
    """Validate that a hook name is valid.

    Raises:
        ValueError: If the hook name is not recognized
    """
    if name not in HOOK_NAMES:
        raise ValueError(
            f"Unknown hook name: '{name}'. Valid hooks: {sorted(HOOK_NAMES)}"
        )
