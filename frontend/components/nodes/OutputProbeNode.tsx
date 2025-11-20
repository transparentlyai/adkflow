"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

const OutputProbeNode = memo(({ selected }: NodeProps) => {
  return (
    <div
      className={`bg-gray-700 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-md transition-all ${
        selected ? "ring-2 ring-gray-400 shadow-xl" : ""
      }`}
    >
      <div className="font-bold text-xs">OUT</div>

      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        style={{ width: '10px', height: '10px', backgroundColor: '#6b7280', border: '2px solid white' }}
      />

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        style={{ width: '10px', height: '10px', backgroundColor: '#6b7280', border: '2px solid white' }}
      />
    </div>
  );
});

OutputProbeNode.displayName = "OutputProbeNode";

export default OutputProbeNode;

/**
 * Default output probe data for new nodes
 */
export function getDefaultOutputProbeData() {
  return {};
}
