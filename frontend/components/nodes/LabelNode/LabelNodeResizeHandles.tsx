"use client";

import {
  NodeResizeControl,
  ResizeControlVariant,
  type ResizeParams,
} from "@xyflow/react";

const CORNER_POSITIONS = [
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
] as const;

const EDGE_POSITIONS = ["top", "right", "bottom", "left"] as const;

interface LabelNodeResizeHandlesProps {
  isHovered: boolean;
  ringColor: string;
  onCornerResizeEnd: (event: unknown, params: ResizeParams) => void;
  onEdgeResizeEnd: (event: unknown, params: ResizeParams) => void;
}

/**
 * Resize handles for LabelNode.
 * Corner handles scale both box and font (proportional).
 * Edge handles resize box only, font stays the same.
 */
export default function LabelNodeResizeHandles({
  isHovered,
  ringColor,
  onCornerResizeEnd,
  onEdgeResizeEnd,
}: LabelNodeResizeHandlesProps) {
  return (
    <>
      {/* Corner handles - always visible when selected, scales font proportionally */}
      {CORNER_POSITIONS.map((position) => (
        <NodeResizeControl
          key={position}
          position={position}
          variant={ResizeControlVariant.Handle}
          minWidth={50}
          minHeight={20}
          keepAspectRatio
          onResizeEnd={onCornerResizeEnd}
          style={{
            width: 8,
            height: 8,
            backgroundColor: ringColor,
            borderColor: ringColor,
            borderRadius: "50%",
          }}
        />
      ))}

      {/* Edge handles - visible on hover only, resizes box without scaling font */}
      {EDGE_POSITIONS.map((position) => (
        <NodeResizeControl
          key={position}
          position={position}
          variant={ResizeControlVariant.Line}
          minWidth={50}
          minHeight={20}
          onResizeEnd={onEdgeResizeEnd}
          style={{
            opacity: isHovered ? 1 : 0,
            borderColor: ringColor,
            transition: "opacity 0.15s ease-in-out",
          }}
        />
      ))}
    </>
  );
}
