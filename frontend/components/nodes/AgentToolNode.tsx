"use client";

import { memo, useState, useCallback } from "react";
import { type NodeProps, useReactFlow, useStore } from "@xyflow/react";
import type { HandlePositions } from "@/lib/types";
import DraggableHandle from "@/components/DraggableHandle";
import NodeContextMenu from "@/components/NodeContextMenu";
import { Lock } from "lucide-react";

interface AgentToolNodeData {
  name?: string;
  handlePositions?: HandlePositions;
  isNodeLocked?: boolean;
}

const AgentToolNode = memo(({ data, id, selected }: NodeProps) => {
  const { name = "Agent Tool", handlePositions, isNodeLocked } = data as AgentToolNodeData;
  const { setNodes } = useReactFlow();
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [newName, setNewName] = useState(name);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const currentNode = useStore((state) => state.nodes.find((n) => n.id === id));
  const parentId = currentNode?.parentId;

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
        className={`bg-amber-600 text-white rounded-lg w-12 h-12 flex flex-col items-center justify-center shadow-md cursor-pointer hover:bg-amber-700 transition-all ${
          selected ? "ring-2 ring-amber-400 shadow-xl" : ""
        }`}
      >
        {isNodeLocked ? (
          <Lock className="w-4 h-4 opacity-80" />
        ) : (
          <>
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
          style={{ width: '8px', height: '8px', backgroundColor: '#d97706', border: '2px solid white' }}
        />
      </div>

      {/* Rename Dialog */}
      {isRenameDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ pointerEvents: 'auto' }}>
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={handleCancel}
          />
          <div className="relative bg-white rounded-lg shadow-xl p-6 w-96">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Rename Agent Tool</h3>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 mb-4"
              placeholder="Agent Tool name"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRename}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
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
