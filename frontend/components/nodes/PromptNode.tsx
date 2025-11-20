"use client";

import { memo, useState, useRef, useEffect } from "react";
import { Handle, Position, type NodeProps, useReactFlow } from "@xyflow/react";
import type { Prompt } from "@/lib/types";

export interface PromptNodeData {
  prompt: Prompt;
  onEdit?: () => void;
}

const PromptNode = memo(({ data, id, selected }: NodeProps) => {
  const { prompt, onEdit } = data as unknown as PromptNodeData;
  const { setNodes } = useReactFlow();
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(prompt.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = () => {
    setIsEditing(true);
    setEditedName(prompt.name);
  };

  const handleSave = () => {
    if (editedName.trim()) {
      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === id
            ? {
                ...node,
                data: {
                  ...node.data,
                  prompt: {
                    ...prompt,
                    name: editedName.trim(),
                  },
                },
              }
            : node
        )
      );
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setEditedName(prompt.name);
      setIsEditing(false);
    }
  };

  return (
    <div
      className={`bg-white rounded-lg shadow-lg min-w-[250px] max-w-[300px] transition-all ${
        selected ? "ring-2 ring-green-500 shadow-xl" : ""
      }`}
    >
      {/* Prompt nodes have no input, only output */}

      {/* Header */}
      <div className="bg-green-600 text-white px-3 py-1.5 rounded-t-lg">
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className="w-full bg-white text-gray-900 px-2 py-0.5 rounded text-sm font-semibold outline-none"
          />
        ) : (
          <div
            className="font-semibold text-sm cursor-pointer hover:opacity-80"
            onDoubleClick={handleDoubleClick}
          >
            {prompt.name}
          </div>
        )}
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
        <div className="mt-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onEdit?.();
            }}
            className="nodrag nopan w-full bg-green-600 hover:bg-green-700 text-white text-xs py-1 px-2 rounded transition-colors"
          >
            Edit Prompt
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-50 px-3 py-2 rounded-b-lg border-t border-gray-200">
        <span className="text-xs text-gray-500">Prompt</span>
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
