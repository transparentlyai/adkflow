"use client";

import { memo, useState, useCallback } from "react";
import { type NodeProps, useReactFlow, useStore } from "@xyflow/react";
import type { HandlePositions } from "@/lib/types";
import DraggableHandle from "@/components/DraggableHandle";
import NodeContextMenu from "@/components/NodeContextMenu";
import { Lock } from "lucide-react";
import ValidationIndicator from "@/components/nodes/ValidationIndicator";
import { useCanvasActions } from "@/contexts/CanvasActionsContext";
import { useTheme } from "@/contexts/ThemeContext";

interface AgentToolNodeData {
  name?: string;
  handlePositions?: HandlePositions;
  isNodeLocked?: boolean;
  hasDuplicateNameError?: boolean;
  validationErrors?: string[];
  validationWarnings?: string[];
}

const AgentToolNode = memo(({ data, id, selected }: NodeProps) => {
  const { name = "Agent Tool", handlePositions, isNodeLocked, hasDuplicateNameError, validationErrors, validationWarnings } = data as AgentToolNodeData;
  const { setNodes } = useReactFlow();
  const canvasActions = useCanvasActions();
  const { theme } = useTheme();

  const handleCopy = useCallback(() => {
    setNodes((nodes) => nodes.map((n) => ({ ...n, selected: n.id === id })));
    setTimeout(() => canvasActions?.copySelectedNodes(), 0);
  }, [id, setNodes, canvasActions]);

  const handleCut = useCallback(() => {
    setNodes((nodes) => nodes.map((n) => ({ ...n, selected: n.id === id })));
    setTimeout(() => canvasActions?.cutSelectedNodes(), 0);
  }, [id, setNodes, canvasActions]);

  const handlePaste = useCallback(() => {
    canvasActions?.pasteNodes();
  }, [canvasActions]);

  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [newName, setNewName] = useState(name);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  // Optimized selector: only subscribe to parentId changes for this specific node
  const parentId = useStore(
    useCallback((state) => state.nodes.find((n) => n.id === id)?.parentId, [id])
  );

  const handleDoubleClick = () => {
    if (isNodeLocked) return;
    setNewName(name);
    setIsRenameDialogOpen(true);
  };

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

  const handleRename = () => {
    if (newName.trim()) {
      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === id
            ? { ...node, data: { ...node.data, name: newName.trim() } }
            : node
        )
      );
    }
    setIsRenameDialogOpen(false);
  };

  const handleCancel = () => {
    setNewName(name);
    setIsRenameDialogOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleRename();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  return (
    <>
      <div
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        title={name}
        className="rounded-lg w-12 h-12 flex flex-col items-center justify-center shadow-md cursor-pointer transition-all"
        style={{
          backgroundColor: theme.colors.nodes.agentTool.header,
          color: theme.colors.nodes.agentTool.text,
          ...(hasDuplicateNameError ? {
            boxShadow: `0 0 0 2px #ef4444, 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)`,
          } : selected ? {
            boxShadow: `0 0 0 2px ${theme.colors.nodes.agentTool.ring}, 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)`,
          } : {}),
        }}
        onMouseEnter={(e) => {
          if (!selected && theme.colors.nodes.agentTool.headerHover) {
            e.currentTarget.style.backgroundColor = theme.colors.nodes.agentTool.headerHover;
          }
        }}
        onMouseLeave={(e) => {
          if (!selected) {
            e.currentTarget.style.backgroundColor = theme.colors.nodes.agentTool.header;
          }
        }}
      >
        {isNodeLocked ? (
          <Lock className="w-4 h-4 opacity-80" />
        ) : (
          <>
            <ValidationIndicator
              errors={validationErrors}
              warnings={validationWarnings}
              duplicateNameError={hasDuplicateNameError}
            />
            <div className="text-xs leading-tight">Agent</div>
            <div className="text-xs leading-tight">Tool</div>
          </>
        )}

        {/* Output Handle */}
        <DraggableHandle
          nodeId={id}
          handleId="output"
          type="source"
          defaultEdge="right"
          defaultPercent={50}
          handlePositions={handlePositions}
          style={{ width: '8px', height: '8px', backgroundColor: theme.colors.handles.agentTool, border: `2px solid ${theme.colors.handles.border}` }}
        />
      </div>

      {/* Rename Dialog */}
      {isRenameDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ pointerEvents: 'auto' }}>
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={handleCancel}
          />
          <div
            className="relative rounded-lg shadow-xl p-6 w-96"
            style={{
              backgroundColor: theme.colors.ui.card,
              color: theme.colors.ui.cardForeground,
            }}
          >
            <h3 className="text-lg font-semibold mb-4">Rename Agent Tool</h3>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-3 py-2 rounded-lg mb-4 focus:outline-none focus:ring-2"
              style={{
                backgroundColor: theme.colors.ui.background,
                color: theme.colors.ui.foreground,
                border: `1px solid ${theme.colors.ui.border}`,
              }}
              onFocus={(e) => {
                e.target.style.borderColor = theme.colors.nodes.agentTool.ring;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = theme.colors.ui.border;
              }}
              placeholder="Agent Tool name"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={handleCancel}
                className="px-4 py-2 rounded-lg transition-colors"
                style={{
                  border: `1px solid ${theme.colors.ui.border}`,
                  color: theme.colors.ui.foreground,
                  backgroundColor: theme.colors.ui.background,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.colors.ui.muted;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = theme.colors.ui.background;
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleRename}
                className="px-4 py-2 rounded-lg transition-colors"
                style={{
                  backgroundColor: theme.colors.nodes.agentTool.header,
                  color: theme.colors.nodes.agentTool.text,
                }}
                onMouseEnter={(e) => {
                  if (theme.colors.nodes.agentTool.headerHover) {
                    e.currentTarget.style.backgroundColor = theme.colors.nodes.agentTool.headerHover;
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = theme.colors.nodes.agentTool.header;
                }}
              >
                Rename
              </button>
            </div>
          </div>
        </div>
      )}

      {contextMenu && (
        <NodeContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          isLocked={!!isNodeLocked}
          onToggleLock={handleToggleNodeLock}
          onClose={() => setContextMenu(null)}
          onDetach={parentId ? handleDetach : undefined}
          onCopy={handleCopy}
          onCut={handleCut}
          onPaste={handlePaste}
          hasClipboard={canvasActions?.hasClipboard}
          isCanvasLocked={canvasActions?.isLocked}
        />
      )}
    </>
  );
});

AgentToolNode.displayName = "AgentToolNode";

export default AgentToolNode;

/**
 * Default agent tool data for new nodes
 */
export function getDefaultAgentToolData() {
  return {
    name: "Agent Tool",
  };
}
