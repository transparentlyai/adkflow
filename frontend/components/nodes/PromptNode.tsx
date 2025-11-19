"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { Prompt } from "@/lib/types";

export interface PromptNodeData {
  prompt: Prompt;
  onEdit?: () => void;
}

/**
 * PromptNode Component
 *
 * React Flow custom node for Prompt type.
 * Displays prompt file information with an edit button.
 */
const PromptNode = memo(({ data, selected }: NodeProps) => {
  const { prompt, onEdit } = data as unknown as PromptNodeData;

  return (
    <div
      className={`bg-white rounded-lg shadow-lg min-w-[250px] max-w-[300px] transition-all ${
        selected ? "ring-2 ring-green-500 shadow-xl" : ""
      }`}
    >
      {/* Prompt nodes have no input, only output */}

      {/* Header */}
      <div className="bg-green-600 text-white p-3 rounded-t-lg">
        <div className="font-semibold text-base">{prompt.name}</div>
        <div className="text-xs opacity-90">Prompt</div>
      </div>

      {/* Body */}
      <div className="p-3 text-sm space-y-2">
        <div>
          <span className="font-semibold text-gray-700">File: </span>
          <code className="text-xs text-gray-900 bg-gray-100 px-2 py-1 rounded">
            {prompt.file_path}
          </code>
        </div>

        {/* Edit Button */}
        <div className="mt-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.();
            }}
            className="w-full bg-green-600 hover:bg-green-700 text-white text-sm py-2 px-3 rounded transition-colors"
          >
            Edit Prompt
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-50 px-3 py-2 rounded-b-lg border-t border-gray-200">
        <code className="text-xs text-gray-500 font-mono">{prompt.id}</code>
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-green-500 border-2 border-white"
      />
    </div>
  );
});

PromptNode.displayName = "PromptNode";

export default PromptNode;

/**
 * Default prompt data for new nodes
 */
export function getDefaultPromptData(): Omit<Prompt, "id"> {
  return {
    name: "New Prompt",
    file_path: "",
  };
}
