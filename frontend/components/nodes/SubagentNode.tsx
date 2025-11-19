/**
 * SubagentNode Component
 *
 * Returns HTML string template for Subagent nodes in Drawflow
 */

import type { Subagent } from "@/lib/types";

export interface SubagentNodeProps {
  subagent: Subagent;
}

/**
 * Generate HTML template for Subagent node
 * This returns a string that Drawflow will render as the node content
 */
export function getSubagentNodeHTML(subagent: Subagent): string {
  const modelDisplay = subagent.model || "No model";
  const toolsCount = subagent.tools?.length || 0;

  return `
    <div class="subagent-node">
      <div class="node-header bg-purple-600">
        <div class="node-title">${subagent.name}</div>
        <div class="node-subtitle">Subagent</div>
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
        ${subagent.system_prompt ? `
          <div class="node-field">
            <span class="field-label">System Prompt:</span>
            <div class="field-description truncate">${subagent.system_prompt.substring(0, 50)}${subagent.system_prompt.length > 50 ? '...' : ''}</div>
          </div>
        ` : ''}
        ${subagent.description ? `
          <div class="node-field">
            <span class="field-label">Description:</span>
            <div class="field-description">${subagent.description}</div>
          </div>
        ` : ''}
      </div>
      <div class="node-id">ID: ${subagent.id}</div>
    </div>
  `;
}

/**
 * Get default Subagent data for new nodes
 */
export function getDefaultSubagentData(): Partial<Subagent> {
  return {
    name: "New Subagent",
    model: "gemini-2.0-flash-exp",
    tools: [],
    system_prompt: "",
    description: "",
  };
}
