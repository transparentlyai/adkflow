/**
 * Custom Node Schema Types
 *
 * Main schema interface for defining custom nodes.
 */

import type { PortDefinition } from "./ports";
import type { FieldDefinition } from "./fields";
import type {
  NodeLayout,
  CollapsedDisplay,
  CollapsedBody,
  CollapsedFooter,
  HandleLayout,
} from "./layout";

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
