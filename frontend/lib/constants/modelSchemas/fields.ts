/**
 * Shared Field Definitions
 *
 * Common field definitions used across multiple model schemas.
 * Models can import and customize these as needed.
 */

import type { FieldDefinition } from "@/components/nodes/CustomNode/types";
import { DEFAULT_MODEL, GEMINI_MODEL_OPTIONS } from "./types";

/**
 * Creates the standard General tab fields.
 * @param options.temperature - Default temperature value
 * @param options.temperatureHelpText - Custom help text for temperature
 */
export function createGeneralFields(
  options: {
    temperature?: number;
    temperatureHelpText?: string;
  } = {},
): FieldDefinition[] {
  const {
    temperature = 0.7,
    temperatureHelpText = "Controls randomness in responses (0 = deterministic, 2 = creative)",
  } = options;

  return [
    {
      id: "description",
      label: "Description",
      widget: "textarea",
      default: "",
      required: true,
      placeholder: "Describe what this agent does...",
      help_text: "A description of the agent's purpose (required for routing)",
      tab: "General",
    },
    {
      id: "model",
      label: "Model",
      widget: "select",
      default: DEFAULT_MODEL,
      options: GEMINI_MODEL_OPTIONS,
      help_text: "The LLM model to use for this agent",
      tab: "General",
    },
    {
      id: "custom_model",
      label: "Custom Model",
      widget: "text",
      default: "",
      placeholder: "Custom model name",
      help_text: "Enter a custom model name",
      tab: "General",
      show_if: { model: "custom" },
    },
    {
      id: "location",
      label: "Location",
      widget: "info_display",
      help_text: "Set in Project Settings",
      tab: "General",
    },
    {
      id: "temperature",
      label: "Temperature",
      widget: "slider",
      default: temperature,
      min_value: 0,
      max_value: 2,
      step: 0.1,
      help_text: temperatureHelpText,
      tab: "General",
    },
    {
      id: "output_key",
      label: "Output Key",
      widget: "text",
      default: "",
      placeholder: "e.g., result",
      help_text: "Saves agent output to session state with this key",
      tab: "General",
    },
    {
      id: "include_contents",
      label: "Receives History",
      widget: "checkbox",
      default: true,
      help_text:
        "ADK property: include_contents. When enabled, agent receives prior conversation history. Disable for stateless operation.",
      tab: "General",
    },
    {
      id: "strip_contents",
      label: "Full Isolation",
      widget: "checkbox",
      default: false,
      help_text:
        "Completely isolates this agent from prior context. ADK still injects '[agent] said:' even with history disabled - this removes it. See: github.com/google/adk-python/issues/2207",
      tab: "General",
      show_if: { include_contents: false },
    },
  ];
}

/**
 * Creates Execution tab fields with thinking_budget (for Gemini 2.x).
 */
export function createExecutionFieldsWithBudget(): FieldDefinition[] {
  return [
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
    ...createCodeExecutorFields(),
    ...createHttpOptionsFields(),
  ];
}

/**
 * Creates Execution tab fields with thinking_level (for Gemini 3.x).
 */
export function createExecutionFieldsWithLevel(): FieldDefinition[] {
  return [
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
      id: "thinking_level",
      label: "Thinking Level",
      widget: "select",
      default: "medium",
      options: [
        { value: "minimal", label: "Minimal" },
        { value: "low", label: "Low" },
        { value: "medium", label: "Medium" },
        { value: "high", label: "High" },
      ],
      help_text: "Controls the depth of reasoning for thinking/planning",
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
    ...createCodeExecutorFields(),
    ...createHttpOptionsFields(),
  ];
}

/**
 * Code Executor fields (shared by all models).
 */
export function createCodeExecutorFields(): FieldDefinition[] {
  return [
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
      default: 2,
      min_value: 0,
      max_value: 10,
      help_text: "Number of retry attempts on code execution errors",
      section: "Code Executor",
      tab: "Execution",
      show_if: { code_executor_enabled: true },
    },
    {
      id: "code_executor_optimize_data_file",
      label: "Optimize Data File",
      widget: "checkbox",
      default: false,
      help_text: "Optimize handling of data files during code execution",
      section: "Code Executor",
      tab: "Execution",
      show_if: { code_executor_enabled: true },
    },
  ];
}

/**
 * HTTP Options fields (shared by all models).
 */
export function createHttpOptionsFields(): FieldDefinition[] {
  return [
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
  ];
}

/**
 * Flow tab fields (transfer controls + schema validation).
 */
export function createFlowFields(): FieldDefinition[] {
  return [
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
    {
      id: "input_schema",
      label: "Input Schema",
      widget: "text",
      default: "",
      placeholder: "e.g., models.TaskInput",
      help_text: "Pydantic BaseModel class path for input validation",
      section: "Schema",
      tab: "Flow",
    },
    {
      id: "output_schema",
      label: "Output Schema",
      widget: "text",
      default: "",
      placeholder: "e.g., models.TaskOutput",
      help_text: "Pydantic BaseModel class path for output validation",
      section: "Schema",
      tab: "Flow",
    },
    {
      id: "finish_reason_fail_fast",
      label: "Finish Reason Fail Fast",
      widget: "checkbox",
      default: false,
      help_text:
        "Fail flow execution if finish_reason is not STOP (e.g., MAX_TOKENS, SAFETY)",
      section: "Finish Reason",
      tab: "Flow",
    },
  ];
}

/**
 * Safety threshold options for harm categories.
 */
const SAFETY_THRESHOLD_OPTIONS = [
  { value: "default", label: "Default" },
  { value: "off", label: "Off (no filtering)" },
  { value: "block_none", label: "Block None" },
  { value: "block_low", label: "Block Low & Above" },
  { value: "block_medium", label: "Block Medium & Above" },
  { value: "block_high", label: "Block High Only" },
];

/**
 * Generation tab fields (GenerateContentConfig + Safety settings).
 */
export function createGenerationFields(): FieldDefinition[] {
  return [
    {
      id: "max_output_tokens",
      label: "Max Output Tokens",
      widget: "number",
      default: 65535,
      min_value: 1,
      max_value: 65535,
      help_text: "Maximum number of tokens in the response",
      section: "Output",
      tab: "Generation",
    },
    {
      id: "top_p",
      label: "Top P",
      widget: "slider",
      default: null,
      min_value: 0,
      max_value: 1,
      step: 0.05,
      help_text: "Nucleus sampling threshold (leave empty for model default)",
      section: "Sampling",
      tab: "Generation",
    },
    {
      id: "top_k",
      label: "Top K",
      widget: "slider",
      default: null,
      min_value: 1,
      max_value: 100,
      step: 1,
      help_text:
        "Top-k sampling: limits token selection to top K candidates (1-100)",
      section: "Sampling",
      tab: "Generation",
    },
    {
      id: "stop_sequences",
      label: "Stop Sequences",
      widget: "textarea",
      default: "",
      placeholder: "Enter stop sequences, one per line",
      help_text:
        "Sequences that stop generation when encountered (one per line)",
      section: "Output",
      tab: "Generation",
    },
    {
      id: "presence_penalty",
      label: "Presence Penalty",
      widget: "slider",
      default: null,
      min_value: -2,
      max_value: 2,
      step: 0.1,
      help_text: "Penalize tokens based on presence in text so far (-2 to 2)",
      section: "Penalties",
      tab: "Generation",
    },
    {
      id: "frequency_penalty",
      label: "Frequency Penalty",
      widget: "slider",
      default: null,
      min_value: -2,
      max_value: 2,
      step: 0.1,
      help_text: "Penalize tokens based on frequency in text so far (-2 to 2)",
      section: "Penalties",
      tab: "Generation",
    },
    {
      id: "seed",
      label: "Seed",
      widget: "number",
      default: null,
      placeholder: "Random",
      help_text: "Fixed seed for reproducible outputs (leave empty for random)",
      section: "Output",
      tab: "Generation",
    },
    {
      id: "response_mime_type",
      label: "Response Format",
      widget: "select",
      default: "",
      options: [
        { value: "", label: "Default" },
        { value: "text/plain", label: "Plain Text" },
        { value: "application/json", label: "JSON" },
      ],
      help_text:
        "Expected response format (leave as Default to let model decide)",
      section: "Output",
      tab: "Generation",
    },
    // Safety settings (content filtering)
    {
      id: "safety_harassment",
      label: "Harassment",
      widget: "select",
      default: "default",
      options: SAFETY_THRESHOLD_OPTIONS,
      help_text: "Filter content that harasses or bullies individuals",
      section: "Safety",
      tab: "Generation",
    },
    {
      id: "safety_hate_speech",
      label: "Hate Speech",
      widget: "select",
      default: "default",
      options: SAFETY_THRESHOLD_OPTIONS,
      help_text: "Filter content promoting hate against protected groups",
      section: "Safety",
      tab: "Generation",
    },
    {
      id: "safety_sexually_explicit",
      label: "Sexually Explicit",
      widget: "select",
      default: "default",
      options: SAFETY_THRESHOLD_OPTIONS,
      help_text: "Filter sexually explicit content",
      section: "Safety",
      tab: "Generation",
    },
    {
      id: "safety_dangerous_content",
      label: "Dangerous Content",
      widget: "select",
      default: "default",
      options: SAFETY_THRESHOLD_OPTIONS,
      help_text: "Filter content promoting harmful activities",
      section: "Safety",
      tab: "Generation",
    },
  ];
}
