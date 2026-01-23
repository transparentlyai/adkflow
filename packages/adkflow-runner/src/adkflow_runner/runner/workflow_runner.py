"""Main workflow runner.

Executes compiled workflows using ADK agents with callback support.
"""

import asyncio
import os
import time
import traceback
import uuid
from pathlib import Path
from typing import Any, AsyncIterator

from dotenv import load_dotenv
from google.adk.agents.invocation_context import LlmCallsLimitExceededError
from google.adk.agents.run_config import RunConfig as AdkRunConfig, StreamingMode
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

from adkflow_runner.compiler import Compiler
from adkflow_runner.errors import ExecutionError
from adkflow_runner.ir import WorkflowIR
from adkflow_runner.logging import (
    Logger,
    configure_logging,
    get_logger,
    log_timing,
    run_context,
)
from adkflow_runner.telemetry import setup_tracing
from adkflow_runner.runner.agent_factory import AgentFactory
from adkflow_runner.runner.types import (
    RunStatus,
    EventType,
    RunEvent,
    RunResult,
    RunConfig,
    NoOpCallbacks,
    RunnerCallbacks,
)
from adkflow_runner.runner.user_input import handle_user_input
from adkflow_runner.runner.context_aggregator_executor import (
    execute_context_aggregator,
)
from adkflow_runner.runner.execution_engine import (
    format_error,
    execute_custom_nodes_graph,
    execute_downstream_agents,
    write_output_files,
    process_adk_event,
    merge_context_vars,
)
from adkflow_runner.runner.graph_builder import partition_custom_nodes
from adkflow_runner.hooks import (
    HookAction,
    HookAbortError,
    create_hooks_integration,
)

# Get workflow logger
_log = get_logger("runner.workflow")


class WorkflowRunner:
    """Executes compiled workflows.

    Usage:
        runner = WorkflowRunner()
        result = await runner.run(RunConfig(
            project_path=Path("/path/to/project"),
            input_data={"prompt": "Hello!"},
            callbacks=my_callbacks,
        ))
    """

    def __init__(self, enable_cache: bool = True, cache_dir: Path | None = None):
        self.compiler = Compiler()
        self._active_runs: dict[str, asyncio.Task] = {}
        self._enable_cache = enable_cache
        self._cache_dir = cache_dir

    async def run(self, config: RunConfig) -> RunResult:
        """Run a workflow.

        Args:
            config: Run configuration

        Returns:
            RunResult with output and events
        """
        # Load .env from workflow project directory
        env_file = config.project_path / ".env"
        if env_file.exists():
            load_dotenv(env_file, override=True)

        # Initialize logging for this project (writes to project/logs/)
        configure_logging(project_path=config.project_path)
        Logger.initialize(project_path=config.project_path)

        # Initialize tracing (writes to project/logs/traces.jsonl)
        setup_tracing(config.project_path)

        # Use provided run_id or generate one
        run_id = config.run_id or str(uuid.uuid4())[:8]

        # Set run context so all logs automatically include run_id
        with run_context(run_id):
            return await self._run_with_context(config, run_id)

    async def _run_with_context(self, config: RunConfig, run_id: str) -> RunResult:
        """Execute the workflow run within a run context."""
        start_time = time.time()
        events: list[RunEvent] = []
        callbacks = config.callbacks or NoOpCallbacks()

        # Create run-scoped logger with context (run_id is auto-injected)
        run_log = _log.with_context(
            project=config.project_path.name,
        )

        async def emit(event: RunEvent) -> None:
            events.append(event)
            await callbacks.on_event(event)

        # Create hooks integration for this run
        session_id = str(uuid.uuid4())[:8]
        hooks = create_hooks_integration(
            run_id=run_id,
            session_id=session_id,
            project_path=config.project_path,
            emit=emit,
        )

        try:
            run_log.info(
                "Workflow starting",
                project_path=str(config.project_path),
                tab_id=config.tab_id,
                input_keys=list(config.input_data.keys()),
            )

            # Invoke before_run hooks
            hook_result, input_data, _ = await hooks.before_run(
                inputs=config.input_data,
                config={
                    "project_path": str(config.project_path),
                    "tab_id": config.tab_id,
                },
            )
            if hook_result.action == HookAction.ABORT:
                raise HookAbortError(
                    hook_result.error or "Aborted by before_run hook",
                    hook_name="before_run",
                    extension_id=None,
                )
            if hook_result.action == HookAction.SKIP:
                # Skip the entire run, return empty result
                return RunResult(
                    run_id=run_id,
                    status=RunStatus.COMPLETED,
                    output="",
                    events=events,
                    duration_ms=(time.time() - start_time) * 1000,
                    metadata={"skipped_by_hook": True},
                )
            # Use potentially modified input data
            config = RunConfig(
                project_path=config.project_path,
                tab_id=config.tab_id,
                input_data=input_data,
                callbacks=config.callbacks,
                timeout_seconds=config.timeout_seconds,
                validate=config.validate,
                user_input_provider=config.user_input_provider,
                run_id=config.run_id,
            )

            # Emit run start
            await emit(
                RunEvent(
                    type=EventType.RUN_START,
                    timestamp=time.time(),
                    data={
                        "run_id": run_id,
                        "project_path": str(config.project_path),
                        "tab_id": config.tab_id,
                    },
                )
            )

            # Compile workflow with timing
            with log_timing(run_log, "compile") as ctx:
                ir = self.compiler.compile(
                    config.project_path,
                    validate=config.validate,
                )
                ctx["agent_count"] = len(ir.all_agents)
                ctx["tool_count"] = sum(len(a.tools) for a in ir.all_agents.values())
                ctx["custom_node_count"] = len(ir.custom_nodes)

            run_log.debug(
                "Compiled workflow",
                root_agent=ir.root_agent.name,
                root_type=ir.root_agent.type,
                agents=[a.name for a in ir.all_agents.values()],
            )

            # Execute with timing
            with log_timing(run_log, "execute") as ctx:
                output = await self._execute(ir, config, emit, run_id, hooks)
                ctx["output_length"] = len(output) if output else 0

            # Invoke after_run hooks
            hook_result, output = await hooks.after_run(
                output=output, status="completed"
            )
            if hook_result.action == HookAction.ABORT:
                raise HookAbortError(
                    hook_result.error or "Aborted by after_run hook",
                    hook_name="after_run",
                    extension_id=None,
                )

            # Emit completion
            await emit(
                RunEvent(
                    type=EventType.RUN_COMPLETE,
                    timestamp=time.time(),
                    data={"output": output},
                )
            )

            duration_ms = (time.time() - start_time) * 1000
            run_log.info(
                "Workflow complete",
                status="completed",
                duration_ms=duration_ms,
                output_preview=output[:200] + "..."
                if output and len(output) > 200
                else output,
            )

            return RunResult(
                run_id=run_id,
                status=RunStatus.COMPLETED,
                output=output,
                events=events,
                duration_ms=duration_ms,
                metadata={
                    "project_path": str(config.project_path),
                    "tab_id": config.tab_id,
                },
            )

        except asyncio.CancelledError:
            duration_ms = (time.time() - start_time) * 1000
            run_log.warning("Workflow cancelled", duration_ms=duration_ms)

            # Invoke on_run_cancel hooks
            await hooks.on_run_cancel()

            await emit(
                RunEvent(
                    type=EventType.ERROR,
                    timestamp=time.time(),
                    data={"error": "Run cancelled"},
                )
            )
            return RunResult(
                run_id=run_id,
                status=RunStatus.CANCELLED,
                error="Run cancelled",
                events=events,
                duration_ms=duration_ms,
            )

        except Exception as e:
            duration_ms = (time.time() - start_time) * 1000
            error_msg = str(e)

            # Invoke on_run_error hooks
            hook_result, modified_error = await hooks.on_run_error(error=e)
            if hook_result.action == HookAction.SKIP:
                # Error suppressed by hook - return success with empty output
                run_log.info(
                    "Workflow error suppressed by hook", original_error=error_msg
                )
                return RunResult(
                    run_id=run_id,
                    status=RunStatus.COMPLETED,
                    output="",
                    events=events,
                    duration_ms=duration_ms,
                    metadata={"error_suppressed_by_hook": True},
                )

            # Use modified error if provided
            if modified_error is not None:
                e = modified_error
                error_msg = str(e)

            run_log.error(
                "Workflow failed",
                exception=e,
                duration_ms=duration_ms,
            )

            # Provide friendly error messages for common issues
            full_error = format_error(error_msg, config.project_path)

            # Include traceback only in dev mode
            if os.environ.get("ADKFLOW_DEV_MODE") == "1":
                tb = traceback.format_exc()
                full_error = f"{full_error}\n\n{tb}"

            await emit(
                RunEvent(
                    type=EventType.ERROR,
                    timestamp=time.time(),
                    data={"error": full_error},
                )
            )
            return RunResult(
                run_id=run_id,
                status=RunStatus.FAILED,
                error=full_error,
                events=events,
                duration_ms=duration_ms,
            )

    async def _execute(
        self,
        ir: WorkflowIR,
        config: RunConfig,
        emit: Any,
        run_id: str,
        hooks: Any,  # HooksIntegration
    ) -> str:
        """Execute the compiled workflow."""
        session_state: dict[str, Any] = {}

        # Track accumulated outputs for variable substitution
        accumulated_outputs: dict[str, str] = {}

        # Handle trigger user inputs (those without incoming connections)
        trigger_inputs = [ui for ui in ir.user_inputs if ui.is_trigger]
        for user_input in trigger_inputs:
            user_response = await handle_user_input(
                user_input=user_input,
                previous_output=None,
                config=config,
                emit=emit,
                hooks=hooks,
            )
            if user_response is not None:
                accumulated_outputs[user_input.variable_name] = user_response

        # Partition custom nodes into pre-agent (no agent dependencies) and
        # post-agent (depend on agent outputs)
        pre_agent_nodes, post_agent_nodes = partition_custom_nodes(ir)

        # Execute pre-agent custom nodes (those without agent dependencies)
        custom_node_outputs: dict[str, dict[str, Any]] = {}
        if pre_agent_nodes:
            custom_node_outputs = await execute_custom_nodes_graph(
                ir=ir,
                config=config,
                emit=emit,
                session_state=session_state,
                run_id=run_id,
                enable_cache=self._enable_cache,
                cache_dir=self._cache_dir,
                hooks=hooks,
                custom_node_ids=pre_agent_nodes,
            )

        # Execute context aggregators (built-in nodes)
        context_aggregator_outputs: dict[str, dict[str, Any]] = {}
        if ir.context_aggregators:
            for aggregator_ir in ir.context_aggregators:
                # Resolve inputs from connected nodes (custom node outputs)
                node_inputs: dict[str, Any] = {}
                for port_id, source_ids in aggregator_ir.input_connections.items():
                    for source_id in source_ids:
                        if source_id in custom_node_outputs:
                            source_output = custom_node_outputs[source_id]
                            if source_output:
                                # Get first output value
                                node_inputs[port_id] = next(
                                    iter(source_output.values())
                                )
                            break

                output = await execute_context_aggregator(
                    aggregator_ir,
                    str(config.project_path),
                    node_inputs,
                )
                context_aggregator_outputs[aggregator_ir.id] = output

        # Resolve context variables for agents from context aggregator and custom node outputs
        if context_aggregator_outputs or custom_node_outputs:
            for agent_ir in ir.all_agents.values():
                if agent_ir.context_var_sources:
                    # Collect outputs from all context var sources
                    source_dicts: list[dict[str, Any]] = []
                    source_names: list[str] = []
                    for source_id in agent_ir.context_var_sources:
                        # Check context aggregator outputs first
                        if source_id in context_aggregator_outputs:
                            node_output = context_aggregator_outputs[source_id]
                            if "output" in node_output:
                                output_value = node_output["output"]
                                if isinstance(output_value, dict):
                                    source_dicts.append(output_value)
                                    # Get name from IR
                                    aggregator = next(
                                        (
                                            a
                                            for a in ir.context_aggregators
                                            if a.id == source_id
                                        ),
                                        None,
                                    )
                                    source_names.append(
                                        aggregator.name if aggregator else source_id
                                    )
                        # Then check custom node outputs
                        elif source_id in custom_node_outputs:
                            # Get the "output" port which contains the variables dict
                            node_output = custom_node_outputs[source_id]
                            if "output" in node_output:
                                output_value = node_output["output"]
                                if isinstance(output_value, dict):
                                    source_dicts.append(output_value)
                                    # Get source name for error messages
                                    source_node = next(
                                        (
                                            n
                                            for n in ir.custom_nodes
                                            if n.id == source_id
                                        ),
                                        None,
                                    )
                                    source_names.append(
                                        source_node.name if source_node else source_id
                                    )

                    # Merge and validate context vars
                    if source_dicts:
                        merged_vars = merge_context_vars(source_dicts, source_names)

                        # Check for conflicts with upstream_output_keys
                        upstream_keys = set(agent_ir.upstream_output_keys)
                        conflicts = upstream_keys & set(merged_vars.keys())
                        if conflicts:
                            raise ExecutionError(
                                f"Context variable conflict in agent '{agent_ir.name}': "
                                f"'{', '.join(conflicts)}' defined in both context "
                                f"aggregator and upstream agent output_key. "
                                f"Use unique variable names."
                            )

                        # Merge with existing context_vars instead of overwriting
                        agent_ir.context_vars = {
                            **agent_ir.context_vars,
                            **merged_vars,
                        }

        factory = AgentFactory(config.project_path)
        root_agent = factory.create_from_workflow(ir, emit=emit, hooks=hooks)

        session_service = InMemorySessionService()
        session = await session_service.create_session(
            app_name="adkflow",
            user_id="runner",
        )

        runner = Runner(
            agent=root_agent,
            app_name="adkflow",
            session_service=session_service,
        )

        # Build prompt from input_data and any trigger user input responses
        prompt = config.input_data.get("prompt", "")
        if not prompt:
            prompt = "Execute the workflow."

        # If we have trigger input responses, prepend them to the prompt
        if trigger_inputs and accumulated_outputs:
            trigger_context = "\n".join(
                f"{name}: {value}" for name, value in accumulated_outputs.items()
            )
            prompt = f"{trigger_context}\n\n{prompt}"

        # If we have custom node outputs, include them as context
        if custom_node_outputs:
            custom_context_parts = []
            for node_id, outputs in custom_node_outputs.items():
                for port_id, value in outputs.items():
                    if isinstance(value, str):
                        custom_context_parts.append(f"[{node_id}.{port_id}]: {value}")
            if custom_context_parts:
                custom_context = "\n".join(custom_context_parts)
                prompt = f"{custom_context}\n\n{prompt}"

        content = types.Content(
            role="user",
            parts=[types.Part(text=prompt)],
        )

        # Build ADK RunConfig from our settings
        adk_run_config = self._build_adk_run_config(config)

        output_parts: list[str] = []
        last_author: str | None = None

        try:
            async for event in runner.run_async(
                user_id="runner",
                session_id=session.id,
                new_message=content,
                run_config=adk_run_config,
            ):
                last_author = await process_adk_event(event, emit, last_author)

                if hasattr(event, "content") and event.content:
                    parts = event.content.parts
                    if parts:
                        for part in parts:
                            if hasattr(part, "text") and part.text:
                                output_parts.append(part.text)
        except LlmCallsLimitExceededError as e:
            # Handle gracefully - return partial results with warning
            await emit(
                RunEvent(
                    type=EventType.ERROR,
                    timestamp=time.time(),
                    data={
                        "warning": f"LLM call limit reached: {e}. Returning partial results.",
                        "partial": True,
                    },
                )
            )
        except Exception as e:
            # Re-raise with friendly error message if applicable
            error_msg = str(e)
            friendly_error = format_error(error_msg, config.project_path)
            raise RuntimeError(friendly_error) from e

        output = "\n".join(output_parts)

        # Execute post-agent custom nodes (those that depend on agent outputs)
        if post_agent_nodes:
            # Build external results from agent outputs
            # All output is passed to monitors (including intermediate steps)
            agent_outputs: dict[str, dict[str, Any]] = {}
            for agent_id in ir.all_agents:
                agent_outputs[agent_id] = {
                    "output": output,
                    "finish-reason": factory.get_finish_reason(agent_id),
                }

            # Merge pre-agent custom node outputs with agent outputs
            external_results = {**custom_node_outputs, **agent_outputs}

            post_agent_outputs = await execute_custom_nodes_graph(
                ir=ir,
                config=config,
                emit=emit,
                session_state=session_state,
                run_id=run_id,
                enable_cache=self._enable_cache,
                cache_dir=self._cache_dir,
                hooks=hooks,
                custom_node_ids=post_agent_nodes,
                external_results=external_results,
            )
            # Merge post-agent outputs into custom_node_outputs
            custom_node_outputs.update(post_agent_outputs)

        # Handle pause user inputs (those with incoming connections)
        # These are processed after the first segment of agents completes
        pause_inputs = [ui for ui in ir.user_inputs if not ui.is_trigger]
        if pause_inputs:
            # Store the current output for use in pause inputs
            accumulated_outputs["__last_output__"] = output

            for user_input in pause_inputs:
                user_response = await handle_user_input(
                    user_input=user_input,
                    previous_output=output,
                    config=config,
                    emit=emit,
                    hooks=hooks,
                )
                if user_response is not None:
                    accumulated_outputs[user_input.variable_name] = user_response

                    # Execute downstream agents connected to this UserInput
                    downstream_output = await execute_downstream_agents(
                        user_input=user_input,
                        user_response=user_response,
                        ir=ir,
                        config=config,
                        emit=emit,
                        session_service=session_service,
                        factory=factory,
                    )
                    if downstream_output:
                        output = downstream_output
                    else:
                        # The user response becomes the output if no downstream agents
                        output = user_response

        await write_output_files(ir, output, config.project_path, emit)

        return output

    def _build_adk_run_config(self, config: RunConfig) -> AdkRunConfig:
        """Build ADK RunConfig from our RunConfig settings.

        Args:
            config: Our RunConfig with ADK settings

        Returns:
            ADK RunConfig for runner.run_async()
        """
        # Map streaming mode string to ADK enum
        streaming_mode_map = {
            "none": StreamingMode.NONE,
            "sse": StreamingMode.SSE,
            "bidi": StreamingMode.BIDI,
        }
        streaming_mode = streaming_mode_map.get(
            config.streaming_mode, StreamingMode.NONE
        )

        # Build base ADK RunConfig
        # Note: max_llm_calls=0 means use default (500), positive values set the limit
        adk_config = AdkRunConfig(
            max_llm_calls=config.max_llm_calls if config.max_llm_calls > 0 else 500,
            streaming_mode=streaming_mode,
        )

        # Enable context window compression if requested
        if config.context_window_compression:
            adk_config.context_window_compression = (
                types.ContextWindowCompressionConfig()
            )

        return adk_config

    async def run_async_generator(
        self,
        config: RunConfig,
    ) -> AsyncIterator[RunEvent | RunResult]:
        """Run a workflow and yield events as they occur.

        Args:
            config: Run configuration

        Yields:
            RunEvent objects as execution progresses, RunResult at end
        """
        event_queue: asyncio.Queue[RunEvent | None] = asyncio.Queue()

        class QueueCallbacks:
            async def on_event(self, event: RunEvent) -> None:
                await event_queue.put(event)

        config_with_callbacks = RunConfig(
            project_path=config.project_path,
            tab_id=config.tab_id,
            input_data=config.input_data,
            callbacks=QueueCallbacks(),
            timeout_seconds=config.timeout_seconds,
            validate=config.validate,
            user_input_provider=config.user_input_provider,
            max_llm_calls=config.max_llm_calls,
            context_window_compression=config.context_window_compression,
            streaming_mode=config.streaming_mode,
        )

        # Start run in background
        run_task = asyncio.create_task(self.run(config_with_callbacks))

        try:
            while True:
                # Wait for event or task completion
                done, _ = await asyncio.wait(
                    [
                        asyncio.create_task(event_queue.get()),
                        run_task,
                    ],
                    return_when=asyncio.FIRST_COMPLETED,
                )

                for task in done:
                    if task == run_task:
                        # Drain remaining events
                        while not event_queue.empty():
                            event = await event_queue.get()
                            if event:
                                yield event
                        return
                    else:
                        event = task.result()
                        if event:
                            yield event

        except asyncio.CancelledError:
            run_task.cancel()
            raise


# Convenience function
async def run_workflow(
    project_path: Path | str,
    input_data: dict[str, Any] | None = None,
    callbacks: RunnerCallbacks | None = None,
) -> RunResult:
    """Run a workflow.

    Convenience function that creates a runner and executes.

    Args:
        project_path: Path to the project directory
        input_data: Input data for the workflow
        callbacks: Optional callbacks for events

    Returns:
        RunResult with output and events
    """
    runner = WorkflowRunner()
    config = RunConfig(
        project_path=Path(project_path),
        input_data=input_data or {},
        callbacks=callbacks,
    )
    return await runner.run(config)
