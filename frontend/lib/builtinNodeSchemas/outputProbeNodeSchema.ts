import type { CustomNodeSchema } from "@/components/nodes/CustomNode";

/**
 * Schema definition for OutputProbeNode
 *
 * Output probe nodes capture and display workflow outputs.
 * They receive data from connected nodes and write it to a file.
 * The node is expandable and displays the output content in a read-only editor.
 *
 * Features from old component:
 * - Collapsed view: circle layout (rounded-full, w-9 h-9 = 36x36px)
 * - Shows "OUT" label when collapsed
 * - Lock icon when locked (inside the circle)
 * - Double-click to expand
 * - Expanded view: full editor panel with:
 *   - Header with "OUT" badge, name, collapse button
 *   - EditorMenuBar for file selection (.log, .txt, .json files)
 *   - Read-only Monaco editor for markdown
 *   - Footer showing file path and line count
 * - Input handle on bottom edge
 * - Resizable when expanded
 */
export const outputProbeNodeSchema: CustomNodeSchema = {
  unit_id: "builtin.outputProbe",
  label: "Output Probe",
  menu_location: "Probes/Output",
  description:
    "Captures output data from the workflow and writes it to a file. Used for inspecting workflow results.",
  version: "1.0.0",
  output_node: true, // Sink node - triggers execution trace
  always_execute: false,
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
        id: "name",
        label: "Name",
        widget: "text",
        default: "Output",
        placeholder: "Probe name...",
        help_text: "Display name for this output probe",
      },
      {
        id: "file_path",
        label: "File",
        widget: "file_picker",
        placeholder: "Select a file...",
        help_text: "Path to the file where output will be written (.log, .txt, .json)",
      },
    ],
    color: "#06B6D4", // Cyan/teal for probe nodes (matches theme.colors.nodes.probe.header)
    icon: "", // No icon - shows "OUT" text label instead
    expandable: true,
    default_width: 400,
    default_height: 280,
    // Circle layout when collapsed
    layout: "circle",
    theme_key: "probe",
    collapsed_display: {
      // Show "OUT" label when collapsed
      format: "OUT",
    },
    handle_layout: {
      input_position: "bottom",
    },
  },
};

export default outputProbeNodeSchema;
