/**
 * Schema definition for VariableNode
 *
 * A simple pill-shaped node that stores a name-value pair.
 * Double-click opens a dialog to edit the variable name and value.
 * Has no inputs, just a single output that emits the variable value.
 *
 * Features from old component:
 * - Pill/rounded-full layout with px-4 py-2
 * - Display format: {name} (with curly braces)
 * - Shows tooltip with the value
 * - Double-click opens edit dialog with name = value inputs
 * - Lock icon when locked
 * - ValidationIndicator for errors/warnings
 */

import type { CustomNodeSchema } from "@/components/nodes/CustomNode";

export const variableNodeSchema: CustomNodeSchema = {
  unit_id: "builtin.variable",
  label: "Variable",
  menu_location: "Tools/Variable",
  description: "A named variable that stores a value for use in the workflow",
  version: "1.0.0",
  output_node: false,
  always_execute: false,
  ui: {
    inputs: [],
    outputs: [
      {
        id: "output",
        label: "Value",
        source_type: "variable",
        data_type: "any",
        required: false,
        multiple: true,
      },
    ],
    fields: [
      {
        id: "value",
        label: "Value",
        widget: "text",
        default: "",
        placeholder: "Variable value",
        help_text: "Value shown in tooltip",
      },
    ],
    color: "",
    icon: "",
    expandable: false,
    default_width: 120,
    default_height: 40,
    // Pill layout for variable nodes - matches rounded-full style
    layout: "pill",
    theme_key: "variable",
    collapsed_display: {
      // VariableNode displays {name} with literal curly braces
      // This is handled specially in PillLayout for unit_id === "builtin.variable"
      show_with_braces: true,
    },
  },
};

export default variableNodeSchema;
