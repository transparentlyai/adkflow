"use client";

import { memo, useState, useRef, useEffect, useCallback } from "react";
import { NodeResizer, type NodeProps, useReactFlow, useStore } from "@xyflow/react";
import { useProject } from "@/contexts/ProjectContext";
import NodeContextMenu from "@/components/NodeContextMenu";
import { Lock } from "lucide-react";

export interface GroupNodeData extends Record<string, unknown> {
  label: string;
  isNodeLocked?: boolean;
}

const GroupNode = memo(({ data, id, selected, dragging }: NodeProps) => {
  const { label, isNodeLocked } = data as unknown as GroupNodeData;
  const { setNodes } = useReactFlow();
  const { isLocked } = useProject();
  const [isEditing, setIsEditing] = useState(false);
  const [editedLabel, setEditedLabel] = useState(label);
  const inputRef = useRef<HTMLInputElement>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const currentNode = useStore((state) => state.nodes.find((n) => n.id === id));
  const parentId = currentNode?.parentId;

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
    if (isNodeLocked) return;
    setIsEditing(true);
    setEditedLabel(label);
  };

  const handleHeaderContextMenu = (e: React.MouseEvent) => {
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

  const isActive = selected || dragging || isNodeDraggingInside;

  return (
    <>
      <NodeResizer
        minWidth={200}
        minHeight={150}
        isVisible={selected && !isLocked && !isNodeLocked}
        lineClassName="!border-gray-400"
        handleClassName="!w-2 !h-2 !bg-gray-400 !border-gray-400"
      />
      <div
        className="w-full h-full rounded-lg transition-all duration-200 flex flex-col"
        style={{
          minWidth: 200,
          minHeight: 150,
          border: isNodeDraggingInside
            ? '2px solid #9ca3af'
            : isActive
              ? '1px solid #d1d5db'
              : 'none',
          backgroundColor: isNodeDraggingInside
            ? 'rgba(156, 163, 175, 0.15)'
            : dragging
              ? 'rgba(156, 163, 175, 0.08)'
              : 'transparent',
        }}
      >
        <div
          className={`group-drag-handle text-white px-2 py-0.5 rounded-t-md cursor-grab flex items-center gap-1.5 transition-colors ${selected ? 'bg-gray-400' : 'bg-gray-400/60'}`}
          onContextMenu={handleHeaderContextMenu}
        >
          {isNodeLocked && <Lock className="w-3 h-3 flex-shrink-0 opacity-80" />}
          <svg className="w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              className="flex-1 bg-white text-gray-900 px-1.5 py-0.5 rounded text-xs font-medium outline-none nodrag"
            />
          ) : (
            <div
              className="flex-1 font-medium text-xs cursor-pointer hover:opacity-80"
              onDoubleClick={handleDoubleClick}
            >
              {label}
            </div>
          )}
        </div>
        <div className="flex-1">
          {isNodeDraggingInside && (
            <div className="p-2 text-xs text-gray-500/60 text-center italic">
              Drop to group
            </div>
          )}
        </div>
      </div>

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

GroupNode.displayName = "GroupNode";

export default GroupNode;

export function getDefaultGroupData(): GroupNodeData {
  return {
    label: "Group",
  };
}
