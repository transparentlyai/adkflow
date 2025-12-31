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
 * Tabs: ["General", "Execution", "Flow", "Schema", "Callbacks"]
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
        label: "Input (A2A)",
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
        label: "Instructions",
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
    ],
    // Tabs and fields are driven by the model schema
    tabs: baseModelSchema.tabs,
    fields: baseModelSchema.fields,
    color: "#0ea5e9", // Blue color for agent nodes (matches theme.colors.nodes.agent.header)
    icon: "monitor",
    expandable: true,
    default_width: 280,
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
          label: "Instructions",
        },
        {
          id: "tools-input",
          type: "target",
          position: "left",
          label: "Tools",
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
