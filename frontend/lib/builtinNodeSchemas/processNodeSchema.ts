import type { CustomNodeSchema } from "@/components/nodes/CustomNode";

/**
 * Schema definition for ProcessNode
 *
 * ProcessNode represents a data processing function in the workflow. It allows
 * writing Python code to transform data between other nodes. Features:
 * - Input handle for receiving data from upstream nodes
 * - Output handle for passing processed data downstream
 * - Embedded Monaco code editor with Python syntax highlighting
 * - Collapsed view shows function signature preview
 * - Expanded view provides full code editing
 *
 * No tabs - single code editor view with Python language.
 */
export const processNodeSchema: CustomNodeSchema = {
  unit_id: "builtin.process",
  label: "Process",
  menu_location: "Processing/Process",
  description:
    "A data processing node that transforms input data using Python code. Write custom processing logic for data transformation.",
  version: "1.0.0",
  output_node: false,
  always_execute: false,
  ui: {
    inputs: [
      {
        id: "input",
        label: "Input",
        source_type: "process",
        data_type: "any",
        required: false,
        multiple: true,
        connection_only: true,
      },
    ],
    outputs: [
      {
        id: "output",
        label: "Output",
        source_type: "process",
        data_type: "any",
        required: false,
        multiple: true,
      },
    ],
    fields: [
      {
        id: "description",
        label: "Description",
        widget: "textarea",
        default: "",
        placeholder: "Describe what this process does...",
        help_text: "A description of the processing logic",
        section: "General",
      },
      {
        id: "file_path",
        label: "File Path",
        widget: "file_picker",
        default: "",
        placeholder: "Select a Python file...",
        help_text: "Path to save/load the process code (.py)",
        section: "General",
      },
      {
        id: "code",
        label: "Code",
        widget: "code_editor",
        language: "python",
        default: `def process(
    data: str,
    options: dict = None,
) -> dict:
    """
    Process the input data and return the result.

    Args:
        data: The input data to process.
        options: Optional processing options.

    Returns:
        dict with 'status' key and processed result.
    """
    # Your processing logic here
    result = {"input": data, "options": options}

    return {"status": "success", "data": result}
`,
        help_text: "Python code for the processing function",
        section: "Code",
      },
    ],
    color: "#14b8a6", // Teal color for process nodes (matches theme.colors.nodes.process.header)
    icon: "code",
    expandable: true,
    default_width: 600,
    default_height: 400,
    // Pill body layout for process nodes - header + body with function signature
    // Input handle on left, output handle on right
    layout: "pill_body",
    theme_key: "process",
    resizable: true, // Enable resize for code editor
    min_width: 400,
    min_height: 250,
    collapsed_display: {
      format: "{name}",
    },
    collapsed_body: {
      show_function_signature: true,
      code_field: "code",
    },
    collapsed_width: 220,
    handle_layout: {
      input_position: "left",
      output_position: "right",
    },
  },
};

export default processNodeSchema;
