import type { CustomNodeSchema } from "@/components/nodes/CustomNode";

/**
 * Schema definition for the PromptNode.
 *
 * PromptNode is a content node that displays and edits markdown/text content
 * from a file. It has:
 * - A Monaco editor for content editing (when expanded) with markdown language
 * - A single output handle that emits string content
 * - File path configuration for loading/saving content
 *
 * No tabs - single content editor view.
 */
export const promptNodeSchema: CustomNodeSchema = {
  unit_id: "builtin.prompt",
  label: "Prompt",
  menu_location: "Content/Prompt",
  description:
    "A content node for editing and managing prompt text from a file. Outputs string content for use in agent workflows.",
  version: "1.0.0",
  output_node: false,
  always_execute: false,
  ui: {
    inputs: [],
    outputs: [
      {
        id: "output",
        label: "Content",
        source_type: "prompt",
        data_type: "str",
        required: false,
        multiple: true,
      },
    ],
    fields: [
      {
        id: "name",
        label: "Name",
        widget: "text",
        default: "New Prompt",
        placeholder: "Prompt name",
        help_text: "A unique name for this prompt",
      },
      {
        id: "file_path",
        label: "File Path",
        widget: "file_picker",
        default: "",
        placeholder: "Select a markdown or text file...",
        help_text: "Path to the prompt file (.md, .txt)",
      },
      {
        id: "content",
        label: "Content",
        widget: "code_editor",
        language: "markdown",
        default: "",
        placeholder: "Enter prompt content here...",
        help_text:
          "The prompt content. Supports template variables like {variable_name}.",
      },
    ],
    color: "#8b5cf6", // Purple color matching theme.colors.nodes.prompt.header
    icon: "document",
    expandable: true,
    default_width: 500,
    default_height: 320,
    // Pill layout for prompt nodes - header only when collapsed, single output on right
    layout: "pill",
    theme_key: "prompt",
    min_collapsed_width: 120, // Consistent minimum width for content nodes
    resizable: true, // Enable resize for code editor
    min_width: 300,
    min_height: 200,
    collapsed_display: {
      format: "{name}",
      show_connections: false,
    },
    handle_layout: {
      output_position: "right",
    },
  },
};

export default promptNodeSchema;
