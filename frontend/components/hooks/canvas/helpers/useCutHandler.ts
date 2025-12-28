import { useCallback } from "react";
import type { Node, Edge } from "@xyflow/react";
import { useClipboard } from "@/contexts/ClipboardContext";

interface UseCutHandlerParams {
  nodes: Node[];
  edges: Edge[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  activeTabId?: string;
  isLocked?: boolean;
  saveSnapshot: () => void;
}

export function useCutHandler({
  nodes,
  edges,
  setNodes,
  setEdges,
  activeTabId,
  isLocked,
  saveSnapshot,
}: UseCutHandlerParams) {
  const { copy } = useClipboard();

  // Cut selected nodes and edges (copy + delete)
  const handleCut = useCallback(() => {
    if (!activeTabId || isLocked) return;

    // Get selected deletable nodes (exclude locked)
    const selectedNodes = nodes.filter(
      (n) =>
        n.selected && !(n.data as { isNodeLocked?: boolean })?.isNodeLocked,
    );
    if (selectedNodes.length === 0) return;

    // Save state for undo before modifying
    saveSnapshot();

    // Copy first (copies all selected, including locked) - clipboard auto-includes children
    copy(nodes, edges, activeTabId);

    // Expand selection to include children of selected groups
    const selectedIds = new Set(selectedNodes.map((n) => n.id));
    const expandedNodes = [...selectedNodes];

    for (const node of nodes) {
      if (
        node.parentId &&
        selectedIds.has(node.parentId) &&
        !selectedIds.has(node.id)
      ) {
        // Include child if it's not locked
        if (!(node.data as { isNodeLocked?: boolean })?.isNodeLocked) {
          expandedNodes.push(node);
          selectedIds.add(node.id);
        }
      }
    }

    // Then delete expanded selection
    const nodeIds = expandedNodes.map((n) => n.id);
    setNodes((nds) => nds.filter((node) => !nodeIds.includes(node.id)));

    // Remove edges connected to deleted nodes
    setEdges((eds) =>
      eds.filter(
        (edge) =>
          !nodeIds.includes(edge.source) && !nodeIds.includes(edge.target),
      ),
    );
  }, [
    nodes,
    edges,
    activeTabId,
    isLocked,
    copy,
    saveSnapshot,
    setNodes,
    setEdges,
  ]);

  return { handleCut };
}
