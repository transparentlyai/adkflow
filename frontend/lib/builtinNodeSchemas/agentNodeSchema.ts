import type { CustomNodeSchema } from "@/components/nodes/CustomNode";
import { GEMINI_MODELS, DEFAULT_MODEL } from "@/lib/constants/models";

/**
 * Schema definition for AgentNode
 *
 * AgentNode represents an LLM AI agent in the workflow. It connects to prompts,
 * tools, and sub-agents. Features include:
 * - Multiple input types: prompts, tools, sub-agents, and link connections
 * - Model configuration with temperature, planner, and HTTP options
 * - Link handles for chaining agents in parallel execution
 * - Expandable properties panel for detailed configuration
 *
 * NOTE: All agents are LLM agents - no type selection needed.
 *
 * Tabs: ["General", "Execution", "Flow", "Schema", "Callbacks"]
 * - General: Source (connected), Model, Custom Model, Temperature, Prompt (connected), Tools (connected), Description
 * - Execution: Planner settings, Code Executor, HTTP Options
 * - Flow: Transfer controls only (no loop settings - all agents are LLM)
 * - Schema: Output configuration, Input/Output schema validation
 * - Callbacks: Model and Tool callbacks
 */
export const agentNodeSchema: CustomNodeSchema = {
  unit_id: "builtin.agent",
  label: "Agent",
  menu_location: "Agents/Agent",
  description:
    "An LLM AI agent that can process prompts, use tools, and coordinate with sub-agents.",
  version: "1.0.0",
  output_node: false,
  always_execute: false,
  ui: {
    inputs: [
      // Main input handle (visible, draggable)
      {
        id: "input",
        label: "Input",
        source_type: "agent",
        data_type: "dict",
        accepted_sources: [
          "agent",
          "prompt",
          "tool",
          "agent_tool",
          "context",
          "flow",
        ],
        accepted_types: ["dict", "link", "str", "callable", "trigger"],
        required: false,
        multiple: true,
        connection_only: true,
        section: "Main",
      },
      // Hidden typed handles (for specific connection types)
      {
        id: "agent-input",
        label: "Input (A2A)",
        source_type: "agent",
        data_type: "dict",
        accepted_sources: ["agent", "flow"],
        accepted_types: ["dict", "trigger"],
        required: false,
        multiple: true,
        connection_only: true,
        icon: "monitor",
        section: "Configuration",
        tab: "General",
      },
      {
        id: "prompt-input",
        label: "Instructions",
        source_type: "prompt",
        data_type: "str",
        accepted_sources: ["prompt", "context"],
        accepted_types: ["str"],
        required: false,
        multiple: false,
        connection_only: true,
        icon: "document",
        section: "Configuration",
        tab: "General",
      },
      {
        id: "tools-input",
        label: "Tools",
        source_type: "tool",
        data_type: "callable",
        accepted_sources: ["tool", "agent_tool"],
        accepted_types: ["callable"],
        required: false,
        multiple: true,
        connection_only: true,
        icon: "gear",
        section: "Configuration",
        tab: "General",
      },
      // Link handle (top) for agent chaining - input from other agents
      {
        id: "link-top",
        label: "Link In",
        source_type: "agent",
        data_type: "link",
        accepted_sources: ["agent"],
        accepted_types: ["link"],
        required: false,
        multiple: true,
        connection_only: true,
        section: "Flow",
      },
    ],
    outputs: [
      {
        id: "output",
        label: "Output",
        source_type: "agent",
        data_type: "dict",
        required: false,
        multiple: true,
      },
      {
        id: "link-bottom",
        label: "Link Out",
        source_type: "agent",
        data_type: "link",
        required: false,
        multiple: true,
      },
    ],
    tabs: ["General", "Execution", "Flow", "Schema", "Callbacks"],
    fields: [
      // === General Tab ===
      // Field order matches OLD AgentNode GeneralTab.tsx exactly:
      // 1. Source (connected agent display) - handled via connection, not a field
      // 2. Model (select)
      // 3. Custom Model (text, conditional)
      // 4. Temperature (slider 0-2, step 0.1)
      // 5. Prompt (connected prompt display) - handled via connection, not a field
      // 6. Tools (connected tools display) - handled via connection, not a field
      // 7. Description (textarea)
      {
        id: "name",
        label: "Name",
        widget: "text",
        default: "New Agent",
        placeholder: "Agent name",
        help_text: "A unique name for this agent",
        section: "General",
        tab: "General",
      },
      {
        id: "model",
        label: "Model",
        widget: "select",
        default: DEFAULT_MODEL,
        options: GEMINI_MODELS,
        help_text: "The LLM model to use for this agent",
        section: "Model",
        tab: "General",
      },
      {
        id: "custom_model",
        label: "Custom Model",
        widget: "text",
        default: "",
        placeholder: "Custom model name",
        help_text: "Enter a custom model name",
        section: "Model",
        tab: "General",
        show_if: { model: "custom" },
      },
      {
        id: "temperature",
        label: "Temperature",
        widget: "slider",
        default: 0.7,
        min_value: 0,
        max_value: 2,
        step: 0.1,
        help_text:
          "Controls randomness in responses (0 = deterministic, 2 = creative)",
        section: "Model",
        tab: "General",
      },
      {
        id: "description",
        label: "Description",
        widget: "textarea",
        default: "",
        required: true,
        placeholder: "Describe what this agent does...",
        help_text:
          "A description of the agent's purpose (required for routing)",
        section: "General",
        tab: "General",
      },

      // === Execution Tab ===
      // Field order matches OLD AgentNode ExecutionTab.tsx exactly:
      // Planner section: Type, Thinking Budget (conditional), Include Thoughts (conditional)
      // Code Executor section: Enable, Stateful (conditional), Error Retry Attempts (conditional)
      // HTTP Options section: Timeout, Max Retries, Retry Delay, Backoff Multiplier
      {
        id: "planner_type",
        label: "Type",
        widget: "select",
        default: "none",
        options: [
          { value: "none", label: "None" },
          { value: "builtin", label: "Built-in (Thinking)" },
          { value: "react", label: "ReAct" },
        ],
        help_text: "The planning strategy for multi-step tasks",
        section: "Planner",
        tab: "Execution",
      },
      {
        id: "thinking_budget",
        label: "Thinking Budget",
        widget: "number",
        default: 2048,
        min_value: 0,
        help_text: "Maximum tokens for thinking/planning",
        section: "Planner",
        tab: "Execution",
        show_if: { planner_type: "builtin" },
      },
      {
        id: "include_thoughts",
        label: "Include thoughts in response",
        widget: "checkbox",
        default: false,
        help_text: "Include thinking output in the final response",
        section: "Planner",
        tab: "Execution",
        show_if: { planner_type: "builtin" },
      },
      {
        id: "code_executor_enabled",
        label: "Enable code execution",
        widget: "checkbox",
        default: false,
        help_text: "Allow this agent to execute generated code",
        section: "Code Executor",
        tab: "Execution",
      },
      {
        id: "code_executor_stateful",
        label: "Stateful (variables persist)",
        widget: "checkbox",
        default: false,
        help_text: "Variables persist between code executions",
        section: "Code Executor",
        tab: "Execution",
        show_if: { code_executor_enabled: true },
      },
      {
        id: "code_executor_error_retry",
        label: "Error Retry Attempts",
        widget: "number",
        default: 3,
        min_value: 0,
        max_value: 10,
        help_text: "Number of retry attempts on code execution errors",
        section: "Code Executor",
        tab: "Execution",
        show_if: { code_executor_enabled: true },
      },
      {
        id: "http_timeout",
        label: "Timeout (ms)",
        widget: "number",
        default: 30000,
        min_value: 0,
        step: 1000,
        help_text: "Request timeout in milliseconds",
        section: "HTTP Options",
        tab: "Execution",
      },
      {
        id: "http_max_retries",
        label: "Max Retries",
        widget: "number",
        default: 3,
        min_value: 0,
        max_value: 10,
        help_text: "Maximum number of retry attempts for failed requests",
        section: "HTTP Options",
        tab: "Execution",
      },
      {
        id: "http_retry_delay",
        label: "Retry Delay (ms)",
        widget: "number",
        default: 1000,
        min_value: 0,
        step: 100,
        help_text: "Initial delay between retries",
        section: "HTTP Options",
        tab: "Execution",
      },
      {
        id: "http_backoff_multiplier",
        label: "Backoff Multiplier",
        widget: "number",
        default: 2,
        min_value: 1,
        max_value: 5,
        step: 0.5,
        help_text: "Exponential backoff multiplier for retries",
        section: "HTTP Options",
        tab: "Execution",
      },

      // === Flow Tab ===
      // Field order matches OLD AgentNode FlowTab.tsx exactly:
      // Transfer Controls section only - no Loop Settings (all agents are LLM)
      {
        id: "disallow_transfer_to_parent",
        label: "Disallow transfer to parent",
        widget: "checkbox",
        default: false,
        help_text:
          "Prevent this agent from transferring control back to its parent",
        section: "Transfer Controls",
        tab: "Flow",
      },
      {
        id: "disallow_transfer_to_peers",
        label: "Disallow transfer to peers",
        widget: "checkbox",
        default: false,
        help_text:
          "Prevent this agent from transferring control to sibling agents",
        section: "Transfer Controls",
        tab: "Flow",
      },

      // === Schema Tab ===
      // Field order matches OLD AgentNode SchemaTab.tsx exactly:
      // Output Configuration section: Output Key, Include Contents
      // Schema Validation section: Input Schema, Output Schema
      {
        id: "output_key",
        label: "Output Key",
        widget: "text",
        default: "",
        placeholder: "e.g., result",
        help_text: "Saves agent output to session state with this key",
        section: "Output Configuration",
        tab: "Schema",
      },
      {
        id: "include_contents",
        label: "Include Contents",
        widget: "select",
        default: "default",
        options: [
          { value: "default", label: "Default" },
          { value: "none", label: "None" },
        ],
        help_text: "Controls content inclusion in agent processing",
        section: "Output Configuration",
        tab: "Schema",
      },
      {
        id: "input_schema",
        label: "Input Schema",
        widget: "text",
        default: "",
        placeholder: "e.g., models.TaskInput",
        help_text: "Pydantic BaseModel class path",
        section: "Schema Validation",
        tab: "Schema",
      },
      {
        id: "output_schema",
        label: "Output Schema",
        widget: "text",
        default: "",
        placeholder: "e.g., models.TaskOutput",
        help_text: "Pydantic BaseModel class path",
        section: "Schema Validation",
        tab: "Schema",
      },

      // === Callbacks Tab ===
      // Field order matches OLD AgentNode CallbacksTab.tsx exactly:
      // Model Callbacks section: Before Model Callback, After Model Callback
      // Tool Callbacks section: Before Tool Callback, After Tool Callback
      {
        id: "before_model_callback",
        label: "Before Model Callback",
        widget: "text",
        default: "",
        placeholder: "e.g., callbacks/guardrails.py",
        help_text: "Callback function to run before model invocation",
        section: "Model Callbacks",
        tab: "Callbacks",
      },
      {
        id: "after_model_callback",
        label: "After Model Callback",
        widget: "text",
        default: "",
        placeholder: "e.g., callbacks/logging.py",
        help_text: "Callback function to run after model invocation",
        section: "Model Callbacks",
        tab: "Callbacks",
      },
      {
        id: "before_tool_callback",
        label: "Before Tool Callback",
        widget: "text",
        default: "",
        placeholder: "e.g., callbacks/validation.py",
        help_text: "Callback function to run before tool execution",
        section: "Tool Callbacks",
        tab: "Callbacks",
      },
      {
        id: "after_tool_callback",
        label: "After Tool Callback",
        widget: "text",
        default: "",
        placeholder: "e.g., callbacks/artifact_save.py",
        help_text: "Callback function to run after tool execution",
        section: "Tool Callbacks",
        tab: "Callbacks",
      },
    ],
    color: "#0ea5e9", // Blue color for agent nodes (matches theme.colors.nodes.agent.header)
    icon: "monitor",
    expandable: true,
    default_width: 400,
    default_height: 500,
    // Panel layout for agent nodes with chaining handles
    layout: "panel",
    theme_key: "agent",
    // Collapsed display - no format template (Agent doesn't use format template)
    collapsed_display: {
      summary_fields: ["model"],
      show_connections: true, // Shows connected prompt, tools, agents
    },
    // Collapsed footer shows just "Agent" text - no type badge since all are LLM
    collapsed_footer: {
      left_text: "Agent",
    },
    // Handle layout matches OLD AgentNode exactly:
    // - Main input handle on left (visible, draggable)
    // - Main output handle on right (visible, draggable)
    // - Link-top handle on top (source, for agent chaining)
    // - Link-bottom handle on bottom (target, for agent chaining)
    // - Hidden handles: agent-input, prompt-input, tools-input (for typed connections)
    handle_layout: {
      input_position: "left",
      output_position: "right",
      additional_handles: [
        {
          id: "link-top",
          type: "target",
          position: "top",
          label: "Chain with other agents",
        },
        {
          id: "link-bottom",
          type: "source",
          position: "bottom",
          label: "Chain with other agents",
        },
        // Hidden handles for typed edges (not visible, used for connection routing)
        {
          id: "agent-input",
          type: "target",
          position: "left",
          label: "Sub-Agents",
        },
        {
          id: "prompt-input",
          type: "target",
          position: "left",
          label: "Instructions",
        },
        {
          id: "tools-input",
          type: "target",
          position: "left",
          label: "Tools",
        },
      ],
    },
  },
};

export default agentNodeSchema;
