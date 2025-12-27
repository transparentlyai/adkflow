import type { CustomNodeSchema } from "@/components/nodes/CustomNode";

/**
 * Schema definition for ToolNode
 *
 * ToolNode represents a Python function that can be used as a tool by agents.
 * It features:
 * - An embedded code editor for writing Python tool functions
 * - File path binding for loading/saving tool code from/to disk
 * - Error behavior configuration
 * - Output handle that emits a callable for agent consumption
 *
 * Tabs: ["Code", "Config"]
 * - Code tab: code_editor widget for Python code
 * - Config tab: error_behavior select field
 */
export const toolNodeSchema: CustomNodeSchema = {
  unit_id: "builtin.tool",
  label: "Tool",
  menu_location: "Tools/Tool",
  description:
    "A Python function tool that can be used by agents. Write tool implementations with ToolContext support for state and session access.",
  version: "1.0.0",
  output_node: false,
  always_execute: false,
  ui: {
    inputs: [],
    outputs: [
      {
        id: "output",
        label: "Tool",
        source_type: "tool",
        data_type: "callable",
        required: false,
        multiple: true,
      },
    ],
    tabs: ["Code", "Config"],
    fields: [
      {
        id: "name",
        label: "Name",
        widget: "text",
        default: "my_tool",
        placeholder: "Tool function name",
        help_text:
          "The function name for this tool (should match the def name in code)",
        section: "General",
      },
      {
        id: "file_path",
        label: "File Path",
        widget: "file_picker",
        default: "",
        placeholder: "Select a Python file...",
        help_text: "Path to save/load the tool code (.py)",
        section: "General",
        tab: "Code",
      },
      {
        id: "code",
        label: "Code",
        widget: "code_editor",
        language: "python",
        default: `from google.adk.tools import ToolContext


def my_tool(
    query: str,
    limit: int = 10,
    tool_context: ToolContext = None,
) -> dict:
    """
    Brief description of what this tool does.

    Use this tool when the user wants to [describe use case].
    Do NOT use for [describe when not to use].

    Args:
        query: Description of what this parameter is for.
        limit: Maximum number of results. Defaults to 10.

    Returns:
        dict with 'status' key and result data.
    """
    # Your implementation here
    result = {"query": query, "limit": limit}

    return {"status": "success", "data": result}
`,
        help_text:
          "Python code for the tool function. Include ToolContext for state access.",
        section: "Code",
        tab: "Code",
      },
      {
        id: "error_behavior",
        label: "Error Handling",
        widget: "select",
        default: "fail_fast",
        options: [
          { value: "fail_fast", label: "Fail fast (terminate workflow)" },
          { value: "pass_to_model", label: "Pass error to model (let LLM handle)" },
        ],
        help_text: "How to handle errors during tool execution. 'Pass to model' returns errors as {'error': message} for the LLM to decide how to proceed. 'Fail fast' raises an exception and terminates the workflow immediately.",
        section: "Error Handling",
        tab: "Config",
      },
    ],
    color: "#f97316", // Orange color for tool nodes (matches theme.colors.nodes.tool.header)
    icon: "gear",
    expandable: true,
    default_width: 500,
    default_height: 320,
    // Pill layout for tool nodes - header only when collapsed, single output on right
    // Tabs: ["Code", "Config"]
    layout: "pill",
    theme_key: "tool",
    min_collapsed_width: 120, // Consistent minimum width for content nodes
    resizable: true, // Enable resize for code editor
    min_width: 300,
    min_height: 200,
    collapsed_display: {
      format: "{name}",
    },
    handle_layout: {
      output_position: "right",
    },
  },
};

export default toolNodeSchema;
