/**
 * Schema definition for TeleportInNode
 *
 * A tag/arrow-shaped connector node that receives data from TeleportOutNodes
 * with matching names. Enables wireless connections across tabs/flows.
 *
 * Features from old TeleportInNode component:
 * - Tag shape with arrow pointing LEFT (output on right side)
 * - Uses TeleporterContext for dynamic colors based on connector name
 * - Shows connection count badge (number of matching outputs)
 * - Double-click opens a panel to rename or link to existing connectors
 * - Tooltip shows connected outputs with navigation links
 * - Name displayed inside the tag shape
 * - Lock icon when locked
 * - Expand/collapse chevron indicator
 */

import type { CustomNodeSchema } from "@/components/nodes/CustomNode";

export const teleportInNodeSchema: CustomNodeSchema = {
  unit_id: "builtin.teleportIn",
  label: "Input Connector",
  menu_location: "Connectors/Input Connector",
  description:
    "Receives data from Output Connectors with the same name - enables wireless connections across tabs",
  version: "1.0.0",
  output_node: false,
  always_execute: false,
  ui: {
    inputs: [],
    outputs: [
      {
        id: "output",
        label: "Output",
        source_type: "teleport",
        data_type: "any",
        required: false,
        multiple: true,
      },
    ],
    fields: [
      {
        id: "name",
        label: "Connector Name",
        widget: "text",
        default: "Connector",
        placeholder: "Connector name",
        help_text:
          "Name must match an Output Connector to establish a connection",
      },
    ],
    color: "", // Uses dynamic color from TeleporterContext based on name
    icon: "ArrowLeftToLine",
    expandable: true,
    default_width: 90, // Match TeleportNodeShape WIDTH
    default_height: 24, // Match TeleportNodeShape HEIGHT
    // Tag layout for teleport nodes - arrow shape pointing left, output on right
    layout: "tag",
    theme_key: "teleportIn",
    // Output handle on right (arrow points left)
    handle_layout: {
      output_position: "right",
    },
    collapsed_display: {
      format: "{name}",
    },
  },
};

export default teleportInNodeSchema;
