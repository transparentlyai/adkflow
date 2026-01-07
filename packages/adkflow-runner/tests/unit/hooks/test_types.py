"""Tests for hooks type definitions."""

from pathlib import Path

import pytest

from adkflow_runner.hooks.types import (
    HookAction,
    HookContext,
    HookResult,
    HookSpec,
    RetryConfig,
    HOOK_NAMES,
    validate_hook_name,
)


class TestHookAction:
    """Tests for HookAction enum."""

    def test_has_all_actions(self):
        """HookAction enum contains all expected actions."""
        assert HookAction.CONTINUE == "continue"
        assert HookAction.SKIP == "skip"
        assert HookAction.RETRY == "retry"
        assert HookAction.ABORT == "abort"
        assert HookAction.REPLACE == "replace"


class TestRetryConfig:
    """Tests for RetryConfig dataclass."""

    def test_default_creation(self):
        """Create RetryConfig with defaults."""
        config = RetryConfig()
        assert config.max_attempts == 3
        assert config.delay_seconds == 1.0
        assert config.backoff_multiplier == 2.0
        assert config.modified_data is None

    def test_custom_creation(self):
        """Create RetryConfig with custom values."""
        config = RetryConfig(
            max_attempts=5,
            delay_seconds=2.0,
            backoff_multiplier=1.5,
            modified_data={"test": "data"},
        )
        assert config.max_attempts == 5
        assert config.delay_seconds == 2.0
        assert config.backoff_multiplier == 1.5
        assert config.modified_data == {"test": "data"}


class TestHookResult:
    """Tests for HookResult dataclass."""

    def test_default_creation(self):
        """Create HookResult with defaults."""
        result = HookResult()
        assert result.action == HookAction.CONTINUE
        assert result.modified_data is None
        assert result.retry_config is None
        assert result.error is None
        assert result.metadata == {}

    def test_continue_factory(self):
        """Create CONTINUE result using factory method."""
        result = HookResult.continue_()
        assert result.action == HookAction.CONTINUE
        assert result.metadata == {}

    def test_continue_factory_with_metadata(self):
        """Create CONTINUE result with metadata."""
        result = HookResult.continue_(metadata={"key": "value"})
        assert result.action == HookAction.CONTINUE
        assert result.metadata == {"key": "value"}

    def test_skip_factory(self):
        """Create SKIP result using factory method."""
        result = HookResult.skip()
        assert result.action == HookAction.SKIP
        assert result.metadata == {}

    def test_skip_factory_with_metadata(self):
        """Create SKIP result with metadata."""
        result = HookResult.skip(metadata={"reason": "not needed"})
        assert result.action == HookAction.SKIP
        assert result.metadata == {"reason": "not needed"}

    def test_retry_factory(self):
        """Create RETRY result using factory method."""
        result = HookResult.retry()
        assert result.action == HookAction.RETRY
        assert result.retry_config is not None
        assert result.retry_config.max_attempts == 3

    def test_retry_factory_with_config(self):
        """Create RETRY result with custom config."""
        config = RetryConfig(max_attempts=5)
        result = HookResult.retry(config=config)
        assert result.action == HookAction.RETRY
        assert result.retry_config.max_attempts == 5  # type: ignore[union-attr]

    def test_retry_factory_with_metadata(self):
        """Create RETRY result with metadata."""
        result = HookResult.retry(metadata={"attempt": 1})
        assert result.action == HookAction.RETRY
        assert result.metadata == {"attempt": 1}

    def test_abort_factory(self):
        """Create ABORT result using factory method."""
        result = HookResult.abort(error="Something went wrong")
        assert result.action == HookAction.ABORT
        assert result.error == "Something went wrong"
        assert result.metadata == {}

    def test_abort_factory_with_metadata(self):
        """Create ABORT result with metadata."""
        result = HookResult.abort(error="Failed", metadata={"code": 500})
        assert result.action == HookAction.ABORT
        assert result.error == "Failed"
        assert result.metadata == {"code": 500}

    def test_replace_factory(self):
        """Create REPLACE result using factory method."""
        new_data = {"modified": True}
        result = HookResult.replace(data=new_data)
        assert result.action == HookAction.REPLACE
        assert result.modified_data == {"modified": True}
        assert result.metadata == {}

    def test_replace_factory_with_metadata(self):
        """Create REPLACE result with metadata."""
        result = HookResult.replace(data="new", metadata={"source": "hook"})
        assert result.action == HookAction.REPLACE
        assert result.modified_data == "new"
        assert result.metadata == {"source": "hook"}


class TestStateAccessor:
    """Tests for StateAccessor protocol."""

    def test_state_accessor_protocol_methods(self):
        """StateAccessor protocol defines required methods."""
        from adkflow_runner.hooks.types import StateAccessor

        # Protocol should define these methods
        assert hasattr(StateAccessor, "get")
        assert hasattr(StateAccessor, "set")
        assert hasattr(StateAccessor, "has")
        assert hasattr(StateAccessor, "delete")


class TestEmitFn:
    """Tests for EmitFn protocol."""

    def test_emit_fn_protocol_methods(self):
        """EmitFn protocol defines required methods."""
        from adkflow_runner.hooks.types import EmitFn

        # Protocol should be callable
        assert hasattr(EmitFn, "__call__")


class TestHookContext:
    """Tests for HookContext dataclass."""

    def test_minimal_creation(self):
        """Create HookContext with minimal required fields."""
        ctx = HookContext(
            hook_name="before_run",
            run_id="run-123",
            session_id="session-456",
            project_path=Path("/tmp/project"),
            phase="run",
        )
        assert ctx.hook_name == "before_run"
        assert ctx.run_id == "run-123"
        assert ctx.session_id == "session-456"
        assert ctx.project_path == Path("/tmp/project")
        assert ctx.phase == "run"
        assert ctx.node_id is None
        assert ctx.node_name is None
        assert ctx.agent_name is None
        assert ctx.data == {}
        assert ctx.metadata == {}

    def test_full_creation(self):
        """Create HookContext with all fields."""
        ctx = HookContext(
            hook_name="before_tool_call",
            run_id="run-123",
            session_id="session-456",
            project_path=Path("/tmp/project"),
            phase="tool",
            node_id="node-1",
            node_name="Tool Node",
            agent_name="MyAgent",
            data={"tool": "calculator"},
            metadata={"priority": "high"},
        )
        assert ctx.hook_name == "before_tool_call"
        assert ctx.node_id == "node-1"
        assert ctx.node_name == "Tool Node"
        assert ctx.agent_name == "MyAgent"
        assert ctx.data == {"tool": "calculator"}
        assert ctx.metadata == {"priority": "high"}

    def test_state_property_raises_without_accessor(self):
        """Accessing state without accessor raises RuntimeError."""
        ctx = HookContext(
            hook_name="before_run",
            run_id="run-123",
            session_id="session-456",
            project_path=Path("/tmp/project"),
            phase="run",
        )
        with pytest.raises(RuntimeError, match="State accessor not available"):
            _ = ctx.state

    def test_emit_property_raises_without_emit_fn(self):
        """Accessing emit without emit function raises RuntimeError."""
        ctx = HookContext(
            hook_name="before_run",
            run_id="run-123",
            session_id="session-456",
            project_path=Path("/tmp/project"),
            phase="run",
        )
        with pytest.raises(RuntimeError, match="Emit function not available"):
            _ = ctx.emit

    def test_with_data(self):
        """Create new context with updated data."""
        ctx = HookContext(
            hook_name="before_run",
            run_id="run-123",
            session_id="session-456",
            project_path=Path("/tmp/project"),
            phase="run",
            data={"key1": "value1"},
        )
        new_ctx = ctx.with_data(key2="value2", key1="updated")

        # Original context unchanged
        assert ctx.data == {"key1": "value1"}

        # New context has merged data
        assert new_ctx.data == {"key1": "updated", "key2": "value2"}
        assert new_ctx.hook_name == ctx.hook_name
        assert new_ctx.run_id == ctx.run_id

    def test_with_metadata(self):
        """Create new context with updated metadata."""
        ctx = HookContext(
            hook_name="before_run",
            run_id="run-123",
            session_id="session-456",
            project_path=Path("/tmp/project"),
            phase="run",
            metadata={"meta1": "value1"},
        )
        new_ctx = ctx.with_metadata(meta2="value2", meta1="updated")

        # Original context unchanged
        assert ctx.metadata == {"meta1": "value1"}

        # New context has merged metadata
        assert new_ctx.metadata == {"meta1": "updated", "meta2": "value2"}
        assert new_ctx.hook_name == ctx.hook_name
        assert new_ctx.data == ctx.data


class TestHookSpec:
    """Tests for HookSpec dataclass."""

    def test_minimal_creation(self):
        """Create HookSpec with minimal required fields."""

        def handler(ctx):
            return HookResult.continue_()

        spec = HookSpec(hook_name="before_run", handler=handler)
        assert spec.hook_name == "before_run"
        assert spec.handler == handler
        assert spec.priority == 0
        assert spec.timeout_seconds == 30.0
        assert spec.extension_id is None
        assert spec.method_name is None

    def test_full_creation(self):
        """Create HookSpec with all fields."""

        async def handler(ctx):
            return HookResult.continue_()

        spec = HookSpec(
            hook_name="before_tool_call",
            handler=handler,
            priority=100,
            timeout_seconds=60.0,
            extension_id="my-extension",
            method_name="rate_limit",
        )
        assert spec.hook_name == "before_tool_call"
        assert spec.handler == handler
        assert spec.priority == 100
        assert spec.timeout_seconds == 60.0
        assert spec.extension_id == "my-extension"
        assert spec.method_name == "rate_limit"

    def test_hash_equality(self):
        """HookSpec instances with same attributes hash equally."""

        def handler1(ctx):
            pass

        def handler2(ctx):
            pass

        spec1 = HookSpec(
            hook_name="before_run",
            handler=handler1,
            priority=0,
            extension_id="ext1",
            method_name="method1",
        )
        spec2 = HookSpec(
            hook_name="before_run",
            handler=handler2,
            priority=0,
            extension_id="ext1",
            method_name="method1",
        )

        # Hash based on hook_name, priority, extension_id, method_name
        # (not handler)
        assert hash(spec1) == hash(spec2)


class TestHookNames:
    """Tests for HOOK_NAMES constant."""

    def test_hook_names_is_frozenset(self):
        """HOOK_NAMES is a frozenset."""
        assert isinstance(HOOK_NAMES, frozenset)

    def test_contains_run_lifecycle_hooks(self):
        """HOOK_NAMES contains run lifecycle hooks."""
        assert "before_run" in HOOK_NAMES
        assert "after_run" in HOOK_NAMES
        assert "on_run_error" in HOOK_NAMES
        assert "on_run_cancel" in HOOK_NAMES

    def test_contains_node_lifecycle_hooks(self):
        """HOOK_NAMES contains node lifecycle hooks."""
        assert "before_node_execute" in HOOK_NAMES
        assert "after_node_execute" in HOOK_NAMES
        assert "on_node_error" in HOOK_NAMES
        assert "on_node_skip" in HOOK_NAMES

    def test_contains_agent_lifecycle_hooks(self):
        """HOOK_NAMES contains agent lifecycle hooks."""
        assert "before_agent_execute" in HOOK_NAMES
        assert "after_agent_execute" in HOOK_NAMES
        assert "on_agent_error" in HOOK_NAMES
        assert "on_agent_transfer" in HOOK_NAMES

    def test_contains_tool_lifecycle_hooks(self):
        """HOOK_NAMES contains tool lifecycle hooks."""
        assert "before_tool_call" in HOOK_NAMES
        assert "after_tool_result" in HOOK_NAMES
        assert "on_tool_error" in HOOK_NAMES
        assert "on_tool_timeout" in HOOK_NAMES

    def test_contains_llm_interaction_hooks(self):
        """HOOK_NAMES contains LLM interaction hooks."""
        assert "before_llm_request" in HOOK_NAMES
        assert "after_llm_response" in HOOK_NAMES
        assert "on_llm_stream_chunk" in HOOK_NAMES
        assert "on_llm_error" in HOOK_NAMES

    def test_contains_data_flow_hooks(self):
        """HOOK_NAMES contains data flow hooks."""
        assert "on_state_read" in HOOK_NAMES
        assert "on_state_write" in HOOK_NAMES
        assert "on_data_transfer" in HOOK_NAMES

    def test_contains_user_interaction_hooks(self):
        """HOOK_NAMES contains user interaction hooks."""
        assert "before_user_input" in HOOK_NAMES
        assert "after_user_input" in HOOK_NAMES
        assert "on_user_input_timeout" in HOOK_NAMES

    def test_contains_graph_execution_hooks(self):
        """HOOK_NAMES contains graph execution hooks."""
        assert "before_layer_execute" in HOOK_NAMES
        assert "after_layer_execute" in HOOK_NAMES
        assert "on_execution_plan" in HOOK_NAMES

    def test_contains_meta_hooks(self):
        """HOOK_NAMES contains meta hooks."""
        assert "on_hook_error" in HOOK_NAMES


class TestValidateHookName:
    """Tests for validate_hook_name function."""

    def test_valid_hook_name_passes(self):
        """Valid hook names pass validation."""
        validate_hook_name("before_run")
        validate_hook_name("after_tool_result")
        validate_hook_name("on_llm_error")
        # No exception means success

    def test_invalid_hook_name_raises(self):
        """Invalid hook name raises ValueError."""
        with pytest.raises(ValueError, match="Unknown hook name: 'invalid_hook'"):
            validate_hook_name("invalid_hook")

    def test_error_message_includes_valid_hooks(self):
        """Error message includes list of valid hooks."""
        with pytest.raises(ValueError) as exc_info:
            validate_hook_name("bad_hook")

        error_msg = str(exc_info.value)
        assert "Valid hooks:" in error_msg
        assert "before_run" in error_msg
