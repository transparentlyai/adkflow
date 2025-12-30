/**
 * Schema definition for TeleportOutNode
 *
 * A tag/arrow-shaped connector node that sends data to TeleportInNodes
 * with matching names. Enables wireless connections across tabs/flows.
 *
 * Features from old TeleportOutNode component:
 * - Tag shape with arrow pointing RIGHT (input on left side)
 * - Uses TeleporterContext for dynamic colors based on connector name
 * - Shows connection count badge (number of matching inputs)
 * - Double-click opens a panel to rename or link to existing connectors
 * - Tooltip shows connected inputs with navigation links
 * - Name displayed inside the tag shape
 * - Lock icon when locked
 * - Expand/collapse chevron indicator
 */

import type { CustomNodeSchema } from "@/components/nodes/CustomNode";

export const teleportOutNodeSchema: CustomNodeSchema = {
  unit_id: "builtin.teleportOut",
  label: "Output Connector",
  menu_location: "Connectors/Output Connector",
  description:
    "Sends data to Input Connectors with the same name - enables wireless connections across tabs",
  version: "1.0.0",
  output_node: false,
  always_execute: false,
  ui: {
    inputs: [
      {
        id: "input",
        label: "Input",
        source_type: "any",
        data_type: "any",
        accepted_sources: ["*"],
        accepted_types: ["*"],
        required: false,
        multiple: false,
        connection_only: true,
      },
    ],
    outputs: [],
    fields: [
      {
        id: "name",
        label: "Connector Name",
        widget: "text",
        default: "Connector",
        placeholder: "Connector name",
        help_text:
          "Name must match an Input Connector to establish a connection",
      },
    ],
    color: "", // Uses dynamic color from TeleporterContext based on name
    icon: "ArrowRightFromLine",
    expandable: true,
    default_width: 90, // Match TeleportNodeShape WIDTH
    default_height: 24, // Match TeleportNodeShape HEIGHT
    // Tag layout for teleport nodes - arrow shape pointing right, input on left
    layout: "tag",
    theme_key: "teleportOut",
    // Input handle on left (arrow points right)
    handle_layout: {
      input_position: "left",
    },
    collapsed_display: {
      format: "{name}",
    },
  },
};

export default teleportOutNodeSchema;
