"use client";

import { memo, useState } from "react";
import { Handle, Position, type NodeProps, useReactFlow } from "@xyflow/react";

const ToolNode = memo(({ data, id, selected }: NodeProps) => {
  const { name = "Tool" } = data as { name?: string };
  const { setNodes } = useReactFlow();
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [newName, setNewName] = useState(name);

  const handleDoubleClick = () => {
    setNewName(name);
    setIsRenameDialogOpen(true);
  };

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
        title={name}
        className={`bg-cyan-600 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-md cursor-pointer hover:bg-cyan-700 transition-all ${
          selected ? "ring-2 ring-cyan-400 shadow-xl" : ""
        }`}
      >
        <div className="text-xs">Tool</div>

        {/* Output Handle */}
        <Handle
          type="source"
          position={Position.Right}
          style={{ width: '10px', height: '10px', backgroundColor: '#0891b2', border: '2px solid white' }}
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
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Rename Tool</h3>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 mb-4"
              placeholder="Tool name"
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
                className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
              >
                Rename
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

ToolNode.displayName = "ToolNode";

export default ToolNode;

/**
 * Default tool data for new nodes
 */
export function getDefaultToolData() {
  return {
    name: "Tool",
  };
}
