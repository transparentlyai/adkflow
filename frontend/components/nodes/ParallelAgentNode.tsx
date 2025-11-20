"use client";

import { memo, useState, useRef, useEffect } from "react";
import { Handle, Position, type NodeProps, useReactFlow } from "@xyflow/react";
import type { ParallelAgent } from "@/lib/types";

export interface ParallelAgentNodeData {
  parallelAgent: ParallelAgent;
}

const ParallelAgentNode = memo(({ data, id, selected }: NodeProps) => {
  const { parallelAgent } = data as unknown as ParallelAgentNodeData;
  const toolsCount = parallelAgent.tools?.length || 0;
  const agentsCount = parallelAgent.agents?.length || 0;
  const { setNodes } = useReactFlow();
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(parallelAgent.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = () => {
    setIsEditing(true);
    setEditedName(parallelAgent.name);
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
                  parallelAgent: {
                    ...parallelAgent,
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
      setEditedName(parallelAgent.name);
      setIsEditing(false);
    }
  };

  return (
    <div
      className={`bg-white rounded-lg shadow-lg min-w-[250px] max-w-[300px] transition-all ${
        selected ? "ring-2 ring-teal-500 shadow-xl" : ""
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{ width: '12px', height: '12px', backgroundColor: '#0d9488', border: '2px solid white' }}
      />

      <div className="bg-teal-600 text-white px-3 py-1.5 rounded-t-lg">
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
            {parallelAgent.name}
          </div>
        )}
      </div>

      <div className="p-3 text-sm space-y-2">
        <div>
          <span className="font-semibold text-gray-700">Model: </span>
          <span className="text-gray-900">{parallelAgent.model || "No model"}</span>
        </div>

        {toolsCount > 0 && (
          <div>
            <span className="font-semibold text-gray-700">Tools: </span>
            <span className="text-gray-900">
              {toolsCount} tool{toolsCount !== 1 ? "s" : ""}
            </span>
          </div>
        )}

        {agentsCount > 0 && (
          <div>
            <span className="font-semibold text-gray-700">Agents: </span>
            <span className="text-gray-900">
              {agentsCount} agent{agentsCount !== 1 ? "s" : ""}
            </span>
          </div>
        )}

        {parallelAgent.description && (
          <div className="mt-2 pt-2 border-t border-gray-200">
            <div className="text-xs text-gray-600 leading-relaxed">
              {parallelAgent.description}
            </div>
          </div>
        )}
      </div>

      <div className="bg-gray-50 px-3 py-2 rounded-b-lg border-t border-gray-200">
        <span className="text-xs text-gray-500">Parallel Agent</span>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        style={{ width: '12px', height: '12px', backgroundColor: '#22c55e', border: '2px solid white' }}
      />
    </div>
  );
});

ParallelAgentNode.displayName = "ParallelAgentNode";

export default ParallelAgentNode;

export function getDefaultParallelAgentData(): Omit<ParallelAgent, "id"> {
  return {
    name: "New Parallel Agent",
    type: "parallelAgent",
    model: "gemini-2.0-flash-exp",
    system_prompt: "",
    tools: [],
    agents: [],
    description: "",
  };
}
