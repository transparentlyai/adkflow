/**
 * AgentNode Component
 *
 * Returns HTML string template for Agent nodes in Drawflow
 */

import type { Agent } from "@/lib/types";

export interface AgentNodeProps {
  agent: Agent;
}

/**
 * Generate HTML template for Agent node
 * This returns a string that Drawflow will render as the node content
 */
export function getAgentNodeHTML(agent: Agent): string {
  const modelDisplay = agent.model || "No model";
  const toolsCount = agent.tools?.length || 0;
  const subagentsCount = agent.subagents?.length || 0;

  return `
    <div class="agent-node">
      <div class="node-header bg-blue-600">
        <div class="node-title">${agent.name}</div>
        <div class="node-subtitle">Agent</div>
      </div>
      <div class="node-body">
        <div class="node-field">
          <span class="field-label">Model:</span>
          <span class="field-value">${modelDisplay}</span>
        </div>
        ${toolsCount > 0 ? `
          <div class="node-field">
            <span class="field-label">Tools:</span>
            <span class="field-value">${toolsCount} tool${toolsCount !== 1 ? 's' : ''}</span>
          </div>
        ` : ''}
        ${subagentsCount > 0 ? `
          <div class="node-field">
            <span class="field-label">Subagents:</span>
            <span class="field-value">${subagentsCount} subagent${subagentsCount !== 1 ? 's' : ''}</span>
          </div>
        ` : ''}
        ${agent.description ? `
          <div class="node-field">
            <span class="field-label">Description:</span>
            <div class="field-description">${agent.description}</div>
          </div>
        ` : ''}
      </div>
      <div class="node-id">ID: ${agent.id}</div>
    </div>
  `;
}

/**
 * Get default Agent data for new nodes
 */
export function getDefaultAgentData(): Partial<Agent> {
  return {
    name: "New Agent",
    model: "gemini-2.0-flash-exp",
    tools: [],
    subagents: [],
    system_prompt: "",
    description: "",
  };
}
