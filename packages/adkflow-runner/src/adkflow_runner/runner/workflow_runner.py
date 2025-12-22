"""Main workflow runner.

Executes compiled workflows using ADK agents with callback support.
"""

import asyncio
import time
import uuid
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any, AsyncIterator, Protocol

from dotenv import load_dotenv
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

from adkflow_runner.compiler import Compiler
from adkflow_runner.ir import WorkflowIR
from adkflow_runner.runner.agent_factory import AgentFactory


class RunStatus(Enum):
    """Status of a workflow run."""

    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class EventType(Enum):
    """Types of execution events."""

    RUN_START = "run_start"
    AGENT_START = "agent_start"
    AGENT_OUTPUT = "agent_output"
    AGENT_END = "agent_end"
    TOOL_CALL = "tool_call"
    TOOL_RESULT = "tool_result"
    THINKING = "thinking"
    ERROR = "error"
    RUN_COMPLETE = "run_complete"


@dataclass
class RunEvent:
    """An event during workflow execution."""

    type: EventType
    timestamp: float
    agent_id: str | None = None
    agent_name: str | None = None
    data: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "type": self.type.value,
            "timestamp": self.timestamp,
            "agent_id": self.agent_id,
            "agent_name": self.agent_name,
            "data": self.data,
        }


@dataclass
class RunResult:
    """Result of a workflow run."""

    run_id: str
    status: RunStatus
    output: str | None = None
    error: str | None = None
    events: list[RunEvent] = field(default_factory=list)
    duration_ms: float = 0
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "run_id": self.run_id,
            "status": self.status.value,
            "output": self.output,
            "error": self.error,
            "events": [e.to_dict() for e in self.events],
            "duration_ms": self.duration_ms,
            "metadata": self.metadata,
        }


class RunnerCallbacks(Protocol):
    """Protocol for execution callbacks."""

    async def on_event(self, event: RunEvent) -> None:
        """Called when an event occurs during execution."""
        ...


class NoOpCallbacks:
    """No-op callbacks implementation."""

    async def on_event(self, event: RunEvent) -> None:
        pass


@dataclass
class RunConfig:
    """Configuration for a workflow run."""

    project_path: Path
    tab_id: str | None = None
    input_data: dict[str, Any] = field(default_factory=dict)
    callbacks: RunnerCallbacks | None = None
    timeout_seconds: float = 300  # 5 minutes default
    validate: bool = True


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

    def __init__(self):
        self.compiler = Compiler()
        self._active_runs: dict[str, asyncio.Task] = {}

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

        run_id = str(uuid.uuid4())[:8]
        start_time = time.time()
        events: list[RunEvent] = []
        callbacks = config.callbacks or NoOpCallbacks()

        async def emit(event: RunEvent) -> None:
            events.append(event)
            await callbacks.on_event(event)

        try:
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

            # Compile workflow
            ir = self.compiler.compile(
                config.project_path,
                validate=config.validate,
            )

            # Execute
            output = await self._execute(ir, config, emit)

            # Emit completion
            await emit(
                RunEvent(
                    type=EventType.RUN_COMPLETE,
                    timestamp=time.time(),
                    data={"output": output},
                )
            )

            return RunResult(
                run_id=run_id,
                status=RunStatus.COMPLETED,
                output=output,
                events=events,
                duration_ms=(time.time() - start_time) * 1000,
                metadata={
                    "project_path": str(config.project_path),
                    "tab_id": config.tab_id,
                },
            )

        except asyncio.CancelledError:
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
                duration_ms=(time.time() - start_time) * 1000,
            )

        except Exception as e:
            error_msg = str(e)
            await emit(
                RunEvent(
                    type=EventType.ERROR,
                    timestamp=time.time(),
                    data={"error": error_msg},
                )
            )
            return RunResult(
                run_id=run_id,
                status=RunStatus.FAILED,
                error=error_msg,
                events=events,
                duration_ms=(time.time() - start_time) * 1000,
            )

    async def _execute(
        self,
        ir: WorkflowIR,
        config: RunConfig,
        emit: Any,
    ) -> str:
        """Execute the compiled workflow."""
        # Create agent factory and build agent tree
        factory = AgentFactory(config.project_path)
        root_agent = factory.create_from_workflow(ir)

        # Create fresh session (stateless)
        session_service = InMemorySessionService()
        session = await session_service.create_session(
            app_name="adkflow",
            user_id="runner",
        )

        # Create ADK runner
        runner = Runner(
            agent=root_agent,
            app_name="adkflow",
            session_service=session_service,
        )

        # Build input message
        prompt = config.input_data.get("prompt", "")
        if not prompt:
            prompt = "Execute the workflow."

        content = types.Content(
            role="user",
            parts=[types.Part(text=prompt)],
        )

        # Execute and collect output
        output_parts: list[str] = []
        last_author: str | None = None

        async for event in runner.run_async(
            user_id="runner",
            session_id=session.id,
            new_message=content,
        ):
            # Process ADK events and emit our events
            last_author = await self._process_adk_event(event, emit, last_author)

            # Collect final output
            if hasattr(event, "content") and event.content:
                parts = event.content.parts
                if parts:
                    for part in parts:
                        if hasattr(part, "text") and part.text:
                            output_parts.append(part.text)

        output = "\n".join(output_parts)

        # Write to output files if configured
        await self._write_output_files(ir, output, config.project_path, emit)

        return output

    async def _write_output_files(
        self,
        ir: WorkflowIR,
        output: str,
        project_path: Path,
        emit: Any,
    ) -> None:
        """Write output to configured output files."""
        from pathlib import Path as PathLib

        for output_file in ir.output_files:
            try:
                # Resolve file path relative to project
                file_path = output_file.file_path
                if not file_path.startswith("/"):
                    full_path = project_path / file_path
                else:
                    full_path = PathLib(file_path)

                # Ensure parent directory exists
                full_path.parent.mkdir(parents=True, exist_ok=True)

                # Write the output
                full_path.write_text(output, encoding="utf-8")

                await emit(
                    RunEvent(
                        type=EventType.AGENT_OUTPUT,
                        timestamp=time.time(),
                        data={
                            "output": f"Wrote output to {file_path}",
                            "file_path": str(full_path),
                        },
                    )
                )

            except Exception as e:
                await emit(
                    RunEvent(
                        type=EventType.ERROR,
                        timestamp=time.time(),
                        data={
                            "error": f"Failed to write output file {output_file.file_path}: {e}",
                        },
                    )
                )

    async def _process_adk_event(
        self,
        event: Any,
        emit: Any,
        last_author: str | None = None,
    ) -> str | None:
        """Process an ADK event and emit corresponding RunEvent.

        Returns the current author for tracking agent changes.
        """
        # ADK events use 'author' attribute for agent name
        author = getattr(event, "author", None)
        turn_complete = getattr(event, "turn_complete", False)

        # Detect agent change - emit start event for new agent
        if author and author != "user" and author != last_author:
            await emit(
                RunEvent(
                    type=EventType.AGENT_START,
                    timestamp=time.time(),
                    agent_name=author,
                    data={"event_type": "agent_change"},
                )
            )

        # Check for content (agent output)
        if hasattr(event, "content") and event.content:
            text = ""
            parts = event.content.parts if event.content.parts else []
            for part in parts:
                if hasattr(part, "text") and part.text:
                    text += part.text
            if text and author and author != "user":
                await emit(
                    RunEvent(
                        type=EventType.AGENT_OUTPUT,
                        timestamp=time.time(),
                        agent_name=author,
                        data={"output": text[:500]},
                    )
                )

        # Check for function calls (tool usage)
        if hasattr(event, "content") and event.content:
            parts = event.content.parts if event.content.parts else []
            for part in parts:
                if hasattr(part, "function_call") and part.function_call:
                    tool_name = getattr(part.function_call, "name", "unknown")
                    await emit(
                        RunEvent(
                            type=EventType.TOOL_CALL,
                            timestamp=time.time(),
                            agent_name=author,
                            data={"tool_name": tool_name},
                        )
                    )
                elif hasattr(part, "function_response") and part.function_response:
                    tool_name = getattr(part.function_response, "name", "unknown")
                    await emit(
                        RunEvent(
                            type=EventType.TOOL_RESULT,
                            timestamp=time.time(),
                            agent_name=author,
                            data={"tool_name": tool_name},
                        )
                    )

        # Detect turn completion - emit end event
        if turn_complete and author and author != "user":
            await emit(
                RunEvent(
                    type=EventType.AGENT_END,
                    timestamp=time.time(),
                    agent_name=author,
                    data={"event_type": "turn_complete"},
                )
            )

        return author if author and author != "user" else last_author

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
