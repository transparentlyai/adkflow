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
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

from adkflow_runner.compiler import Compiler
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
from adkflow_runner.runner.execution_engine import (
    format_error,
    execute_custom_nodes_graph,
    execute_downstream_agents,
    write_output_files,
    process_adk_event,
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

        try:
            run_log.info(
                "Workflow starting",
                project_path=str(config.project_path),
                tab_id=config.tab_id,
                input_keys=list(config.input_data.keys()),
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
                output = await self._execute(ir, config, emit, run_id)
                ctx["output_length"] = len(output) if output else 0

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
            )
            if user_response is not None:
                accumulated_outputs[user_input.variable_name] = user_response

        # Execute custom nodes using graph-based execution if any exist
        custom_node_outputs: dict[str, dict[str, Any]] = {}
        if ir.custom_nodes:
            custom_node_outputs = await execute_custom_nodes_graph(
                ir=ir,
                config=config,
                emit=emit,
                session_state=session_state,
                run_id=run_id,
                enable_cache=self._enable_cache,
                cache_dir=self._cache_dir,
            )

        factory = AgentFactory(config.project_path)
        root_agent = factory.create_from_workflow(ir, emit=emit)

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

        output_parts: list[str] = []
        last_author: str | None = None

        try:
            async for event in runner.run_async(
                user_id="runner",
                session_id=session.id,
                new_message=content,
            ):
                last_author = await process_adk_event(event, emit, last_author)

                if hasattr(event, "content") and event.content:
                    parts = event.content.parts
                    if parts:
                        for part in parts:
                            if hasattr(part, "text") and part.text:
                                output_parts.append(part.text)
        except Exception as e:
            # Re-raise with friendly error message if applicable
            error_msg = str(e)
            friendly_error = format_error(error_msg, config.project_path)
            raise RuntimeError(friendly_error) from e

        output = "\n".join(output_parts)

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
