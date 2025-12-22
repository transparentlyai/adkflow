"use client";

import { memo, useState, useCallback } from "react";
import { type NodeProps, useReactFlow, Handle, Position } from "@xyflow/react";
import NodeContextMenu from "@/components/NodeContextMenu";
import { Play, Loader2 } from "lucide-react";
import { useCanvasActions } from "@/contexts/CanvasActionsContext";
import { useRunWorkflow } from "@/contexts/RunWorkflowContext";
import { useTheme } from "@/contexts/ThemeContext";
import type { HandlePositions } from "@/lib/types";

export interface StartNodeData extends Record<string, unknown> {
  handlePositions?: HandlePositions;
  isNodeLocked?: boolean;
  hasValidationError?: boolean;
}

const StartNode = memo(({ data, id, selected }: NodeProps) => {
  const { isNodeLocked, hasValidationError } = data as StartNodeData;
  const { setNodes } = useReactFlow();
  const canvasActions = useCanvasActions();
  const { runWorkflow, isRunning, hasProjectPath } = useRunWorkflow();
  const { theme } = useTheme();

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  // Get validation error glow style
  const getValidationStyle = useCallback((): React.CSSProperties => {
    if (hasValidationError) {
      return {
        boxShadow: `0 0 0 2px rgba(239, 68, 68, 0.8), 0 0 20px 4px rgba(239, 68, 68, 0.4)`,
        animation: "validation-error-pulse 1s ease-in-out infinite",
      };
    }
    return {};
  }, [hasValidationError]);

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

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasProjectPath && !isRunning) {
      runWorkflow();
    }
  };

  const size = 48;
  const colors = theme.colors.nodes.start;

  // Combine selection and validation styles
  const getNodeStyle = useCallback((): React.CSSProperties => {
    const validationStyle = getValidationStyle();
    if (Object.keys(validationStyle).length > 0) {
      return {
        border: "2px solid transparent",
        ...validationStyle,
      };
    }
    return {
      border: selected ? `2px solid ${colors.ring}` : "2px solid transparent",
      boxShadow: selected ? `0 0 0 2px ${colors.ring}40` : undefined,
    };
  }, [selected, colors.ring, getValidationStyle]);

  return (
    <>
      {/* Keyframes for validation error pulse */}
      <style>{`
        @keyframes validation-error-pulse {
          0%, 100% { box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.8), 0 0 20px 4px rgba(239, 68, 68, 0.4); }
          50% { box-shadow: 0 0 0 3px rgba(239, 68, 68, 1), 0 0 30px 8px rgba(239, 68, 68, 0.6); }
        }
      `}</style>
      <div
        onContextMenu={handleContextMenu}
        className="relative cursor-pointer"
        style={{ width: size, height: size }}
      >
        {/* Circular node */}
        <div
          className="w-full h-full rounded-full flex items-center justify-center shadow-lg transition-colors"
          style={{
            backgroundColor: colors.header,
            ...getNodeStyle(),
          }}
          onClick={handlePlayClick}
        >
          {isRunning ? (
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: colors.text }} />
          ) : (
            <Play className="w-6 h-6 ml-0.5" style={{ color: colors.text }} />
          )}
        </div>

        {/* Output handle on right */}
        <Handle
          type="source"
          position={Position.Right}
          id="output"
          style={{
            background: theme.colors.handles.output,
            border: `2px solid ${theme.colors.handles.border}`,
            width: 10,
            height: 10,
            right: -5,
          }}
        />
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

StartNode.displayName = "StartNode";

export default StartNode;

export function getDefaultStartData(): StartNodeData {
  return {};
}
