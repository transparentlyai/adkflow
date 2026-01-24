"""Agent factory for creating ADK agents from IR.

Creates the appropriate ADK agent types based on IR definitions.
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import Any

from google.adk.agents import Agent, LoopAgent, ParallelAgent, SequentialAgent
from google.adk.agents.base_agent import BaseAgent
from google.adk.code_executors import BuiltInCodeExecutor
from google.adk.planners import BuiltInPlanner
from google.genai import types

from adkflow_runner.errors import ExecutionError
from adkflow_runner.hooks import HooksIntegration
from adkflow_runner.ir import AgentIR, ToolIR, WorkflowIR
from adkflow_runner.logging import get_logger
from adkflow_runner.runner.agent_callbacks import EmitFn
from adkflow_runner.runner.agent_serialization import (
    serialize_agent_config,
    serialize_workflow_agent_config,
)
from adkflow_runner.runner.agent_utils import sanitize_agent_name
from adkflow_runner.runner.callbacks import (
    CallbackRegistry,
    EmitHandler,
    ExtensionHooksHandler,
    FinishReasonHandler,
    LoggingHandler,
    ResponseHandler,
    StripContentsHandler,
    TracingHandler,
    UserCallbackHandler,
    UserCallbackLoader,
)
from adkflow_runner.runner.tool_loader import ToolLoader

# Loggers for different categories
_agent_config_log = get_logger("runner.agent.config")
_tool_log = get_logger("runner.tool")


class AgentFactory:
    """Creates ADK agents from IR definitions."""

    def __init__(
        self,
        project_path: Path | None = None,
        emit: EmitFn | None = None,
        hooks: HooksIntegration | None = None,
    ):
        self.project_path = project_path
        self.emit = emit
        self.hooks = hooks
        self.tool_loader = ToolLoader(project_path)
        self._agent_cache: dict[str, BaseAgent] = {}
        self._finish_reason_handlers: dict[str, FinishReasonHandler] = {}
        self._response_handlers: dict[str, ResponseHandler] = {}

    def create_from_workflow(
        self,
        ir: WorkflowIR,
        emit: EmitFn | None = None,
        hooks: HooksIntegration | None = None,
    ) -> BaseAgent:
        """Create the complete agent tree from workflow IR.

        Args:
            ir: Complete workflow IR
            emit: Optional emit function for real-time event callbacks
            hooks: Optional hooks integration for extension hooks

        Returns:
            Root agent ready for execution
        """
        self.project_path = Path(ir.project_path) if ir.project_path else None
        self.emit = emit
        self.hooks = hooks
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
            context_var_count=len(agent_ir.context_vars),
        )

        # Apply context variable substitution to instruction
        # (upstream_output_keys are left for ADK to substitute at runtime)
        instruction = self._substitute_variables(
            agent_ir.instruction or "",
            agent_ir.context_vars,
            agent_ir.name,
            upstream_output_keys=agent_ir.upstream_output_keys,
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
                http_status_codes=[429, 499, 500, 502, 503, 504],  # Added 499
            ),
        )

        # Build safety settings from SafetyConfig
        safety_settings = self._build_safety_settings(agent_ir)

        # Build generate config with all GenerateContentConfig fields
        generate_config = types.GenerateContentConfig(
            temperature=agent_ir.temperature,
            max_output_tokens=agent_ir.generate_content.max_output_tokens,
            top_p=agent_ir.generate_content.top_p,
            top_k=agent_ir.generate_content.top_k,
            stop_sequences=agent_ir.generate_content.stop_sequences,
            presence_penalty=agent_ir.generate_content.presence_penalty,
            frequency_penalty=agent_ir.generate_content.frequency_penalty,
            seed=agent_ir.generate_content.seed,
            response_mime_type=agent_ir.generate_content.response_mime_type,
            safety_settings=safety_settings,
            http_options=http_options,
        )

        # Build callback registry with all handlers in priority order
        callbacks = self._create_callback_registry(agent_ir)

        # Create the agent - tools must be a list or omitted entirely
        agent = Agent(
            name=name,
            description=agent_ir.description or "",
            model=agent_ir.model,
            instruction=instruction,
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
                instruction=instruction,
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

    def _create_callback_registry(self, agent_ir: AgentIR) -> dict[str, Any]:
        """Create callback registry with all handlers for an agent.

        Handlers are registered in priority order:
        - 100: StripContentsHandler (optional, if strip_contents enabled)
        - 200: TracingHandler (OpenTelemetry span attributes)
        - 300: LoggingHandler (API/tool logging)
        - 350: FinishReasonHandler (finish reason validation)
        - 400: EmitHandler (RunEvent emission to UI)
        - 450: ResponseHandler (final response emission)
        - 500: ExtensionHooksHandler (bridge to global hooks)
        - 600: UserCallbackHandler (optional, if callbacks configured)

        Args:
            agent_ir: Agent IR definition

        Returns:
            Dict of callback functions to pass to ADK Agent constructor
        """
        registry = CallbackRegistry(agent_ir.name, agent_ir.id)

        # Priority 100: Strip injected ADK context (optional)
        if agent_ir.strip_contents:
            registry.register(StripContentsHandler(enabled=True))

        # Priority 200: OpenTelemetry tracing
        registry.register(TracingHandler())

        # Priority 300: API/tool logging
        registry.register(LoggingHandler())

        # Priority 350: Finish reason validation (optional fail-fast)
        finish_reason_handler = FinishReasonHandler(
            fail_fast=agent_ir.finish_reason_fail_fast
        )
        registry.register(finish_reason_handler)
        # Store handler for post-execution retrieval
        self._finish_reason_handlers[agent_ir.id] = finish_reason_handler

        # Priority 400: RunEvent emission for UI
        registry.register(EmitHandler(self.emit))

        # Priority 450: Final response emission
        response_handler = ResponseHandler(self.emit)
        registry.register(response_handler)
        # Store handler for post-execution retrieval
        self._response_handlers[agent_ir.id] = response_handler

        # Priority 500: Extension hooks bridge
        registry.register(ExtensionHooksHandler(self.hooks))

        # Priority 600: User-defined callbacks (optional)
        # Supports both file paths and inline code from connected CallbackNodes
        if agent_ir.callbacks.has_any():
            # Use project_path if available, otherwise use current directory
            loader_path = self.project_path or Path.cwd()
            loader = UserCallbackLoader(loader_path)
            loaded, callback_metadata = loader.load(agent_ir.callbacks)
            if loaded:
                registry.register(
                    UserCallbackHandler(
                        callbacks=loaded,
                        callback_metadata=callback_metadata,
                        emit=self.emit,
                    )
                )

        return registry.to_adk_callbacks()

    def get_finish_reason(self, agent_id: str) -> dict[str, str] | None:
        """Get the finish reason for an agent after execution.

        Args:
            agent_id: The agent ID to get finish reason for

        Returns:
            Dict with 'name' and 'description' keys, or None if not available.
            Example: {"name": "STOP", "description": "Natural completion"}
        """
        handler = self._finish_reason_handlers.get(agent_id)
        if handler:
            return handler.last_finish_reason
        return None

    def get_response(self, agent_id: str) -> str | None:
        """Get the final response for an agent after execution.

        Args:
            agent_id: The agent ID to get response for

        Returns:
            The response text, or None if not available.
        """
        handler = self._response_handlers.get(agent_id)
        if handler:
            return handler.last_response
        return None

    def _load_tools(self, agent_ir: AgentIR) -> list[Any]:
        """Load tools for an agent."""
        tools = []

        for tool_ir in agent_ir.tools:
            try:
                _tool_log.debug(
                    f"Loading tool: {tool_ir.name}",
                    tool_name=tool_ir.name,
                    file_path=tool_ir.file_path,
                    tool_type=tool_ir.tool_type,
                )

                # Handle builtin tools with config (like shellTool)
                if tool_ir.tool_type == "shellTool":
                    tool = self._create_shell_tool(tool_ir)
                    tools.append(tool)
                    _tool_log.debug(
                        f"Shell tool created: {tool_ir.name}", tool_name=tool_ir.name
                    )
                    continue

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

    def _create_shell_tool(self, tool_ir: ToolIR) -> Any:
        """Create a shell tool from IR config."""
        from pathlib import Path

        from adkflow_runner.runner.shell_executor import (
            ErrorBehavior,
            OutputMode,
            create_shell_tool,
        )

        config = tool_ir.config or {}

        # Parse allowed commands
        allowed_text = config.get("allowed_commands", "git:*\nls:*\ncat:*")
        allowed_patterns = []
        for line in allowed_text.strip().split("\n"):
            line = line.strip()
            if line and not line.startswith("#"):
                allowed_patterns.append(line)

        # Determine working directory
        working_dir_str = config.get("working_directory", "").strip()
        if working_dir_str:
            working_dir = Path(working_dir_str)
            if not working_dir.is_absolute() and self.project_path:
                working_dir = self.project_path / working_dir
        else:
            working_dir = self.project_path or Path.cwd()

        # Parse other config
        timeout = float(config.get("timeout", 30))
        output_mode = OutputMode(config.get("output_mode", "combined"))
        error_behavior = ErrorBehavior(config.get("error_behavior", "pass_to_model"))
        max_output_size = int(config.get("max_output_size", 100000))

        # Parse environment variables
        env_text = config.get("environment_variables", "")
        env_vars = None
        if env_text:
            env_vars = {}
            for line in env_text.strip().split("\n"):
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if "=" in line:
                    key, value = line.split("=", 1)
                    env_vars[key.strip()] = value.strip()

        # Parse pre/post shell config
        pre_shell = config.get("pre_shell", "").strip() or None
        post_shell = config.get("post_shell", "").strip() or None
        include_pre_shell_output = config.get("include_pre_shell_output", False)
        include_post_shell_output = config.get("include_post_shell_output", False)
        pre_shell_on_fail = config.get("pre_shell_on_fail", "stop")
        post_shell_on_fail = config.get("post_shell_on_fail", "run")

        return create_shell_tool(
            allowed_patterns=allowed_patterns,
            working_directory=working_dir,
            timeout=timeout,
            output_mode=output_mode,
            error_behavior=error_behavior,
            max_output_size=max_output_size,
            shell="bash",
            environment_variables=env_vars,
            pre_shell=pre_shell,
            post_shell=post_shell,
            include_pre_shell_output=include_pre_shell_output,
            include_post_shell_output=include_post_shell_output,
            pre_shell_on_fail=pre_shell_on_fail,
            post_shell_on_fail=post_shell_on_fail,
        )

    def _substitute_variables(
        self,
        text: str,
        context_vars: dict[str, str],
        agent_name: str,
        upstream_output_keys: list[str] | None = None,
    ) -> str:
        """Substitute {variable_name} placeholders with context variable values.

        Placeholders that match upstream_output_keys are left unchanged for ADK
        to substitute at runtime via state.

        Args:
            text: Text containing {variable_name} placeholders
            context_vars: Dict mapping variable names to values
            agent_name: Agent name for error messages
            upstream_output_keys: output_keys from upstream sequential agents
                (these are substituted by ADK at runtime, not here)

        Returns:
            Text with placeholders replaced by variable values
            (upstream_output_keys placeholders are preserved)

        Raises:
            ExecutionError: If a placeholder references a missing variable
                (excluding upstream_output_keys which ADK handles)
        """
        if not text:
            return text

        upstream_keys = set(upstream_output_keys or [])

        # Find all placeholders in text
        placeholders = re.findall(r"\{(\w+)\}", text)

        if not placeholders:
            return text

        # Check for missing variables (excluding upstream_output_keys - ADK handles those)
        missing = [
            p for p in placeholders if p not in context_vars and p not in upstream_keys
        ]

        if missing:
            if context_vars:
                available = ", ".join(context_vars.keys())
            elif upstream_keys:
                available = f"upstream: {', '.join(upstream_keys)}"
            else:
                available = "none"
            raise ExecutionError(
                f"Agent '{agent_name}' references missing context variables: "
                f"{', '.join(missing)}. Available variables: {available}."
            )

        # Substitute only context_vars (not upstream_output_keys - ADK handles those)
        result = text
        for key, value in context_vars.items():
            # Escape {word} patterns in value so ADK doesn't interpret them as variables.
            # ADK's regex {+[^{}]*}+ matches any {word} pattern and tries to substitute.
            # We insert a zero-width space (U+200B) after { to break isidentifier() check.
            # This is invisible but prevents ADK from treating it as a variable.
            escaped_value = re.sub(r"\{(\w+)\}", "{\u200b\\1}", value)
            result = result.replace(f"{{{key}}}", escaped_value)

        return result

    def _build_safety_settings(
        self, agent_ir: AgentIR
    ) -> list[types.SafetySetting] | None:
        """Build safety settings list from SafetyConfig.

        Returns None if all settings are at default (use model defaults).
        """
        safety = agent_ir.safety

        # Check if all settings are default
        if all(
            v == "default"
            for v in [
                safety.harassment,
                safety.hate_speech,
                safety.sexually_explicit,
                safety.dangerous_content,
            ]
        ):
            return None  # Use model defaults

        # Map threshold strings to ADK enum values
        threshold_map = {
            "off": types.HarmBlockThreshold.OFF,
            "block_none": types.HarmBlockThreshold.BLOCK_NONE,
            "block_low": types.HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
            "block_medium": types.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            "block_high": types.HarmBlockThreshold.BLOCK_ONLY_HIGH,
        }

        # Map category fields to ADK harm categories
        category_map = {
            "harassment": (
                safety.harassment,
                types.HarmCategory.HARM_CATEGORY_HARASSMENT,
            ),
            "hate_speech": (
                safety.hate_speech,
                types.HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            ),
            "sexually_explicit": (
                safety.sexually_explicit,
                types.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            ),
            "dangerous_content": (
                safety.dangerous_content,
                types.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            ),
        }

        settings = []
        for _name, (threshold_str, category) in category_map.items():
            if threshold_str != "default" and threshold_str in threshold_map:
                settings.append(
                    types.SafetySetting(
                        category=category,
                        threshold=threshold_map[threshold_str],
                    )
                )

        return settings if settings else None

    def clear_cache(self) -> None:
        """Clear the agent cache."""
        self._agent_cache.clear()
