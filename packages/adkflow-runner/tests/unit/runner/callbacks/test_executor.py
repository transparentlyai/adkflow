"""Tests for CallbackExecutor."""

import pytest

from adkflow_runner.runner.callbacks.executor import CallbackExecutor
from adkflow_runner.runner.callbacks.handlers.base import BaseHandler
from adkflow_runner.runner.callbacks.registry import CallbackRegistry
from adkflow_runner.runner.callbacks.types import (
    ErrorPolicy,
    FlowControl,
    HandlerResult,
)


class TrackingHandler(BaseHandler):
    """Handler that tracks calls for testing."""

    DEFAULT_PRIORITY = 100

    def __init__(self, name: str = "tracking", **kwargs):
        super().__init__(**kwargs)
        self.name = name
        self.calls = []

    def before_model(self, callback_context, llm_request, agent_name):
        self.calls.append(("before_model", agent_name))
        return None

    def after_model(self, callback_context, llm_response, agent_name):
        self.calls.append(("after_model", agent_name))
        return None


class SkipHandler(BaseHandler):
    """Handler that returns SKIP."""

    DEFAULT_PRIORITY = 100

    def before_model(self, callback_context, llm_request, agent_name):
        return HandlerResult.skip(reason="test skip")


class AbortHandler(BaseHandler):
    """Handler that returns ABORT."""

    DEFAULT_PRIORITY = 100

    def before_model(self, callback_context, llm_request, agent_name):
        return HandlerResult.abort("test abort error")


class ReplaceHandler(BaseHandler):
    """Handler that returns REPLACE with modified data."""

    DEFAULT_PRIORITY = 100

    def before_model(self, callback_context, llm_request, agent_name):
        return HandlerResult.replace({"modified": True})


class ErrorHandler(BaseHandler):
    """Handler that raises an exception."""

    DEFAULT_PRIORITY = 100

    def before_model(self, callback_context, llm_request, agent_name):
        raise ValueError("test error")


class TestCallbackExecutor:
    """Tests for CallbackExecutor class."""

    def test_execute_sync_chain_calls_handlers(self):
        """Sync chain executes all handlers in order."""
        registry = CallbackRegistry("TestAgent")
        h1 = TrackingHandler(name="h1", priority=100)
        h2 = TrackingHandler(name="h2", priority=200)
        registry.register(h1)
        registry.register(h2)

        executor = CallbackExecutor(registry)
        executor._execute_sync_chain(
            "before_model",
            callback_context=None,
            llm_request=None,
        )

        assert h1.calls == [("before_model", "TestAgent")]
        assert h2.calls == [("before_model", "TestAgent")]

    def test_execute_sync_chain_skip_stops_chain(self):
        """SKIP action stops handler chain and returns."""
        registry = CallbackRegistry("TestAgent")
        skip_handler = SkipHandler(priority=100)
        tracking = TrackingHandler(name="after_skip", priority=200)
        registry.register(skip_handler)
        registry.register(tracking)

        executor = CallbackExecutor(registry)
        result = executor._execute_sync_chain(
            "before_model",
            callback_context=None,
            llm_request=None,
        )

        assert result.action == FlowControl.SKIP
        assert tracking.calls == []  # Should not be called

    def test_execute_sync_chain_abort_raises(self):
        """ABORT action raises RuntimeError."""
        registry = CallbackRegistry("TestAgent")
        registry.register(AbortHandler())

        executor = CallbackExecutor(registry)

        with pytest.raises(RuntimeError, match="test abort error"):
            executor._execute_sync_chain(
                "before_model",
                callback_context=None,
                llm_request=None,
            )

    def test_execute_sync_chain_replace_updates_kwargs(self):
        """REPLACE action updates kwargs for next handler."""
        registry = CallbackRegistry("TestAgent")
        registry.register(ReplaceHandler(priority=100))

        tracking = TrackingHandler(priority=200)
        registry.register(tracking)

        executor = CallbackExecutor(registry)
        executor._execute_sync_chain(
            "before_model",
            callback_context=None,
            llm_request=None,
        )

        # Handler chain should continue after REPLACE
        assert tracking.calls == [("before_model", "TestAgent")]

    def test_error_policy_continue(self):
        """Error with continue policy logs warning and continues."""
        registry = CallbackRegistry("TestAgent")
        error_handler = ErrorHandler(on_error=ErrorPolicy.CONTINUE)
        tracking = TrackingHandler(priority=200)
        registry.register(error_handler)
        registry.register(tracking)

        executor = CallbackExecutor(registry)
        result = executor._execute_sync_chain(
            "before_model",
            callback_context=None,
            llm_request=None,
        )

        # Should continue to next handler
        assert tracking.calls == [("before_model", "TestAgent")]
        assert result.action == FlowControl.CONTINUE

    def test_error_policy_abort(self):
        """Error with abort policy re-raises exception."""
        registry = CallbackRegistry("TestAgent")
        error_handler = ErrorHandler(on_error=ErrorPolicy.ABORT)
        registry.register(error_handler)

        executor = CallbackExecutor(registry)

        with pytest.raises(ValueError, match="test error"):
            executor._execute_sync_chain(
                "before_model",
                callback_context=None,
                llm_request=None,
            )

    def test_create_adk_callbacks_freezes_registry(self):
        """create_adk_callbacks freezes the registry."""
        registry = CallbackRegistry("TestAgent")
        executor = CallbackExecutor(registry)

        executor.create_adk_callbacks()

        assert registry._frozen is True

    def test_create_adk_callbacks_returns_all_types(self):
        """create_adk_callbacks returns all callback types."""
        registry = CallbackRegistry("TestAgent")
        executor = CallbackExecutor(registry)

        callbacks = executor.create_adk_callbacks()

        expected = [
            "before_agent_callback",
            "after_agent_callback",
            "before_model_callback",
            "after_model_callback",
            "before_tool_callback",
            "after_tool_callback",
        ]
        for key in expected:
            assert key in callbacks
            assert callable(callbacks[key])


class TestAsyncExecution:
    """Tests for async handler execution."""

    @pytest.mark.asyncio
    async def test_execute_async_chain(self):
        """Async chain executes handlers."""

        class AsyncHandler(BaseHandler):
            DEFAULT_PRIORITY = 100

            def __init__(self):
                super().__init__()
                self.called = False

            async def before_tool(self, tool, args, tool_context, agent_name):
                self.called = True
                return None

        registry = CallbackRegistry("TestAgent")
        handler = AsyncHandler()
        registry.register(handler)

        executor = CallbackExecutor(registry)
        result, data = await executor._execute_async_chain(
            "before_tool",
            tool=None,
            args={"test": True},
            tool_context=None,
        )

        assert handler.called is True
        assert result.action == FlowControl.CONTINUE

    @pytest.mark.asyncio
    async def test_async_skip_returns_result(self):
        """Async handler SKIP stops chain."""

        class AsyncSkipHandler(BaseHandler):
            DEFAULT_PRIORITY = 100

            async def before_tool(self, tool, args, tool_context, agent_name):
                return HandlerResult.skip(reason="async skip")

        registry = CallbackRegistry("TestAgent")
        registry.register(AsyncSkipHandler())

        executor = CallbackExecutor(registry)
        result, _ = await executor._execute_async_chain(
            "before_tool",
            tool=None,
            args={},
            tool_context=None,
        )

        assert result.action == FlowControl.SKIP

    @pytest.mark.asyncio
    async def test_async_replace_returns_modified_data(self):
        """Async handler REPLACE returns modified data."""

        class AsyncReplaceHandler(BaseHandler):
            DEFAULT_PRIORITY = 100

            async def before_tool(self, tool, args, tool_context, agent_name):
                return HandlerResult.replace({"replaced": True})

        registry = CallbackRegistry("TestAgent")
        registry.register(AsyncReplaceHandler())

        executor = CallbackExecutor(registry)
        result, data = await executor._execute_async_chain(
            "before_tool",
            tool=None,
            args={"original": True},
            tool_context=None,
        )

        assert result.action == FlowControl.CONTINUE  # Chain continues
        assert data == {"replaced": True}


class TestSyncAsyncBoundaries:
    """Tests for sync/async boundary enforcement."""

    def test_sync_chain_rejects_awaitable(self):
        """before_model/after_model raise TypeError if handler returns awaitable."""

        class BadAsyncHandler(BaseHandler):
            DEFAULT_PRIORITY = 100

            def before_model(self, callback_context, llm_request, agent_name):
                async def bad():
                    pass

                return bad()  # Returns coroutine

        registry = CallbackRegistry("TestAgent")
        registry.register(BadAsyncHandler())
        executor = CallbackExecutor(registry)

        with pytest.raises(TypeError, match="awaitable"):
            executor._execute_sync_chain(
                "before_model",
                callback_context=None,
                llm_request=None,
            )

    def test_agent_callback_ignores_awaitable(self):
        """Agent callbacks warn and ignore awaitables."""

        class AsyncAgentHandler(BaseHandler):
            DEFAULT_PRIORITY = 100
            calls = []

            def before_agent(self, callback_context, agent_name):
                AsyncAgentHandler.calls.append("before_agent")

                async def bad():
                    pass

                return bad()

        registry = CallbackRegistry("TestAgent")
        registry.register(AsyncAgentHandler())
        executor = CallbackExecutor(registry)

        # Reset calls tracking
        AsyncAgentHandler.calls = []

        # Should not raise, should log warning
        executor._execute_agent_callback("before_agent", callback_context=None)

        # The method was called (returned awaitable which was ignored)
        assert AsyncAgentHandler.calls == ["before_agent"]


class TestHandlerCapabilities:
    """Tests for handler capability caching."""

    def test_capabilities_detected_correctly(self):
        """Only overridden methods are detected as capabilities."""

        class PartialHandler(BaseHandler):
            DEFAULT_PRIORITY = 100

            def before_model(self, callback_context, llm_request, agent_name):
                pass  # Only implements before_model

        registry = CallbackRegistry("TestAgent")
        handler = PartialHandler()
        registry.register(handler)

        caps = registry._handler_capabilities[id(handler)]
        assert "before_model" in caps
        assert "after_model" not in caps
        assert "before_agent" not in caps
        assert "after_agent" not in caps
        assert "before_tool" not in caps
        assert "after_tool" not in caps

    def test_get_handlers_for_filters(self):
        """get_handlers_for returns only handlers implementing method."""

        class OnlyBeforeModel(BaseHandler):
            DEFAULT_PRIORITY = 100

            def before_model(self, callback_context, llm_request, agent_name):
                pass

        class OnlyAfterModel(BaseHandler):
            DEFAULT_PRIORITY = 200

            def after_model(self, callback_context, llm_response, agent_name):
                pass

        registry = CallbackRegistry("TestAgent")
        h1 = OnlyBeforeModel()
        h2 = OnlyAfterModel()
        registry.register(h1)
        registry.register(h2)

        assert registry.get_handlers_for("before_model") == [h1]
        assert registry.get_handlers_for("after_model") == [h2]
        assert registry.get_handlers_for("before_agent") == []

    def test_get_handlers_for_preserves_priority_order(self):
        """get_handlers_for returns handlers in priority order."""

        class HighPriorityHandler(BaseHandler):
            DEFAULT_PRIORITY = 50

            def before_model(self, callback_context, llm_request, agent_name):
                pass

        class LowPriorityHandler(BaseHandler):
            DEFAULT_PRIORITY = 200

            def before_model(self, callback_context, llm_request, agent_name):
                pass

        registry = CallbackRegistry("TestAgent")
        h_low = LowPriorityHandler()
        h_high = HighPriorityHandler()
        # Register in reverse priority order
        registry.register(h_low)
        registry.register(h_high)

        handlers = registry.get_handlers_for("before_model")
        assert handlers == [h_high, h_low]  # Sorted by priority

    def test_unregister_cleans_capabilities_cache(self):
        """Unregistering a handler removes its capabilities from cache."""

        class SimpleHandler(BaseHandler):
            DEFAULT_PRIORITY = 100

            def before_model(self, callback_context, llm_request, agent_name):
                pass

        registry = CallbackRegistry("TestAgent")
        handler = SimpleHandler()
        registry.register(handler)

        handler_id = id(handler)
        assert handler_id in registry._handler_capabilities

        registry.unregister(handler)
        assert handler_id not in registry._handler_capabilities
