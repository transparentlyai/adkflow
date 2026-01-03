"""Agent factory for creating ADK agents from IR.

Creates the appropriate ADK agent types based on IR definitions.
"""

from __future__ import annotations

from pathlib import Path
from typing import TYPE_CHECKING, Any

from google.adk.agents import Agent, LoopAgent, ParallelAgent, SequentialAgent
from google.adk.agents.base_agent import BaseAgent
from google.adk.code_executors import BuiltInCodeExecutor
from google.adk.planners import BuiltInPlanner
from google.genai import types

from adkflow_runner.errors import ExecutionError
from adkflow_runner.ir import AgentIR, WorkflowIR
from adkflow_runner.logging import get_logger
from adkflow_runner.runner.agent_callbacks import EmitFn, create_agent_callbacks
from adkflow_runner.runner.agent_serialization import (
    serialize_agent_config,
    serialize_workflow_agent_config,
)
from adkflow_runner.runner.agent_utils import (
    create_strip_contents_callback,
    sanitize_agent_name,
)
from adkflow_runner.runner.tool_loader import ToolLoader

if TYPE_CHECKING:
    pass

# Loggers for different categories
_agent_config_log = get_logger("runner.agent.config")
_tool_log = get_logger("runner.tool")


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

        # Log agent creation start (INFO level)
        _agent_config_log.info(
            f"Creating agent: {agent_ir.name}",
            agent_id=agent_ir.id,
            agent_type=agent_ir.type,
            model=agent_ir.model,
            tool_count=len(agent_ir.tools),
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

        # Build code executor if enabled
        code_executor = None
        if agent_ir.code_executor.enabled:
            code_executor = BuiltInCodeExecutor(
                stateful=agent_ir.code_executor.stateful,
                error_retry_attempts=agent_ir.code_executor.error_retry_attempts,
                optimize_data_file=agent_ir.code_executor.optimize_data_file,
                code_block_delimiters=agent_ir.code_executor.code_block_delimiters,
                execution_result_delimiters=agent_ir.code_executor.execution_result_delimiters,
            )

        # Build HTTP options for retry/timeout behavior
        http_options = types.HttpOptions(
            timeout=agent_ir.http_options.timeout,
            retry_options=types.HttpRetryOptions(
                initial_delay=agent_ir.http_options.retry_delay / 1000,  # ms to seconds
                exp_base=agent_ir.http_options.retry_backoff_multiplier,
                attempts=agent_ir.http_options.max_retries,
                http_status_codes=[429, 500, 502, 503, 504],
            ),
        )

        # Build generate config with HTTP options
        generate_config = types.GenerateContentConfig(
            temperature=agent_ir.temperature,
            http_options=http_options,
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
            description=agent_ir.description or "",
            model=agent_ir.model,
            instruction=agent_ir.instruction or "",
            tools=tools if tools else [],
            output_key=agent_ir.output_key,
            include_contents=agent_ir.include_contents,
            planner=planner,
            code_executor=code_executor,
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
                description=agent_ir.description or "",
                model=agent_ir.model,
                instruction=agent_ir.instruction or "",
                tools=tools if tools else [],
                sub_agents=sub_agents,
                output_key=agent_ir.output_key,
                include_contents=agent_ir.include_contents,
                planner=planner,
                code_executor=code_executor,
                disallow_transfer_to_parent=agent_ir.disallow_transfer_to_parent,
                disallow_transfer_to_peers=agent_ir.disallow_transfer_to_peers,
                generate_content_config=generate_config,
                **callbacks,
            )

        # Log full ADK agent configuration (DEBUG level)
        # Uses lazy evaluation to avoid serialization overhead when DEBUG is disabled
        _agent_config_log.debug(
            f"Agent created: {agent_ir.name}",
            agent_id=agent_ir.id,
            adk_config=lambda: serialize_agent_config(agent),
        )
        return agent

    def _create_sequential_agent(self, agent_ir: AgentIR) -> SequentialAgent:
        """Create a sequential agent."""
        name = sanitize_agent_name(agent_ir.name)

        _agent_config_log.info(
            f"Creating sequential agent: {agent_ir.name}",
            agent_id=agent_ir.id,
            agent_type=agent_ir.type,
            subagent_count=len(agent_ir.subagents),
        )

        sub_agents = [self.create(sa) for sa in agent_ir.subagents]

        agent = SequentialAgent(
            name=name,
            description=agent_ir.description or "",
            sub_agents=sub_agents,
        )

        # Log full ADK agent configuration (DEBUG level)
        _agent_config_log.debug(
            f"Sequential agent created: {agent_ir.name}",
            agent_id=agent_ir.id,
            adk_config=lambda: serialize_workflow_agent_config(agent),
        )
        return agent

    def _create_parallel_agent(self, agent_ir: AgentIR) -> ParallelAgent:
        """Create a parallel agent."""
        name = sanitize_agent_name(agent_ir.name)

        _agent_config_log.info(
            f"Creating parallel agent: {agent_ir.name}",
            agent_id=agent_ir.id,
            agent_type=agent_ir.type,
            subagent_count=len(agent_ir.subagents),
        )

        sub_agents = [self.create(sa) for sa in agent_ir.subagents]

        agent = ParallelAgent(
            name=name,
            description=agent_ir.description or "",
            sub_agents=sub_agents,
        )

        # Log full ADK agent configuration (DEBUG level)
        _agent_config_log.debug(
            f"Parallel agent created: {agent_ir.name}",
            agent_id=agent_ir.id,
            adk_config=lambda: serialize_workflow_agent_config(agent),
        )
        return agent

    def _create_loop_agent(self, agent_ir: AgentIR) -> LoopAgent:
        """Create a loop agent."""
        name = sanitize_agent_name(agent_ir.name)

        _agent_config_log.info(
            f"Creating loop agent: {agent_ir.name}",
            agent_id=agent_ir.id,
            agent_type=agent_ir.type,
            subagent_count=len(agent_ir.subagents),
            max_iterations=agent_ir.max_iterations,
        )

        sub_agents = [self.create(sa) for sa in agent_ir.subagents]

        agent = LoopAgent(
            name=name,
            description=agent_ir.description or "",
            sub_agents=sub_agents,
            max_iterations=agent_ir.max_iterations,
        )

        # Log full ADK agent configuration (DEBUG level)
        _agent_config_log.debug(
            f"Loop agent created: {agent_ir.name}",
            agent_id=agent_ir.id,
            adk_config=lambda: serialize_workflow_agent_config(agent),
        )
        return agent

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
