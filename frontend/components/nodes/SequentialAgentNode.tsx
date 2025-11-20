"use client";

import { memo, useState, useRef, useEffect } from "react";
import { Handle, Position, type NodeProps, useReactFlow } from "@xyflow/react";
import type { Agent, SequentialAgent } from "@/lib/types";

export interface SequentialAgentNodeData {
  sequentialAgent: SequentialAgent;
}

const SequentialAgentNode = memo(({ data, id, selected }: NodeProps) => {
  const { sequentialAgent } = data as unknown as SequentialAgentNodeData;
  const toolsCount = sequentialAgent.tools?.length || 0;
  const agentsCount = sequentialAgent.subagents?.length || 0;
  const { setNodes } = useReactFlow();
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(sequentialAgent.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = () => {
    setIsEditing(true);
    setEditedName(sequentialAgent.name);
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
                  sequentialAgent: {
                    ...sequentialAgent,
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
      setEditedName(sequentialAgent.name);
      setIsEditing(false);
    }
  };

  return (
    <div
      className={`bg-white rounded-lg shadow-lg min-w-[250px] max-w-[300px] transition-all ${
        selected ? "ring-2 ring-orange-500 shadow-xl" : ""
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{ width: '12px', height: '12px', backgroundColor: '#ea580c', border: '2px solid white' }}
      />

      <div className="bg-orange-600 text-white px-3 py-1.5 rounded-t-lg">
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
            {sequentialAgent.name}
          </div>
        )}
      </div>

      <div className="p-3 text-sm space-y-2">
        <div>
          <span className="font-semibold text-gray-700">Model: </span>
          <span className="text-gray-900">{sequentialAgent.model || "No model"}</span>
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

        {sequentialAgent.description && (
          <div className="mt-2 pt-2 border-t border-gray-200">
            <div className="text-xs text-gray-600 leading-relaxed">
              {sequentialAgent.description}
            </div>
          </div>
        )}
      </div>

      <div className="bg-gray-50 px-3 py-2 rounded-b-lg border-t border-gray-200">
        <span className="text-xs text-gray-500">Sequential Agent</span>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        style={{ width: '12px', height: '12px', backgroundColor: '#22c55e', border: '2px solid white' }}
      />
    </div>
  );
});

SequentialAgentNode.displayName = "SequentialAgentNode";

export default SequentialAgentNode;

export function getDefaultSequentialAgentData(): Omit<Agent, "id"> {
  return {
    name: "New Sequential Agent",
    type: "sequential",
    model: "gemini-2.0-flash-exp",
    temperature: 0.7,
    tools: [],
    subagents: [],
    description: "",
  };
}
