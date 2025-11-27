"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { Prompt } from "@/lib/types";

export interface PromptNodeData {
  prompt: Prompt;
  onEdit?: () => void;
}

const PromptNode = memo(({ data, selected }: NodeProps) => {
  const { prompt, onEdit } = data as unknown as PromptNodeData;

  const handleDoubleClick = () => {
    onEdit?.();
  };

  return (
    <div
      onDoubleClick={handleDoubleClick}
      title={prompt.name}
      className={`bg-green-600 text-white px-4 py-2 rounded-lg shadow-md cursor-pointer hover:bg-green-700 transition-all ${
        selected ? "ring-2 ring-green-400 shadow-xl" : ""
      }`}
    >
      <div className="font-medium text-sm whitespace-nowrap">
        Prompt
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        style={{ width: '12px', height: '12px', backgroundColor: '#22c55e', border: '2px solid white' }}
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
