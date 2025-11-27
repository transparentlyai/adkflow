"use client";

import { memo, useState } from "react";
import { type NodeProps, useReactFlow } from "@xyflow/react";

const VariableNode = memo(({ data, id, selected }: NodeProps) => {
  const { name = "variable", value = "" } = data as { name?: string; value?: string };
  const { setNodes } = useReactFlow();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [newName, setNewName] = useState(name);
  const [newValue, setNewValue] = useState(value);

  const handleDoubleClick = () => {
    setNewName(name);
    setNewValue(value);
    setIsEditDialogOpen(true);
  };

  const handleSave = () => {
    if (newName.trim()) {
      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === id
            ? { ...node, data: { ...node.data, name: newName.trim(), value: newValue.trim() } }
            : node
        )
      );
    }
    setIsEditDialogOpen(false);
  };

  const handleCancel = () => {
    setNewName(name);
    setNewValue(value);
    setIsEditDialogOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  const tooltipText = value || "";

  return (
    <>
      <div
        onDoubleClick={handleDoubleClick}
        title={tooltipText}
        className={`bg-violet-600 text-white px-4 py-2 rounded-full shadow-md cursor-pointer hover:bg-violet-700 transition-all ${
          selected ? "ring-2 ring-violet-400 shadow-xl" : ""
        }`}
      >
        <div className="font-medium text-sm whitespace-nowrap">
          {`{${name}}`}
        </div>
      </div>

      {/* Edit Dialog */}
      {isEditDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ pointerEvents: 'auto' }}>
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={handleCancel}
          />
          <div className="relative bg-white rounded-lg shadow-xl p-6" style={{ width: '1000px', maxWidth: '90vw' }}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Variable</h3>

            {/* Inline inputs: name = value */}
            <div className="flex items-center gap-3 mb-4">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={handleKeyDown}
                className="px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                style={{ width: '250px' }}
                placeholder="Variable name"
                autoFocus
              />
              <span className="text-gray-600 font-semibold">=</span>
              <input
                type="text"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                placeholder="Variable value"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

VariableNode.displayName = "VariableNode";

export default VariableNode;

/**
 * Default variable data for new nodes
 */
export function getDefaultVariableData() {
  return {
    name: "variable",
    value: "",
  };
}
