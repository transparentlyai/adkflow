/**
 * PromptNode Component
 *
 * Returns HTML string template for Prompt nodes in Drawflow
 */

import type { Prompt } from "@/lib/types";

export interface PromptNodeProps {
  prompt: Prompt;
}

/**
 * Generate HTML template for Prompt node
 * This returns a string that Drawflow will render as the node content
 */
export function getPromptNodeHTML(prompt: Prompt): string {
  const textPreview = prompt.text
    ? prompt.text.substring(0, 100) + (prompt.text.length > 100 ? "..." : "")
    : "Empty prompt";

  const hasText = prompt.text && prompt.text.trim().length > 0;

  return `
    <div class="prompt-node">
      <div class="node-header bg-green-600">
        <div class="node-title">Prompt</div>
        <div class="node-subtitle">${hasText ? 'Has content' : 'Empty'}</div>
      </div>
      <div class="node-body">
        <div class="node-field">
          <span class="field-label">Preview:</span>
          <div class="field-description text-sm">${textPreview}</div>
        </div>
        ${prompt.description ? `
          <div class="node-field">
            <span class="field-label">Description:</span>
            <div class="field-description">${prompt.description}</div>
          </div>
        ` : ''}
        <div class="node-field mt-2">
          <button class="edit-prompt-btn" onclick="window.editPrompt('${prompt.id}')">
            Edit Prompt
          </button>
        </div>
      </div>
      <div class="node-id">ID: ${prompt.id}</div>
    </div>
  `;
}

/**
 * Get default Prompt data for new nodes
 */
export function getDefaultPromptData(): Partial<Prompt> {
  return {
    text: "",
    description: "",
  };
}
