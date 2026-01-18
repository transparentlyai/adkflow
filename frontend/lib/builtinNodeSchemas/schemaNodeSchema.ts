import type { CustomNodeSchema } from "@/components/nodes/CustomNode";

/**
 * Default code template for schema definitions.
 * Users define their Pydantic BaseModel classes here.
 */
const DEFAULT_SCHEMA_CODE = `from pydantic import BaseModel, Field

class MySchema(BaseModel):
    """
    Define your Pydantic BaseModel schema here.

    Connect this node to an Agent's input_schema or output_schema
    handle to validate agent input/output data.

    Example:
        class TaskInput(BaseModel):
            query: str = Field(description="The search query")
            max_results: int = Field(default=10)
    """
    # Your fields here
    pass
`;

/**
 * Schema definition for SchemaNode
 *
 * SchemaNode represents a Pydantic BaseModel schema definition for agent
 * input/output validation. It provides a code editor for writing schema
 * classes, similar to ToolNode and CallbackNode.
 *
 * Features:
 * - Pill layout matching ToolNode/CallbackNode style
 * - File path for loading/saving schema code
 * - Code editor with Python syntax highlighting
 * - Schema class name selector for BaseModel to use
 * - Single output handle on the right (schema:json type)
 *
 * Tabs: ["Code"]
 * - Code tab: file_path picker, code_editor, and schema_class name
 */
export const schemaNodeSchema: CustomNodeSchema = {
  unit_id: "builtin.schema",
  label: "Schema",
  menu_location: "Tools/Schema",
  description:
    "A Pydantic BaseModel schema for agent input/output validation. Connect to Agent schema inputs to enforce data structure.",
  version: "1.0.0",
  output_node: false,
  always_execute: false,
  ui: {
    inputs: [], // No inputs - this is a source node
    outputs: [
      {
        id: "output",
        label: "Schema",
        source_type: "schema",
        data_type: "json",
        required: false,
        multiple: true, // Can connect to multiple agents
      },
    ],
    tabs: ["Code"],
    fields: [
      {
        id: "file_path",
        label: "File Path",
        widget: "file_picker",
        default: "",
        placeholder: "Select a Python file...",
        help_text: "Path to save/load the schema code (.py)",
        tab: "Code",
      },
      {
        id: "code",
        label: "Code",
        widget: "code_editor",
        language: "python",
        default: DEFAULT_SCHEMA_CODE,
        help_text:
          "Python code defining a Pydantic BaseModel class for schema validation.",
        tab: "Code",
      },
      {
        id: "schema_class",
        label: "Schema Class",
        widget: "text",
        default: "MySchema",
        placeholder: "e.g., MySchema",
        help_text: "Name of the Pydantic BaseModel class to use for validation",
        tab: "Code",
      },
    ],
    color: "#06b6d4", // Cyan - distinct from callback purple, matches schema connections
    icon: "code",
    expandable: true,
    default_width: 500,
    default_height: 320,
    // Pill layout matching ToolNode/CallbackNode style
    layout: "pill",
    theme_key: "schema",
    min_collapsed_width: 120,
    resizable: true,
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

export default schemaNodeSchema;
