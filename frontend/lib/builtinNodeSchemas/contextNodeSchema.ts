/**
 * Context Node Schema
 *
 * Schema definition for the built-in Context node.
 * Context nodes provide additional context content for agents,
 * similar to Prompt nodes but used specifically for context injection.
 *
 * No tabs - single content editor view with markdown language.
 */

import type { CustomNodeSchema } from "@/components/nodes/CustomNode";

export const contextNodeSchema: CustomNodeSchema = {
  unit_id: "builtin.context",
  label: "Context",
  menu_location: "Content/Context",
  description:
    "Additional context content for agents. Similar to prompts but used for injecting context data.",
  version: "1.0.0",
  output_node: false,
  always_execute: false,

  ui: {
    inputs: [],
    outputs: [
      {
        id: "output",
        label: "Context",
        source_type: "context",
        data_type: "str",
        required: true,
        multiple: false,
      },
    ],
    fields: [
      {
        id: "name",
        label: "Name",
        widget: "text",
        default: "New Context",
        placeholder: "Context name",
        help_text: "A unique name for this context",
      },
      {
        id: "file_path",
        label: "File Path",
        widget: "file_picker",
        default: "",
        placeholder: "contexts/context.md",
        help_text: "Path to the context file",
      },
      {
        id: "content",
        label: "Content",
        widget: "code_editor",
        language: "markdown",
        default: "",
        help_text: "Context content (editable in expanded view)",
      },
    ],
    color: "#10b981", // Emerald/green - theme.colors.nodes.context.header
    icon: "database",
    expandable: true,
    default_width: 500,
    default_height: 320,
    // Pill layout for context nodes - header only when collapsed, single output on right
    layout: "pill",
    theme_key: "context",
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
