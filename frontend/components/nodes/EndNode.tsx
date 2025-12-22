"use client";

import { memo, useState, useCallback } from "react";
import { type NodeProps, useReactFlow, Handle, Position } from "@xyflow/react";
import NodeContextMenu from "@/components/NodeContextMenu";
import { Square } from "lucide-react";
import { useCanvasActions } from "@/contexts/CanvasActionsContext";
import { useTheme } from "@/contexts/ThemeContext";
import type { HandlePositions } from "@/lib/types";

export interface EndNodeData extends Record<string, unknown> {
  handlePositions?: HandlePositions;
  isNodeLocked?: boolean;
}

const EndNode = memo(({ data, id, selected }: NodeProps) => {
  const { isNodeLocked } = data as EndNodeData;
  const { setNodes } = useReactFlow();
  const canvasActions = useCanvasActions();
  const { theme } = useTheme();

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleToggleNodeLock = useCallback(() => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id
          ? { ...node, data: { ...node.data, isNodeLocked: !isNodeLocked } }
          : node
      )
    );
  }, [id, isNodeLocked, setNodes]);

  const handleCopy = useCallback(() => {
    setNodes((nodes) => nodes.map((n) => ({ ...n, selected: n.id === id })));
    setTimeout(() => canvasActions?.copySelectedNodes(), 0);
  }, [id, setNodes, canvasActions]);

  const size = 48;
  const colors = theme.colors.nodes.end;

  // Octagon path
  const octagonPoints = () => {
    const s = size;
    const cut = s * 0.29; // Corner cut amount
    return `${cut},0 ${s - cut},0 ${s},${cut} ${s},${s - cut} ${s - cut},${s} ${cut},${s} 0,${s - cut} 0,${cut}`;
  };

  return (
    <>
      <div
        onContextMenu={handleContextMenu}
        className="relative"
        style={{ width: size, height: size }}
      >
        {/* Input handle on left */}
        <Handle
          type="target"
          position={Position.Left}
          id="input"
          style={{
            background: theme.colors.handles.input,
            border: `2px solid ${theme.colors.handles.border}`,
            width: 10,
            height: 10,
            left: -5,
          }}
        />

        {/* Octagon shape */}
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="drop-shadow-lg"
        >
          <polygon
            points={octagonPoints()}
            fill={colors.header}
            stroke={selected ? colors.ring : "transparent"}
            strokeWidth="2"
          />
        </svg>

        {/* Icon overlay */}
        <div
          className="absolute inset-0 flex items-center justify-center"
        >
          <Square className="w-5 h-5" style={{ color: colors.text }} />
        </div>
      </div>

      {contextMenu && (
        <NodeContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          isLocked={!!isNodeLocked}
          onToggleLock={handleToggleNodeLock}
          onClose={() => setContextMenu(null)}
          onCopy={handleCopy}
          hasClipboard={canvasActions?.hasClipboard}
          isCanvasLocked={canvasActions?.isLocked}
        />
      )}
    </>
  );
});

EndNode.displayName = "EndNode";

export default EndNode;

export function getDefaultEndData(): EndNodeData {
  return {};
}
