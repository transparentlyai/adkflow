/**
 * Layout and Display Configuration Types
 *
 * Defines layout types and collapsed display configurations for custom nodes.
 */

/**
 * Layout types for different node shapes in collapsed mode.
 *
 * Each layout provides a distinct visual appearance optimized for different
 * use cases. The layout determines the shape, size, and what information
 * is displayed when the node is collapsed.
 *
 * @example Using different layouts
 * ```typescript
 * // Pill layout for simple nodes (header only)
 * ui: { layout: "pill", ... }
 *
 * // Full layout for complex nodes (header + body + footer)
 * ui: { layout: "full", collapsed_body: {...}, collapsed_footer: {...} }
 *
 * // Circle layout for action buttons
 * ui: { layout: "circle", on_click: "run_workflow" }
 * ```
 */
export type NodeLayout =
  /** Standard expandable panel with header, content area, and footer (default) */
  | "standard"
  /** Pill-shaped compact node showing only the header (VariableNode, Prompt, Context, Tool) */
  | "pill"
  /** Header + body content, no footer - for nodes showing signatures (ProcessNode) */
  | "pill_body"
  /** Header + body + footer - for complex nodes (AgentNode with model, connections, type) */
  | "full"
  /** Circular button shape (StartNode for run action, probe nodes when collapsed) */
  | "circle"
  /** Octagonal shape (EndNode) */
  | "octagon"
  /** Diamond connector shape (legacy, use "tag" for new nodes) */
  | "diamond"
  /** Tag/arrow shape for teleport nodes - uses TeleporterContext for dynamic colors */
  | "tag"
  /** Small compact pill for auxiliary nodes (AgentToolNode) */
  | "compact"
  /** Full panel with sections - legacy alias for "standard" */
  | "panel";

/**
 * Configuration for what to display in the collapsed node header.
 *
 * Controls the text shown in the node header when collapsed. Supports
 * template strings with field placeholders, connected node display,
 * and special formatting options.
 *
 * @example Simple name display
 * ```typescript
 * collapsed_display: {
 *   format: "{name}",  // Shows the node's name field value
 * }
 * ```
 *
 * @example Formatted display with prefix
 * ```typescript
 * collapsed_display: {
 *   format: "Model: {model}",  // Shows "Model: gemini-2.5-flash"
 * }
 * ```
 *
 * @example Variable with braces (shows "{variableName}")
 * ```typescript
 * collapsed_display: {
 *   format: "{name}",
 *   show_with_braces: true,  // Wraps result in literal braces
 * }
 * ```
 */
export interface CollapsedDisplay {
  /** Field IDs whose values should be concatenated as summary text */
  summary_fields?: string[];
  /**
   * Format string with {field_id} placeholders for templated display.
   * Example: "{name}" or "Model: {model}"
   */
  format?: string;
  /** Whether to show connected input names in the header */
  show_connections?: boolean;
  /**
   * Wrap the displayed text in literal braces (for VariableNode style).
   * When true, "{myVar}" format results in displaying "{myVar}" with visible braces.
   */
  show_with_braces?: boolean;
}

/**
 * Configuration for body content in "pill_body" and "full" layouts.
 *
 * The body section appears below the header and can display field values,
 * connected node names, or parsed function signatures.
 *
 * @example AgentNode showing model and connections
 * ```typescript
 * collapsed_body: {
 *   show_field: "model",           // Shows "gemini-2.5-flash" in body
 *   show_connected: ["prompt", "tools"],  // Shows connected prompts/tools
 * }
 * ```
 *
 * @example ProcessNode showing function signature
 * ```typescript
 * collapsed_body: {
 *   show_function_signature: true,  // Parses and shows "def process(data):"
 *   code_field: "code",             // Field containing the Python code
 * }
 * ```
 */
export interface CollapsedBody {
  /** Field ID whose value to display (e.g., "model" shows model name) */
  show_field?: string;
  /**
   * Input handle IDs for which to display connected node names.
   * Example: ["prompt", "tools"] shows names of connected prompt and tool nodes.
   */
  show_connected?: string[];
  /** Parse and display function signature from code field (for ProcessNode) */
  show_function_signature?: boolean;
  /** Field ID containing code to parse for function signature */
  code_field?: string;
}

/**
 * Configuration for footer content in "full" layout.
 *
 * The footer appears at the bottom of the collapsed node and can show
 * a label on the left and/or a type badge on the right.
 *
 * @example Simple footer with label
 * ```typescript
 * collapsed_footer: {
 *   left_text: "Agent",  // Shows "Agent" on left side of footer
 * }
 * ```
 *
 * @example Footer with type badge
 * ```typescript
 * collapsed_footer: {
 *   left_text: "Agent",
 *   show_type_badge: true,
 *   type_field: "type",
 *   type_labels: {
 *     "llm": "LLM",
 *     "sequential": "Sequential",
 *     "parallel": "Parallel",
 *   },
 * }
 * ```
 */
export interface CollapsedFooter {
  /** Text shown on the left side of the footer (e.g., "Agent", "Process") */
  left_text?: string;
  /** Whether to show a type badge on the right side */
  show_type_badge?: boolean;
  /** Field ID to read the type value from */
  type_field?: string;
  /** Map of type values to display labels (e.g., { "llm": "LLM" }) */
  type_labels?: Record<string, string>;
}

/**
 * Configuration for handle (connection point) positions.
 *
 * Controls where input and output handles are placed on the node,
 * and allows adding additional handles for specialized connections
 * like agent chaining.
 *
 * @example Standard left-to-right flow
 * ```typescript
 * handle_layout: {
 *   input_position: "left",
 *   output_position: "right",
 * }
 * ```
 *
 * @example Agent node with chaining handles
 * ```typescript
 * handle_layout: {
 *   input_position: "left",
 *   output_position: "right",
 *   additional_handles: [
 *     { id: "link-top", type: "target", position: "top", label: "Chain In" },
 *     { id: "link-bottom", type: "source", position: "bottom", label: "Chain Out" },
 *   ],
 * }
 * ```
 */
export interface HandleLayout {
  /** Position for the main input handle. Default: "left" */
  input_position?: "left" | "top" | "right" | "bottom";
  /** Position for the main output handle. Default: "right" */
  output_position?: "left" | "top" | "right" | "bottom";
  /**
   * Additional handles for specialized connections (e.g., agent chaining).
   * Each handle has a unique ID, type (source/target), position, and optional label.
   */
  additional_handles?: {
    /** Unique identifier for the handle */
    id: string;
    /** Handle type: "source" (output) or "target" (input) */
    type: "source" | "target";
    /** Position on the node */
    position: "left" | "top" | "right" | "bottom";
    /** Optional label shown on hover */
    label?: string;
    /** If true, render at node edge in expanded mode (for left/right positions) */
    render_at_edge?: boolean;
  }[];
}
