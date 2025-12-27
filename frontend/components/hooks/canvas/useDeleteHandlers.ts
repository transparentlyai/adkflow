import { useCallback } from "react";
import type { Node, Edge } from "@xyflow/react";
import type {
  DeleteConfirmState,
  GroupDeleteConfirmState,
} from "./useCanvasState";

interface UseDeleteHandlersParams {
  nodes: Node[];
  edges: Edge[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  deleteConfirm: DeleteConfirmState | null;
  setDeleteConfirm: React.Dispatch<
    React.SetStateAction<DeleteConfirmState | null>
  >;
  groupDeleteConfirm: GroupDeleteConfirmState | null;
  setGroupDeleteConfirm: React.Dispatch<
    React.SetStateAction<GroupDeleteConfirmState | null>
  >;
  saveSnapshot: () => void;
  isLocked?: boolean;
}

export function useDeleteHandlers({
  nodes,
  edges,
  setNodes,
  setEdges,
  deleteConfirm,
  setDeleteConfirm,
  groupDeleteConfirm,
  setGroupDeleteConfirm,
  saveSnapshot,
  isLocked,
}: UseDeleteHandlersParams) {
  // Handle delete confirmation
  const handleDeleteConfirm = useCallback(() => {
    if (!deleteConfirm) return;

    // Save state for undo before modifying
    saveSnapshot();

    const { nodeIds, edgeIds } = deleteConfirm;

    // Remove selected nodes
    if (nodeIds.length > 0) {
      setNodes((nds) => nds.filter((node) => !nodeIds.includes(node.id)));
    }

    // Remove selected edges and edges connected to deleted nodes
    setEdges((eds) =>
      eds.filter(
        (edge) =>
          !edgeIds.includes(edge.id) &&
          !nodeIds.includes(edge.source) &&
          !nodeIds.includes(edge.target),
      ),
    );

    setDeleteConfirm(null);
  }, [deleteConfirm, saveSnapshot, setNodes, setEdges, setDeleteConfirm]);

  const handleDeleteCancel = useCallback(() => {
    setDeleteConfirm(null);
  }, [setDeleteConfirm]);

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

  // Handle delete action (used by keyboard shortcut and context menu)
  const handleDelete = useCallback(() => {
    if (isLocked) return;

    // Find selected nodes and edges, excluding locked nodes
    const selectedNodes = nodes.filter((node) => node.selected);
    const deletableNodes = selectedNodes.filter(
      (node) => !(node.data as { isNodeLocked?: boolean })?.isNodeLocked,
    );
    const lockedNodeCount = selectedNodes.length - deletableNodes.length;
    const selectedEdges = edges.filter((edge) => edge.selected);

    if (deletableNodes.length === 0 && selectedEdges.length === 0) return;

    // Check if any selected deletable node is a group with children
    const selectedGroupIds = deletableNodes
      .filter((n) => n.type === "group")
      .map((n) => n.id);
    const childrenOfSelectedGroups = nodes.filter(
      (n) => n.parentId && selectedGroupIds.includes(n.parentId),
    );

    if (childrenOfSelectedGroups.length > 0) {
      // Show group delete dialog with options
      const otherNodeIds = deletableNodes
        .filter((n) => n.type !== "group")
        .map((n) => n.id);
      setGroupDeleteConfirm({
        groupIds: selectedGroupIds,
        childIds: childrenOfSelectedGroups.map((n) => n.id),
        otherNodeIds,
        edgeIds: selectedEdges.map((edge) => edge.id),
      });
    } else {
      // Build confirmation message for regular delete
      const nodeCount = deletableNodes.length;
      const edgeCount = selectedEdges.length;

      let message = "";
      if (nodeCount > 0 && edgeCount > 0) {
        message = `Are you sure you want to delete ${nodeCount} node${nodeCount !== 1 ? "s" : ""} and ${edgeCount} connection${edgeCount !== 1 ? "s" : ""}?`;
      } else if (nodeCount > 0) {
        message =
          nodeCount === 1
            ? "Are you sure you want to delete this node?"
            : `Are you sure you want to delete ${nodeCount} nodes?`;
      } else {
        message =
          edgeCount === 1
            ? "Are you sure you want to delete this connection?"
            : `Are you sure you want to delete ${edgeCount} connections?`;
      }

      if (lockedNodeCount > 0) {
        message += ` (${lockedNodeCount} locked node${lockedNodeCount !== 1 ? "s" : ""} will be skipped)`;
      }

      // Store data for confirmation dialog
      setDeleteConfirm({
        nodeIds: deletableNodes.map((node) => node.id),
        edgeIds: selectedEdges.map((edge) => edge.id),
        message,
      });
    }
  }, [nodes, edges, isLocked, setDeleteConfirm, setGroupDeleteConfirm]);

  return {
    handleDeleteConfirm,
    handleDeleteCancel,
    handleGroupDeleteGroupOnly,
    handleGroupDeleteAll,
    handleGroupDeleteCancel,
    handleDelete,
  };
}
