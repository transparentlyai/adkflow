"use client";

import {
  useCallback,
  useRef,
  useLayoutEffect,
  useState,
  useEffect,
  useMemo,
} from "react";
import { createPortal } from "react-dom";
import {
  Handle,
  Position,
  useReactFlow,
  useUpdateNodeInternals,
} from "@xyflow/react";
import type { HandleEdge, HandlePosition, HandlePositions } from "@/lib/types";
import { isTypeCompatible } from "@/lib/types";
import { useTheme } from "@/contexts/ThemeContext";
import { useConnection } from "@/contexts/ConnectionContext";
import HandleTooltip from "@/components/HandleTooltip";

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
  outputSource?: string; // For source handles: what source type (e.g., 'prompt', 'agent')
  outputType?: string; // For source handles: what Python type (e.g., 'str', 'dict')
  acceptedSources?: string[]; // For target handles: which sources accepted
  acceptedTypes?: string[]; // For target handles: which types accepted
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
    case "top":
      return Position.Top;
    case "right":
      return Position.Right;
    case "bottom":
      return Position.Bottom;
    case "left":
      return Position.Left;
  }
}

/**
 * Calculate handle position based on mouse position relative to node
 */
function calculateHandlePosition(
  mouseX: number,
  mouseY: number,
  nodeRect: DOMRect,
): HandlePosition {
  const distances = {
    top: Math.abs(mouseY - nodeRect.top),
    bottom: Math.abs(mouseY - nodeRect.bottom),
    left: Math.abs(mouseX - nodeRect.left),
    right: Math.abs(mouseX - nodeRect.right),
  };

  const edge = (Object.entries(distances) as [HandleEdge, number][]).sort(
    ([, a], [, b]) => a - b,
  )[0][0];

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
  baseStyle?: React.CSSProperties,
): React.CSSProperties {
  const base: React.CSSProperties = {
    ...baseStyle,
    position: "absolute",
  };

  switch (position.edge) {
    case "top":
      return {
        ...base,
        top: 0,
        left: `${position.percent}%`,
        transform: "translate(-50%, -50%)",
      };
    case "bottom":
      return {
        ...base,
        bottom: 0,
        left: `${position.percent}%`,
        transform: "translate(-50%, 50%)",
      };
    case "left":
      return {
        ...base,
        left: 0,
        top: `${position.percent}%`,
        transform: "translate(-50%, -50%)",
      };
    case "right":
      return {
        ...base,
        right: 0,
        top: `${position.percent}%`,
        transform: "translate(50%, -50%)",
      };
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
  outputSource,
  outputType,
  acceptedSources,
  acceptedTypes,
}: DraggableHandleProps) {
  const { theme } = useTheme();
  const { setNodes } = useReactFlow();
  const updateNodeInternals = useUpdateNodeInternals();
  const { connectionState } = useConnection();
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [isMoveMode, setIsMoveMode] = useState(false);
  const nodeRef = useRef<HTMLElement | null>(null);

  // Determine if this target handle is compatible with current drag source
  const isValidTarget = useMemo(() => {
    // Only applies to target handles when a drag is in progress
    if (
      !connectionState.isDragging ||
      type !== "target" ||
      !acceptedSources ||
      !acceptedTypes
    ) {
      return null; // null means "not applicable" (no visual feedback)
    }
    // Prevent self-connection
    if (connectionState.sourceNodeId === nodeId) {
      return false;
    }
    // Check type compatibility using source:type format
    return isTypeCompatible(
      connectionState.sourceOutputSource,
      connectionState.sourceOutputType,
      acceptedSources,
      acceptedTypes,
    );
  }, [connectionState, type, acceptedSources, acceptedTypes, nodeId]);

  // Visual styling based on connection validity
  // Use boxShadow for glow effect (avoid mixing border shorthand with borderColor)
  const validityStyle: React.CSSProperties = useMemo(() => {
    if (isValidTarget === null) {
      return {}; // No styling when not dragging or this is a source handle
    }
    if (isValidTarget) {
      return {
        boxShadow: "0 0 0 2px #22c55e, 0 0 8px 2px #22c55e", // Green ring + glow
        cursor: "pointer",
      };
    } else {
      return {
        boxShadow: "0 0 0 2px #ef4444, 0 0 8px 2px #ef4444", // Red ring + glow
        cursor: "not-allowed",
      };
    }
  }, [isValidTarget]);

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
        }),
      );
    },
    [nodeId, handleId, setNodes],
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
        nodeRect,
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

  // Determine tooltip content based on handle type
  const tooltipLabel = title || handleId;
  const tooltipSourceType =
    type === "source"
      ? outputSource || "any"
      : acceptedSources?.join("|") || "any";
  const tooltipDataType =
    type === "source" ? outputType || "any" : acceptedTypes?.join("|") || "any";
  const tooltipType = type === "source" ? "output" : "input";

  return (
    <>
      <HandleTooltip
        label={tooltipLabel}
        sourceType={tooltipSourceType}
        dataType={tooltipDataType}
        type={tooltipType}
      >
        <Handle
          type={type}
          position={edgeToPosition(currentPosition.edge)}
          id={handleId}
          isConnectable={!isMoveMode && isConnectable}
          style={{
            ...computedStyle,
            ...validityStyle,
            outline: isMoveMode ? "2px solid #3b82f6" : undefined,
            outlineOffset: "2px",
            transition: "box-shadow 0.15s ease",
          }}
          onContextMenu={handleContextMenu}
        />
      </HandleTooltip>

      {/* Context Menu - rendered via portal to escape React Flow transforms */}
      {contextMenu &&
        createPortal(
          <div
            className="fixed z-[9999] rounded-lg shadow-lg border py-1 min-w-[120px]"
            style={{
              left: contextMenu.x,
              top: contextMenu.y,
              backgroundColor: theme.colors.nodes.common.container.background,
              borderColor: theme.colors.nodes.common.container.border,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="w-full px-3 py-1.5 text-left text-sm flex items-center gap-2 hover:opacity-80 transition-opacity"
              style={{ color: theme.colors.nodes.common.text.secondary }}
              onClick={handleMoveClick}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                />
              </svg>
              Move
            </button>
          </div>,
          document.body,
        )}
    </>
  );
}
