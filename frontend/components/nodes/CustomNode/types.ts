/**
 * =============================================================================
 * CUSTOM NODE SCHEMA TYPES
 * =============================================================================
 *
 * These types define the schema structure for custom nodes in the flow editor.
 * Extension developers can use these types to create custom node definitions
 * that are rendered by the CustomNode component.
 *
 * @example Basic Extension Node Schema
 * ```typescript
 * const myNodeSchema: CustomNodeSchema = {
 *   unit_id: "my_extension.my_node",
 *   label: "My Custom Node",
 *   menu_location: "My Extension",
 *   description: "A custom node that does something useful",
 *   version: "1.0.0",
 *   ui: {
 *     inputs: [...],
 *     outputs: [...],
 *     fields: [...],
 *     color: "#3b82f6",
 *     icon: "gear",
 *     expandable: true,
 *     default_width: 300,
 *     default_height: 200,
 *   }
 * };
 * ```
 */

import type { HandlePositions, NodeExecutionState } from "@/lib/types";

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
  /** Widget type for manual input (when connection_only=false) */
  widget?: string;
  /** Default value for the port */
  default?: unknown;
  /** Placeholder text for the input widget */
  placeholder?: string;
  /** Options for select/dropdown widgets */
  options?: { value: string; label: string }[];
}

/**
 * Defines a configuration field in the node's expanded view.
 *
 * Fields are UI controls that allow users to configure the node's behavior.
 * They can be organized into tabs and sections for complex nodes.
 *
 * @example Text input field
 * ```typescript
 * const nameField: FieldDefinition = {
 *   id: "name",
 *   label: "Name",
 *   widget: "text_input",
 *   default: "my_node",
 *   placeholder: "Enter node name",
 * };
 * ```
 *
 * @example Select field with options
 * ```typescript
 * const typeField: FieldDefinition = {
 *   id: "type",
 *   label: "Type",
 *   widget: "select",
 *   default: "default",
 *   options: [
 *     { value: "default", label: "Default" },
 *     { value: "custom", label: "Custom" },
 *   ],
 * };
 * ```
 *
 * @example Conditional field (only shown when type="custom")
 * ```typescript
 * const customField: FieldDefinition = {
 *   id: "custom_value",
 *   label: "Custom Value",
 *   widget: "text_input",
 *   show_if: { type: "custom" },  // Only visible when type field equals "custom"
 * };
 * ```
 *
 * @example Code editor field
 * ```typescript
 * const codeField: FieldDefinition = {
 *   id: "code",
 *   label: "Python Code",
 *   widget: "code_editor",
 *   language: "python",
 *   tab: "Code",
 * };
 * ```
 */
export interface FieldDefinition {
  /** Unique identifier for the field (used as config key) */
  id: string;
  /** Display label shown next to the widget */
  label: string;
  /**
   * Widget type for rendering the field.
   * Available widgets: text_input, text_area, select, number, checkbox,
   * code_editor, slider, color_picker
   */
  widget: string;
  /** Default value for the field */
  default?: unknown;
  /** Options for select/dropdown widgets */
  options?: { value: string; label: string }[];
  /** Minimum value for number/slider widgets */
  min_value?: number;
  /** Maximum value for number/slider widgets */
  max_value?: number;
  /** Step increment for number/slider widgets */
  step?: number;
  /** Placeholder text for text inputs */
  placeholder?: string;
  /** Help text shown below the field */
  help_text?: string;
  /**
   * Conditional visibility: field is only shown when all conditions match.
   * Keys are field IDs, values are the required values.
   */
  show_if?: Record<string, unknown>;
  /** Tab name for organizing fields (appears in tab bar) */
  tab?: string;
  /** Section name for grouping fields within a tab (appears as subheader) */
  section?: string;
  /** Language for syntax highlighting in code_editor widget */
  language?: string;
}

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
  }[];
}

/**
 * Complete schema definition for a custom node.
 *
 * This is the main interface that extension developers use to define
 * custom nodes. It specifies the node's identity, behavior, appearance,
 * and all its configuration options.
 *
 * @example Complete extension node schema
 * ```typescript
 * const myNodeSchema: CustomNodeSchema = {
 *   unit_id: "my_extension.data_processor",
 *   label: "Data Processor",
 *   menu_location: "My Extension/Processing",
 *   description: "Processes data with custom logic",
 *   version: "1.0.0",
 *   output_node: true,  // Triggers execution trace
 *
 *   ui: {
 *     inputs: [
 *       {
 *         id: "data",
 *         label: "Input Data",
 *         source_type: "data",
 *         data_type: "any",
 *         required: true,
 *         multiple: false,
 *         connection_only: true,
 *       },
 *     ],
 *     outputs: [
 *       {
 *         id: "result",
 *         label: "Result",
 *         source_type: "data",
 *         data_type: "any",
 *         required: false,
 *         multiple: false,
 *       },
 *     ],
 *     fields: [
 *       { id: "name", label: "Name", widget: "text_input", default: "processor" },
 *       { id: "mode", label: "Mode", widget: "select", options: [...] },
 *     ],
 *     color: "#3b82f6",
 *     icon: "gear",
 *     expandable: true,
 *     default_width: 300,
 *     default_height: 200,
 *     layout: "pill",
 *     theme_key: "tool",
 *     collapsed_display: { format: "{name}" },
 *   },
 * };
 * ```
 */
export interface CustomNodeSchema {
  /**
   * Unique identifier for the node type.
   * Format: "extension_name.node_name" (e.g., "my_extension.processor")
   */
  unit_id: string;
  /** Display name shown in the node header and menus */
  label: string;
  /**
   * Location in the add-node menu.
   * Use "/" for submenus (e.g., "My Extension/Tools")
   */
  menu_location: string;
  /** Description shown in tooltips and documentation */
  description: string;
  /** Schema version string (e.g., "1.0.0") */
  version: string;

  // ─────────────────────────────────────────────────────────────────────────
  // Execution Control Properties
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Mark as output/sink node that triggers execution trace.
   * When true, this node will be included in the execution order calculation.
   */
  output_node?: boolean;
  /**
   * Skip cache and always execute this node.
   * Useful for nodes with side effects or external dependencies.
   */
  always_execute?: boolean;

  // ─────────────────────────────────────────────────────────────────────────
  // UI Configuration
  // ─────────────────────────────────────────────────────────────────────────

  ui: {
    /** Input port definitions */
    inputs: PortDefinition[];
    /** Output port definitions */
    outputs: PortDefinition[];
    /** Configuration field definitions */
    fields: FieldDefinition[];
    /**
     * Tab names for organizing fields in expanded view.
     * Fields/inputs with matching `tab` property appear in that tab.
     */
    tabs?: string[];
    /** Primary color for the node header (hex string, e.g., "#3b82f6") */
    color: string;
    /**
     * Icon identifier for the node header.
     * Built-in icons: "document", "database", "gear", "code", "monitor"
     * Lucide icons: "Play", "Square", "Send", "FileInput", etc.
     */
    icon?: string;
    /** Whether the node can be expanded to show full configuration */
    expandable: boolean;
    /** Default width in pixels when expanded */
    default_width: number;
    /** Default height in pixels when expanded */
    default_height: number;

    // ─────────────────────────────────────────────────────────────────────
    // Layout and Appearance
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Layout type for collapsed appearance.
     * @see NodeLayout for available options
     */
    layout?: NodeLayout;
    /**
     * Theme key for looking up node-specific colors.
     * Options: "variable", "agent", "prompt", "context", "tool", "process", etc.
     */
    theme_key?: string;
    /** Configuration for collapsed header display */
    collapsed_display?: CollapsedDisplay;
    /** Body content configuration for pill_body and full layouts */
    collapsed_body?: CollapsedBody;
    /** Footer configuration for full layout */
    collapsed_footer?: CollapsedFooter;
    /** Fixed width when collapsed (pixels). If not set, uses content width. */
    collapsed_width?: number;
    /** Minimum width when collapsed (pixels). Ensures consistent sizing across similar nodes. */
    min_collapsed_width?: number;
    /**
     * Action to perform when the node is clicked (for circle/button layouts).
     * Options: "run_workflow", "toggle_expand"
     */
    on_click?: string;
    /** Handle position configuration */
    handle_layout?: HandleLayout;
    /**
     * Whether the node can be resized when expanded.
     * When true, shows a resize handle in the bottom-right corner.
     */
    resizable?: boolean;
    /** Minimum width when resizing (pixels). Defaults to 200. */
    min_width?: number;
    /** Minimum height when resizing (pixels). Defaults to 150. */
    min_height?: number;
  };
}

/**
 * Runtime data stored on a CustomNode instance.
 *
 * This interface defines the data structure that is stored in ReactFlow's
 * node data property. It includes the schema, current configuration values,
 * and runtime state like expansion and execution status.
 *
 * @example Creating node data from schema
 * ```typescript
 * const nodeData = getDefaultCustomNodeData(myNodeSchema);
 * // nodeData.config contains default values from schema
 * // nodeData.handleTypes contains connection type info
 * ```
 */
export interface CustomNodeData {
  /** The node's schema definition */
  schema: CustomNodeSchema;
  /** Current configuration values keyed by field ID (includes 'name' field) */
  config: Record<string, unknown>;
  /** Handle position overrides */
  handlePositions?: HandlePositions;
  /**
   * Handle type information for connection validation.
   * Computed from schema inputs/outputs.
   */
  handleTypes?: Record<
    string,
    {
      outputSource?: string;
      outputType?: string;
      acceptedSources?: string[];
      acceptedTypes?: string[];
    }
  >;
  /** Current size when expanded (for resizable nodes) */
  expandedSize?: { width: number; height: number };
  /** Whether the node is currently expanded */
  isExpanded?: boolean;
  /** Whether the node is locked (prevents editing) */
  isNodeLocked?: boolean;
  /** Current execution state for visual feedback */
  executionState?: NodeExecutionState;
  /** List of validation error messages */
  validationErrors?: string[];
  /** List of validation warning messages */
  validationWarnings?: string[];
  /** Client-side duplicate name error message */
  duplicateNameError?: string;
}
