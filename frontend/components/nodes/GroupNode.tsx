"use client";

import { memo, useState, useRef, useEffect } from "react";
import { NodeResizer, type NodeProps, useReactFlow, useStore } from "@xyflow/react";

export interface GroupNodeData extends Record<string, unknown> {
  label: string;
}

const GroupNode = memo(({ data, id, selected }: NodeProps) => {
  const { label } = data as unknown as GroupNodeData;
  const { setNodes } = useReactFlow();
  const [isEditing, setIsEditing] = useState(false);
  const [editedLabel, setEditedLabel] = useState(label);
  const inputRef = useRef<HTMLInputElement>(null);

  const isNodeDraggingInside = useStore((state) => {
    const groupNode = state.nodes.find((n) => n.id === id);
    if (!groupNode) return false;

    const groupWidth = groupNode.measured?.width ?? (groupNode.style?.width as number) ?? 300;
    const groupHeight = groupNode.measured?.height ?? (groupNode.style?.height as number) ?? 200;

    const draggingNodes = state.nodes.filter(
      (n) => n.dragging && n.type !== "group"
    );

    for (const draggedNode of draggingNodes) {
      const nodeWidth = draggedNode.measured?.width ?? 200;
      const nodeHeight = draggedNode.measured?.height ?? 100;

      let absoluteX = draggedNode.position.x;
      let absoluteY = draggedNode.position.y;

      if (draggedNode.parentId) {
        const parentNode = state.nodes.find((n) => n.id === draggedNode.parentId);
        if (parentNode) {
          absoluteX += parentNode.position.x;
          absoluteY += parentNode.position.y;
        }
      }

      const centerX = absoluteX + nodeWidth / 2;
      const centerY = absoluteY + nodeHeight / 2;

      const isInside =
        centerX >= groupNode.position.x &&
        centerX <= groupNode.position.x + groupWidth &&
        centerY >= groupNode.position.y &&
        centerY <= groupNode.position.y + groupHeight;

      if (isInside) return true;
    }

    return false;
  });

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = () => {
    setIsEditing(true);
    setEditedLabel(label);
  };

  const handleSave = () => {
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
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setEditedLabel(label);
      setIsEditing(false);
    }
  };

  return (
    <>
      <NodeResizer
        minWidth={200}
        minHeight={150}
        isVisible={selected}
        lineClassName="!border-gray-500"
        handleClassName="!w-2 !h-2 !bg-gray-500 !border-gray-500"
      />
      <div
        className={`w-full h-full rounded-lg transition-all duration-200 ${
          isNodeDraggingInside
            ? "border-4 border-gray-500 bg-gray-100/50"
            : selected
              ? "border-2 border-gray-500"
              : "border-2 border-gray-300"
        }`}
        style={{ minWidth: 200, minHeight: 150 }}
      >
        <div
          className="bg-gray-400 text-white px-3 py-2 rounded-t-md cursor-move flex items-center gap-2"
        >
          <svg className="w-4 h-4 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeWidth="2" d="M4 8h16M4 16h16" />
          </svg>
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={editedLabel}
              onChange={(e) => setEditedLabel(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 bg-white text-gray-900 px-2 py-0.5 rounded text-sm font-semibold outline-none"
            />
          ) : (
            <div
              className="flex-1 font-semibold text-sm cursor-pointer hover:opacity-80"
              onDoubleClick={handleDoubleClick}
            >
              {label}
            </div>
          )}
        </div>
        {isNodeDraggingInside && (
          <div className="p-2 text-xs text-gray-500/60 text-center italic">
            Drop to group
          </div>
        )}
      </div>
    </>
  );
});

GroupNode.displayName = "GroupNode";

export default GroupNode;

export function getDefaultGroupData(): GroupNodeData {
  return {
    label: "Group",
  };
}
