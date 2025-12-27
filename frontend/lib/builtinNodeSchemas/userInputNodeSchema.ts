import type { CustomNodeSchema } from "@/components/nodes/CustomNode";

/**
 * Schema definition for the UserInputNode.
 *
 * UserInputNode pauses workflow execution to collect user input. It has:
 * - An input handle that receives context/trigger from upstream nodes
 * - An output handle that emits the user-provided string
 * - Configuration for timeout behavior and fallback options
 * - Variable name derived from node name (e.g., "Review Step" -> {review_step_input})
 *
 * Features from old component:
 * - Contracted view: compact bar with Send icon, name, expand button
 * - Expanded view: full configuration panel
 * - Variable name display with copy button (derived from name)
 * - Timeout setting (number input, seconds, 0 = no timeout)
 * - Timeout behavior (radio buttons): error, pass_through, predefined_text
 * - Predefined text textarea (shown when timeout behavior is predefined_text)
 * - Pulse animation when isWaitingForInput is true
 * - Input handle on left, output handle on right
 * - Resizable when expanded
 */
export const userInputNodeSchema: CustomNodeSchema = {
  unit_id: "builtin.userInput",
  label: "User Input",
  menu_location: "Interaction/User Input",
  description:
    "Pauses workflow execution to collect input from the user. Supports timeout configuration with customizable fallback behavior.",
  version: "1.0.0",
  output_node: false,
  always_execute: true, // User input should always execute to capture fresh input
  ui: {
    inputs: [
      {
        id: "input",
        label: "Trigger",
        source_type: "*",
        data_type: "any",
        required: false,
        multiple: false,
        connection_only: true,
      },
    ],
    outputs: [
      {
        id: "output",
        label: "User Response",
        source_type: "user_input",
        data_type: "str",
        required: false,
        multiple: true,
      },
    ],
    fields: [
      {
        id: "name",
        label: "Name",
        widget: "text",
        default: "User Input",
        placeholder: "Enter node name...",
        help_text:
          "Node name. Used to derive the variable name (e.g., 'Review Step' -> {review_step_input})",
      },
      {
        id: "timeout",
        label: "Timeout (seconds)",
        widget: "number",
        default: 300,
        min_value: 0,
        step: 1,
        help_text: "Time to wait for user input. 0 = no timeout (wait indefinitely).",
      },
      {
        id: "timeoutBehavior",
        label: "On Timeout",
        widget: "radio",
        default: "error",
        options: [
          { value: "error", label: "Throw error" },
          { value: "pass_through", label: "Pass through (use previous input)" },
          { value: "predefined_text", label: "Use predefined text" },
        ],
        help_text: "Action to take when the timeout is reached.",
      },
      {
        id: "predefinedText",
        label: "Predefined Text",
        widget: "textarea",
        default: "",
        placeholder: "Default response on timeout...",
        help_text: "Text to use when timeout behavior is set to 'predefined_text'.",
        show_if: { timeoutBehavior: "predefined_text" },
      },
    ],
    color: "#22c55e", // Green color matching theme.colors.nodes.userInput.header
    icon: "Send",
    expandable: true,
    default_width: 280,
    default_height: 200,
    // Pill layout for user input nodes - compact header bar when collapsed
    // Input on left, output on right, expandable
    layout: "pill",
    theme_key: "userInput",
    collapsed_display: {
      format: "{name}",
    },
    handle_layout: {
      input_position: "left",
      output_position: "right",
    },
  },
};

export default userInputNodeSchema;
