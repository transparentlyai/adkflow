/**
 * Schema definition for StartNode
 *
 * A circular node that represents the workflow entry point.
 *
 * Features from old StartNode component:
 * - Circle layout (48px diameter, rounded-full)
 * - Play icon (shifts to Loader2 spinner when running)
 * - Click to run workflow (uses RunWorkflowContext)
 * - Green color theme (theme_key: "start")
 * - Output handle on right side
 * - Validation error pulse animation when has errors
 * - ValidationIndicator positioned above the circle
 * - Selection ring when selected
 */

import type { CustomNodeSchema } from "@/components/nodes/CustomNode";

export const startNodeSchema: CustomNodeSchema = {
  unit_id: "builtin.start",
  label: "Start",
  menu_location: "Flow Control/Start",
  description: "Entry point for workflow execution - click to run the workflow",
  version: "1.0.0",
  output_node: false,
  always_execute: true,
  ui: {
    inputs: [],
    outputs: [
      {
        id: "output",
        label: "Start",
        source_type: "flow",
        data_type: "trigger",
        required: false,
        multiple: true,
      },
    ],
    fields: [],
    color: "", // Uses theme colors from theme_key
    icon: "Play",
    expandable: false,
    default_width: 48,
    default_height: 48,
    // Circle layout for start node - click to run workflow
    layout: "circle",
    theme_key: "start",
    on_click: "run_workflow", // Click triggers workflow execution
    // Output handle on right
    handle_layout: {
      output_position: "right",
    },
  },
};

export default startNodeSchema;
