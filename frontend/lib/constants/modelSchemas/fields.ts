/**
 * Shared Field Definitions
 *
 * Common field definitions used across multiple model schemas.
 * Models can import and customize these as needed.
 */

import type { FieldDefinition } from "@/components/nodes/CustomNode/types";

/**
 * Creates the standard General tab fields.
 * @param options.temperature - Default temperature value
 * @param options.temperatureHelpText - Custom help text for temperature
 */
export function createGeneralFields(options: {
  temperature?: number;
  temperatureHelpText?: string;
} = {}): FieldDefinition[] {
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
      default: "", // Will be set by index.ts with actual default model
      options: [], // Will be populated by index.ts with discovered models
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
      default: 3,
      min_value: 0,
      max_value: 10,
      help_text: "Number of retry attempts on code execution errors",
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
 * Flow tab fields (shared by all models).
 */
export function createFlowFields(): FieldDefinition[] {
  return [
    {
      id: "disallow_transfer_to_parent",
      label: "Disallow transfer to parent",
      widget: "checkbox",
      default: false,
      help_text: "Prevent this agent from transferring control back to its parent",
      section: "Transfer Controls",
      tab: "Flow",
    },
    {
      id: "disallow_transfer_to_peers",
      label: "Disallow transfer to peers",
      widget: "checkbox",
      default: false,
      help_text: "Prevent this agent from transferring control to sibling agents",
      section: "Transfer Controls",
      tab: "Flow",
    },
  ];
}

/**
 * Schema tab fields (shared by all models).
 */
export function createSchemaFields(): FieldDefinition[] {
  return [
    {
      id: "output_key",
      label: "Output Key",
      widget: "text",
      default: "",
      placeholder: "e.g., result",
      help_text: "Saves agent output to session state with this key",
      section: "Output Options",
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
      section: "Output Options",
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
  ];
}

/**
 * Callbacks tab fields (shared by all models).
 */
export function createCallbacksFields(): FieldDefinition[] {
  return [
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
  ];
}
