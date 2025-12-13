"use client";

import { memo, useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { NodeResizer, type NodeProps, useReactFlow, useStore, type ResizeParams } from "@xyflow/react";
import { useProject } from "@/contexts/ProjectContext";
import { Settings, X, Unlink } from "lucide-react";
import ResizeHandle from "@/components/ResizeHandle";

export interface LabelNodeData extends Record<string, unknown> {
  label: string;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
  textAlign?: "left" | "center" | "right";
  color?: string;
  expandedSize?: { width: number; height: number };
  expandedPosition?: { x: number; y: number };
  contractedPosition?: { x: number; y: number };
}

const DEFAULT_FONT_SIZE = 14;
const DEFAULT_WIDTH = 100;
const EXPANDED_SIZE = { width: 280, height: 320 };

const FONT_FAMILIES = [
  { value: "sans-serif", label: "Sans Serif" },
  { value: "serif", label: "Serif" },
  { value: "monospace", label: "Monospace" },
  { value: "cursive", label: "Cursive" },
];

const FONT_WEIGHTS = [
  { value: "normal", label: "Normal" },
  { value: "bold", label: "Bold" },
  { value: "lighter", label: "Light" },
];

const PRESET_COLORS = [
  "#374151", // gray-700
  "#1f2937", // gray-800
  "#6b7280", // gray-500
  "#dc2626", // red-600
  "#ea580c", // orange-600
  "#ca8a04", // yellow-600
  "#16a34a", // green-600
  "#0891b2", // cyan-600
  "#2563eb", // blue-600
  "#7c3aed", // violet-600
  "#c026d3", // fuchsia-600
  "#db2777", // pink-600
];

const LabelNode = memo(({ data, id, selected }: NodeProps) => {
  const {
    label,
    fontFamily = "sans-serif",
    fontWeight = "normal",
    fontStyle = "normal",
    textAlign = "left",
    color = "#374151",
  } = data as unknown as LabelNodeData;

  const { setNodes } = useReactFlow();
  const { isLocked } = useProject();
  const [isEditing, setIsEditing] = useState(false);
  const [editedLabel, setEditedLabel] = useState(label);
  const [isExpanded, setIsExpanded] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [size, setSize] = useState(EXPANDED_SIZE);
  const inputRef = useRef<HTMLInputElement>(null);

  // Optimized selectors: only subscribe to specific property changes
  const parentId = useStore(
    useCallback((state) => state.nodes.find((n) => n.id === id)?.parentId, [id])
  );
  const nodeWidth = useStore(
    useCallback((state) => {
      const node = state.nodes.find((n) => n.id === id);
      return node?.measured?.width ?? (node?.style?.width as number) ?? DEFAULT_WIDTH;
    }, [id])
  );
  const scaledFontSize = (nodeWidth / DEFAULT_WIDTH) * DEFAULT_FONT_SIZE;

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
      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === id
            ? {
                ...node,
                data: {
                  ...node.data,
                  label: editedLabel.trim(),
                },
              }
            : node
        )
      );
    }
    setIsEditing(false);
  }, [editedLabel, id, setNodes]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
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
            },
          };
        }
      })
    );
    setIsExpanded(!isExpanded);
  }, [id, isExpanded, setNodes, size]);

  const updateData = useCallback(
    (updates: Partial<LabelNodeData>) => {
      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === id
            ? {
                ...node,
                data: {
                  ...node.data,
                  ...updates,
                },
              }
            : node
        )
      );
    },
    [id, setNodes]
  );

  const handleResize = useCallback((deltaWidth: number, deltaHeight: number) => {
    setSize((prev) => ({
      width: Math.max(240, prev.width + deltaWidth),
      height: Math.max(200, prev.height + deltaHeight),
    }));
  }, []);

  const handleResizeEnd = useCallback(() => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id
          ? {
              ...node,
              data: {
                ...node.data,
                expandedSize: size,
              },
            }
          : node
      )
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
          : node
      );
    });
  }, [id, setNodes]);

  const handleNodeResize = useCallback(
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
              }
            : node
        )
      );
    },
    [id, setNodes]
  );

  // Expanded view with settings
  if (isExpanded) {
    return (
      <div
        className="bg-white rounded-lg shadow-lg border border-gray-200"
        style={{ width: size.width, height: size.height }}
      >
        {/* Header */}
        <div className="bg-gray-500 text-white px-3 py-1.5 rounded-t-lg flex items-center justify-between">
          <span className="text-sm font-medium truncate">Label Settings</span>
          <button
            onClick={toggleExpand}
            className="p-0.5 hover:bg-gray-600 rounded transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Preview */}
        <div className="p-3 border-b border-gray-200 bg-gray-50">
          <div className="text-xs text-gray-500 mb-1">Preview</div>
          <div
            className="p-2 bg-white rounded border border-gray-200 min-h-[40px] flex items-center"
            style={{
              fontFamily,
              fontWeight,
              fontStyle,
              textAlign,
              color,
              justifyContent: textAlign === "left" ? "flex-start" : textAlign === "right" ? "flex-end" : "center",
            }}
          >
            {label}
          </div>
        </div>

        {/* Settings */}
        <div className="p-3 space-y-3 overflow-y-auto nodrag" style={{ height: size.height - 140 }}>
          {/* Text */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">Text</label>
            <input
              type="text"
              value={label}
              onChange={(e) => updateData({ label: e.target.value })}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-500"
            />
          </div>

          {/* Font Family */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">Font Family</label>
            <select
              value={fontFamily}
              onChange={(e) => updateData({ fontFamily: e.target.value })}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-500 bg-white"
            >
              {FONT_FAMILIES.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          {/* Font Weight & Style */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">Weight</label>
              <select
                value={fontWeight}
                onChange={(e) => updateData({ fontWeight: e.target.value })}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-500 bg-white"
              >
                {FONT_WEIGHTS.map((w) => (
                  <option key={w.value} value={w.value}>
                    {w.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">Style</label>
              <select
                value={fontStyle}
                onChange={(e) => updateData({ fontStyle: e.target.value })}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-500 bg-white"
              >
                <option value="normal">Normal</option>
                <option value="italic">Italic</option>
              </select>
            </div>
          </div>

          {/* Alignment */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">Alignment</label>
            <div className="flex gap-1">
              {(["left", "center", "right"] as const).map((align) => (
                <button
                  key={align}
                  onClick={() => updateData({ textAlign: align })}
                  className={`flex-1 px-2 py-1.5 text-sm border rounded-md transition-colors ${
                    textAlign === align
                      ? "bg-gray-500 text-white border-gray-500"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {align.charAt(0).toUpperCase() + align.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">Color</label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => updateData({ color: c })}
                  className={`w-6 h-6 rounded border-2 transition-all ${
                    color === c ? "border-gray-800 scale-110" : "border-transparent hover:scale-105"
                  }`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
            <input
              type="color"
              value={color}
              onChange={(e) => updateData({ color: e.target.value })}
              className="w-full h-8 mt-1 cursor-pointer rounded border border-gray-300"
            />
          </div>
        </div>

        <ResizeHandle onResize={handleResize} onResizeEnd={handleResizeEnd} />
      </div>
    );
  }

  // Collapsed view
  return (
    <>
      <NodeResizer
        minWidth={50}
        minHeight={20}
        isVisible={selected && !isLocked}
        lineClassName="!border-transparent"
        handleClassName="!w-2 !h-2 !bg-gray-400 !border-gray-400"
        keepAspectRatio
        onResizeEnd={handleNodeResize}
      />
      <div
        className="w-full h-full flex items-center cursor-default select-none"
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        style={{
          fontSize: `${scaledFontSize}px`,
          fontFamily,
          fontWeight,
          fontStyle,
          justifyContent: textAlign === "left" ? "flex-start" : textAlign === "right" ? "flex-end" : "center",
          padding: 0,
          lineHeight: 1,
        }}
      >
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editedLabel}
            onChange={(e) => setEditedLabel(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-white px-1 py-0.5 rounded text-center outline-none border border-gray-300 nodrag"
            style={{ fontSize: `${scaledFontSize}px`, color }}
          />
        ) : (
          <span className="whitespace-nowrap" style={{ color }}>
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
          document.body
        )}
    </>
  );
});

LabelNode.displayName = "LabelNode";

export default LabelNode;

export function getDefaultLabelData(): LabelNodeData {
  return {
    label: "Label",
    fontFamily: "sans-serif",
    fontWeight: "normal",
    fontStyle: "normal",
    textAlign: "left",
    color: "#374151",
  };
}
