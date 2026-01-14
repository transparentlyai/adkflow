import type { CustomNodeSchema } from "@/components/nodes/CustomNode";
import { CALLBACK_HANDLE_CONFIGS } from "@/lib/types/handles";

/**
 * Schema definition for CallbackNode
 *
 * CallbackNode is a compact node that represents a user-defined callback
 * function in the workflow. Callbacks connect to Agent nodes to provide
 * custom lifecycle hooks (before_agent, after_agent, before_model, etc.)
 *
 * Features:
 * - Compact square layout (48x48px) similar to AgentToolNode
 * - Rounded corners (rounded-full via compact layout)
 * - Shows only icon and callback name (callback type selector hidden in compact view)
 * - Single output handle on right side of type 'callback'
 * - No expandable view
 * - Tooltip shows full name
 */
export const callbackNodeSchema: CustomNodeSchema = {
  unit_id: "builtin.callback",
  label: "Callback",
  menu_location: "Callbacks/Callback",
  description:
    "A callback function that hooks into agent lifecycle events. Connect to Agent nodes to execute custom code at specific points (before/after agent, model, or tool execution).",
  version: "1.0.0",
  output_node: false,
  always_execute: false,
  ui: {
    inputs: [],
    outputs: [
      {
        id: CALLBACK_HANDLE_CONFIGS.callbackOutput.id,
        label: CALLBACK_HANDLE_CONFIGS.callbackOutput.label,
        source_type: CALLBACK_HANDLE_CONFIGS.callbackOutput.source_type,
        data_type: CALLBACK_HANDLE_CONFIGS.callbackOutput.data_type,
        required: false,
        multiple: CALLBACK_HANDLE_CONFIGS.callbackOutput.multiple ?? true,
      },
    ],
    fields: [],
    color: "#a855f7", // Purple color for callback nodes (distinct from other node types)
    icon: "", // No icon - shows text instead in compact layout
    expandable: false,
    default_width: 48,
    default_height: 48,
    // Compact square layout for callback nodes (same as AgentToolNode)
    layout: "compact",
    theme_key: "callback",
    collapsed_display: {
      // Display format for compact view - shows callback name
      format: "Callback",
    },
    handle_layout: {
      output_position: "right",
    },
  },
};

export default callbackNodeSchema;
