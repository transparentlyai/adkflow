"use client";

import { memo } from "react";
import { type NodeProps } from "@xyflow/react";
import type { HandlePositions } from "@/lib/types";
import DraggableHandle from "@/components/DraggableHandle";

interface InputProbeNodeData {
  handlePositions?: HandlePositions;
}

const InputProbeNode = memo(({ data, id, selected }: NodeProps) => {
  const { handlePositions } = (data || {}) as InputProbeNodeData;

  return (
    <div
      className={`bg-gray-700 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-md transition-all ${
        selected ? "ring-2 ring-gray-400 shadow-xl" : ""
      }`}
    >
      <div className="font-bold text-xs">IN</div>

      {/* Input Handle */}
      <DraggableHandle
        nodeId={id}
        handleId="input"
        type="target"
        defaultEdge="left"
        defaultPercent={50}
        handlePositions={handlePositions}
        style={{ width: '10px', height: '10px', backgroundColor: '#6b7280', border: '2px solid white' }}
      />

      {/* Output Handle */}
      <DraggableHandle
        nodeId={id}
        handleId="output"
        type="source"
        defaultEdge="right"
        defaultPercent={50}
        handlePositions={handlePositions}
        style={{ width: '10px', height: '10px', backgroundColor: '#6b7280', border: '2px solid white' }}
      />
    </div>
  );
});

InputProbeNode.displayName = "InputProbeNode";

export default InputProbeNode;

export function getDefaultInputProbeData() {
  return {};
}
