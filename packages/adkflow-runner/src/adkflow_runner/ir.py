"""Intermediate Representation (IR) for compiled workflows.

The IR is the bridge between the visual ReactFlow representation
and the executable ADK agents. It's a normalized, validated form
that can be:
1. Executed directly by the Runner
2. Serialized for caching/debugging
3. Used to generate Python code for export
"""

from dataclasses import dataclass, field
from typing import Any, Literal

# Tool error handling behavior
ToolErrorBehavior = Literal["fail_fast", "pass_to_model"]


@dataclass
class PlannerConfig:
    """Planner configuration for LLM agents."""

    type: Literal["none", "builtin", "react"] = "none"
    thinking_budget: int | None = None
    include_thoughts: bool = False


@dataclass
class CodeExecutorConfig:
    """Code executor configuration."""

    enabled: bool = False
    stateful: bool = False
    error_retry_attempts: int = 2
    optimize_data_file: bool = False
    code_block_delimiters: list[tuple[str, str]] = field(
        default_factory=lambda: [("```tool_code\n", "\n```"), ("```python\n", "\n```")]
    )
    execution_result_delimiters: tuple[str, str] = ("```tool_output\n", "\n```")


@dataclass
class HttpOptionsConfig:
    """HTTP/retry configuration for API calls."""

    timeout: int = 30000
    max_retries: int = 3
    retry_delay: int = 1000
    retry_backoff_multiplier: float = 2.0


@dataclass
class CallbackConfig:
    """Callback file paths for agent lifecycle hooks."""

    before_agent: str | None = None
    after_agent: str | None = None
    before_model: str | None = None
    after_model: str | None = None
    before_tool: str | None = None
    after_tool: str | None = None

    def has_any(self) -> bool:
        """Check if any callback file paths are configured.

        Returns:
            True if any callback path is set
        """
        return any(
            [
                self.before_model,
                self.after_model,
                self.before_tool,
                self.after_tool,
            ]
        )


@dataclass
class GenerateContentConfig:
    """GenerateContentConfig parameters for fine-tuning model output."""

    max_output_tokens: int | None = None
    top_p: float | None = None
    top_k: int | None = None
    stop_sequences: list[str] | None = None
    presence_penalty: float | None = None
    frequency_penalty: float | None = None
    seed: int | None = None
    response_mime_type: str | None = None


@dataclass
class SafetyConfig:
    """Safety settings for content filtering by harm category."""

    harassment: str = "default"
    hate_speech: str = "default"
    sexually_explicit: str = "default"
    dangerous_content: str = "default"


@dataclass
class ToolIR:
    """Intermediate representation for a tool.

    Tools can be loaded from files or defined inline.
    """

    name: str
    file_path: str | None = None
    code: str | None = None
    description: str | None = None
    error_behavior: ToolErrorBehavior = "fail_fast"

    def __post_init__(self) -> None:
        if not self.file_path and not self.code:
            raise ValueError("Tool must have either file_path or code")


@dataclass
class PromptIR:
    """Intermediate representation for a prompt.

    Prompts are markdown templates that can contain {variable} placeholders.
    """

    name: str
    file_path: str | None = None
    content: str | None = None

    def get_content(self) -> str:
        """Get resolved prompt content."""
        if self.content:
            return self.content
        raise ValueError(f"Prompt '{self.name}' content not loaded")


@dataclass
class AgentIR:
    """Intermediate representation for an agent.

    This is the core IR type that maps to ADK agent types:
    - llm → Agent
    - sequential → SequentialAgent
    - parallel → ParallelAgent
    - loop → LoopAgent
    """

    id: str
    name: str
    type: Literal["llm", "sequential", "parallel", "loop"]

    # LLM-specific
    model: str = "gemini-2.5-flash"
    instruction: str | None = None
    temperature: float = 0.7

    # Tools and subagents
    tools: list[ToolIR] = field(default_factory=list)
    subagents: list["AgentIR"] = field(default_factory=list)

    # Output
    output_key: str | None = None
    output_schema: str | None = None
    input_schema: str | None = None
    include_contents: Literal["default", "none"] = "default"
    strip_contents: bool = False  # Strip injected "[agent] said:" context

    # Loop-specific
    max_iterations: int = 5

    # Transfer controls
    disallow_transfer_to_parent: bool = False
    disallow_transfer_to_peers: bool = False

    # System instruction
    system_instruction: str | None = None
    system_instruction_file: str | None = None

    # Configuration
    planner: PlannerConfig = field(default_factory=PlannerConfig)
    code_executor: CodeExecutorConfig = field(default_factory=CodeExecutorConfig)
    http_options: HttpOptionsConfig = field(default_factory=HttpOptionsConfig)
    callbacks: CallbackConfig = field(default_factory=CallbackConfig)
    generate_content: GenerateContentConfig = field(
        default_factory=GenerateContentConfig
    )
    safety: SafetyConfig = field(default_factory=SafetyConfig)

    # Context variables for template substitution
    context_vars: dict[str, str] = field(default_factory=dict)
    context_var_sources: list[str] = field(default_factory=list)  # Source node IDs
    upstream_output_keys: list[str] = field(
        default_factory=list
    )  # output_keys from upstream SEQUENTIAL agents

    # Metadata
    description: str | None = None
    source_node_id: str | None = None  # Original ReactFlow node ID

    def is_composite(self) -> bool:
        """Check if this is a composite agent (has subagents)."""
        return self.type in ("sequential", "parallel", "loop")

    def is_llm(self) -> bool:
        """Check if this is an LLM agent."""
        return self.type == "llm"


@dataclass
class OutputFileIR:
    """Intermediate representation for output file destinations."""

    name: str
    file_path: str
    agent_id: str  # The agent whose output should be written


@dataclass
class TeleporterIR:
    """Intermediate representation for cross-tab teleporter connections."""

    name: str
    direction: Literal["input", "output"]
    tab_id: str
    node_id: str
    connected_agent_id: str | None = None


@dataclass
class UserInputIR:
    """Intermediate representation for a user input pause point.

    When the runner encounters this during execution, it pauses and
    requests user input before continuing. Can operate in two modes:

    - Trigger mode (is_trigger=True): No incoming agents, acts like a Start node
    - Pause mode (is_trigger=False): Receives output from previous agents
    """

    id: str
    name: str
    variable_name: (
        str  # Sanitized name for variable substitution (e.g., "review_step_input")
    )

    # Mode
    is_trigger: bool = False  # True if no incoming connection (acts as Start)

    # Timeout configuration
    timeout_seconds: float = 300.0  # 0 = no timeout
    timeout_behavior: Literal["pass_through", "predefined_text", "error"] = "error"
    predefined_text: str = ""  # Text to use when timeout_behavior is "predefined_text"

    # Execution context
    incoming_agent_ids: list[str] = field(default_factory=list)
    outgoing_agent_ids: list[str] = field(default_factory=list)

    # Source tracking
    source_node_id: str | None = None


@dataclass
class CustomNodeIR:
    """IR for custom FlowUnit nodes."""

    id: str  # Node ID
    unit_id: str  # References the FlowUnit class (e.g., "tools.web_search")
    name: str  # Display name
    config: dict[str, Any]  # Field values from UI
    source_node_id: str  # Original ReactFlow node ID

    # Connection info (resolved at transform time)
    input_connections: dict[str, list[str]] = field(
        default_factory=dict
    )  # port_id -> [source_node_ids]
    output_connections: dict[str, list[str]] = field(
        default_factory=dict
    )  # port_id -> [target_node_ids]

    # Execution control (from FlowUnit class attributes)
    output_node: bool = False  # Sink node - triggers execution trace
    always_execute: bool = False  # Skip cache, always run
    lazy_inputs: list[str] = field(default_factory=list)  # Port IDs marked lazy


@dataclass
class ContextAggregatorIR:
    """IR for context aggregator nodes.

    Context aggregators collect content from files, directories, URLs, and
    connected nodes into named variables for agent template substitution.
    """

    id: str  # Node ID
    name: str  # Display name
    config: dict[str, Any]  # aggregationMode, outputVariableName, separator, etc.

    # Connection info for "node" type dynamic inputs
    # Maps dynamic input ID → list of source node IDs
    input_connections: dict[str, list[str]] = field(default_factory=dict)


@dataclass
class WorkflowIR:
    """Complete intermediate representation for a workflow.

    This is the top-level IR that contains:
    - The root agent (entry point)
    - All agents (for lookup)
    - Output files (agent output destinations)
    - Teleporter connections (cross-tab)
    - Execution metadata
    """

    root_agent: AgentIR
    all_agents: dict[str, AgentIR] = field(default_factory=dict)
    output_files: list[OutputFileIR] = field(default_factory=list)
    teleporters: dict[str, TeleporterIR] = field(default_factory=dict)
    user_inputs: list[UserInputIR] = field(default_factory=list)
    custom_nodes: list[CustomNodeIR] = field(default_factory=list)
    context_aggregators: list[ContextAggregatorIR] = field(default_factory=list)
    variables: dict[str, Any] = field(default_factory=dict)
    metadata: dict[str, Any] = field(default_factory=dict)

    # Flow control nodes (for topology visualization)
    has_start_node: bool = False
    has_end_node: bool = False

    # Source tracking
    project_path: str | None = None
    tab_ids: list[str] = field(default_factory=list)

    def get_agent(self, agent_id: str) -> AgentIR | None:
        """Get an agent by ID."""
        return self.all_agents.get(agent_id)

    def get_all_tools(self) -> list[ToolIR]:
        """Get all tools used in the workflow."""
        tools: list[ToolIR] = []
        for agent in self.all_agents.values():
            tools.extend(agent.tools)
        return tools
