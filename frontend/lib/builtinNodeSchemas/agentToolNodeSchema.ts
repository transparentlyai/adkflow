import type { CustomNodeSchema } from "@/components/nodes/CustomNode";

/**
 * Schema definition for AgentToolNode
 *
 * AgentToolNode is a compact node that wraps an agent as a tool that can be
 * used by other agents. It provides a callable interface for agent-to-agent
 * delegation.
 *
 * Features from old component:
 * - Compact square layout (w-12 h-12 = 48x48px)
 * - Rounded corners (rounded-lg)
 * - Shows "Agent" on first line, "Tool" on second line (no icon)
 * - Lock icon when locked (replaces text)
 * - ValidationIndicator for errors/warnings
 * - Double-click opens rename dialog
 * - Single output handle on right side
 * - No expandable view
 * - Tooltip shows name
 */
export const agentToolNodeSchema: CustomNodeSchema = {
  unit_id: "builtin.agentTool",
  label: "Agent Tool",
  menu_location: "Tools/Agent Tool",
  description:
    "Wraps an agent as a callable tool for use by other agents. Enables agent-to-agent delegation and orchestration.",
  version: "1.0.0",
  output_node: false,
  always_execute: false,
  ui: {
    inputs: [],
    outputs: [
      {
        id: "output",
        label: "Tool",
        source_type: "agent_tool",
        data_type: "callable",
        required: false,
        multiple: true,
      },
    ],
    fields: [],
    color: "#ec4899", // Pink color for agent tool nodes (matches theme.colors.nodes.agentTool.header)
    icon: "", // No icon - shows "Agent\nTool" text instead
    expandable: false,
    default_width: 48,
    default_height: 48,
    // Compact square layout for agent tool nodes (rounded-lg, not pill)
    layout: "compact",
    theme_key: "agentTool",
    collapsed_display: {
      // Two-line text display: "Agent" on top, "Tool" on bottom
      format: "Agent\nTool",
    },
    handle_layout: {
      output_position: "right",
    },
  },
};

export default agentToolNodeSchema;
