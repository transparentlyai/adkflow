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
    fields: [], // Node-level settings handled by DynamicInputEditor
    color: "#10b981", // Emerald/green - matches context theme
    icon: "database",
    expandable: true,
    default_width: 380,
    default_height: 400,
    layout: "standard",
    theme_key: "context",
    resizable: true,
    min_width: 340,
    min_height: 300,
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
