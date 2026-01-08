"""Tests for CallbackRegistry."""

import pytest

from adkflow_runner.runner.callbacks.handlers.base import BaseHandler
from adkflow_runner.runner.callbacks.registry import CallbackRegistry


class MockHandler(BaseHandler):
    """Mock handler for testing."""

    DEFAULT_PRIORITY = 200

    def __init__(self, name: str = "mock", **kwargs):
        super().__init__(**kwargs)
        self.name = name


class TestCallbackRegistry:
    """Tests for CallbackRegistry class."""

    def test_create_registry(self):
        """Registry is created with agent name."""
        registry = CallbackRegistry("TestAgent")
        assert registry.agent_name == "TestAgent"
        assert registry.agent_id is None
        assert len(registry) == 0

    def test_create_with_agent_id(self):
        """Registry accepts optional agent_id."""
        registry = CallbackRegistry("TestAgent", agent_id="agent-123")
        assert registry.agent_id == "agent-123"

    def test_register_handler(self):
        """Handler can be registered."""
        registry = CallbackRegistry("TestAgent")
        handler = MockHandler()
        registry.register(handler)
        assert len(registry) == 1

    def test_register_uses_default_priority(self):
        """Handler uses DEFAULT_PRIORITY when no priority specified."""
        registry = CallbackRegistry("TestAgent")
        handler = MockHandler()
        registry.register(handler)
        assert handler.priority == 200  # MockHandler.DEFAULT_PRIORITY

    def test_register_with_custom_priority(self):
        """Priority can be overridden at registration."""
        registry = CallbackRegistry("TestAgent")
        handler = MockHandler()
        registry.register(handler, priority=50)
        assert handler.priority == 50

    def test_auto_priority_assignment(self):
        """Auto-assigns priority when handler has no DEFAULT_PRIORITY."""

        class NoPriorityHandler(BaseHandler):
            pass

        registry = CallbackRegistry("TestAgent")
        h1 = NoPriorityHandler()
        h2 = NoPriorityHandler()
        h3 = NoPriorityHandler()

        registry.register(h1)
        registry.register(h2)
        registry.register(h3)

        assert h1.priority == 100
        assert h2.priority == 200
        assert h3.priority == 300

    def test_handlers_sorted_by_priority(self):
        """get_handlers returns handlers sorted by priority (ascending)."""
        registry = CallbackRegistry("TestAgent")

        h_low = MockHandler(name="low", priority=100)
        h_high = MockHandler(name="high", priority=300)
        h_mid = MockHandler(name="mid", priority=200)

        # Register in non-sorted order
        registry.register(h_high)
        registry.register(h_low)
        registry.register(h_mid)

        handlers = registry.get_handlers()
        assert [h.name for h in handlers] == ["low", "mid", "high"]

    def test_duplicate_registration_raises(self):
        """Cannot register same handler twice."""
        registry = CallbackRegistry("TestAgent")
        handler = MockHandler()
        registry.register(handler)

        with pytest.raises(ValueError, match="already registered"):
            registry.register(handler)

    def test_unregister_handler(self):
        """Handler can be unregistered."""
        registry = CallbackRegistry("TestAgent")
        handler = MockHandler()
        registry.register(handler)
        assert len(registry) == 1

        result = registry.unregister(handler)
        assert result is True
        assert len(registry) == 0

    def test_unregister_nonexistent_returns_false(self):
        """Unregistering nonexistent handler returns False."""
        registry = CallbackRegistry("TestAgent")
        handler = MockHandler()
        result = registry.unregister(handler)
        assert result is False

    def test_freeze_prevents_registration(self):
        """Cannot register handlers when frozen."""
        registry = CallbackRegistry("TestAgent")
        registry.freeze()

        handler = MockHandler()
        with pytest.raises(RuntimeError, match="Cannot register"):
            registry.register(handler)

    def test_freeze_prevents_unregistration(self):
        """Cannot unregister handlers when frozen."""
        registry = CallbackRegistry("TestAgent")
        handler = MockHandler()
        registry.register(handler)
        registry.freeze()

        with pytest.raises(RuntimeError, match="Cannot unregister"):
            registry.unregister(handler)

    def test_unfreeze_allows_registration(self):
        """Unfreezing allows registration again."""
        registry = CallbackRegistry("TestAgent")
        registry.freeze()
        registry.unfreeze()

        handler = MockHandler()
        registry.register(handler)
        assert len(registry) == 1

    def test_to_adk_callbacks_returns_dict(self):
        """to_adk_callbacks returns dict with all callback types."""
        registry = CallbackRegistry("TestAgent")
        callbacks = registry.to_adk_callbacks()

        expected_keys = [
            "before_agent_callback",
            "after_agent_callback",
            "before_model_callback",
            "after_model_callback",
            "before_tool_callback",
            "after_tool_callback",
        ]
        for key in expected_keys:
            assert key in callbacks
            assert callable(callbacks[key])

    def test_repr(self):
        """Registry has informative repr."""
        registry = CallbackRegistry("TestAgent")
        registry.register(MockHandler())
        repr_str = repr(registry)
        assert "TestAgent" in repr_str
        assert "MockHandler" in repr_str
