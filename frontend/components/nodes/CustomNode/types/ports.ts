/**
 * Port Definition Types
 *
 * Defines input and output port structures for custom nodes.
 */

/**
 * Defines an input or output port on a node.
 *
 * Ports are connection points where edges can be attached. Inputs accept
 * connections from other nodes, while outputs provide data to downstream nodes.
 *
 * @example Input port with manual fallback
 * ```typescript
 * const input: PortDefinition = {
 *   id: "prompt",
 *   label: "Prompt",
 *   source_type: "prompt",
 *   data_type: "str",
 *   required: true,
 *   multiple: false,
 *   connection_only: false,  // Shows text input when not connected
 *   widget: "text_area",
 *   placeholder: "Enter your prompt...",
 * };
 * ```
 *
 * @example Connection-only input
 * ```typescript
 * const input: PortDefinition = {
 *   id: "agent_input",
 *   label: "Agent Input",
 *   source_type: "agent",
 *   data_type: "agent",
 *   accepted_sources: ["agent", "llm"],  // Accept multiple source types
 *   required: false,
 *   multiple: true,  // Allow multiple connections
 *   connection_only: true,  // No manual input, connections only
 * };
 * ```
 */
export interface PortDefinition {
  /** Unique identifier for the port (used as handle ID) */
  id: string;
  /** Display label shown next to the handle */
  label: string;
  /** Source type for connection compatibility (e.g., "prompt", "agent", "tool") */
  source_type: string;
  /** Data type of the value (e.g., "str", "int", "agent") */
  data_type: string;
  /** Array of accepted source types for inputs (defaults to [source_type]) */
  accepted_sources?: string[];
  /** Array of accepted data types for inputs (defaults to [data_type]) */
  accepted_types?: string[];
  /** Whether a connection is required for the node to be valid */
  required: boolean;
  /** Whether multiple connections are allowed */
  multiple: boolean;
  /** Tab name for organizing ports in expanded view */
  tab?: string;
  /** Section name for grouping ports within a tab */
  section?: string;
  /** Custom color for the handle (overrides default) */
  handle_color?: string;
  /**
   * Icon identifier for the port (displayed in labels and connected items).
   * Uses same icon names as node icons: "document", "database", "gear", "code", "monitor", etc.
   */
  icon?: string;
  /**
   * When true: only accepts connections (no manual input widget)
   * When false: shows editable field, disabled when connected
   */
  connection_only?: boolean;
  /**
   * Handle type override for the port.
   * - "target": Input handle (default for inputs) - receives connections
   * - "source": Output handle - emits connections
   *
   * Use "source" on an input to render it as an output handle while keeping
   * the inline rendering behavior (label + widget + handle on right).
   * Useful for callback handles on AgentNode that need to connect TO CallbackNodes.
   */
  handleType?: "source" | "target";
  /** Widget type for manual input (when connection_only=false) */
  widget?: string;
  /** Default value for the port */
  default?: unknown;
  /** Placeholder text for the input widget */
  placeholder?: string;
  /** Options for select/dropdown widgets */
  options?: { value: string; label: string }[];
}
