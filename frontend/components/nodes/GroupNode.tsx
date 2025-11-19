"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

export interface GroupNodeData {
  label: string;
  description?: string;
}

/**
 * GroupNode Component
 *
 * React Flow custom node for grouping other nodes.
 * Useful for creating visual containers (e.g., Agent containing Subagents).
 * Child nodes will be positioned relative to this parent.
 */
const GroupNode = memo(({ data, selected }: NodeProps) => {
  const { label, description } = data as unknown as GroupNodeData;

  return (
    <div
      className={`bg-blue-50 border-2 border-blue-300 rounded-lg p-4 min-w-[400px] min-h-[300px] transition-all ${
        selected ? "border-blue-500 bg-blue-100" : ""
      }`}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-blue-500 border-2 border-white"
      />

      {/* Group Header */}
      <div className="bg-blue-600 text-white px-3 py-2 rounded-lg mb-3 inline-block">
        <div className="font-semibold text-sm">{label}</div>
        {description && (
          <div className="text-xs opacity-90 mt-1">{description}</div>
        )}
      </div>

      {/* Child nodes will be rendered inside this area */}
      <div className="text-xs text-gray-500 text-center mt-8">
        Drag nodes here to group them
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

GroupNode.displayName = "GroupNode";

export default GroupNode;
