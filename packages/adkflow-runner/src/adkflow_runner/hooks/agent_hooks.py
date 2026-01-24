"""Agent lifecycle hook methods for HooksIntegration.

This module provides a mixin class with agent-related hook methods
that can be composed into the main HooksIntegration class.
"""

from typing import Any, Protocol

from adkflow_runner.hooks.types import HookResult


class _HooksIntegrationProtocol(Protocol):
    """Protocol for HooksIntegration base functionality."""

    def _create_context(
        self,
        hook_name: str,
        phase: str,
        data: dict[str, Any],
        node_id: str | None = None,
        node_name: str | None = None,
        agent_name: str | None = None,
    ) -> Any: ...

    @property
    def executor(self) -> Any: ...


class AgentHooksMixin:
    """Mixin providing agent lifecycle hook methods."""

    async def before_agent_execute(
        self: _HooksIntegrationProtocol,
        agent_name: str,
        agent_id: str,
        prompt: str,
        config: dict[str, Any],
    ) -> tuple[HookResult, str, dict[str, Any]]:
        """Invoke before_agent_execute hooks."""
        if not self.executor.has_hooks("before_agent_execute"):
            return HookResult.continue_(), prompt, config

        ctx = self._create_context(
            hook_name="before_agent_execute",
            phase="agent",
            data={"prompt": prompt, "config": config, "agent_id": agent_id},
            agent_name=agent_name,
        )

        result, data = await self.executor.execute(
            "before_agent_execute", ctx, {"prompt": prompt, "config": config}
        )

        # Use the returned data (may be modified by REPLACE hooks)
        if isinstance(data, dict):
            return (
                result,
                data.get("prompt", prompt),
                data.get("config", config),
            )

        return result, prompt, config

    async def after_agent_execute(
        self: _HooksIntegrationProtocol,
        agent_name: str,
        agent_id: str,
        output: str,
    ) -> tuple[HookResult, str]:
        """Invoke after_agent_execute hooks."""
        if not self.executor.has_hooks("after_agent_execute"):
            return HookResult.continue_(), output

        ctx = self._create_context(
            hook_name="after_agent_execute",
            phase="agent",
            data={"output": output, "agent_id": agent_id},
            agent_name=agent_name,
        )

        result, data = await self.executor.execute("after_agent_execute", ctx, output)

        # Use the returned data (may be modified by REPLACE hooks)
        return result, str(data) if data is not None else output

    async def on_agent_error(
        self: _HooksIntegrationProtocol,
        agent_name: str,
        agent_id: str,
        error: Exception,
    ) -> tuple[HookResult, str | None]:
        """Invoke on_agent_error hooks."""
        if not self.executor.has_hooks("on_agent_error"):
            return HookResult.continue_(), None

        ctx = self._create_context(
            hook_name="on_agent_error",
            phase="agent",
            data={
                "error": str(error),
                "error_type": type(error).__name__,
                "agent_id": agent_id,
            },
            agent_name=agent_name,
        )

        result, data = await self.executor.execute("on_agent_error", ctx, error)

        # Use the returned data as fallback (may be set by REPLACE hooks)
        if data is not None and data is not error:
            return result, str(data)

        return result, None

    async def on_agent_transfer(
        self: _HooksIntegrationProtocol,
        from_agent: str,
        to_agent: str,
        context_data: dict[str, Any],
    ) -> tuple[HookResult, str, dict[str, Any]]:
        """Invoke on_agent_transfer hooks."""
        if not self.executor.has_hooks("on_agent_transfer"):
            return HookResult.continue_(), to_agent, context_data

        ctx = self._create_context(
            hook_name="on_agent_transfer",
            phase="agent",
            data={
                "from_agent": from_agent,
                "to_agent": to_agent,
                "context_data": context_data,
            },
            agent_name=from_agent,
        )

        result, data = await self.executor.execute(
            "on_agent_transfer",
            ctx,
            {"to_agent": to_agent, "context_data": context_data},
        )

        # Use the returned data (may be modified by REPLACE hooks)
        if isinstance(data, dict):
            return (
                result,
                data.get("to_agent", to_agent),
                data.get("context_data", context_data),
            )

        return result, to_agent, context_data
