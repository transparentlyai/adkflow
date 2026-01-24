import { useCallback } from "react";
import { useReactFlow } from "@xyflow/react";
import { useCanvasActions } from "@/contexts/CanvasActionsContext";
import type { CustomNodeData } from "@/components/nodes/CustomNode/types";

export interface UseNodeContextMenuActionsOptions {
  nodeId: string;
  isNodeLocked: boolean;
}

export interface UseNodeContextMenuActionsResult {
  handleToggleNodeLock: () => void;
  handleDetach: () => void;
  handleCopy: () => void;
  handleCut: () => void;
  handlePaste: () => void;
  handleDelete: () => void;
  canvasActions: ReturnType<typeof useCanvasActions>;
}

/**
 * Hook that provides context menu action handlers for CustomNode.
 *
 * Extracts the context menu operations (lock, detach, copy, cut, paste, delete)
 * from the main CustomNode component for better separation of concerns.
 */
export function useNodeContextMenuActions({
  nodeId,
  isNodeLocked,
}: UseNodeContextMenuActionsOptions): UseNodeContextMenuActionsResult {
  const { setNodes } = useReactFlow();
  const canvasActions = useCanvasActions();

  const handleToggleNodeLock = useCallback(() => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, isNodeLocked: !isNodeLocked } }
          : node,
      ),
    );
  }, [nodeId, isNodeLocked, setNodes]);

  const handleDetach = useCallback(() => {
    setNodes((nodes) => {
      const currentNode = nodes.find((n) => n.id === nodeId);
      const parentNode = nodes.find((n) => n.id === currentNode?.parentId);
      if (!currentNode || !parentNode) return nodes;

      return nodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              parentId: undefined,
              position: {
                x: currentNode.position.x + parentNode.position.x,
                y: currentNode.position.y + parentNode.position.y,
              },
            }
          : node,
      );
    });
  }, [nodeId, setNodes]);

  const handleCopy = useCallback(() => {
    setNodes((nodes) =>
      nodes.map((n) => ({ ...n, selected: n.id === nodeId })),
    );
    setTimeout(() => canvasActions?.copySelectedNodes(), 0);
  }, [nodeId, setNodes, canvasActions]);

  const handleCut = useCallback(() => {
    setNodes((nodes) =>
      nodes.map((n) => ({ ...n, selected: n.id === nodeId })),
    );
    setTimeout(() => canvasActions?.cutSelectedNodes(), 0);
  }, [nodeId, setNodes, canvasActions]);

  const handlePaste = useCallback(() => {
    canvasActions?.pasteNodes();
  }, [canvasActions]);

  const handleDelete = useCallback(() => {
    setNodes((nodes) => nodes.filter((n) => n.id !== nodeId));
  }, [nodeId, setNodes]);

  return {
    handleToggleNodeLock,
    handleDetach,
    handleCopy,
    handleCut,
    handlePaste,
    handleDelete,
    canvasActions,
  };
}
