/**
 * Context Aggregator Node Schema
 *
 * Schema definition for the built-in Context Aggregator node.
 * Collects context from multiple sources (files, directories, URLs, nodes)
 * into named variables for Agent template substitution.
 *
 * Supports dynamic inputs that can be added/removed at runtime.
 */

import type { CustomNodeSchema } from "@/components/nodes/CustomNode";

export const contextAggregatorNodeSchema: CustomNodeSchema = {
  unit_id: "builtin.context_aggregator",
  label: "Context Aggregator",
  menu_location: "Content/Context Aggregator",
  description:
    "Collects context from multiple sources (files, directories, URLs, nodes) into named variables for Agent template substitution.",
  version: "1.0.0",
  output_node: false,
  always_execute: true, // Content may change, always re-execute

  ui: {
    inputs: [], // No static inputs - all dynamic
    outputs: [
      {
        id: "output",
        label: "Variables",
        source_type: "context",
        data_type: "dict",
        required: true,
        multiple: false,
      },
    ],
    fields: [
      {
        id: "aggregationMode",
        label: "Aggregation",
        widget: "select",
        default: "pass",
        help_text:
          "How to combine inputs: Pass creates separate variables, Concatenate joins all into one",
        options: [
          { value: "pass", label: "Pass (each input → own variable)" },
          {
            value: "concatenate",
            label: "Concatenate (all → single variable)",
          },
        ],
      },
      {
        id: "outputVariableName",
        label: "Output Variable",
        widget: "text_input",
        default: "context",
        help_text:
          "Name of the output variable containing all concatenated content",
        show_if: { aggregationMode: "concatenate" },
      },
      {
        id: "separator",
        label: "Separator",
        widget: "text_input",
        default: "\\n\\n---",
        help_text: "Text inserted between each input. Use \\n for newlines",
        show_if: { aggregationMode: "concatenate" },
      },
      {
        id: "includeMetadata",
        label: "Metadata",
        widget: "checkbox",
        default: false,
        help_text: "Add source metadata (path, name, timestamps) to content",
      },
    ],
    color: "#10b981", // Emerald/green - matches context theme
    icon: "database",
    expandable: true,
    default_width: 320,
    default_height: 300,
    layout: "standard",
    theme_key: "context",
    collapsed_display: {
      format: "{name}",
      show_connections: true,
    },
    handle_layout: {
      output_position: "right",
    },

    // Enable dynamic inputs
    dynamic_inputs: true,
    dynamic_input_template: {
      source_type: "*",
      data_type: "str",
      accepted_sources: ["*"],
      accepted_types: ["str"],
      required: false,
      multiple: false,
      connection_only: true,
    },
  },
};
