import type { CustomNodeSchema } from "@/components/nodes/CustomNode";

/**
 * Default code template for callback functions.
 * Users write their callback logic here and connect to the appropriate
 * callback handle on an Agent node to determine the callback type.
 */
const DEFAULT_CALLBACK_CODE = `async def callback(*args, **kwargs):
    """
    Callback function for agent lifecycle hooks.

    Connect this node to an Agent's callback input handle
    (before_agent, after_agent, before_model, after_model,
    before_tool, or after_tool) to define when it runs.

    The function signature depends on the callback type:
    - Agent callbacks: (callback_context) -> Optional[Content]
    - Model callbacks: (callback_context, llm_request/response) -> Optional[LlmResponse]
    - Tool callbacks: (tool, args, tool_context, [tool_response]) -> Optional[dict]
    """
    # Your implementation here
    return None
`;

/**
 * Schema definition for CallbackNode
 *
 * CallbackNode represents a user-defined callback function in the workflow.
 * It provides a code editor for writing callback logic, similar to ToolNode.
 *
 * The callback type is determined by which Agent callback output
 * connects to this node's input handle.
 *
 * Features:
 * - Pill layout matching ToolNode style
 * - File path for loading/saving callback code
 * - Code editor with Python syntax highlighting
 * - Single input handle on the left (visible in expanded and collapsed states)
 *
 * Tabs: ["Code"]
 * - Code tab: file_path picker and code_editor widget
 */
export const callbackNodeSchema: CustomNodeSchema = {
  unit_id: "builtin.callback",
  label: "Callback",
  menu_location: "Callbacks/Callback",
  description:
    "A callback function that hooks into agent lifecycle events. Connect to Agent callback inputs to execute custom code at specific points.",
  version: "1.0.0",
  output_node: false,
  always_execute: false,
  ui: {
    inputs: [
      {
        id: "input",
        label: "Callback",
        source_type: "callback",
        data_type: "callable",
        accepted_sources: ["callback"],
        accepted_types: ["callable"],
        required: false,
        multiple: false,
        connection_only: true,
        tab: "Code",
      },
    ],
    outputs: [],
    tabs: ["Code"],
    fields: [
      {
        id: "file_path",
        label: "File Path",
        widget: "file_picker",
        default: "",
        placeholder: "Select a Python file...",
        help_text: "Path to save/load the callback code (.py)",
        tab: "Code",
      },
      {
        id: "code",
        label: "Code",
        widget: "code_editor",
        language: "python",
        default: DEFAULT_CALLBACK_CODE,
        help_text:
          "Python code for the callback function. Connect to an Agent's callback handle to determine when it runs.",
        tab: "Code",
      },
    ],
    color: "#a855f7", // Purple color for callback nodes
    icon: "callback",
    expandable: true,
    default_width: 500,
    default_height: 320,
    // Pill layout matching ToolNode style
    layout: "pill",
    theme_key: "callback",
    min_collapsed_width: 120,
    resizable: true,
    min_width: 300,
    min_height: 200,
    collapsed_display: {
      format: "{name}",
    },
    handle_layout: {
      input_position: "left",
    },
  },
};

export default callbackNodeSchema;
