"use client";

import { Handle, Position } from "@xyflow/react";
import { Lock, ChevronDown, ChevronUp } from "lucide-react";
import HandleTooltip from "@/components/HandleTooltip";

const WIDTH = 90;
const HEIGHT = 24;
const ARROW_WIDTH = 10;

interface TeleportNodeShapeProps {
  name: string;
  color: string;
  selected: boolean;
  isNodeLocked: boolean | undefined;
  isExpanded: boolean;
  matchingCount: number;
  direction: "input" | "output";
}

export default function TeleportNodeShape({
  name,
  color,
  selected,
  isNodeLocked,
  isExpanded,
  matchingCount,
  direction,
}: TeleportNodeShapeProps) {
  const isInput = direction === "input";

  // SVG path for tag shape
  const shapePath = isInput
    ? // Arrow pointing LEFT (TeleportIn - has output handle on right)
      `M${ARROW_WIDTH},0 H${WIDTH - 4} Q${WIDTH},0 ${WIDTH},4 V${HEIGHT - 4} Q${WIDTH},${HEIGHT} ${WIDTH - 4},${HEIGHT} H${ARROW_WIDTH} L0,${HEIGHT / 2} Z`
    : // Arrow pointing RIGHT (TeleportOut - has input handle on left)
      `M0,4 Q0,0 4,0 H${WIDTH - ARROW_WIDTH} L${WIDTH},${HEIGHT / 2} L${WIDTH - ARROW_WIDTH},${HEIGHT} H4 Q0,${HEIGHT} 0,${HEIGHT - 4} Z`;

  // Handle position and type
  const handlePosition = isInput ? Position.Right : Position.Left;
  const handleType = isInput ? "source" : "target";
  const handleId = isInput ? "output" : "input";
  const handleOffset = isInput ? { right: -4 } : { left: -4 };

  // Badge position
  const badgePosition = isInput
    ? "absolute -top-1.5 -right-1"
    : "absolute -top-1.5 -left-1";

  // Content padding
  const contentPadding = isInput
    ? { paddingLeft: 12, paddingRight: 4 }
    : { paddingLeft: 4, paddingRight: 12 };

  // Expand indicator position
  const expandIndicatorPosition = isInput
    ? "absolute bottom-0 left-2"
    : "absolute bottom-0 right-1";

  return (
    <div className="relative" style={{ width: WIDTH, height: HEIGHT }}>
      {/* Handle */}
      <HandleTooltip
        label={name || (isInput ? "Teleport In" : "Teleport Out")}
        sourceType="teleport"
        dataType="any"
        type={isInput ? "output" : "input"}
      >
        <Handle
          type={handleType}
          position={handlePosition}
          id={handleId}
          style={{
            background: color,
            border: "2px solid white",
            width: 8,
            height: 8,
            ...handleOffset,
          }}
        />
      </HandleTooltip>

      {/* Tag shape SVG */}
      <svg
        width={WIDTH}
        height={HEIGHT}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="drop-shadow-md"
      >
        <path
          d={shapePath}
          fill={color}
          stroke={selected ? "#3b82f6" : "transparent"}
          strokeWidth="2"
        />
      </svg>

      {/* Content overlay */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={contentPadding}
      >
        <div className="flex items-center gap-1 text-white text-sm font-medium">
          {isNodeLocked && <Lock className="w-3 h-3 opacity-80" />}
          <span className="truncate max-w-[55px]">{name}</span>
        </div>
      </div>

      {/* Connection count badge */}
      {matchingCount > 0 && (
        <div
          className={`${badgePosition} bg-white rounded-full px-1 text-[10px] font-medium border shadow-sm`}
          style={{ borderColor: color, color }}
        >
          {matchingCount}
        </div>
      )}

      {/* Expand indicator */}
      <div className={`${expandIndicatorPosition} text-white opacity-60`}>
        {isExpanded ? (
          <ChevronUp className="w-2.5 h-2.5" />
        ) : (
          <ChevronDown className="w-2.5 h-2.5" />
        )}
      </div>
    </div>
  );
}

export { WIDTH, HEIGHT };
