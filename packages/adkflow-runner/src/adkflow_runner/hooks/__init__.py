"""Extension hooks system for controlling workflow execution.

This module provides a hooks system that allows extensions to intercept
and control workflow execution at various lifecycle points.

Unlike callbacks (which are observation-only), hooks can:
- Modify data flowing through the workflow
- Skip, retry, or abort operations
- Transform inputs/outputs between nodes
- Route execution dynamically

Example:
    from adkflow_runner.hooks import hook, HookResult, HookAction, HookContext

    class MyExtension:
        @hook("before_tool_call", priority=100)
        async def rate_limit(self, ctx: HookContext) -> HookResult:
            if await self.is_rate_limited(ctx.data["tool_name"]):
                return HookResult(action=HookAction.ABORT, error="Rate limited")
            return HookResult(action=HookAction.CONTINUE)
"""

from adkflow_runner.hooks.types import (
    HookAction,
    HookResult,
    HookContext,
    HookSpec,
    RetryConfig,
    HOOK_NAMES,
)
from adkflow_runner.hooks.decorator import hook
from adkflow_runner.hooks.registry import HooksRegistry, get_hooks_registry
from adkflow_runner.hooks.executor import HookExecutor, HookAbortError, HookTimeoutError
from adkflow_runner.hooks.integration import HooksIntegration, create_hooks_integration

__all__ = [
    # Types
    "HookAction",
    "HookResult",
    "HookContext",
    "HookSpec",
    "RetryConfig",
    "HOOK_NAMES",
    # Decorator
    "hook",
    # Registry
    "HooksRegistry",
    "get_hooks_registry",
    # Executor
    "HookExecutor",
    "HookAbortError",
    "HookTimeoutError",
    # Integration
    "HooksIntegration",
    "create_hooks_integration",
]
