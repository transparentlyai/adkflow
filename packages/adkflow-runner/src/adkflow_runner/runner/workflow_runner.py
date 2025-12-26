"""Main workflow runner.

Executes compiled workflows using ADK agents with callback support.
"""

import asyncio
import os
import time
import traceback
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
    ERROR = "run_error"
    RUN_COMPLETE = "run_complete"

    # User input events
    USER_INPUT_REQUIRED = "user_input_required"
    USER_INPUT_RECEIVED = "user_input_received"
    USER_INPUT_TIMEOUT = "user_input_timeout"


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


@dataclass
class UserInputRequest:
    """Request for user input during workflow execution."""

    request_id: str
    node_id: str
    node_name: str
    variable_name: str
    previous_output: str | None  # Output from previous agent (None if trigger mode)
    is_trigger: bool  # True if no input connection
    timeout_seconds: float
    timeout_behavior: str  # "pass_through" | "predefined_text" | "error"
    predefined_text: str

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for event data."""
        return {
            "request_id": self.request_id,
            "node_id": self.node_id,
            "node_name": self.node_name,
            "variable_name": self.variable_name,
            "previous_output": self.previous_output,
            "is_trigger": self.is_trigger,
            "timeout_seconds": self.timeout_seconds,
            "timeout_behavior": self.timeout_behavior,
            "predefined_text": self.predefined_text,
        }


class UserInputProvider(Protocol):
    """Protocol for providing user input during workflow execution.

    Implementations handle the actual user interaction (CLI prompts, UI dialogs, etc.)
    """

    async def request_input(self, request: UserInputRequest) -> str | None:
        """Request user input.

        Args:
            request: The input request context

        Returns:
            User input string, or None if skipped/cancelled

        Raises:
            TimeoutError: If timeout_behavior is "error" and timeout occurs
            asyncio.CancelledError: If the request was cancelled
        """
        ...


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
    user_input_provider: UserInputProvider | None = None


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

            # Provide friendly error messages for common issues
            full_error = self._format_error(error_msg, config.project_path)

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
                duration_ms=(time.time() - start_time) * 1000,
            )

    def _format_error(self, error_msg: str, project_path: Path) -> str:
        """Format error messages with helpful instructions for common issues."""
        error_lower = error_msg.lower()

        # Check for missing API credentials - catch various error patterns
        credential_error_patterns = [
            "missing key inputs argument",
            "api_key",
            "google_api_key",
            "gemini_api_key",
            "defaultcredentialserror",
            "could not automatically determine credentials",
            "credentials not found",
            "api key not valid",
            "invalid api key",
            "authentication failed",
            "unauthorized",
            "permission denied",
            "please set the google_api_key",
            "please provide an api_key",
        ]

        is_credential_error = any(
            pattern in error_lower for pattern in credential_error_patterns
        )

        if is_credential_error:
            return f"""API credentials not configured or invalid.

To run workflows, you need to set up Google API credentials.

Option 1: Create a .env file in your project directory:
  {project_path}/.env

  Add one of these configurations:

  # For Google AI API (Gemini):
  GOOGLE_API_KEY=your-api-key-here

  # OR for Vertex AI:
  GOOGLE_GENAI_USE_VERTEXAI=true
  GOOGLE_CLOUD_PROJECT=your-project-id
  GOOGLE_CLOUD_LOCATION=us-central1

Option 2: Set environment variables before starting the server.

Get your API key at: https://aistudio.google.com/apikey

Original error: {error_msg}"""

        # Return original message for other errors
        return error_msg

    async def _execute(
        self,
        ir: WorkflowIR,
        config: RunConfig,
        emit: Any,
    ) -> str:
        """Execute the compiled workflow."""
        # Track accumulated outputs for variable substitution
        accumulated_outputs: dict[str, str] = {}

        # Handle trigger user inputs (those without incoming connections)
        trigger_inputs = [ui for ui in ir.user_inputs if ui.is_trigger]
        for user_input in trigger_inputs:
            user_response = await self._handle_user_input(
                user_input=user_input,
                previous_output=None,
                config=config,
                emit=emit,
            )
            if user_response is not None:
                accumulated_outputs[user_input.variable_name] = user_response

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
                last_author = await self._process_adk_event(event, emit, last_author)

                if hasattr(event, "content") and event.content:
                    parts = event.content.parts
                    if parts:
                        for part in parts:
                            if hasattr(part, "text") and part.text:
                                output_parts.append(part.text)
        except Exception as e:
            # Re-raise with friendly error message if applicable
            error_msg = str(e)
            friendly_error = self._format_error(error_msg, config.project_path)
            raise RuntimeError(friendly_error) from e

        output = "\n".join(output_parts)

        # Handle pause user inputs (those with incoming connections)
        # These are processed after the first segment of agents completes
        pause_inputs = [ui for ui in ir.user_inputs if not ui.is_trigger]
        if pause_inputs:
            # Store the current output for use in pause inputs
            accumulated_outputs["__last_output__"] = output

            for user_input in pause_inputs:
                user_response = await self._handle_user_input(
                    user_input=user_input,
                    previous_output=output,
                    config=config,
                    emit=emit,
                )
                if user_response is not None:
                    accumulated_outputs[user_input.variable_name] = user_response

                    # Execute downstream agents connected to this UserInput
                    downstream_output = await self._execute_downstream_agents(
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

        await self._write_output_files(ir, output, config.project_path, emit)

        return output

    async def _handle_user_input(
        self,
        user_input: Any,  # UserInputIR
        previous_output: str | None,
        config: RunConfig,
        emit: Any,
    ) -> str | None:
        """Handle a user input pause point.

        Emits USER_INPUT_REQUIRED event, waits for response (or timeout),
        and returns the user's input.

        Args:
            user_input: The UserInputIR to handle
            previous_output: Output from previous agent (None for triggers)
            config: Run configuration
            emit: Event emitter function

        Returns:
            User's input string, or None if skipped/cancelled
        """
        request_id = str(uuid.uuid4())[:8]

        # Create request
        request = UserInputRequest(
            request_id=request_id,
            node_id=user_input.id,
            node_name=user_input.name,
            variable_name=user_input.variable_name,
            previous_output=previous_output,
            is_trigger=user_input.is_trigger,
            timeout_seconds=user_input.timeout_seconds,
            timeout_behavior=user_input.timeout_behavior,
            predefined_text=user_input.predefined_text,
        )

        # Emit USER_INPUT_REQUIRED event
        await emit(
            RunEvent(
                type=EventType.USER_INPUT_REQUIRED,
                timestamp=time.time(),
                data=request.to_dict(),
            )
        )

        # If we have a user input provider, use it
        if config.user_input_provider:
            try:
                response = await config.user_input_provider.request_input(request)

                # Emit received event
                await emit(
                    RunEvent(
                        type=EventType.USER_INPUT_RECEIVED,
                        timestamp=time.time(),
                        data={
                            "request_id": request_id,
                            "node_id": user_input.id,
                            "node_name": user_input.name,
                        },
                    )
                )

                return response

            except TimeoutError:
                # Emit timeout event
                await emit(
                    RunEvent(
                        type=EventType.USER_INPUT_TIMEOUT,
                        timestamp=time.time(),
                        data={
                            "request_id": request_id,
                            "node_id": user_input.id,
                            "behavior": user_input.timeout_behavior,
                        },
                    )
                )

                # Handle timeout based on configured behavior
                if user_input.timeout_behavior == "pass_through":
                    return previous_output
                elif user_input.timeout_behavior == "predefined_text":
                    return user_input.predefined_text
                else:  # "error"
                    raise RuntimeError(f"User input timeout for '{user_input.name}'")

            except asyncio.CancelledError:
                raise

        else:
            # No user input provider configured
            # Use timeout behavior immediately
            if user_input.timeout_behavior == "pass_through":
                return previous_output
            elif user_input.timeout_behavior == "predefined_text":
                return user_input.predefined_text
            else:
                # For trigger inputs without a provider, we can't proceed
                if user_input.is_trigger:
                    raise RuntimeError(
                        f"No user input provider configured and trigger "
                        f"'{user_input.name}' requires input"
                    )
                return previous_output

    async def _execute_downstream_agents(
        self,
        user_input: Any,  # UserInputIR
        user_response: str,
        ir: WorkflowIR,
        config: RunConfig,
        emit: Any,
        session_service: Any,
        factory: Any,
    ) -> str | None:
        """Execute agents connected downstream of a UserInput node.

        Args:
            user_input: The UserInputIR with outgoing agent connections
            user_response: The user's response to use as input
            ir: Complete workflow IR with all agents
            config: Run configuration
            emit: Event emitter function
            session_service: Session service for runner
            factory: Agent factory for creating agents

        Returns:
            Output from downstream agents, or None if no downstream agents
        """
        if not user_input.outgoing_agent_ids:
            return None

        output_parts: list[str] = []

        for agent_id in user_input.outgoing_agent_ids:
            agent_ir = ir.all_agents.get(agent_id)
            if not agent_ir:
                continue

            # Create the downstream agent
            downstream_agent = factory.create(agent_ir)

            # Create a new runner for this segment
            downstream_runner = Runner(
                agent=downstream_agent,
                app_name="adkflow",
                session_service=session_service,
            )

            # Create a new session for this segment
            session = await session_service.create_session(
                app_name="adkflow",
                user_id="runner",
            )

            # Use user response as the prompt
            content = types.Content(
                role="user",
                parts=[types.Part(text=user_response)],
            )

            last_author: str | None = None

            try:
                async for event in downstream_runner.run_async(
                    user_id="runner",
                    session_id=session.id,
                    new_message=content,
                ):
                    last_author = await self._process_adk_event(
                        event, emit, last_author
                    )

                    if hasattr(event, "content") and event.content:
                        parts = event.content.parts
                        if parts:
                            for part in parts:
                                if hasattr(part, "text") and part.text:
                                    output_parts.append(part.text)
            except Exception as e:
                error_msg = str(e)
                friendly_error = self._format_error(error_msg, config.project_path)
                raise RuntimeError(friendly_error) from e

        return "\n".join(output_parts) if output_parts else None

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
        author = getattr(event, "author", None)
        turn_complete = getattr(event, "turn_complete", False)

        if author and author != "user" and author != last_author:
            await emit(
                RunEvent(
                    type=EventType.AGENT_START,
                    timestamp=time.time(),
                    agent_name=author,
                    data={"event_type": "agent_change"},
                )
            )

        # Emit agent output for non-partial events with text content
        # or for final responses (complete messages)
        is_partial = getattr(event, "partial", False)
        is_final = hasattr(event, "is_final_response") and event.is_final_response()

        if hasattr(event, "content") and event.content:
            text = ""
            parts = event.content.parts if event.content.parts else []
            for part in parts:
                if hasattr(part, "text") and part.text:
                    text += part.text
            # Emit for final responses, or non-partial events with text
            if text and author and author != "user" and (is_final or not is_partial):
                await emit(
                    RunEvent(
                        type=EventType.AGENT_OUTPUT,
                        timestamp=time.time(),
                        agent_name=author,
                        data={"output": text[:2000], "is_final": is_final},
                    )
                )

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
