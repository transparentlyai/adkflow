"use client";

import { memo, useState, useRef, useEffect } from "react";
import { type NodeProps, useReactFlow } from "@xyflow/react";
import type { Agent, HandlePositions } from "@/lib/types";
import DraggableHandle from "@/components/DraggableHandle";

export interface AgentNodeData {
  agent: Agent;
  handlePositions?: HandlePositions;
}

const AgentNode = memo(({ data, id, selected }: NodeProps) => {
  const { agent, handlePositions } = data as unknown as AgentNodeData;
  const toolsCount = agent.tools?.length || 0;
  const { setNodes } = useReactFlow();
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(agent.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = () => {
    setIsEditing(true);
    setEditedName(agent.name);
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
                  agent: {
                    ...agent,
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
      setEditedName(agent.name);
      setIsEditing(false);
    }
  };

  const handleStyle = { width: '12px', height: '12px', border: '2px solid white' };
  const linkHandleStyle = { width: '10px', height: '10px', border: '2px solid white' };

  return (
    <div
      className={`bg-white rounded-lg shadow-lg min-w-[250px] max-w-[300px] transition-all ${
        selected ? "ring-2 ring-purple-500 shadow-xl" : ""
      }`}
    >
      {/* Input Handle */}
      <DraggableHandle
        nodeId={id}
        handleId="input"
        type="target"
        defaultEdge="left"
        defaultPercent={50}
        handlePositions={handlePositions}
        style={{ ...handleStyle, backgroundColor: '#a855f7' }}
      />

      {/* Link Handle - Top (bidirectional) */}
      <DraggableHandle
        nodeId={id}
        handleId="link-top"
        type="source"
        defaultEdge="top"
        defaultPercent={50}
        handlePositions={handlePositions}
        title="Chain with other agents for parallel execution"
        style={{ ...linkHandleStyle, backgroundColor: '#9ca3af' }}
      />

      {/* Header */}
      <div className="bg-purple-600 text-white px-3 py-1.5 rounded-t-lg">
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
            {agent.name}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-3 text-sm space-y-2">
        <div>
          <span className="font-semibold text-gray-700">Model: </span>
          <span className="text-gray-900">{agent.model || "No model"}</span>
        </div>

        {toolsCount > 0 && (
          <div>
            <span className="font-semibold text-gray-700">Tools: </span>
            <span className="text-gray-900">
              {toolsCount} tool{toolsCount !== 1 ? "s" : ""}
            </span>
          </div>
        )}

        {agent.description && (
          <div className="mt-2 pt-2 border-t border-gray-200">
            <div className="text-xs text-gray-600 leading-relaxed">
              {agent.description}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-gray-50 px-3 py-2 rounded-b-lg border-t border-gray-200">
        <span className="text-xs text-gray-500">Agent</span>
      </div>

      {/* Link Handle - Bottom (bidirectional) */}
      <DraggableHandle
        nodeId={id}
        handleId="link-bottom"
        type="target"
        defaultEdge="bottom"
        defaultPercent={50}
        handlePositions={handlePositions}
        title="Chain with other agents for parallel execution"
        style={{ ...linkHandleStyle, backgroundColor: '#9ca3af' }}
      />

      {/* Output Handle */}
      <DraggableHandle
        nodeId={id}
        handleId="output"
        type="source"
        defaultEdge="right"
        defaultPercent={50}
        handlePositions={handlePositions}
        style={{ ...handleStyle, backgroundColor: '#22c55e' }}
      />
    </div>
  );
});

AgentNode.displayName = "AgentNode";

export default AgentNode;

export function getDefaultAgentData(): Omit<Agent, "id"> {
  return {
    name: "New Agent",
    type: "sequential",
    model: "gemini-2.0-flash-exp",
    temperature: 0.7,
    tools: [],
    subagents: [],
    description: "",
  };
}
