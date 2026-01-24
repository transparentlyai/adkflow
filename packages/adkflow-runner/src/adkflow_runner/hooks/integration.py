"""Integration helpers for adding hooks to runner components.

This module provides factory functions and helpers for creating hook contexts
and invoking hooks from WorkflowRunner, GraphExecutor, AgentFactory, etc.
"""

from pathlib import Path
from typing import Any, TypeVar

from adkflow_runner.hooks.agent_hooks import AgentHooksMixin
from adkflow_runner.hooks.executor import HookExecutor
from adkflow_runner.hooks.types import HookAction, HookContext, HookResult

T = TypeVar("T")


class HooksIntegration(AgentHooksMixin):
    """Integration layer for hooks in the workflow execution pipeline.

    Provides methods to invoke hooks at various lifecycle points with
    proper context creation and error handling.
    """

    def __init__(
        self,
        run_id: str,
        session_id: str,
        project_path: Path,
        state: Any = None,
        emit: Any = None,
    ):
        """Initialize hooks integration for a workflow run.

        Args:
            run_id: Current run ID
            session_id: Current session ID
            project_path: Path to the project directory
            state: State accessor for workflow state
            emit: Event emission function
        """
        self.run_id = run_id
        self.session_id = session_id
        self.project_path = project_path
        self.state = state
        self.emit = emit
        self.executor = HookExecutor()

    def _create_context(
        self,
        hook_name: str,
        phase: str,
        data: dict[str, Any],
        node_id: str | None = None,
        node_name: str | None = None,
        agent_name: str | None = None,
    ) -> HookContext:
        """Create a HookContext for a specific hook invocation."""
        return HookContext(
            hook_name=hook_name,
            run_id=self.run_id,
            session_id=self.session_id,
            project_path=self.project_path,
            phase=phase,
            node_id=node_id,
            node_name=node_name,
            agent_name=agent_name,
            data=data,
            metadata={},
            _state=self.state,
            _emit=self.emit,
        )

    # =========================================================================
    # Run Lifecycle Hooks
    # =========================================================================

    async def before_run(
        self,
        inputs: dict[str, Any],
        config: dict[str, Any],
    ) -> tuple[HookResult, dict[str, Any], dict[str, Any]]:
        """Invoke before_run hooks.

        Args:
            inputs: Workflow input data
            config: Run configuration

        Returns:
            Tuple of (result, potentially_modified_inputs, potentially_modified_config)
        """
        if not self.executor.has_hooks("before_run"):
            return HookResult.continue_(), inputs, config

        ctx = self._create_context(
            hook_name="before_run",
            phase="run",
            data={"inputs": inputs, "config": config},
        )

        result, data = await self.executor.execute(
            "before_run", ctx, {"inputs": inputs, "config": config}
        )

        # Use the returned data (may be modified by REPLACE hooks)
        if isinstance(data, dict):
            return (
                result,
                data.get("inputs", inputs),
                data.get("config", config),
            )

        return result, inputs, config

    async def after_run(
        self,
        output: str,
        status: str,
    ) -> tuple[HookResult, str]:
        """Invoke after_run hooks.

        Args:
            output: Workflow output
            status: Final run status

        Returns:
            Tuple of (result, potentially_modified_output)
        """
        if not self.executor.has_hooks("after_run"):
            return HookResult.continue_(), output

        ctx = self._create_context(
            hook_name="after_run",
            phase="run",
            data={"output": output, "status": status},
        )

        result, data = await self.executor.execute("after_run", ctx, output)

        # Use the returned data (may be modified by REPLACE hooks)
        return result, str(data) if data is not None else output

    async def on_run_error(
        self,
        error: Exception,
        partial_output: str | None = None,
    ) -> tuple[HookResult, Exception | None]:
        """Invoke on_run_error hooks.

        Args:
            error: The error that occurred
            partial_output: Any partial output before failure

        Returns:
            Tuple of (result, potentially_modified_or_None_error)
            If a hook returns SKIP, error is suppressed.
            If a hook returns REPLACE, the modified_data is used as new error message.
        """
        if not self.executor.has_hooks("on_run_error"):
            return HookResult.continue_(), error

        ctx = self._create_context(
            hook_name="on_run_error",
            phase="run",
            data={
                "error": str(error),
                "error_type": type(error).__name__,
                "partial_output": partial_output,
            },
        )

        result, data = await self.executor.execute("on_run_error", ctx, error)

        if result.action == HookAction.SKIP:
            return result, None  # Error suppressed

        # Use returned data (may be modified by REPLACE hooks)
        if data is not None and data is not error:
            if isinstance(data, dict) and "error" in data:
                return result, data["error"]
            elif isinstance(data, Exception):
                return result, data
            else:
                return result, RuntimeError(str(data))

        return result, error

    async def on_run_cancel(self) -> HookResult:
        """Invoke on_run_cancel hooks."""
        if not self.executor.has_hooks("on_run_cancel"):
            return HookResult.continue_()

        ctx = self._create_context(
            hook_name="on_run_cancel",
            phase="run",
            data={},
        )

        result, _ = await self.executor.execute("on_run_cancel", ctx, None)
        return result

    # =========================================================================
    # Custom Node Hooks
    # =========================================================================

    async def before_node_execute(
        self,
        node_id: str,
        node_name: str,
        unit_id: str,
        inputs: dict[str, Any],
        config: dict[str, Any],
    ) -> tuple[HookResult, dict[str, Any], dict[str, Any]]:
        """Invoke before_node_execute hooks."""
        if not self.executor.has_hooks("before_node_execute"):
            return HookResult.continue_(), inputs, config

        ctx = self._create_context(
            hook_name="before_node_execute",
            phase="node",
            data={"unit_id": unit_id, "inputs": inputs, "config": config},
            node_id=node_id,
            node_name=node_name,
        )

        result, data = await self.executor.execute(
            "before_node_execute", ctx, {"inputs": inputs, "config": config}
        )

        # Use the returned data (may be modified by REPLACE hooks)
        if isinstance(data, dict):
            return (
                result,
                data.get("inputs", inputs),
                data.get("config", config),
            )

        return result, inputs, config

    async def after_node_execute(
        self,
        node_id: str,
        node_name: str,
        unit_id: str,
        outputs: dict[str, Any],
    ) -> tuple[HookResult, dict[str, Any]]:
        """Invoke after_node_execute hooks."""
        if not self.executor.has_hooks("after_node_execute"):
            return HookResult.continue_(), outputs

        ctx = self._create_context(
            hook_name="after_node_execute",
            phase="node",
            data={"unit_id": unit_id, "outputs": outputs},
            node_id=node_id,
            node_name=node_name,
        )

        result, data = await self.executor.execute("after_node_execute", ctx, outputs)

        # Use the returned data (may be modified by REPLACE hooks)
        if isinstance(data, dict):
            return result, data

        return result, outputs

    async def on_node_error(
        self,
        node_id: str,
        node_name: str,
        unit_id: str,
        error: Exception,
    ) -> tuple[HookResult, Any]:
        """Invoke on_node_error hooks.

        Returns:
            Tuple of (result, fallback_output_or_None)
        """
        if not self.executor.has_hooks("on_node_error"):
            return HookResult.continue_(), None

        ctx = self._create_context(
            hook_name="on_node_error",
            phase="node",
            data={
                "unit_id": unit_id,
                "error": str(error),
                "error_type": type(error).__name__,
            },
            node_id=node_id,
            node_name=node_name,
        )

        result, data = await self.executor.execute("on_node_error", ctx, error)

        # Use the returned data as fallback output (may be set by REPLACE hooks)
        if data is not None and data is not error:
            return result, data  # Fallback output

        return result, None

    # =========================================================================
    # Tool Hooks
    # =========================================================================

    async def before_tool_call(
        self,
        tool_name: str,
        arguments: dict[str, Any],
        agent_name: str | None = None,
    ) -> tuple[HookResult, dict[str, Any]]:
        """Invoke before_tool_call hooks."""
        if not self.executor.has_hooks("before_tool_call"):
            return HookResult.continue_(), arguments

        ctx = self._create_context(
            hook_name="before_tool_call",
            phase="tool",
            data={"tool_name": tool_name, "arguments": arguments},
            agent_name=agent_name,
        )

        result, data = await self.executor.execute("before_tool_call", ctx, arguments)

        # Use the returned data (may be modified by REPLACE hooks)
        if isinstance(data, dict):
            return result, data

        return result, arguments

    async def after_tool_result(
        self,
        tool_name: str,
        arguments: dict[str, Any],
        result_data: Any,
        agent_name: str | None = None,
    ) -> tuple[HookResult, Any]:
        """Invoke after_tool_result hooks."""
        if not self.executor.has_hooks("after_tool_result"):
            return HookResult.continue_(), result_data

        ctx = self._create_context(
            hook_name="after_tool_result",
            phase="tool",
            data={
                "tool_name": tool_name,
                "arguments": arguments,
                "result": result_data,
            },
            agent_name=agent_name,
        )

        hook_result, data = await self.executor.execute(
            "after_tool_result", ctx, result_data
        )

        # Use the returned data (may be modified by REPLACE hooks)
        return hook_result, data if data is not None else result_data

    async def on_tool_error(
        self,
        tool_name: str,
        arguments: dict[str, Any],
        error: Exception,
        agent_name: str | None = None,
    ) -> tuple[HookResult, Any]:
        """Invoke on_tool_error hooks."""
        if not self.executor.has_hooks("on_tool_error"):
            return HookResult.continue_(), None

        ctx = self._create_context(
            hook_name="on_tool_error",
            phase="tool",
            data={
                "tool_name": tool_name,
                "arguments": arguments,
                "error": str(error),
                "error_type": type(error).__name__,
            },
            agent_name=agent_name,
        )

        result, data = await self.executor.execute("on_tool_error", ctx, error)

        # Use the returned data as fallback result (may be set by REPLACE hooks)
        if data is not None and data is not error:
            return result, data

        return result, None

    # =========================================================================
    # LLM Hooks
    # =========================================================================

    async def before_llm_request(
        self,
        messages: list[Any],
        config: dict[str, Any],
        agent_name: str | None = None,
    ) -> tuple[HookResult, list[Any], dict[str, Any]]:
        """Invoke before_llm_request hooks."""
        if not self.executor.has_hooks("before_llm_request"):
            return HookResult.continue_(), messages, config

        ctx = self._create_context(
            hook_name="before_llm_request",
            phase="llm",
            data={"messages": messages, "config": config},
            agent_name=agent_name,
        )

        result, data = await self.executor.execute(
            "before_llm_request", ctx, {"messages": messages, "config": config}
        )

        # Use the returned data (may be modified by REPLACE hooks)
        if isinstance(data, dict):
            return (
                result,
                data.get("messages", messages),
                data.get("config", config),
            )

        return result, messages, config

    async def after_llm_response(
        self,
        response: Any,
        agent_name: str | None = None,
    ) -> tuple[HookResult, Any]:
        """Invoke after_llm_response hooks."""
        if not self.executor.has_hooks("after_llm_response"):
            return HookResult.continue_(), response

        ctx = self._create_context(
            hook_name="after_llm_response",
            phase="llm",
            data={"response": response},
            agent_name=agent_name,
        )

        result, data = await self.executor.execute("after_llm_response", ctx, response)

        # Use the returned data (may be modified by REPLACE hooks)
        return result, data if data is not None else response

    # =========================================================================
    # User Input Hooks
    # =========================================================================

    async def before_user_input(
        self,
        prompt: str,
        variable_name: str,
        node_id: str,
        node_name: str,
    ) -> tuple[HookResult, str]:
        """Invoke before_user_input hooks."""
        if not self.executor.has_hooks("before_user_input"):
            return HookResult.continue_(), prompt

        ctx = self._create_context(
            hook_name="before_user_input",
            phase="user_input",
            data={"prompt": prompt, "variable_name": variable_name},
            node_id=node_id,
            node_name=node_name,
        )

        result, data = await self.executor.execute("before_user_input", ctx, prompt)

        # Use the returned data (may be modified by REPLACE hooks)
        return result, str(data) if data is not None else prompt

    async def after_user_input(
        self,
        response: str,
        variable_name: str,
        node_id: str,
        node_name: str,
    ) -> tuple[HookResult, str]:
        """Invoke after_user_input hooks."""
        if not self.executor.has_hooks("after_user_input"):
            return HookResult.continue_(), response

        ctx = self._create_context(
            hook_name="after_user_input",
            phase="user_input",
            data={"response": response, "variable_name": variable_name},
            node_id=node_id,
            node_name=node_name,
        )

        result, data = await self.executor.execute("after_user_input", ctx, response)

        # Use the returned data (may be modified by REPLACE hooks)
        return result, str(data) if data is not None else response

    # =========================================================================
    # Graph Execution Hooks
    # =========================================================================

    async def on_execution_plan(
        self,
        layers: list[list[str]],
    ) -> tuple[HookResult, list[list[str]]]:
        """Invoke on_execution_plan hooks."""
        if not self.executor.has_hooks("on_execution_plan"):
            return HookResult.continue_(), layers

        ctx = self._create_context(
            hook_name="on_execution_plan",
            phase="graph",
            data={"layers": layers},
        )

        result, data = await self.executor.execute("on_execution_plan", ctx, layers)

        # Use the returned data (may be modified by REPLACE hooks)
        if isinstance(data, list):
            return result, data

        return result, layers

    async def before_layer_execute(
        self,
        layer_index: int,
        node_ids: list[str],
    ) -> tuple[HookResult, list[str]]:
        """Invoke before_layer_execute hooks."""
        if not self.executor.has_hooks("before_layer_execute"):
            return HookResult.continue_(), node_ids

        ctx = self._create_context(
            hook_name="before_layer_execute",
            phase="graph",
            data={"layer_index": layer_index, "node_ids": node_ids},
        )

        result, data = await self.executor.execute(
            "before_layer_execute", ctx, node_ids
        )

        # Use the returned data (may be modified by REPLACE hooks)
        if isinstance(data, list):
            return result, data

        return result, node_ids

    async def after_layer_execute(
        self,
        layer_index: int,
        results: dict[str, Any],
    ) -> tuple[HookResult, dict[str, Any]]:
        """Invoke after_layer_execute hooks."""
        if not self.executor.has_hooks("after_layer_execute"):
            return HookResult.continue_(), results

        ctx = self._create_context(
            hook_name="after_layer_execute",
            phase="graph",
            data={"layer_index": layer_index, "results": results},
        )

        result, data = await self.executor.execute("after_layer_execute", ctx, results)

        # Use the returned data (may be modified by REPLACE hooks)
        if isinstance(data, dict):
            return result, data

        return result, results


def create_hooks_integration(
    run_id: str,
    session_id: str,
    project_path: Path,
    state: Any = None,
    emit: Any = None,
) -> HooksIntegration:
    """Factory function to create a HooksIntegration instance."""
    return HooksIntegration(
        run_id=run_id,
        session_id=session_id,
        project_path=project_path,
        state=state,
        emit=emit,
    )
