"""Agent factory for creating ADK agents from IR.

Creates the appropriate ADK agent types based on IR definitions.
"""

from __future__ import annotations

import re
import time
from pathlib import Path
from typing import TYPE_CHECKING, Any, Awaitable, Callable

from google.adk.agents import Agent, LoopAgent, ParallelAgent, SequentialAgent
from google.adk.agents.base_agent import BaseAgent
from google.adk.planners import BuiltInPlanner
from google.genai import types

from adkflow_runner.errors import ExecutionError
from adkflow_runner.ir import AgentIR, WorkflowIR
from adkflow_runner.logging import get_logger
from adkflow_runner.runner.tool_loader import ToolLoader

if TYPE_CHECKING:
    from adkflow_runner.runner.workflow_runner import RunEvent

# Type alias for emit function
EmitFn = Callable[["RunEvent"], Awaitable[None]]

# Loggers for different categories
_agent_config_log = get_logger("runner.agent.config")
_tool_log = get_logger("runner.tool")
_api_request_log = get_logger("api.request")
_api_response_log = get_logger("api.response")


def sanitize_agent_name(name: str) -> str:
    """Convert agent name to valid Python identifier.

    ADK requires agent names to be valid identifiers:
    - Start with letter or underscore
    - Only letters, digits, underscores
    """
    # Replace spaces and hyphens with underscores
    sanitized = re.sub(r"[\s\-]+", "_", name)
    # Remove any other invalid characters
    sanitized = re.sub(r"[^a-zA-Z0-9_]", "", sanitized)
    # Ensure it starts with letter or underscore
    if sanitized and not sanitized[0].isalpha() and sanitized[0] != "_":
        sanitized = "_" + sanitized
    # Default if empty
    if not sanitized:
        sanitized = "agent"
    return sanitized


# Patterns for stripping injected context from ADK
# See: https://github.com/google/adk-python/issues/2207
_CONTEXT_PATTERNS = [
    re.compile(r"^For context:\s*", re.IGNORECASE),
    # [Agent Name] said: or [agent_name] said:
    re.compile(r"^\[[^\]]+\]\s+said:\s*", re.IGNORECASE),
    # Agent Name said: or agent_name said: (with optional spaces in name)
    re.compile(r"^[\w\s_-]+\s+said:\s*", re.IGNORECASE),
    # Agent Name says: or agent_name says: (alternate form)
    re.compile(r"^[\w\s_-]+\s+says:\s*", re.IGNORECASE),
]


def create_strip_contents_callback() -> Callable[..., None]:
    """Create a before_model_callback that strips injected agent context.

    ADK injects "[agent] said:" context even when include_contents='none'.
    This callback removes that pollution to achieve true context isolation.

    See: https://github.com/google/adk-python/issues/2207
    """

    def before_model_callback(callback_context: Any, llm_request: Any) -> None:
        """Strip injected context from LLM request contents."""
        if not hasattr(llm_request, "contents") or not llm_request.contents:
            return None

        cleaned_contents = []
        for content in llm_request.contents:
            if not hasattr(content, "parts") or not content.parts:
                cleaned_contents.append(content)
                continue

            # Check if this content has injected context patterns
            cleaned_parts = []
            for part in content.parts:
                if not hasattr(part, "text") or not part.text:
                    cleaned_parts.append(part)
                    continue

                text = part.text
                # Check for and strip injected patterns
                is_injected = False
                for pattern in _CONTEXT_PATTERNS:
                    if pattern.match(text):
                        is_injected = True
                        break

                if not is_injected:
                    cleaned_parts.append(part)

            # Only include content if it has remaining parts
            if cleaned_parts:
                # Create new content with cleaned parts
                content.parts = cleaned_parts
                cleaned_contents.append(content)

        llm_request.contents = cleaned_contents
        return None

    return before_model_callback


def create_agent_callbacks(
    emit: EmitFn | None,
    agent_name: str,
) -> dict[str, Any]:
    """Create ADK callbacks that emit RunEvents for real-time updates.

    Tool callbacks are async and await the emit to ensure events are sent
    before/after tool execution. Agent callbacks use fire-and-forget since
    their timing is less critical.

    Also integrates logging for API requests/responses and tool execution.

    Args:
        emit: Async function to emit RunEvent (or None for no-op)
        agent_name: Name of the agent for event attribution

    Returns:
        Dict of callback functions to pass to Agent constructor
    """
    import asyncio

    from adkflow_runner.runner.workflow_runner import EventType, RunEvent

    async def _do_emit(event: "RunEvent") -> None:
        if emit:
            await emit(event)

    def _emit_event(event: "RunEvent") -> None:
        if not emit:
            return
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(_do_emit(event))
        except RuntimeError:
            pass

    def before_agent_callback(callback_context: Any) -> None:
        if emit:
            _emit_event(
                RunEvent(
                    type=EventType.AGENT_START,
                    timestamp=time.time(),
                    agent_name=agent_name,
                    data={"source": "callback"},
                )
            )
        return None

    def after_agent_callback(callback_context: Any) -> None:
        if emit:
            _emit_event(
                RunEvent(
                    type=EventType.AGENT_END,
                    timestamp=time.time(),
                    agent_name=agent_name,
                    data={"source": "callback"},
                )
            )
        return None

    def before_model_callback(callback_context: Any, llm_request: Any) -> None:
        """Log LLM API request before sending to Gemini."""
        # Extract content from request
        contents = getattr(llm_request, "contents", []) or []
        message_count = len(contents)

        # Get last message preview
        last_msg = ""
        if contents:
            last_content = contents[-1]
            if hasattr(last_content, "parts") and last_content.parts:
                for part in last_content.parts:
                    if hasattr(part, "text") and part.text:
                        last_msg = part.text
                        break

        preview = last_msg[:200] + "..." if len(last_msg) > 200 else last_msg

        _api_request_log.info(
            f"LLM request: {agent_name}",
            agent=agent_name,
            message_count=message_count,
            preview=preview,
        )

        _api_request_log.debug(
            "Full LLM request",
            agent=agent_name,
            contents=lambda: [str(c) for c in contents],
        )
        return None

    def after_model_callback(callback_context: Any, llm_response: Any) -> None:
        """Log LLM API response from Gemini."""
        content = getattr(llm_response, "content", None)
        text = ""
        if content and hasattr(content, "parts") and content.parts:
            for part in content.parts:
                if hasattr(part, "text") and part.text:
                    text = part.text
                    break

        preview = text[:200] + "..." if len(text) > 200 else text
        has_content = bool(content)

        _api_response_log.info(
            f"LLM response: {agent_name}",
            agent=agent_name,
            has_content=has_content,
            preview=preview,
        )

        _api_response_log.debug(
            "Full LLM response",
            agent=agent_name,
            content=lambda: str(content) if content else None,
        )
        return None

    async def before_tool_callback(
        *, tool: Any, args: dict[str, Any], tool_context: Any
    ) -> dict[str, Any] | None:
        tool_name = getattr(tool, "name", str(tool))
        # Format args preview (truncate if too long)
        args_preview = ""
        if args:
            args_str = str(args)
            args_preview = args_str[:200] + "..." if len(args_str) > 200 else args_str

        # Log tool call
        _tool_log.info(
            f"Tool call: {tool_name}",
            agent=agent_name,
            tool=tool_name,
            args_preview=args_preview,
        )
        _tool_log.debug("Tool args full", agent=agent_name, tool=tool_name, args=args)

        # Await emit to ensure event is sent before tool executes
        if emit:
            await emit(
                RunEvent(
                    type=EventType.TOOL_CALL,
                    timestamp=time.time(),
                    agent_name=agent_name,
                    data={"tool_name": tool_name, "args": args_preview},
                )
            )
        return None

    async def after_tool_callback(
        *, tool: Any, args: dict[str, Any], tool_context: Any, tool_response: Any
    ) -> dict[str, Any] | None:
        tool_name = getattr(tool, "name", str(tool))
        # Format result preview (truncate if too long)
        result_preview = ""
        if tool_response is not None:
            result_str = str(tool_response)
            result_preview = (
                result_str[:200] + "..." if len(result_str) > 200 else result_str
            )

        # Determine success
        is_error = isinstance(tool_response, dict) and "error" in tool_response

        # Log tool result
        _tool_log.info(
            f"Tool result: {tool_name}",
            agent=agent_name,
            tool=tool_name,
            success=not is_error,
            result_preview=result_preview,
        )
        _tool_log.debug(
            "Tool result full", agent=agent_name, tool=tool_name, result=tool_response
        )

        # Await emit to ensure event is sent after tool completes
        if emit:
            await emit(
                RunEvent(
                    type=EventType.TOOL_RESULT,
                    timestamp=time.time(),
                    agent_name=agent_name,
                    data={"tool_name": tool_name, "result": result_preview},
                )
            )
        return None

    return {
        "before_agent_callback": before_agent_callback,
        "after_agent_callback": after_agent_callback,
        "before_model_callback": before_model_callback,
        "after_model_callback": after_model_callback,
        "before_tool_callback": before_tool_callback,
        "after_tool_callback": after_tool_callback,
    }


class AgentFactory:
    """Creates ADK agents from IR definitions."""

    def __init__(
        self,
        project_path: Path | None = None,
        emit: EmitFn | None = None,
    ):
        self.project_path = project_path
        self.emit = emit
        self.tool_loader = ToolLoader(project_path)
        self._agent_cache: dict[str, BaseAgent] = {}

    def create_from_workflow(
        self,
        ir: WorkflowIR,
        emit: EmitFn | None = None,
    ) -> BaseAgent:
        """Create the complete agent tree from workflow IR.

        Args:
            ir: Complete workflow IR
            emit: Optional emit function for real-time event callbacks

        Returns:
            Root agent ready for execution
        """
        self.project_path = Path(ir.project_path) if ir.project_path else None
        self.emit = emit
        self.tool_loader = ToolLoader(self.project_path)

        return self.create(ir.root_agent)

    def create(self, agent_ir: AgentIR) -> BaseAgent:
        """Create an ADK agent from IR.

        Args:
            agent_ir: Agent IR definition

        Returns:
            ADK agent (Agent, SequentialAgent, ParallelAgent, or LoopAgent)
        """
        # Check cache
        if agent_ir.id in self._agent_cache:
            return self._agent_cache[agent_ir.id]

        # Create based on type
        if agent_ir.type == "llm":
            agent = self._create_llm_agent(agent_ir)
        elif agent_ir.type == "sequential":
            agent = self._create_sequential_agent(agent_ir)
        elif agent_ir.type == "parallel":
            agent = self._create_parallel_agent(agent_ir)
        elif agent_ir.type == "loop":
            agent = self._create_loop_agent(agent_ir)
        else:
            raise ExecutionError(
                f"Unknown agent type: {agent_ir.type}",
                agent_id=agent_ir.id,
            )

        self._agent_cache[agent_ir.id] = agent
        return agent

    def _create_llm_agent(self, agent_ir: AgentIR) -> Agent:
        """Create an LLM agent."""
        # Sanitize name to valid identifier
        name = sanitize_agent_name(agent_ir.name)

        # Log agent configuration
        _agent_config_log.info(
            f"Creating agent: {agent_ir.name}",
            agent_id=agent_ir.id,
            agent_type=agent_ir.type,
            model=agent_ir.model,
            temperature=agent_ir.temperature,
            tool_count=len(agent_ir.tools),
        )

        _agent_config_log.debug(
            "Agent full configuration",
            agent_id=agent_ir.id,
            agent_name=agent_ir.name,
            instruction_preview=(
                agent_ir.instruction[:200] + "..."
                if agent_ir.instruction and len(agent_ir.instruction) > 200
                else agent_ir.instruction
            ),
            tools=[t.name for t in agent_ir.tools],
            planner_type=agent_ir.planner.type if agent_ir.planner else None,
            thinking_budget=agent_ir.planner.thinking_budget
            if agent_ir.planner
            else None,
            output_key=agent_ir.output_key,
            output_schema=agent_ir.output_schema,
            include_contents=agent_ir.include_contents,
            strip_contents=agent_ir.strip_contents,
            subagent_count=len(agent_ir.subagents),
        )

        # Load tools
        tools = self._load_tools(agent_ir)

        # Build planner if configured
        planner = None
        if agent_ir.planner.type == "builtin":
            if agent_ir.planner.thinking_budget:
                thinking_config = types.ThinkingConfig(
                    thinking_budget=agent_ir.planner.thinking_budget,
                    include_thoughts=agent_ir.planner.include_thoughts,
                )
                planner = BuiltInPlanner(thinking_config=thinking_config)
            else:
                # Use default ThinkingConfig when no budget specified
                planner = BuiltInPlanner(thinking_config=types.ThinkingConfig())

        # Build generate config with HTTP options
        generate_config = types.GenerateContentConfig(
            temperature=agent_ir.temperature,
        )

        # Create callbacks for real-time updates and logging (use original name)
        callbacks = create_agent_callbacks(self.emit, agent_ir.name)

        # Handle strip_contents callback - chain with logging callback
        # See: https://github.com/google/adk-python/issues/2207
        if agent_ir.strip_contents:
            logging_callback = callbacks.get("before_model_callback")
            strip_callback = create_strip_contents_callback()

            def chained_before_model(ctx: Any, req: Any) -> None:
                # First log, then strip
                if logging_callback:
                    logging_callback(ctx, req)
                strip_callback(ctx, req)
                return None

            callbacks["before_model_callback"] = chained_before_model

        # Create the agent - tools must be a list or omitted entirely
        agent = Agent(
            name=name,
            model=agent_ir.model,
            instruction=agent_ir.instruction or "",
            tools=tools if tools else [],
            output_key=agent_ir.output_key,
            include_contents=agent_ir.include_contents,
            planner=planner,
            disallow_transfer_to_parent=agent_ir.disallow_transfer_to_parent,
            disallow_transfer_to_peers=agent_ir.disallow_transfer_to_peers,
            generate_content_config=generate_config,
            **callbacks,
        )

        # Add subagents if any (for dynamic routing)
        if agent_ir.subagents:
            sub_agents = [self.create(sa) for sa in agent_ir.subagents]
            agent = Agent(
                name=name,
                model=agent_ir.model,
                instruction=agent_ir.instruction or "",
                tools=tools if tools else [],
                sub_agents=sub_agents,
                output_key=agent_ir.output_key,
                include_contents=agent_ir.include_contents,
                planner=planner,
                disallow_transfer_to_parent=agent_ir.disallow_transfer_to_parent,
                disallow_transfer_to_peers=agent_ir.disallow_transfer_to_peers,
                generate_content_config=generate_config,
                **callbacks,
            )

        _agent_config_log.debug(f"Agent created: {agent_ir.name}", agent_id=agent_ir.id)
        return agent

    def _create_sequential_agent(self, agent_ir: AgentIR) -> SequentialAgent:
        """Create a sequential agent."""
        name = sanitize_agent_name(agent_ir.name)
        sub_agents = [self.create(sa) for sa in agent_ir.subagents]

        return SequentialAgent(
            name=name,
            sub_agents=sub_agents,
        )

    def _create_parallel_agent(self, agent_ir: AgentIR) -> ParallelAgent:
        """Create a parallel agent."""
        name = sanitize_agent_name(agent_ir.name)
        sub_agents = [self.create(sa) for sa in agent_ir.subagents]

        return ParallelAgent(
            name=name,
            sub_agents=sub_agents,
        )

    def _create_loop_agent(self, agent_ir: AgentIR) -> LoopAgent:
        """Create a loop agent."""
        name = sanitize_agent_name(agent_ir.name)
        sub_agents = [self.create(sa) for sa in agent_ir.subagents]

        return LoopAgent(
            name=name,
            sub_agents=sub_agents,
            max_iterations=agent_ir.max_iterations,
        )

    def _load_tools(self, agent_ir: AgentIR) -> list[Any]:
        """Load tools for an agent."""
        tools = []

        for tool_ir in agent_ir.tools:
            try:
                _tool_log.debug(
                    f"Loading tool: {tool_ir.name}",
                    tool_name=tool_ir.name,
                    file_path=tool_ir.file_path,
                )

                tool = self.tool_loader.load(tool_ir)

                # Handle built-in tools
                if isinstance(tool, str):
                    if tool == "google_search":
                        from google.adk.tools.google_search_tool import google_search

                        tools.append(google_search)
                    elif tool == "code_execution":
                        from google.genai.types import ToolCodeExecution

                        tools.append(ToolCodeExecution())
                    # Add more built-in tools as needed
                else:
                    tools.append(tool)

                _tool_log.debug(f"Tool loaded: {tool_ir.name}", tool_name=tool_ir.name)

            except Exception as e:
                if tool_ir.error_behavior == "fail_fast":
                    _tool_log.error(
                        f"Failed to load tool: {tool_ir.name}",
                        tool_name=tool_ir.name,
                        exception=e,
                    )
                    # Re-raise to terminate workflow
                    raise
                else:
                    # Log warning but continue - let LLM handle missing tool
                    _tool_log.warning(
                        f"Failed to load tool '{tool_ir.name}': {e}",
                        tool_name=tool_ir.name,
                        error=str(e),
                    )

        return tools

    def clear_cache(self) -> None:
        """Clear the agent cache."""
        self._agent_cache.clear()
