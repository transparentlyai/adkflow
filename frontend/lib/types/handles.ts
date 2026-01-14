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
  | "*"; // Wildcard - accepts any source

/**
 * Callback handle configuration for CallbackNode connections.
 *
 * Callbacks connect to Agent callback inputs to provide custom
 * lifecycle hooks (before_agent, after_agent, before_model, etc.)
 *
 * @example CallbackNode output handle
 * ```typescript
 * {
 *   id: "output",
 *   label: "Callback",
 *   source_type: "callback",
 *   data_type: "callable",
 * }
 * ```
 *
 * @example Agent callback input handle
 * ```typescript
 * {
 *   id: "callbacks-input",
 *   label: "Callbacks",
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
 */
export const CALLBACK_HANDLE_CONFIGS = {
  /**
   * Output handle for CallbackNode - emits callable callbacks.
   */
  callbackOutput: {
    id: "output",
    label: "Callback",
    source_type: "callback",
    data_type: "callable",
    handleType: "source",
    position: "right",
    multiple: true,
  } as CallbackHandleConfig,

  /**
   * Input handle for Agent nodes to receive callbacks.
   */
  callbackInput: {
    id: "callbacks-input",
    label: "Callbacks",
    source_type: "callback",
    data_type: "callable",
    handleType: "target",
    position: "left",
    multiple: true,
    connection_only: true,
  } as CallbackHandleConfig,
} as const;
