import type { CustomNodeSchema } from "@/components/nodes/CustomNode";

/**
 * Schema definition for LogProbeNode
 *
 * Log probe nodes monitor and display log output from the workflow.
 * They receive data from connected nodes and append it to a log file.
 *
 * Collapsed: Circle shape with "LOG" label (like old LogProbeNode)
 * Expanded: Full panel with log content viewer and pagination
 *
 * Features from old component:
 * - Circle layout when collapsed (36px, rounded-full)
 * - "LOG" label in bold 10px text
 * - Double-click to expand/collapse
 * - Lock icon when locked
 * - Input handle on bottom edge
 * - Expandable to show log content with Monaco editor
 */
export const logProbeNodeSchema: CustomNodeSchema = {
  unit_id: "builtin.logProbe",
  label: "Log",
  menu_location: "Probes/Log",
  description:
    "Monitors and logs workflow data. Displays log content with support for large files via pagination.",
  version: "1.0.0",
  output_node: true, // Sink node - triggers execution trace
  always_execute: true, // Always log, skip cache
  ui: {
    inputs: [
      {
        id: "input",
        label: "Input",
        source_type: "*",
        data_type: "any",
        accepted_sources: ["*"],
        accepted_types: ["str", "dict", "any"],
        required: false,
        multiple: false,
        connection_only: true,
      },
    ],
    outputs: [],
    fields: [
      {
        id: "file_path",
        label: "Log File",
        widget: "file_picker",
        placeholder: "Select a log file...",
        help_text: "Path to the log file",
      },
      {
        id: "content",
        label: "Log Content",
        widget: "code_editor",
        default: "",
        help_text: "Read-only preview of log content (scroll for more)",
      },
    ],
    color: "", // Uses theme colors from theme_key
    icon: "FileText",
    expandable: true,
    default_width: 400,
    default_height: 280,
    // Circle layout when collapsed, like old LogProbeNode
    layout: "circle",
    theme_key: "probe",
    // Handle on bottom for circle mode
    handle_layout: {
      input_position: "bottom",
    },
    collapsed_display: {
      // "LOG" label shown in circle
      format: "LOG",
    },
  },
};

export default logProbeNodeSchema;
