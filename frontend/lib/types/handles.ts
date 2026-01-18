/**
 * Handle Type Definitions
 *
 * Defines handle data types and source types for the connection system.
 * Handle types determine which nodes can connect to each other.
 *
 * The handle system uses a source:type pattern:
 * - Source: semantic origin (e.g., 'agent', 'callback', 'tool')
 * - Type: data format (e.g., 'callable', 'dict', 'str')
 */

/**
 * Callback type enum defining when callbacks are invoked in the agent lifecycle.
 *
 * These correspond to ADK's agent callback hooks:
 * - before_agent/after_agent: Around entire agent execution
 * - before_model/after_model: Around LLM calls
 * - before_tool/after_tool: Around tool invocations
 */
export type CallbackType =
  | "before_agent"
  | "after_agent"
  | "before_model"
  | "after_model"
  | "before_tool"
  | "after_tool";

/**
 * All valid callback type values.
 */
export const CALLBACK_TYPES: readonly CallbackType[] = [
  "before_agent",
  "after_agent",
  "before_model",
  "after_model",
  "before_tool",
  "after_tool",
] as const;

/**
 * CallbackNode represents a user-defined callback function in the workflow.
 *
 * Callbacks connect to Agent nodes to provide custom lifecycle hooks.
 * The code property contains Python code that executes at the specified
 * callback_type point in the agent lifecycle.
 *
 * @example
 * ```typescript
 * const callback: CallbackNode = {
 *   id: "callback-1",
 *   name: "Log Agent Start",
 *   callback_type: "before_agent",
 *   code: "async def callback(callback_context):\n    print('Agent starting')",
 * };
 * ```
 */
export interface CallbackNode {
  /** Unique identifier for the callback node */
  id: string;
  /** Display name for the callback */
  name: string;
  /** When this callback is invoked in the agent lifecycle */
  callback_type: CallbackType;
  /** Python code implementing the callback function */
  code: string;
}

/**
 * Handle data types define the format of data flowing through connections.
 *
 * These types are used in the `data_type` field of input/output definitions
 * and in `acceptedTypes` for connection validation.
 */
export type HandleDataType =
  | "str" // String data (prompts, text content)
  | "dict" // Dictionary/object data (agent outputs, context)
  | "callable" // Callable functions (tools, callbacks)
  | "link" // Agent chaining connections
  | "trigger" // Flow control triggers (start node)
  | "adopt" // Sub-agent adoption connections
  | "json" // JSON schema definitions (Pydantic BaseModel)
  | "any"; // Accepts any data type

/**
 * Handle source types define the semantic origin of the connection.
 *
 * These types are used in the `source_type` field of input/output definitions
 * and in `acceptedSources` for connection validation.
 */
export type HandleSourceType =
  | "agent" // Agent node outputs
  | "prompt" // Prompt node outputs
  | "tool" // Tool node outputs
  | "agent_tool" // Agent tool node outputs
  | "context" // Context node outputs
  | "flow" // Flow control nodes (start, end)
  | "callback" // Callback node outputs
  | "schema" // Schema provider nodes (Pydantic BaseModel)
  | "*"; // Wildcard - accepts any source

/**
 * Callback handle configuration for CallbackNode connections.
 *
 * Connection direction: AgentNode (source) → CallbackNode (target)
 * Agent callback output handles emit triggers to connected CallbackNodes.
 *
 * @example Agent callback output handle
 * ```typescript
 * {
 *   id: "before_model_callback",
 *   label: "Before Model",
 *   source_type: "callback",
 *   data_type: "callable",
 * }
 * ```
 *
 * @example CallbackNode input handle
 * ```typescript
 * {
 *   id: "input",
 *   label: "Callback",
 *   source_type: "callback",
 *   data_type: "callable",
 *   accepted_sources: ["callback"],
 *   accepted_types: ["callable"],
 * }
 * ```
 */
export interface CallbackHandleConfig {
  /** Handle identifier */
  id: string;
  /** Display label */
  label: string;
  /** Source type - always "callback" for callback handles */
  source_type: "callback";
  /** Data type - callbacks are callable functions */
  data_type: "callable";
  /** Handle type: source (output) or target (input) */
  handleType: "source" | "target";
  /** Position on the node */
  position: "left" | "top" | "right" | "bottom";
  /** Whether multiple connections are allowed */
  multiple?: boolean;
  /** Whether this is a connection-only handle (no form field) */
  connection_only?: boolean;
}

/**
 * Predefined callback handle configurations for common use cases.
 *
 * Connection direction: AgentNode (source) → CallbackNode (target)
 */
export const CALLBACK_HANDLE_CONFIGS = {
  /**
   * Output handle for AgentNode - emits callback triggers.
   * Each callback type has its own output handle (before_agent_callback, etc.)
   */
  agentCallbackOutput: {
    id: "before_model_callback", // Example - actual IDs vary by type
    label: "Before Model",
    source_type: "callback",
    data_type: "callable",
    handleType: "source",
    position: "right",
    multiple: false,
  } as CallbackHandleConfig,

  /**
   * Input handle for CallbackNode to receive triggers from Agent.
   */
  callbackInput: {
    id: "input",
    label: "Callback",
    source_type: "callback",
    data_type: "callable",
    handleType: "target",
    position: "left",
    multiple: false,
    connection_only: true,
  } as CallbackHandleConfig,
} as const;
