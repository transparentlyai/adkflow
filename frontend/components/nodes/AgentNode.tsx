"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { Agent } from "@/lib/types";

export interface AgentNodeData {
  agent: Agent;
}

/**
 * AgentNode Component
 *
 * React Flow custom node for Agent type.
 * Displays agent information and can contain subagents as child nodes.
 */
const AgentNode = memo(({ data, selected }: NodeProps) => {
  const { agent } = data as unknown as AgentNodeData;
  const toolsCount = agent.tools?.length || 0;
  const subagentsCount = agent.subagents?.length || 0;

  return (
    <div
      className={`bg-white rounded-lg shadow-lg min-w-[250px] max-w-[300px] transition-all ${
        selected ? "ring-2 ring-blue-500 shadow-xl" : ""
      }`}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-blue-500 border-2 border-white"
      />

      {/* Header */}
      <div className="bg-blue-600 text-white p-3 rounded-t-lg">
        <div className="font-semibold text-base">{agent.name}</div>
        <div className="text-xs opacity-90">Agent</div>
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

        {subagentsCount > 0 && (
          <div>
            <span className="font-semibold text-gray-700">Subagents: </span>
            <span className="text-gray-900">
              {subagentsCount} subagent{subagentsCount !== 1 ? "s" : ""}
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
        <code className="text-xs text-gray-500 font-mono">{agent.id}</code>
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

AgentNode.displayName = "AgentNode";

export default AgentNode;

/**
 * Default agent data for new nodes
 */
export function getDefaultAgentData(): Omit<Agent, "id"> {
  return {
    name: "New Agent",
    model: "gemini-2.0-flash-exp",
    system_prompt: "",
    tools: [],
    subagents: [],
    description: "",
  };
}
