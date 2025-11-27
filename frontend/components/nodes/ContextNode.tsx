"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { Prompt } from "@/lib/types";

export interface ContextNodeData {
  prompt: Prompt;
  onEdit?: () => void;
}

const ContextNode = memo(({ data, selected }: NodeProps) => {
  const { prompt, onEdit } = data as unknown as ContextNodeData;

  const handleDoubleClick = () => {
    onEdit?.();
  };

  return (
    <div
      onDoubleClick={handleDoubleClick}
      title={prompt.name}
      className={`bg-blue-600 text-white px-4 py-2 rounded-lg shadow-md cursor-pointer hover:bg-blue-700 transition-all ${
        selected ? "ring-2 ring-blue-400 shadow-xl" : ""
      }`}
    >
      <div className="font-medium text-sm whitespace-nowrap">
        Context
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        style={{ width: '12px', height: '12px', backgroundColor: '#2563eb', border: '2px solid white' }}
      />
    </div>
  );
});

ContextNode.displayName = "ContextNode";

export default ContextNode;

/**
 * Default context data for new nodes
 */
export function getDefaultContextData(): Omit<Prompt, "id"> {
  return {
    name: "New Context",
    file_path: "",
  };
}
