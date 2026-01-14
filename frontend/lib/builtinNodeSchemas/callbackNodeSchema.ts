import type { CustomNodeSchema } from "@/components/nodes/CustomNode";
import { CALLBACK_HANDLE_CONFIGS, CALLBACK_TYPES } from "@/lib/types/handles";

/**
 * Default code templates for each callback type.
 * These provide the correct function signatures based on the ADK callback system.
 */
const CALLBACK_CODE_TEMPLATES: Record<string, string> = {
  before_agent: `from typing import Optional
from google.genai import types

async def callback(
    callback_context,
) -> Optional[types.Content]:
    """
    Called before the agent starts execution.

    Args:
        callback_context: Context object with invocation info and state access.

    Returns:
        Optional Content to skip agent execution with a predefined response,
        or None to continue normal execution.
    """
    # Your implementation here
    return None
`,
  after_agent: `from typing import Optional
from google.genai import types

async def callback(
    callback_context,
) -> Optional[types.Content]:
    """
    Called after the agent completes execution.

    Args:
        callback_context: Context object with invocation info and state access.

    Returns:
        Optional Content to override the agent's response,
        or None to use the original response.
    """
    # Your implementation here
    return None
`,
  before_model: `from typing import Optional
from google.adk.agents.callback_context import CallbackContext
from google.adk.models import LlmRequest, LlmResponse

async def callback(
    callback_context: CallbackContext,
    llm_request: LlmRequest,
) -> Optional[LlmResponse]:
    """
    Called before the LLM model is invoked.

    Args:
        callback_context: Context object with invocation info and state access.
        llm_request: The request about to be sent to the LLM.

    Returns:
        Optional LlmResponse to skip the LLM call with a predefined response,
        or None to continue with the request.
    """
    # Your implementation here
    return None
`,
  after_model: `from google.adk.agents.callback_context import CallbackContext
from google.adk.models import LlmResponse

async def callback(
    callback_context: CallbackContext,
    llm_response: LlmResponse,
) -> LlmResponse:
    """
    Called after the LLM model returns a response.

    Args:
        callback_context: Context object with invocation info and state access.
        llm_response: The response received from the LLM.

    Returns:
        The LlmResponse to use (can be modified or returned as-is).
    """
    # Your implementation here
    return llm_response
`,
  before_tool: `from typing import Optional
from google.adk.tools import BaseTool, ToolContext

async def callback(
    tool: BaseTool,
    args: dict,
    tool_context: ToolContext,
) -> Optional[dict]:
    """
    Called before a tool is executed.

    Args:
        tool: The tool about to be executed.
        args: The arguments being passed to the tool.
        tool_context: Context object for tool execution.

    Returns:
        Optional dict to skip tool execution with a predefined result,
        or None to continue with execution.
    """
    # Your implementation here
    return None
`,
  after_tool: `from typing import Optional
from google.adk.tools import BaseTool, ToolContext

async def callback(
    tool: BaseTool,
    args: dict,
    tool_context: ToolContext,
    tool_response: dict,
) -> Optional[dict]:
    """
    Called after a tool completes execution.

    Args:
        tool: The tool that was executed.
        args: The arguments that were passed to the tool.
        tool_context: Context object for tool execution.
        tool_response: The response from the tool.

    Returns:
        Optional dict to override the tool's response,
        or None to use the original response.
    """
    # Your implementation here
    return tool_response
`,
};

/**
 * Schema definition for CallbackNode
 *
 * CallbackNode represents a user-defined callback function in the workflow.
 * Callbacks connect to Agent nodes to provide custom lifecycle hooks
 * (before_agent, after_agent, before_model, after_model, before_tool, after_tool).
 *
 * Features:
 * - Pill body layout with function signature preview when collapsed
 * - Double-click to expand and edit code in Monaco editor
 * - Callback type selector in expanded view (Config tab)
 * - Code editor with pre-populated function signature based on callback_type
 * - Single output handle on right side of type 'callback'
 *
 * Tabs: ["Config", "Code"]
 * - Config tab: callback_type selector
 * - Code tab: Monaco code editor with Python syntax
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
    tabs: ["Config", "Code"],
    fields: [
      {
        id: "callback_type",
        label: "Callback Type",
        widget: "select",
        default: "before_agent",
        options: CALLBACK_TYPES.map((type) => ({
          value: type,
          label: type.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        })),
        help_text:
          "When this callback is invoked in the agent lifecycle. Changing this will update the code template.",
        tab: "Config",
      },
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
        default: CALLBACK_CODE_TEMPLATES.before_agent,
        help_text:
          "Python code for the callback function. The signature depends on the callback type.",
        tab: "Code",
      },
    ],
    color: "#a855f7", // Purple color for callback nodes (distinct from other node types)
    icon: "callback",
    expandable: true,
    default_width: 500,
    default_height: 320,
    // Pill body layout for callback nodes - header + body with function signature
    layout: "pill_body",
    theme_key: "callback",
    min_collapsed_width: 120,
    resizable: true,
    min_width: 300,
    min_height: 200,
    collapsed_display: {
      format: "{name}",
    },
    collapsed_body: {
      show_function_signature: true,
      code_field: "code",
    },
    collapsed_width: 180,
    handle_layout: {
      output_position: "right",
    },
  },
};

/** Code templates for each callback type, exported for use in dynamic code generation */
export { CALLBACK_CODE_TEMPLATES };

export default callbackNodeSchema;
