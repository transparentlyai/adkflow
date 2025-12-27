import type { CustomNodeSchema } from "@/components/nodes/CustomNode";

/**
 * Schema definition for the OutputFileNode.
 *
 * OutputFileNode is a sink node that displays file content. It has:
 * - An input handle that receives data from upstream nodes
 * - No outputs (terminal/sink node)
 * - Read-only Monaco editor for viewing file content
 * - Pagination support for large files
 * - File path configuration for the output destination
 *
 * Features from old component:
 * - Collapsed view: header bar with FileInput icon, name, expand button
 * - Expanded view: full editor panel with:
 *   - Header with "OUTPUT" badge, name, refresh button, collapse button
 *   - EditorMenuBar for file selection
 *   - Read-only Monaco editor with syntax highlighting
 *   - Footer showing file path and line count
 * - Refresh button in header to reload file content
 * - Input handle on left (accepts str, dict, any)
 * - Resizable when expanded
 * - Pagination: loads 500 lines at a time, scroll to load more
 */
export const outputFileNodeSchema: CustomNodeSchema = {
  unit_id: "builtin.outputFile",
  label: "Output File",
  menu_location: "Output/File Output",
  description:
    "A sink node that writes workflow output to a file. Displays file content with syntax highlighting and pagination support.",
  version: "1.0.0",
  output_node: true, // This is a sink node that triggers execution traces
  always_execute: false,
  ui: {
    inputs: [
      {
        id: "input",
        label: "Data",
        source_type: "*",
        data_type: "any",
        accepted_sources: ["*"],
        accepted_types: ["str", "dict", "any"],
        required: true,
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
        placeholder: "Enter node name...",
        help_text: "Display name for this output node.",
      },
      {
        id: "file_path",
        label: "Output File Path",
        widget: "file_picker",
        default: "outputs/output.txt",
        placeholder: "Select or enter output file path...",
        help_text:
          "Path where the output will be written. Supports various file formats with syntax highlighting.",
      },
    ],
    color: "#f97316", // Orange color matching theme.colors.nodes.outputFile.header
    icon: "FileInput",
    expandable: true,
    default_width: 400,
    default_height: 280,
    // Pill layout for output file nodes - header bar when collapsed
    // Input handle on left only, expandable
    layout: "pill",
    theme_key: "outputFile",
    collapsed_display: {
      format: "{name}",
    },
    handle_layout: {
      input_position: "left",
    },
  },
};

export default outputFileNodeSchema;
