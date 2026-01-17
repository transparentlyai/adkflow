import type { CustomNodeSchema } from "@/components/nodes/CustomNode";
import { getModelSchema, getModelTabs } from "@/lib/constants/modelSchemas";
import { DEFAULT_MODEL } from "@/lib/constants/models";

/**
 * Schema definition for AgentNode
 *
 * AgentNode represents an LLM AI agent in the workflow. It connects to prompts,
 * tools, and sub-agents. Features include:
 * - Multiple input types: prompts, tools, sub-agents, and link connections
 * - Model configuration with temperature, planner, and HTTP options
 * - Link handles for chaining agents in parallel execution
 * - Expandable properties panel for detailed configuration
 *
 * NOTE: All agents are LLM agents - no type selection needed.
 *
 * Fields are defined in modelSchemas.ts and driven by the selected model.
 * Tabs: ["General", "Execution", "Generation", "Flow", "Callbacks"]
 */

// Get base schema from default model
const baseModelSchema = getModelSchema(DEFAULT_MODEL);

export const agentNodeSchema: CustomNodeSchema = {
  unit_id: "builtin.agent",
  label: "Agent",
  menu_location: "Agents/Agent",
  description:
    "An LLM AI agent that can process prompts, use tools, and coordinate with sub-agents.",
  version: "1.0.0",
  output_node: false,
  always_execute: false,
  ui: {
    inputs: [
      // Main input handle (visible, draggable)
      {
        id: "input",
        label: "Input",
        source_type: "agent",
        data_type: "dict",
        accepted_sources: [
          "agent",
          "prompt",
          "tool",
          "agent_tool",
          "context",
          "flow",
        ],
        accepted_types: ["dict", "link", "str", "callable", "trigger"],
        required: false,
        multiple: true,
        connection_only: true,
        section: "Main",
      },
      // Hidden typed handles (for specific connection types)
      {
        id: "agent-input",
        label: "Input (Agent)",
        source_type: "agent",
        data_type: "dict",
        accepted_sources: ["agent", "flow"],
        accepted_types: ["dict", "trigger"],
        required: false,
        multiple: true,
        connection_only: true,
        icon: "monitor",
        section: "Inputs",
        tab: "General",
      },
      {
        id: "prompt-input",
        label: "Prompt",
        source_type: "prompt",
        data_type: "str",
        accepted_sources: ["prompt", "context"],
        accepted_types: ["str"],
        required: false,
        multiple: false,
        connection_only: true,
        icon: "document",
        section: "Inputs",
        tab: "General",
      },
      {
        id: "tools-input",
        label: "Tools",
        source_type: "tool",
        data_type: "callable",
        accepted_sources: ["tool", "agent_tool"],
        accepted_types: ["callable"],
        required: false,
        multiple: true,
        connection_only: true,
        icon: "gear",
        section: "Inputs",
        tab: "General",
      },
      {
        id: "context-input",
        label: "Context",
        source_type: "*",
        data_type: "dict",
        accepted_sources: ["*"],
        accepted_types: ["dict"],
        required: false,
        multiple: true,
        connection_only: true,
        icon: "database",
        section: "Inputs",
        tab: "General",
      },
      // Link handle (top) for agent chaining - input from other agents
      {
        id: "link-top",
        label: "Link In",
        source_type: "agent",
        data_type: "link",
        accepted_sources: ["agent"],
        accepted_types: ["link"],
        required: false,
        multiple: true,
        connection_only: true,
        section: "Flow",
      },
      // Sub-Agents input - receives agents to be adopted as sub-agents
      {
        id: "sub-agents",
        label: "Sub-Agents",
        source_type: "agent",
        data_type: "adopt",
        accepted_sources: ["agent"],
        accepted_types: ["adopt"],
        required: false,
        multiple: true,
        connection_only: true,
        icon: "users",
        handle_color: "#a78bfa", // Purple - distinct color for adoption
        section: "Inputs",
        tab: "General",
      },
      // Callback handles - rendered as source handles (outputs) but with input-style inline rendering
      // These connect TO CallbackNodes, so they are sources. But they render with file picker widgets.
      {
        id: "before_agent_callback",
        label: "Before Agent Callback",
        source_type: "callback",
        data_type: "callable",
        required: false,
        multiple: false,
        connection_only: false, // Show file picker widget
        handleType: "source", // Renders as output handle
        widget: "file_picker",
        placeholder: "e.g., callbacks/setup.py",
        handle_color: "#a855f7", // Purple - callback color
        section: "Agent Callbacks",
        tab: "Callbacks",
      },
      {
        id: "after_agent_callback",
        label: "After Agent Callback",
        source_type: "callback",
        data_type: "callable",
        required: false,
        multiple: false,
        connection_only: false,
        handleType: "source",
        widget: "file_picker",
        placeholder: "e.g., callbacks/cleanup.py",
        handle_color: "#a855f7",
        section: "Agent Callbacks",
        tab: "Callbacks",
      },
      {
        id: "before_model_callback",
        label: "Before Model Callback",
        source_type: "callback",
        data_type: "callable",
        required: false,
        multiple: false,
        connection_only: false,
        handleType: "source",
        widget: "file_picker",
        placeholder: "e.g., callbacks/guardrails.py",
        handle_color: "#a855f7",
        section: "Model Callbacks",
        tab: "Callbacks",
      },
      {
        id: "after_model_callback",
        label: "After Model Callback",
        source_type: "callback",
        data_type: "callable",
        required: false,
        multiple: false,
        connection_only: false,
        handleType: "source",
        widget: "file_picker",
        placeholder: "e.g., callbacks/logging.py",
        handle_color: "#a855f7",
        section: "Model Callbacks",
        tab: "Callbacks",
      },
      {
        id: "before_tool_callback",
        label: "Before Tool Callback",
        source_type: "callback",
        data_type: "callable",
        required: false,
        multiple: false,
        connection_only: false,
        handleType: "source",
        widget: "file_picker",
        placeholder: "e.g., callbacks/validation.py",
        handle_color: "#a855f7",
        section: "Tool Callbacks",
        tab: "Callbacks",
      },
      {
        id: "after_tool_callback",
        label: "After Tool Callback",
        source_type: "callback",
        data_type: "callable",
        required: false,
        multiple: false,
        connection_only: false,
        handleType: "source",
        widget: "file_picker",
        placeholder: "e.g., callbacks/artifact_save.py",
        handle_color: "#a855f7",
        section: "Tool Callbacks",
        tab: "Callbacks",
      },
    ],
    outputs: [
      {
        id: "output",
        label: "Output",
        source_type: "agent",
        data_type: "dict",
        required: false,
        multiple: true,
      },
      {
        id: "link-bottom",
        label: "Link Out",
        source_type: "agent",
        data_type: "link",
        required: false,
        multiple: true,
      },
      // Plug output - allows this agent to be adopted as a sub-agent
      {
        id: "plug",
        label: "Plug",
        source_type: "agent",
        data_type: "adopt",
        required: false,
        multiple: true,
        handle_color: "#a78bfa", // Purple - matches sub-agents input
      },
      // Finish reason output - returns {name, description} dict
      {
        id: "finish-reason",
        label: "Finish Reason",
        source_type: "agent",
        data_type: "dict",
        required: false,
        multiple: true,
        handle_color: "#f59e0b", // Amber - warning/status color
      },
    ],
    // Tabs and fields are driven by the model schema
    tabs: baseModelSchema.tabs,
    fields: baseModelSchema.fields,
    color: "#0ea5e9", // Blue color for agent nodes (matches theme.colors.nodes.agent.header)
    icon: "monitor",
    expandable: true,
    default_width: 350,
    min_width: 350,
    default_height: 500,
    // Panel layout for agent nodes with chaining handles
    layout: "panel",
    theme_key: "agent",
    // Collapsed display - no format template (Agent doesn't use format template)
    collapsed_display: {
      summary_fields: ["model"],
      show_connections: true, // Shows connected prompt, tools, agents
    },
    // Collapsed footer shows just "Agent" text - no type badge since all are LLM
    collapsed_footer: {
      left_text: "Agent",
    },
    // Handle layout matches OLD AgentNode exactly:
    // - Main input handle on left (visible, draggable)
    // - Main output handle on right (visible, draggable)
    // - Link-top handle on top (source, for agent chaining)
    // - Link-bottom handle on bottom (target, for agent chaining)
    // - Hidden handles: agent-input, prompt-input, tools-input (for typed connections)
    handle_layout: {
      input_position: "left",
      output_position: "right",
      additional_handles: [
        {
          id: "link-top",
          type: "target",
          position: "top",
          label: "Chain with other agents",
        },
        {
          id: "link-bottom",
          type: "source",
          position: "bottom",
          label: "Chain with other agents",
        },
        // Hidden handles for typed edges (not visible, used for connection routing)
        {
          id: "agent-input",
          type: "target",
          position: "left",
          label: "Sub-Agents",
        },
        {
          id: "prompt-input",
          type: "target",
          position: "left",
          label: "Prompt",
        },
        {
          id: "tools-input",
          type: "target",
          position: "left",
          label: "Tools",
        },
        {
          id: "context-input",
          type: "target",
          position: "left",
          label: "Context Variables",
        },
        // Sub-Agents input on RIGHT (unconventional: input receives children)
        {
          id: "sub-agents",
          type: "target",
          position: "right",
          label: "Receive sub-agents",
        },
        // Plug output on LEFT (unconventional: output plugs into parent)
        {
          id: "plug",
          type: "source",
          position: "left",
          label: "Plug into parent agent",
        },
        // NOTE: "finish-reason" is NOT in additional_handles because it's a regular
        // right-side output handle. additional_handles are for edge-positioned handles
        // (top/bottom) or unconventional positions (like plug on left).
        // Callback output handles - emit callback triggers to connected CallbackNodes
        {
          id: "before_agent_callback",
          type: "source",
          position: "right",
          label: "Before Agent Callback",
        },
        {
          id: "after_agent_callback",
          type: "source",
          position: "right",
          label: "After Agent Callback",
        },
        {
          id: "before_model_callback",
          type: "source",
          position: "right",
          label: "Before Model Callback",
        },
        {
          id: "after_model_callback",
          type: "source",
          position: "right",
          label: "After Model Callback",
        },
        {
          id: "before_tool_callback",
          type: "source",
          position: "right",
          label: "Before Tool Callback",
        },
        {
          id: "after_tool_callback",
          type: "source",
          position: "right",
          label: "After Tool Callback",
        },
      ],
    },
  },
};

/**
 * Get an Agent Node schema with fields for a specific model.
 *
 * Use this when you need a schema configured for a particular model,
 * such as when restoring a saved workflow or switching models.
 *
 * @param modelId - The model identifier (e.g., "gemini-2.5-flash")
 * @returns CustomNodeSchema with model-specific fields
 */
export function getAgentNodeSchemaForModel(modelId: string): CustomNodeSchema {
  const modelSchema = getModelSchema(modelId);

  return {
    ...agentNodeSchema,
    ui: {
      ...agentNodeSchema.ui,
      tabs: modelSchema.tabs,
      fields: modelSchema.fields,
    },
  };
}

export default agentNodeSchema;
