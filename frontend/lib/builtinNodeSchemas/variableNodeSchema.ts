/**
 * Schema definition for VariableNode
 *
 * A pill-shaped node that stores multiple key-value pairs.
 * - In collapsed state: Shows first variable key with optional +N count
 * - In expanded state: Shows KeyValueList widget for editing variables
 *
 * Two operational modes determined by connections:
 * - Connected mode: Emits variables to connected agents as context_vars
 * - Global mode: Unconnected nodes substitute {var} everywhere at build time
 */

import type { CustomNodeSchema } from "@/components/nodes/CustomNode";

export const variableNodeSchema: CustomNodeSchema = {
  unit_id: "builtin.variable",
  label: "Variables",
  menu_location: "Tools/Variables",
  description:
    "Store key-value pairs for agent context or global build-time substitution",
  version: "2.0.0",
  output_node: false,
  always_execute: false,
  ui: {
    inputs: [],
    outputs: [
      {
        id: "output",
        label: "Variables",
        source_type: "variable",
        data_type: "any",
        required: false,
        multiple: true,
      },
    ],
    fields: [
      {
        id: "name",
        label: "Name",
        widget: "text",
        default: "Variables",
        placeholder: "Enter node name...",
        help_text: "Display name for this node.",
      },
      {
        id: "variables",
        label: "Variables",
        widget: "keyValueList",
        default: [],
        help_text:
          "Key-value pairs. Connected: emitted to agents. Unconnected: global substitution.",
      },
    ],
    color: "",
    icon: "",
    expandable: true,
    default_width: 280,
    default_height: 200,
    // Pill layout for variable nodes - matches rounded-full style
    layout: "pill",
    theme_key: "variable",
    collapsed_display: {
      format: "{name}",
    },
  },
};

export default variableNodeSchema;
