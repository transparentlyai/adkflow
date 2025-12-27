"use client";

import { useCallback } from "react";
import { useReactFlow, useStore } from "@xyflow/react";
import { useCanvasActions } from "@/contexts/CanvasActionsContext";
import { useTabs } from "@/contexts/TabsContext";

interface UseTeleportHandlersProps {
  id: string;
  isNodeLocked: boolean | undefined;
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
}

export function useTeleportHandlers({
  id,
  isNodeLocked,
  isExpanded,
  setIsExpanded,
}: UseTeleportHandlersProps) {
  const { setNodes } = useReactFlow();
  const canvasActions = useCanvasActions();
  const { navigateToNode } = useTabs();

  const parentId = useStore(
    useCallback(
      (state) => state.nodes.find((n) => n.id === id)?.parentId,
      [id],
    ),
  );

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

  const handleDoubleClick = useCallback(() => {
    if (isNodeLocked) return;
    const newIsExpanded = !isExpanded;
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id
          ? { ...node, data: { ...node.data, isExpanded: newIsExpanded } }
          : node,
      ),
    );
    setIsExpanded(newIsExpanded);
  }, [id, isExpanded, isNodeLocked, setNodes, setIsExpanded]);

  const handleToggleNodeLock = useCallback(() => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id
          ? { ...node, data: { ...node.data, isNodeLocked: !isNodeLocked } }
          : node,
      ),
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
          : node,
      );
    });
  }, [id, setNodes]);

  const handleNavigateToNode = useCallback(
    (tabId: string, nodeId: string) => {
      setIsExpanded(false);
      setTimeout(() => navigateToNode(tabId, nodeId), 0);
    },
    [navigateToNode, setIsExpanded],
  );

  return {
    parentId,
    canvasActions,
    setNodes,
    handleCopy,
    handleCut,
    handlePaste,
    handleDoubleClick,
    handleToggleNodeLock,
    handleDetach,
    handleNavigateToNode,
  };
}
