"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { Subagent } from "@/lib/types";

export interface SubagentNodeData {
  subagent: Subagent;
}

/**
 * SubagentNode Component
 *
 * React Flow custom node for Subagent type.
 * Can be used standalone or as a child of an Agent node.
 */
const SubagentNode = memo(({ data, selected }: NodeProps) => {
  const { subagent } = data as unknown as SubagentNodeData;
  const toolsCount = subagent.tools?.length || 0;

  return (
    <div
      className={`bg-white rounded-lg shadow-lg min-w-[250px] max-w-[300px] transition-all ${
        selected ? "ring-2 ring-purple-500 shadow-xl" : ""
      }`}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-purple-500 border-2 border-white"
      />

      {/* Header */}
      <div className="bg-purple-600 text-white p-3 rounded-t-lg">
        <div className="font-semibold text-base">{subagent.name}</div>
        <div className="text-xs opacity-90">Subagent</div>
      </div>

      {/* Body */}
      <div className="p-3 text-sm space-y-2">
        <div>
          <span className="font-semibold text-gray-700">Model: </span>
          <span className="text-gray-900">{subagent.model || "No model"}</span>
        </div>

        {toolsCount > 0 && (
          <div>
            <span className="font-semibold text-gray-700">Tools: </span>
            <span className="text-gray-900">
              {toolsCount} tool{toolsCount !== 1 ? "s" : ""}
            </span>
          </div>
        )}

        {subagent.description && (
          <div className="mt-2 pt-2 border-t border-gray-200">
            <div className="text-xs text-gray-600 leading-relaxed">
              {subagent.description}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-gray-50 px-3 py-2 rounded-b-lg border-t border-gray-200">
        <code className="text-xs text-gray-500 font-mono">{subagent.id}</code>
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

SubagentNode.displayName = "SubagentNode";

export default SubagentNode;

/**
 * Default subagent data for new nodes
 */
export function getDefaultSubagentData(): Omit<Subagent, "id"> {
  return {
    name: "New Subagent",
    model: "gemini-2.0-flash-exp",
    system_prompt: "",
    tools: [],
    description: "",
  };
}
