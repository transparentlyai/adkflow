"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { MasterAgent } from "@/lib/types";

export interface MasterAgentNodeData {
  masterAgent: MasterAgent;
}

const MasterAgentNode = memo(({ data, selected }: NodeProps) => {
  const { masterAgent } = data as unknown as MasterAgentNodeData;
  const toolsCount = masterAgent.tools?.length || 0;
  const agentsCount = masterAgent.agents?.length || 0;

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
        style={{ width: '12px', height: '12px', backgroundColor: '#3b82f6', border: '2px solid white' }}
      />

      {/* Header */}
      <div className="bg-blue-600 text-white px-3 py-1.5 rounded-t-lg">
        <div className="font-semibold text-sm">{masterAgent.name}</div>
      </div>

      {/* Body */}
      <div className="p-3 text-sm space-y-2">
        <div>
          <span className="font-semibold text-gray-700">Model: </span>
          <span className="text-gray-900">{masterAgent.model || "No model"}</span>
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

        {masterAgent.description && (
          <div className="mt-2 pt-2 border-t border-gray-200">
            <div className="text-xs text-gray-600 leading-relaxed">
              {masterAgent.description}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-gray-50 px-3 py-2 rounded-b-lg border-t border-gray-200">
        <span className="text-xs text-gray-500">Master Agent</span>
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

MasterAgentNode.displayName = "MasterAgentNode";

export default MasterAgentNode;

export function getDefaultMasterAgentData(): Omit<MasterAgent, "id"> {
  return {
    name: "New Master Agent",
    type: "masterAgent", // Added type property
    model: "gemini-2.0-flash-exp",
    system_prompt: "",
    tools: [],
    agents: [],
    description: "",
  };
}
