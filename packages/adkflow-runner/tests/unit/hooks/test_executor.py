"""Tests for hook chain executor with sync/async support."""

import asyncio
from unittest.mock import AsyncMock, MagicMock

import pytest

from adkflow_runner.hooks.executor import (
    HookAbortError,
    HookExecutor,
    HookTimeoutError,
    create_hook_context,
    invoke_hooks,
)
from adkflow_runner.hooks.registry import HooksRegistry
from adkflow_runner.hooks.types import HookAction, HookContext, HookResult, HookSpec


class TestHookAbortError:
    """Tests for HookAbortError exception."""

    def test_creates_with_message_and_hook_name(self):
        """Create error with message and hook name."""
        error = HookAbortError("Test abort", "before_tool_call", "ext-1")
        assert str(error) == "Test abort"
        assert error.hook_name == "before_tool_call"
        assert error.extension_id == "ext-1"

    def test_creates_without_extension_id(self):
        """Create error without extension ID."""
        error = HookAbortError("Test abort", "before_run")
        assert error.hook_name == "before_run"
        assert error.extension_id is None


class TestHookTimeoutError:
    """Tests for HookTimeoutError exception."""

    def test_creates_with_timeout_info(self):
        """Create error with timeout information."""
        error = HookTimeoutError("before_tool_call", "ext-1", 5.0)
        assert "before_tool_call" in str(error)
        assert "ext-1" in str(error)
        assert "5.0s" in str(error)
        assert error.hook_name == "before_tool_call"
        assert error.extension_id == "ext-1"
        assert error.timeout == 5.0

    def test_creates_with_none_extension_id(self):
        """Create error with None extension ID."""
        error = HookTimeoutError("before_run", None, 10.0)
        assert "None" in str(error)
        assert error.extension_id is None


class TestHookExecutorInit:
    """Tests for HookExecutor initialization."""

    def test_creates_with_default_registry(self):
        """Create executor with default global registry."""
        executor = HookExecutor()
        assert executor.registry is not None

    def test_creates_with_custom_registry(self):
        """Create executor with custom registry."""
        custom_registry = HooksRegistry()
        executor = HookExecutor(registry=custom_registry)
        assert executor.registry is custom_registry


class TestHookExecutorExecute:
    """Tests for HookExecutor.execute method."""

    @pytest.fixture
    def registry(self):
        """Create a fresh registry for each test."""
        return HooksRegistry()

    @pytest.fixture
    def executor(self, registry):
        """Create an executor with the test registry."""
        return HookExecutor(registry=registry)

    @pytest.fixture
    def context(self, tmp_path):
        """Create a basic hook context."""
        return HookContext(
            hook_name="before_run",
            run_id="run-123",
            session_id="session-456",
            project_path=tmp_path,
            phase="test",
            data={},
            metadata={},
        )

    async def test_returns_continue_when_no_hooks(self, executor, context):
        """Return CONTINUE when no hooks registered."""
        result, data = await executor.execute(
            "before_run", context, {"initial": "data"}
        )
        assert result.action == HookAction.CONTINUE
        assert data == {"initial": "data"}

    async def test_executes_single_async_hook(self, executor, registry, context):
        """Execute a single async hook successfully."""

        async def my_hook(ctx: HookContext) -> HookResult:
            return HookResult.continue_(metadata={"executed": True})

        spec = HookSpec(
            hook_name="before_run",
            handler=my_hook,
            extension_id="test-ext",
        )
        registry.register_spec(spec)

        result, data = await executor.execute("before_run", context, {"test": "data"})
        assert result.action == HookAction.CONTINUE
        assert result.metadata == {"executed": True}

    async def test_executes_single_sync_hook(self, executor, registry, context):
        """Execute a single sync hook in thread pool."""

        def my_sync_hook(ctx: HookContext) -> HookResult:
            return HookResult.continue_(metadata={"sync": True})

        spec = HookSpec(
            hook_name="before_run",
            handler=my_sync_hook,
            extension_id="test-ext",
        )
        registry.register_spec(spec)

        result, data = await executor.execute("before_run", context, {"test": "data"})
        assert result.action == HookAction.CONTINUE
        assert result.metadata == {"sync": True}

    async def test_executes_multiple_hooks_in_order(self, executor, registry, context):
        """Execute multiple hooks in priority order."""
        execution_order = []

        async def hook1(ctx: HookContext) -> HookResult:
            execution_order.append("hook1")
            return HookResult.continue_()

        async def hook2(ctx: HookContext) -> HookResult:
            execution_order.append("hook2")
            return HookResult.continue_()

        # Register with different priorities
        registry.register_spec(
            HookSpec(hook_name="before_run", handler=hook1, priority=10)
        )
        registry.register_spec(
            HookSpec(hook_name="before_run", handler=hook2, priority=5)
        )

        await executor.execute("before_run", context)
        assert execution_order == ["hook1", "hook2"]

    async def test_stops_on_skip_action(self, executor, registry, context):
        """Stop execution when hook returns SKIP."""

        async def hook1(ctx: HookContext) -> HookResult:
            return HookResult.skip(metadata={"skipped": True})

        async def hook2(ctx: HookContext) -> HookResult:
            pytest.fail("Should not be called")

        registry.register_spec(
            HookSpec(hook_name="before_run", handler=hook1, priority=10)
        )
        registry.register_spec(
            HookSpec(hook_name="before_run", handler=hook2, priority=5)
        )

        result, data = await executor.execute("before_run", context, {"test": "data"})
        assert result.action == HookAction.SKIP
        assert result.metadata == {"skipped": True}
        assert data == {"test": "data"}

    async def test_stops_on_abort_action(self, executor, registry, context):
        """Stop execution when hook returns ABORT."""

        async def hook1(ctx: HookContext) -> HookResult:
            return HookResult.abort("Test error", metadata={"error": True})

        async def hook2(ctx: HookContext) -> HookResult:
            pytest.fail("Should not be called")

        registry.register_spec(
            HookSpec(hook_name="before_run", handler=hook1, priority=10)
        )
        registry.register_spec(
            HookSpec(hook_name="before_run", handler=hook2, priority=5)
        )

        result, data = await executor.execute("before_run", context)
        assert result.action == HookAction.ABORT
        assert result.error == "Test error"

    async def test_replaces_data_on_replace_action(self, executor, registry, context):
        """Replace data when hook returns REPLACE."""

        async def hook1(ctx: HookContext) -> HookResult:
            return HookResult.replace({"replaced": "value"})

        registry.register_spec(HookSpec(hook_name="before_run", handler=hook1))

        result, data = await executor.execute(
            "before_run", context, {"original": "data"}
        )
        assert result.action == HookAction.CONTINUE
        assert data == {"replaced": "value"}

    async def test_accumulates_metadata_across_hooks(self, executor, registry, context):
        """Accumulate metadata from all hooks in chain."""

        async def hook1(ctx: HookContext) -> HookResult:
            return HookResult.continue_(metadata={"hook1": "value1"})

        async def hook2(ctx: HookContext) -> HookResult:
            return HookResult.continue_(metadata={"hook2": "value2"})

        registry.register_spec(
            HookSpec(hook_name="before_run", handler=hook1, priority=10)
        )
        registry.register_spec(
            HookSpec(hook_name="before_run", handler=hook2, priority=5)
        )

        result, _ = await executor.execute("before_run", context)
        assert result.metadata == {"hook1": "value1", "hook2": "value2"}

    async def test_raises_timeout_error_on_timeout(self, executor, registry, context):
        """Raise HookTimeoutError when hook exceeds timeout."""

        async def slow_hook(ctx: HookContext) -> HookResult:
            await asyncio.sleep(1.0)
            return HookResult.continue_()

        spec = HookSpec(
            hook_name="before_run",
            handler=slow_hook,
            timeout_seconds=0.1,
            extension_id="slow-ext",
        )
        registry.register_spec(spec)

        with pytest.raises(HookTimeoutError) as exc_info:
            await executor.execute("before_run", context)

        assert exc_info.value.hook_name == "before_run"
        assert exc_info.value.extension_id == "slow-ext"
        assert exc_info.value.timeout == 0.1

    async def test_handles_none_result_as_continue(self, executor, registry, context):
        """Treat None result as CONTINUE."""

        async def hook_returns_none(ctx: HookContext) -> None:
            return None

        registry.register_spec(
            HookSpec(hook_name="before_run", handler=hook_returns_none)
        )

        result, _ = await executor.execute("before_run", context)
        assert result.action == HookAction.CONTINUE

    async def test_handles_non_hookresult_as_replace(self, executor, registry, context):
        """Treat non-HookResult return value as REPLACE."""

        async def hook_returns_dict(ctx: HookContext) -> dict:
            return {"custom": "data"}

        registry.register_spec(
            HookSpec(hook_name="before_run", handler=hook_returns_dict)
        )

        result, data = await executor.execute(
            "before_run", context, {"initial": "data"}
        )
        # When only one hook returns REPLACE, final action is CONTINUE but data is modified
        assert result.action == HookAction.CONTINUE
        assert data == {"custom": "data"}

    async def test_invokes_error_handler_on_exception(
        self, executor, registry, context
    ):
        """Invoke on_hook_error handler when hook raises exception."""
        error_handled = []

        async def failing_hook(ctx: HookContext) -> HookResult:
            raise ValueError("Hook error")

        async def error_handler(ctx: HookContext) -> HookResult:
            error_handled.append(ctx.data)
            return HookResult.skip()

        registry.register_spec(
            HookSpec(
                hook_name="before_run", handler=failing_hook, extension_id="fail-ext"
            )
        )
        registry.register_spec(
            HookSpec(hook_name="on_hook_error", handler=error_handler)
        )

        result, _ = await executor.execute("before_run", context)
        assert result.action == HookAction.SKIP
        assert len(error_handled) == 1
        assert error_handled[0]["failed_hook"] == "before_run"
        assert error_handled[0]["failed_extension"] == "fail-ext"
        assert "Hook error" in error_handled[0]["error"]

    async def test_reraises_exception_when_no_error_handler(
        self, executor, registry, context
    ):
        """Re-raise exception when no error handler registered."""

        async def failing_hook(ctx: HookContext) -> HookResult:
            raise ValueError("Unhandled error")

        registry.register_spec(HookSpec(hook_name="before_run", handler=failing_hook))

        with pytest.raises(ValueError, match="Unhandled error"):
            await executor.execute("before_run", context)

    async def test_returns_retry_action(self, executor, registry, context):
        """Return RETRY action when hook requests retry."""

        async def retry_hook(ctx: HookContext) -> HookResult:
            return HookResult.retry()

        registry.register_spec(HookSpec(hook_name="before_run", handler=retry_hook))

        result, _ = await executor.execute("before_run", context)
        assert result.action == HookAction.RETRY


class TestHookExecutorExecuteWithRetry:
    """Tests for HookExecutor.execute_with_retry method."""

    @pytest.fixture
    def registry(self):
        """Create a fresh registry for each test."""
        return HooksRegistry()

    @pytest.fixture
    def executor(self, registry):
        """Create an executor with the test registry."""
        return HookExecutor(registry=registry)

    @pytest.fixture
    def context(self, tmp_path):
        """Create a basic hook context."""
        return HookContext(
            hook_name="before_run",
            run_id="run-123",
            session_id="session-456",
            project_path=tmp_path,
            phase="test",
        )

    async def test_executes_without_retry(self, executor, registry, context):
        """Execute successfully without retry."""

        async def normal_hook(ctx: HookContext) -> HookResult:
            return HookResult.continue_()

        registry.register_spec(HookSpec(hook_name="before_run", handler=normal_hook))

        operation = AsyncMock(return_value="result")
        result, data = await executor.execute_with_retry(
            "before_run", context, {"test": "data"}, operation
        )

        assert result.action == HookAction.CONTINUE

    async def test_retries_on_retry_action(self, executor, registry, context):
        """Retry when hook returns RETRY action."""
        attempt_count = []

        async def retry_then_continue(ctx: HookContext) -> HookResult:
            attempt_count.append(1)
            if len(attempt_count) < 2:
                return HookResult.retry()
            return HookResult.continue_()

        registry.register_spec(
            HookSpec(hook_name="before_run", handler=retry_then_continue)
        )

        operation = AsyncMock()
        result, _ = await executor.execute_with_retry(
            "before_run", context, {"test": "data"}, operation, max_retries=3
        )

        assert result.action == HookAction.CONTINUE
        assert len(attempt_count) == 2

    async def test_aborts_after_max_retries(self, executor, registry, context):
        """Abort after max retries exceeded."""

        async def always_retry(ctx: HookContext) -> HookResult:
            return HookResult.retry()

        registry.register_spec(HookSpec(hook_name="before_run", handler=always_retry))

        operation = AsyncMock()
        result, _ = await executor.execute_with_retry(
            "before_run", context, {"test": "data"}, operation, max_retries=2
        )

        assert result.action == HookAction.ABORT
        assert "Max retries" in result.error


class TestHookExecutorHasHooks:
    """Tests for HookExecutor.has_hooks method."""

    def test_returns_true_when_hooks_exist(self):
        """Return True when hooks registered."""
        registry = HooksRegistry()
        executor = HookExecutor(registry=registry)

        async def my_hook(ctx: HookContext) -> HookResult:
            return HookResult.continue_()

        registry.register_spec(HookSpec(hook_name="before_run", handler=my_hook))

        assert executor.has_hooks("before_run") is True

    def test_returns_false_when_no_hooks(self):
        """Return False when no hooks registered."""
        registry = HooksRegistry()
        executor = HookExecutor(registry=registry)

        assert executor.has_hooks("before_run") is False


class TestInvokeHooks:
    """Tests for invoke_hooks convenience function."""

    async def test_invokes_with_default_registry(self, tmp_path):
        """Invoke hooks using global registry."""
        context = HookContext(
            hook_name="before_run",
            run_id="run-123",
            session_id="session-456",
            project_path=tmp_path,
            phase="test",
        )

        result, data = await invoke_hooks("before_run", context, {"test": "data"})
        assert result.action == HookAction.CONTINUE

    async def test_invokes_with_custom_registry(self, tmp_path):
        """Invoke hooks using custom registry."""
        custom_registry = HooksRegistry()

        async def my_hook(ctx: HookContext) -> HookResult:
            return HookResult.continue_(metadata={"custom": True})

        custom_registry.register_spec(HookSpec(hook_name="before_run", handler=my_hook))

        context = HookContext(
            hook_name="before_run",
            run_id="run-123",
            session_id="session-456",
            project_path=tmp_path,
            phase="test",
        )

        result, _ = await invoke_hooks("before_run", context, registry=custom_registry)
        assert result.metadata == {"custom": True}


class TestCreateHookContext:
    """Tests for create_hook_context convenience function."""

    def test_creates_context_with_path_string(self, tmp_path):
        """Create context converting string to Path."""
        ctx = create_hook_context(
            hook_name="before_run",
            run_id="run-123",
            session_id="session-456",
            project_path=str(tmp_path),
            phase="test",
        )

        assert ctx.hook_name == "before_run"
        assert ctx.run_id == "run-123"
        assert ctx.session_id == "session-456"
        assert ctx.project_path == tmp_path
        assert ctx.phase == "test"
        assert ctx.data == {}
        assert ctx.metadata == {}

    def test_creates_context_with_path_object(self, tmp_path):
        """Create context with Path object."""
        ctx = create_hook_context(
            hook_name="before_run",
            run_id="run-123",
            session_id="session-456",
            project_path=tmp_path,
            phase="test",
        )

        assert ctx.project_path == tmp_path

    def test_creates_context_with_optional_params(self, tmp_path):
        """Create context with all optional parameters."""
        mock_state = MagicMock()
        mock_emit = MagicMock()

        ctx = create_hook_context(
            hook_name="before_run",
            run_id="run-123",
            session_id="session-456",
            project_path=tmp_path,
            phase="test",
            data={"custom": "data"},
            node_id="node-1",
            node_name="TestNode",
            agent_name="TestAgent",
            state=mock_state,
            emit=mock_emit,
        )

        assert ctx.data == {"custom": "data"}
        assert ctx.node_id == "node-1"
        assert ctx.node_name == "TestNode"
        assert ctx.agent_name == "TestAgent"
        assert ctx._state is mock_state
        assert ctx._emit is mock_emit
