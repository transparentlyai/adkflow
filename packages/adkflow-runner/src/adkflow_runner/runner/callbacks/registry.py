"""Callback registry for per-agent handler management.

Each agent instance gets its own registry with handlers sorted by priority.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from adkflow_runner.runner.callbacks.handlers.base import BaseHandler

if TYPE_CHECKING:
    pass


class CallbackRegistry:
    """Per-agent callback handler registry.

    Manages registration and retrieval of callback handlers for a single agent.
    Handlers are automatically sorted by priority (ascending - lower runs first).

    Attributes:
        agent_name: Name of the agent this registry belongs to
        agent_id: Optional ID of the agent

    Example:
        registry = CallbackRegistry("MyAgent", agent_id="agent-123")

        # Auto-assigned priorities: 100, 200, 300...
        registry.register(LoggingHandler())
        registry.register(EmitHandler(emit_fn))

        # Manual priority to slot between handlers
        registry.register(MyCustomHandler(), priority=150)

        # Get ADK-compatible callbacks dict
        callbacks = registry.to_adk_callbacks()
    """

    # Priority increment for auto-assignment
    PRIORITY_INCREMENT = 100

    # All callback method names for capability scanning
    CALLBACK_METHODS = frozenset(
        [
            "before_agent",
            "after_agent",
            "before_model",
            "after_model",
            "before_tool",
            "after_tool",
        ]
    )

    def __init__(self, agent_name: str, agent_id: str | None = None):
        """Initialize the registry for an agent.

        Args:
            agent_name: Name of the agent
            agent_id: Optional agent ID for context
        """
        self.agent_name = agent_name
        self.agent_id = agent_id
        self._handlers: list[BaseHandler] = []
        self._next_auto_priority = self.PRIORITY_INCREMENT
        self._frozen = False  # Prevent registration during execution
        self._handler_capabilities: dict[int, frozenset[str]] = {}

    def register(
        self,
        handler: BaseHandler,
        priority: int | None = None,
    ) -> None:
        """Register a handler with optional priority override.

        If priority is not specified and handler has no DEFAULT_PRIORITY,
        auto-assigns: 100, 200, 300, etc.

        Args:
            handler: The handler to register
            priority: Optional priority override (lower = runs earlier)

        Raises:
            RuntimeError: If registry is frozen (during execution)
            ValueError: If handler is already registered
        """
        if self._frozen:
            raise RuntimeError(
                "Cannot register handlers during callback execution. "
                "Register all handlers before agent execution starts."
            )

        # Check for duplicate registration
        if handler in self._handlers:
            raise ValueError(
                f"Handler {handler.__class__.__name__} is already registered"
            )

        # Assign priority
        if priority is not None:
            handler.priority = priority
        elif not handler.has_priority():
            handler.priority = self._next_auto_priority
            self._next_auto_priority += self.PRIORITY_INCREMENT

        self._handlers.append(handler)
        self._scan_capabilities(handler)
        self._sort_handlers()

    def unregister(self, handler: BaseHandler) -> bool:
        """Remove a handler from the registry.

        Args:
            handler: The handler to remove

        Returns:
            True if handler was found and removed, False otherwise

        Raises:
            RuntimeError: If registry is frozen (during execution)
        """
        if self._frozen:
            raise RuntimeError("Cannot unregister handlers during callback execution")

        try:
            self._handlers.remove(handler)
            # Clean up capabilities cache
            self._handler_capabilities.pop(id(handler), None)
            return True
        except ValueError:
            return False

    def _scan_capabilities(self, handler: BaseHandler) -> None:
        """Cache which callback methods this handler implements.

        A method is considered implemented if it overrides the BaseHandler version.

        Args:
            handler: The handler to scan
        """
        capabilities = set()
        handler_type = type(handler)

        for method_name in self.CALLBACK_METHODS:
            method = getattr(handler_type, method_name, None)
            base_method = getattr(BaseHandler, method_name, None)

            # Check if method is overridden from BaseHandler
            if method is not None and method is not base_method:
                capabilities.add(method_name)

        self._handler_capabilities[id(handler)] = frozenset(capabilities)

    def get_handlers_for(self, method_name: str) -> list[BaseHandler]:
        """Get only handlers that implement the given method.

        Args:
            method_name: The callback method name (e.g., "before_model")

        Returns:
            List of handlers that implement the method, sorted by priority
        """
        return [
            h
            for h in self._handlers
            if method_name in self._handler_capabilities.get(id(h), frozenset())
        ]

    def get_handlers(self) -> list[BaseHandler]:
        """Get all handlers sorted by priority (ascending).

        Returns:
            List of handlers, lowest priority first
        """
        return list(self._handlers)

    def _sort_handlers(self) -> None:
        """Sort handlers by priority (ascending - lower runs first)."""
        self._handlers.sort(key=lambda h: h.priority)

    def freeze(self) -> None:
        """Freeze the registry to prevent modifications during execution."""
        self._frozen = True

    def unfreeze(self) -> None:
        """Unfreeze the registry to allow modifications."""
        self._frozen = False

    def to_adk_callbacks(self) -> dict[str, Any]:
        """Create ADK-compatible callback dict.

        Creates wrapper functions that route ADK callbacks through the
        registry's executor.

        Returns:
            Dict of callback functions to pass to ADK Agent constructor
        """
        from adkflow_runner.runner.callbacks.executor import CallbackExecutor

        executor = CallbackExecutor(self)
        return executor.create_adk_callbacks()

    def __len__(self) -> int:
        """Return number of registered handlers."""
        return len(self._handlers)

    def __repr__(self) -> str:
        handler_names = [h.__class__.__name__ for h in self._handlers]
        return f"CallbackRegistry(agent={self.agent_name}, handlers={handler_names})"
