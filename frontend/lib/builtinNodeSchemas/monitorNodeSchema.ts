import type { CustomNodeSchema } from "@/components/nodes/CustomNode";

/**
 * Schema definition for MonitorNode
 *
 * Monitor nodes capture and display runtime output from connected nodes.
 * They provide a read-only view of data flowing through the workflow.
 *
 * Features:
 * - Collapsed view: circle layout with "MON" label (like Input/Log Probe)
 * - Expanded view: read-only Monaco editor with syntax highlighting
 * - Single input accepting any serializable type
 * - Persists last captured value in config (survives session reload)
 * - Receives values via monitor_update SSE event during execution
 */
export const monitorNodeSchema: CustomNodeSchema = {
  unit_id: "builtin.monitor",
  label: "Monitor",
  menu_location: "Probes/Monitor",
  description:
    "Captures and displays runtime output from connected nodes. Shows values in a read-only editor with syntax highlighting.",
  version: "1.0.0",
  output_node: true, // Sink node - triggers execution trace
  always_execute: true, // Always capture, skip cache
  ui: {
    inputs: [
      {
        id: "input",
        label: "Input",
        source_type: "*",
        data_type: "any",
        accepted_sources: ["*"],
        accepted_types: ["str", "dict", "any"],
        required: false,
        multiple: false,
        connection_only: true,
      },
    ],
    outputs: [],
    fields: [
      {
        id: "name",
        label: "Name",
        widget: "text",
        default: "Monitor",
        placeholder: "Monitor name...",
        help_text: "Display name for this monitor",
      },
      {
        id: "monitoredValue",
        label: "Monitored Value",
        widget: "hidden",
        default: "",
        help_text: "Last captured value (stored for persistence)",
      },
      {
        id: "monitoredValueType",
        label: "Value Type",
        widget: "hidden",
        default: "plaintext",
        help_text: "Detected content type: json, markdown, or plaintext",
      },
      {
        id: "monitoredTimestamp",
        label: "Timestamp",
        widget: "hidden",
        default: "",
        help_text: "When the value was last captured",
      },
    ],
    color: "", // Uses theme colors from theme_key
    icon: "Eye",
    expandable: true,
    default_width: 400,
    default_height: 280,
    // Circle layout when collapsed, like Input/Log Probe
    layout: "circle",
    theme_key: "probe",
    // Handle on bottom for circle mode, in footer when expanded
    handle_layout: {
      input_position: "bottom",
      input_in_footer: true,
    },
    collapsed_display: {
      // "MON" label shown in circle
      format: "MON",
    },
  },
};

export default monitorNodeSchema;
