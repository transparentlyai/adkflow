import { useCallback } from "react";
import type { Node, Edge } from "@xyflow/react";
import { useClipboard } from "@/contexts/ClipboardContext";
import { useCutHandler } from "./helpers/useCutHandler";
import { usePasteHandler } from "./helpers/usePasteHandler";

interface UseClipboardOperationsParams {
  nodes: Node[];
  edges: Edge[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  activeTabId?: string;
  isLocked?: boolean;
  mousePosition: { x: number; y: number } | null;
  saveSnapshot: () => void;
}

export function useClipboardOperations({
  nodes,
  edges,
  setNodes,
  setEdges,
  activeTabId,
  isLocked,
  mousePosition,
  saveSnapshot,
}: UseClipboardOperationsParams) {
  const { copy, hasClipboard } = useClipboard();

  // Copy selected nodes and edges to clipboard
  const handleCopy = useCallback(() => {
    if (!activeTabId) return;
    copy(nodes, edges, activeTabId);
  }, [nodes, edges, activeTabId, copy]);

  // Use helper hooks for cut and paste
  const { handleCut } = useCutHandler({
    nodes,
    edges,
    setNodes,
    setEdges,
    activeTabId,
    isLocked,
    saveSnapshot,
  });

  const { handlePaste } = usePasteHandler({
    setNodes,
    setEdges,
    isLocked,
    mousePosition,
    saveSnapshot,
  });

  return {
    handleCopy,
    handleCut,
    handlePaste,
    hasClipboard,
  };
}
