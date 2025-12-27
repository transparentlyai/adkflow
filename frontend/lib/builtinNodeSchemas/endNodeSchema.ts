/**
 * Schema definition for EndNode
 *
 * An octagonal node that represents the workflow termination point.
 *
 * Features from old EndNode component:
 * - Octagon layout (48px, SVG polygon with corner cut = size * 0.29)
 * - Square icon in center
 * - Red color theme (theme_key: "end")
 * - Input handle on left side
 * - Selection ring using stroke on polygon
 * - Sink node (output_node: true) - triggers execution trace
 *
 * Octagon points formula (size=48, cut=size*0.29):
 * `${cut},0 ${size-cut},0 ${size},${cut} ${size},${size-cut} ${size-cut},${size} ${cut},${size} 0,${size-cut} 0,${cut}`
 */

import type { CustomNodeSchema } from "@/components/nodes/CustomNode";

export const endNodeSchema: CustomNodeSchema = {
  unit_id: "builtin.end",
  label: "End",
  menu_location: "Flow Control/End",
  description: "Termination point for workflow execution",
  version: "1.0.0",
  output_node: true, // Sink node - triggers execution trace
  always_execute: false,
  ui: {
    inputs: [
      {
        id: "input",
        label: "End",
        source_type: "any",
        data_type: "any",
        accepted_sources: ["*"],
        accepted_types: ["str", "dict", "any"],
        required: false,
        multiple: true,
        connection_only: true,
      },
    ],
    outputs: [],
    fields: [],
    color: "", // Uses theme colors from theme_key
    icon: "Square",
    expandable: false,
    default_width: 48,
    default_height: 48,
    // Octagon layout for end node - matches old EndNode with SVG polygon
    layout: "octagon",
    theme_key: "end",
    // Input handle on left
    handle_layout: {
      input_position: "left",
    },
  },
};

export default endNodeSchema;
