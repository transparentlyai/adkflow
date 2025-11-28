"use client";

import { useCallback, useRef, useLayoutEffect, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Handle, Position, useReactFlow, useUpdateNodeInternals } from "@xyflow/react";
import type { HandleEdge, HandlePosition, HandlePositions } from "@/lib/types";

interface DraggableHandleProps {
  nodeId: string;
  handleId: string;
  type: "source" | "target";
  defaultEdge: HandleEdge;
  defaultPercent?: number;
  handlePositions?: HandlePositions;
  style?: React.CSSProperties;
  title?: string;
  isConnectable?: boolean;
}

interface ContextMenuState {
  x: number;
  y: number;
}

/**
 * Convert HandleEdge to React Flow Position enum
 */
function edgeToPosition(edge: HandleEdge): Position {
  switch (edge) {
    case "top": return Position.Top;
    case "right": return Position.Right;
    case "bottom": return Position.Bottom;
    case "left": return Position.Left;
  }
}

/**
 * Calculate handle position based on mouse position relative to node
 */
function calculateHandlePosition(
  mouseX: number,
  mouseY: number,
  nodeRect: DOMRect
): HandlePosition {
  const distances = {
    top: Math.abs(mouseY - nodeRect.top),
    bottom: Math.abs(mouseY - nodeRect.bottom),
    left: Math.abs(mouseX - nodeRect.left),
    right: Math.abs(mouseX - nodeRect.right),
  };

  const edge = (Object.entries(distances) as [HandleEdge, number][])
    .sort(([, a], [, b]) => a - b)[0][0];

  let percent: number;
  if (edge === "top" || edge === "bottom") {
    percent = ((mouseX - nodeRect.left) / nodeRect.width) * 100;
  } else {
    percent = ((mouseY - nodeRect.top) / nodeRect.height) * 100;
  }

  return { edge, percent: Math.max(5, Math.min(95, percent)) };
}

/**
 * Get CSS styles for handle positioning
 */
function getHandleStyle(
  position: HandlePosition,
  baseStyle?: React.CSSProperties
): React.CSSProperties {
  const base: React.CSSProperties = {
    ...baseStyle,
    position: "absolute",
  };

  switch (position.edge) {
    case "top":
      return { ...base, top: 0, left: `${position.percent}%`, transform: "translate(-50%, -50%)" };
    case "bottom":
      return { ...base, bottom: 0, left: `${position.percent}%`, transform: "translate(-50%, 50%)" };
    case "left":
      return { ...base, left: 0, top: `${position.percent}%`, transform: "translate(-50%, -50%)" };
    case "right":
      return { ...base, right: 0, top: `${position.percent}%`, transform: "translate(50%, -50%)" };
  }
}

export default function DraggableHandle({
  nodeId,
  handleId,
  type,
  defaultEdge,
  defaultPercent = 50,
  handlePositions,
  style,
  title,
  isConnectable = true,
}: DraggableHandleProps) {
  const { setNodes } = useReactFlow();
  const updateNodeInternals = useUpdateNodeInternals();
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [isMoveMode, setIsMoveMode] = useState(false);
  const nodeRef = useRef<HTMLElement | null>(null);

  const currentPosition: HandlePosition = handlePositions?.[handleId] ?? {
    edge: defaultEdge,
    percent: defaultPercent,
  };

  const updatePosition = useCallback(
    (newPosition: HandlePosition) => {
      setNodes((nodes) =>
        nodes.map((node) => {
          if (node.id !== nodeId) return node;
          return {
            ...node,
            data: {
              ...node.data,
              handlePositions: {
                ...(node.data.handlePositions as HandlePositions | undefined),
                [handleId]: newPosition,
              },
            },
          };
        })
      );
    },
    [nodeId, handleId, setNodes]
  );

  useLayoutEffect(() => {
    if (handlePositions?.[handleId]) {
      const timer = setTimeout(() => {
        updateNodeInternals(nodeId);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [handlePositions, handleId, nodeId, updateNodeInternals]);

  // Close context menu when clicking outside
  useEffect(() => {
    if (!contextMenu) return;

    const handleClickOutside = () => {
      setContextMenu(null);
    };

    document.addEventListener("click", handleClickOutside);
    document.addEventListener("contextmenu", handleClickOutside);

    return () => {
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("contextmenu", handleClickOutside);
    };
  }, [contextMenu]);

  // When in move mode: track mouse movement and finish on click or Escape
  useEffect(() => {
    if (!isMoveMode) return;

    nodeRef.current = document.querySelector(`[data-id="${nodeId}"]`);

    const handleMouseMove = (e: MouseEvent) => {
      if (!nodeRef.current) return;

      const nodeRect = nodeRef.current.getBoundingClientRect();
      const newPosition = calculateHandlePosition(
        e.clientX,
        e.clientY,
        nodeRect
      );

      updatePosition(newPosition);
    };

    const handleMouseDown = (e: MouseEvent) => {
      e.stopPropagation();
      e.stopImmediatePropagation();
      e.preventDefault();

      setIsMoveMode(false);
      nodeRef.current = null;

      setTimeout(() => {
        updateNodeInternals(nodeId);
      }, 50);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsMoveMode(false);
        nodeRef.current = null;
      }
    };

    // Use capture phase to intercept all events
    document.addEventListener("mousemove", handleMouseMove, true);
    document.addEventListener("mousedown", handleMouseDown, true);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove, true);
      document.removeEventListener("mousedown", handleMouseDown, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMoveMode, nodeId, updatePosition, updateNodeInternals]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMoveClick = useCallback(() => {
    setContextMenu(null);
    setIsMoveMode(true);
  }, []);

  const computedStyle = getHandleStyle(currentPosition, {
    ...style,
    cursor: isMoveMode ? "move" : "crosshair",
  });

  return (
    <>
      <Handle
        type={type}
        position={edgeToPosition(currentPosition.edge)}
        id={handleId}
        title={isMoveMode ? "Click to place handle (Esc to cancel)" : title}
        isConnectable={!isMoveMode && isConnectable}
        style={{
          ...computedStyle,
          outline: isMoveMode ? "2px solid #3b82f6" : undefined,
          outlineOffset: "2px",
        }}
        onContextMenu={handleContextMenu}
      />

      {/* Context Menu - rendered via portal to escape React Flow transforms */}
      {contextMenu && createPortal(
        <div
          className="fixed z-[9999] bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[120px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
            onClick={handleMoveClick}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
            Move
          </button>
        </div>,
        document.body
      )}
    </>
  );
}
