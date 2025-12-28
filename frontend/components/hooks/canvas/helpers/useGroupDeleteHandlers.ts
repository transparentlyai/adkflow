import { useCallback } from "react";
import type { Node, Edge } from "@xyflow/react";
import type { GroupDeleteConfirmState } from "./useDialogState";

interface UseGroupDeleteHandlersParams {
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  groupDeleteConfirm: GroupDeleteConfirmState | null;
  setGroupDeleteConfirm: React.Dispatch<
    React.SetStateAction<GroupDeleteConfirmState | null>
  >;
  saveSnapshot: () => void;
}

export function useGroupDeleteHandlers({
  setNodes,
  setEdges,
  groupDeleteConfirm,
  setGroupDeleteConfirm,
  saveSnapshot,
}: UseGroupDeleteHandlersParams) {
  // Handle group delete - delete group only (unparent children)
  const handleGroupDeleteGroupOnly = useCallback(() => {
    if (!groupDeleteConfirm) return;

    // Save state for undo before modifying
    saveSnapshot();

    const { groupIds, otherNodeIds, edgeIds } = groupDeleteConfirm;

    setNodes((nds) => {
      // Find group positions for converting child positions to absolute
      const groupPositions = new Map<string, { x: number; y: number }>();
      for (const node of nds) {
        if (groupIds.includes(node.id)) {
          groupPositions.set(node.id, node.position);
        }
      }

      return nds
        .filter(
          (node) =>
            !groupIds.includes(node.id) && !otherNodeIds.includes(node.id),
        )
        .map((node) => {
          // Unparent children of deleted groups
          if (node.parentId && groupIds.includes(node.parentId)) {
            const parentPos = groupPositions.get(node.parentId);
            return {
              ...node,
              parentId: undefined,
              extent: undefined,
              position: parentPos
                ? {
                    x: node.position.x + parentPos.x,
                    y: node.position.y + parentPos.y,
                  }
                : node.position,
            };
          }
          return node;
        });
    });

    // Remove selected edges and edges connected to deleted nodes (groups and other nodes, not children)
    const deletedNodeIds = [...groupIds, ...otherNodeIds];
    setEdges((eds) =>
      eds.filter(
        (edge) =>
          !edgeIds.includes(edge.id) &&
          !deletedNodeIds.includes(edge.source) &&
          !deletedNodeIds.includes(edge.target),
      ),
    );

    setGroupDeleteConfirm(null);
  }, [
    groupDeleteConfirm,
    saveSnapshot,
    setNodes,
    setEdges,
    setGroupDeleteConfirm,
  ]);

  // Handle group delete - delete all (group + children)
  const handleGroupDeleteAll = useCallback(() => {
    if (!groupDeleteConfirm) return;

    // Save state for undo before modifying
    saveSnapshot();

    const { groupIds, childIds, otherNodeIds, edgeIds } = groupDeleteConfirm;
    const allNodeIds = [...groupIds, ...childIds, ...otherNodeIds];

    setNodes((nds) => nds.filter((node) => !allNodeIds.includes(node.id)));

    // Remove selected edges and edges connected to any deleted nodes
    setEdges((eds) =>
      eds.filter(
        (edge) =>
          !edgeIds.includes(edge.id) &&
          !allNodeIds.includes(edge.source) &&
          !allNodeIds.includes(edge.target),
      ),
    );

    setGroupDeleteConfirm(null);
  }, [
    groupDeleteConfirm,
    saveSnapshot,
    setNodes,
    setEdges,
    setGroupDeleteConfirm,
  ]);

  const handleGroupDeleteCancel = useCallback(() => {
    setGroupDeleteConfirm(null);
  }, [setGroupDeleteConfirm]);

  return {
    handleGroupDeleteGroupOnly,
    handleGroupDeleteAll,
    handleGroupDeleteCancel,
  };
}
