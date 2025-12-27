import type { CustomNodeSchema } from "@/components/nodes/CustomNode";

/**
 * Schema definition for InputProbeNode
 *
 * Input probe nodes provide data injection points in the workflow.
 * They read content from a file and output it as a string.
 * The node is expandable and displays file content in a read-only editor.
 *
 * Features from old component:
 * - Collapsed view: circle layout (rounded-full, w-9 h-9 = 36x36px)
 * - Shows "IN" label when collapsed
 * - Lock icon when locked (inside the circle)
 * - Double-click to expand
 * - Expanded view: full editor panel with:
 *   - Header with "IN" badge, name, collapse button
 *   - EditorMenuBar for file selection (.log, .txt, .json files)
 *   - Read-only Monaco editor for markdown
 *   - Footer showing file path and line count
 * - Output handle on bottom edge
 * - Resizable when expanded
 */
export const inputProbeNodeSchema: CustomNodeSchema = {
  unit_id: "builtin.inputProbe",
  label: "Input Probe",
  menu_location: "Probes/Input",
  description:
    "Reads content from a file and outputs it as a string. Used for injecting data into workflows.",
  version: "1.0.0",
  output_node: false,
  always_execute: false,
  ui: {
    inputs: [],
    outputs: [
      {
        id: "output",
        label: "Output",
        source_type: "input_probe",
        data_type: "str",
        required: true,
        multiple: true,
      },
    ],
    fields: [
      {
        id: "name",
        label: "Name",
        widget: "text",
        default: "Input",
        placeholder: "Probe name...",
        help_text: "Display name for this input probe",
      },
      {
        id: "file_path",
        label: "File",
        widget: "file_picker",
        placeholder: "Select a file...",
        help_text: "Path to the file containing the input data (.log, .txt, .json)",
      },
    ],
    color: "#06B6D4", // Cyan/teal for probe nodes (matches theme.colors.nodes.probe.header)
    icon: "", // No icon - shows "IN" text label instead
    expandable: true,
    default_width: 400,
    default_height: 280,
    // Circle layout when collapsed
    layout: "circle",
    theme_key: "probe",
    collapsed_display: {
      // Show "IN" label when collapsed
      format: "IN",
    },
    handle_layout: {
      output_position: "bottom",
    },
  },
};

export default inputProbeNodeSchema;
