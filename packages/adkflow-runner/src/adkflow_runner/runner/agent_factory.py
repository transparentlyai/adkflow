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
from adkflow_runner.runner.tool_loader import ToolLoader

if TYPE_CHECKING:
    from adkflow_runner.runner.workflow_runner import RunEvent

# Type alias for emit function
EmitFn = Callable[["RunEvent"], Awaitable[None]]


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


def create_agent_callbacks(
    emit: EmitFn | None,
    agent_name: str,
) -> dict[str, Any]:
    """Create ADK callbacks that emit RunEvents for real-time updates.

    ADK callbacks are called synchronously, so we use asyncio.create_task
    to fire off the async emit without blocking.

    Args:
        emit: Async function to emit RunEvent (or None for no-op)
        agent_name: Name of the agent for event attribution

    Returns:
        Dict of callback functions to pass to Agent constructor
    """
    if emit is None:
        return {}

    import asyncio

    from adkflow_runner.runner.workflow_runner import EventType, RunEvent

    async def _do_emit(event: "RunEvent") -> None:
        await emit(event)

    def _emit_event(event: "RunEvent") -> None:
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(_do_emit(event))
        except RuntimeError:
            pass

    def before_agent_callback(callback_context: Any) -> None:
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
        _emit_event(
            RunEvent(
                type=EventType.AGENT_END,
                timestamp=time.time(),
                agent_name=agent_name,
                data={"source": "callback"},
            )
        )
        return None

    def before_tool_callback(
        *, tool: Any, args: dict[str, Any], tool_context: Any
    ) -> dict[str, Any] | None:
        tool_name = getattr(tool, "name", str(tool))
        # Format args preview (truncate if too long)
        args_preview = ""
        if args:
            args_str = str(args)
            args_preview = args_str[:200] + "..." if len(args_str) > 200 else args_str
        _emit_event(
            RunEvent(
                type=EventType.TOOL_CALL,
                timestamp=time.time(),
                agent_name=agent_name,
                data={"tool_name": tool_name, "args": args_preview},
            )
        )
        return None

    def after_tool_callback(
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
        _emit_event(
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

        # Create callbacks for real-time updates (use original name for display)
        callbacks = create_agent_callbacks(self.emit, agent_ir.name)

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
                tool = self.tool_loader.load(tool_ir)

                # Handle built-in tools
                if isinstance(tool, str):
                    if tool == "google_search":
                        from google.adk.tools.google_search_tool import google_search

                        tools.append(google_search)
                    elif tool == "code_execution":
                        from google.adk.tools import built_in_code_execution

                        tools.append(built_in_code_execution)
                    # Add more built-in tools as needed
                else:
                    tools.append(tool)

            except Exception as e:
                if tool_ir.error_behavior == "fail_fast":
                    # Re-raise to terminate workflow
                    raise
                else:
                    # Log warning but continue - let LLM handle missing tool
                    print(f"Warning: Failed to load tool '{tool_ir.name}': {e}")

        return tools

    def clear_cache(self) -> None:
        """Clear the agent cache."""
        self._agent_cache.clear()
