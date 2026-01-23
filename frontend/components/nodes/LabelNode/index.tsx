"use client";

import { memo, useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  NodeResizeControl,
  ResizeControlVariant,
  type NodeProps,
  useReactFlow,
  useStore,
  type ResizeParams,
} from "@xyflow/react";
import { useProject } from "@/contexts/ProjectContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Settings, Unlink } from "lucide-react";
import LabelNodeExpanded from "./LabelNodeExpanded";
import type { LabelNodeData } from "./types";
import { DEFAULT_FONT_SIZE, DEFAULT_WIDTH, EXPANDED_SIZE } from "./types";

const CORNER_POSITIONS = [
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
] as const;
const EDGE_POSITIONS = ["top", "right", "bottom", "left"] as const;

const LabelNode = memo(({ data, id, selected }: NodeProps) => {
  const {
    label,
    fontFamily = "sans-serif",
    fontWeight = "normal",
    fontStyle = "normal",
    textAlign = "left",
    color = "#374151",
    isExpanded: dataIsExpanded,
  } = data as unknown as LabelNodeData;

  const { setNodes } = useReactFlow();
  const { isLocked } = useProject();
  const { theme } = useTheme();
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedLabel, setEditedLabel] = useState(label);
  const [isExpanded, setIsExpanded] = useState(dataIsExpanded ?? false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [size, setSize] = useState(EXPANDED_SIZE);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const parentId = useStore(
    useCallback(
      (state) => state.nodes.find((n) => n.id === id)?.parentId,
      [id],
    ),
  );
  const nodeWidth = useStore(
    useCallback(
      (state) => {
        const node = state.nodes.find((n) => n.id === id);
        return (
          node?.measured?.width ??
          (node?.style?.width as number) ??
          DEFAULT_WIDTH
        );
      },
      [id],
    ),
  );
  const fontScaleWidth = useStore(
    useCallback(
      (state) =>
        (state.nodes.find((n) => n.id === id)?.data as LabelNodeData)
          ?.fontScaleWidth,
      [id],
    ),
  );
  const manuallyResized = useStore(
    useCallback(
      (state) =>
        (state.nodes.find((n) => n.id === id)?.data as LabelNodeData)
          ?.manuallyResized,
      [id],
    ),
  );
  const effectiveFontWidth = fontScaleWidth ?? nodeWidth;
  const scaledFontSize =
    (effectiveFontWidth / DEFAULT_WIDTH) * DEFAULT_FONT_SIZE;

  // Measure text width using canvas
  const measureTextSize = useCallback(
    (text: string) => {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) return { width: DEFAULT_WIDTH, height: 20 };

      context.font = `${fontStyle} ${fontWeight} ${DEFAULT_FONT_SIZE}px ${fontFamily}`;

      const lines = text.split("\n");
      const lineHeight = DEFAULT_FONT_SIZE * 1.2;
      let maxWidth = 0;

      for (const line of lines) {
        const metrics = context.measureText(line);
        maxWidth = Math.max(maxWidth, metrics.width);
      }

      const padding = 8;
      const width = Math.max(50, maxWidth + padding);
      const height = Math.max(20, lines.length * lineHeight);

      return { width, height };
    },
    [fontFamily, fontWeight, fontStyle],
  );

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    const nodeData = data as unknown as LabelNodeData;
    if (nodeData.expandedSize) {
      setSize(nodeData.expandedSize);
    }
  }, [data]);

  const handleDoubleClick = () => {
    if (isLocked || isExpanded) return;
    setIsEditing(true);
    setEditedLabel(label);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleSave = useCallback(() => {
    if (editedLabel.trim()) {
      const trimmedLabel = editedLabel.trim();
      setNodes((nodes) =>
        nodes.map((node) => {
          if (node.id !== id) return node;

          const nodeData = node.data as LabelNodeData;
          const updatedNode = {
            ...node,
            data: { ...nodeData, label: trimmedLabel },
          };

          // Auto-resize if not manually resized
          if (!nodeData.manuallyResized) {
            const { width, height } = measureTextSize(trimmedLabel);
            updatedNode.style = {
              ...node.style,
              width,
              height,
            };
            // Also update fontScaleWidth to keep font consistent with auto-sizing
            updatedNode.data = {
              ...updatedNode.data,
              fontScaleWidth: width,
            };
          }

          return updatedNode;
        }),
      );
    }
    setIsEditing(false);
  }, [editedLabel, id, setNodes, measureTextSize]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleSave();
    } else if (e.key === "Escape") {
      setEditedLabel(label);
      setIsEditing(false);
    }
  };

  const toggleExpand = useCallback(() => {
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id !== id) return node;

        const nodeData = node.data as unknown as LabelNodeData;
        const currentPosition = node.position;

        if (isExpanded) {
          return {
            ...node,
            position: nodeData.contractedPosition ?? currentPosition,
            extent: node.parentId ? ("parent" as const) : undefined,
            data: {
              ...nodeData,
              expandedPosition: currentPosition,
              expandedSize: size,
              isExpanded: false,
            },
          };
        } else {
          return {
            ...node,
            position: nodeData.expandedPosition ?? currentPosition,
            extent: undefined,
            data: {
              ...nodeData,
              contractedPosition: currentPosition,
              isExpanded: true,
            },
          };
        }
      }),
    );
    setIsExpanded(!isExpanded);
  }, [id, isExpanded, setNodes, size]);

  const updateData = useCallback(
    (updates: Partial<LabelNodeData>) => {
      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === id
            ? { ...node, data: { ...node.data, ...updates } }
            : node,
        ),
      );
    },
    [id, setNodes],
  );

  const handleResize = useCallback(
    (deltaWidth: number, deltaHeight: number) => {
      setSize((prev) => ({
        width: Math.max(240, prev.width + deltaWidth),
        height: Math.max(200, prev.height + deltaHeight),
      }));
    },
    [],
  );

  const handleResizeEnd = useCallback(() => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id
          ? { ...node, data: { ...node.data, expandedSize: size } }
          : node,
      ),
    );
  }, [id, setNodes, size]);

  const handleDetach = useCallback(() => {
    setNodes((nodes) => {
      const thisNode = nodes.find((n) => n.id === id);
      const parentNode = nodes.find((n) => n.id === thisNode?.parentId);
      if (!thisNode || !parentNode) return nodes;

      return nodes.map((node) =>
        node.id === id
          ? {
              ...node,
              parentId: undefined,
              position: {
                x: thisNode.position.x + parentNode.position.x,
                y: thisNode.position.y + parentNode.position.y,
              },
            }
          : node,
      );
    });
  }, [id, setNodes]);

  // Corner resize: scales both box and font
  const handleCornerResizeEnd = useCallback(
    (_event: unknown, params: ResizeParams) => {
      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === id
            ? {
                ...node,
                style: {
                  ...node.style,
                  width: params.width,
                  height: params.height,
                },
                data: {
                  ...node.data,
                  fontScaleWidth: params.width,
                  manuallyResized: true,
                },
              }
            : node,
        ),
      );
    },
    [id, setNodes],
  );

  // Edge resize: resizes box only, font stays the same
  const handleEdgeResizeEnd = useCallback(
    (_event: unknown, params: ResizeParams) => {
      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === id
            ? {
                ...node,
                style: {
                  ...node.style,
                  width: params.width,
                  height: params.height,
                },
                data: { ...node.data, manuallyResized: true },
              }
            : node,
        ),
      );
    },
    [id, setNodes],
  );

  // Expanded view
  if (isExpanded) {
    return (
      <LabelNodeExpanded
        data={data as unknown as LabelNodeData}
        size={size}
        onClose={toggleExpand}
        onUpdate={updateData}
        onResize={handleResize}
        onResizeEnd={handleResizeEnd}
      />
    );
  }

  // Collapsed view
  return (
    <>
      {/* Corner handles - always visible when selected */}
      {selected &&
        !isLocked &&
        CORNER_POSITIONS.map((position) => (
          <NodeResizeControl
            key={position}
            position={position}
            variant={ResizeControlVariant.Handle}
            minWidth={50}
            minHeight={20}
            keepAspectRatio
            onResizeEnd={handleCornerResizeEnd}
            style={{
              width: 8,
              height: 8,
              backgroundColor: theme.colors.nodes.label.ring,
              borderColor: theme.colors.nodes.label.ring,
              borderRadius: "50%",
            }}
          />
        ))}

      {/* Edge handles - visible on hover only */}
      {selected &&
        !isLocked &&
        EDGE_POSITIONS.map((position) => (
          <NodeResizeControl
            key={position}
            position={position}
            variant={ResizeControlVariant.Line}
            minWidth={50}
            minHeight={20}
            onResizeEnd={handleEdgeResizeEnd}
            style={{
              opacity: isHovered ? 1 : 0,
              borderColor: theme.colors.nodes.label.ring,
              transition: "opacity 0.15s ease-in-out",
            }}
          />
        ))}

      <div
        className="w-full h-full flex items-center cursor-default select-none"
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          fontSize: `${scaledFontSize}px`,
          fontFamily,
          fontWeight,
          fontStyle,
          justifyContent:
            textAlign === "left"
              ? "flex-start"
              : textAlign === "right"
                ? "flex-end"
                : "center",
          padding: 0,
          lineHeight: 1,
        }}
      >
        {isEditing ? (
          <textarea
            ref={inputRef}
            value={editedLabel}
            onChange={(e) => setEditedLabel(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            className="w-full h-full px-1 py-0.5 rounded outline-none border nodrag resize-none"
            style={{
              fontSize: `${scaledFontSize}px`,
              color,
              backgroundColor: theme.colors.ui.background,
              borderColor: theme.colors.ui.border,
              textAlign,
            }}
          />
        ) : (
          <span className="whitespace-pre-wrap break-words" style={{ color }}>
            {label}
          </span>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-50"
              onClick={() => setContextMenu(null)}
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenu(null);
              }}
            />
            <div
              className="fixed z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95"
              style={{
                left: Math.min(contextMenu.x, window.innerWidth - 160),
                top: Math.min(contextMenu.y, window.innerHeight - 100),
              }}
            >
              <button
                onClick={() => {
                  toggleExpand();
                  setContextMenu(null);
                }}
                className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
              >
                <span className="mr-2 text-muted-foreground">
                  <Settings className="h-4 w-4" />
                </span>
                Settings
              </button>
              {parentId && (
                <button
                  onClick={() => {
                    handleDetach();
                    setContextMenu(null);
                  }}
                  className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                >
                  <span className="mr-2 text-muted-foreground">
                    <Unlink className="h-4 w-4" />
                  </span>
                  Detach from Group
                </button>
              )}
            </div>
          </>,
          document.body,
        )}
    </>
  );
});

LabelNode.displayName = "LabelNode";

export default LabelNode;
