import { useCallback } from "react";
import type { Node, Edge } from "@xyflow/react";
import { useReactFlow } from "@xyflow/react";
import { useClipboard } from "@/contexts/ClipboardContext";
import { generateNodeId } from "@/lib/workflowHelpers";

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
  const { screenToFlowPosition } = useReactFlow();
  const { clipboard, copy, hasClipboard } = useClipboard();

  // Copy selected nodes and edges to clipboard
  const handleCopy = useCallback(() => {
    if (!activeTabId) return;
    copy(nodes, edges, activeTabId);
  }, [nodes, edges, activeTabId, copy]);

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

  // Paste nodes and edges from clipboard at cursor position
  const handlePaste = useCallback(
    (pastePosition?: { x: number; y: number }) => {
      if (!clipboard || clipboard.nodes.length === 0) return;
      if (isLocked) return;

      // Save state for undo before modifying
      saveSnapshot();

      // Create ID mapping: old ID -> new ID
      const idMap = new Map<string, string>();
      clipboard.nodes.forEach((node) => {
        const prefix = node.id.split("_")[0] || "node";
        idMap.set(node.id, generateNodeId(prefix));
      });

      // Identify top-level nodes (no parent or parent not in clipboard)
      const topLevelNodes = clipboard.nodes.filter(
        (n) => !n.parentId || !idMap.has(n.parentId),
      );

      // Calculate the bounding box center of top-level nodes only
      const minX = Math.min(...topLevelNodes.map((n) => n.position.x));
      const minY = Math.min(...topLevelNodes.map((n) => n.position.y));
      const maxX = Math.max(...topLevelNodes.map((n) => n.position.x));
      const maxY = Math.max(...topLevelNodes.map((n) => n.position.y));
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;

      // Use provided position, tracked mouse position, or fallback to offset
      let targetPosition: { x: number; y: number };
      if (pastePosition) {
        targetPosition = pastePosition;
      } else if (mousePosition) {
        targetPosition = screenToFlowPosition(mousePosition);
      } else {
        // Fallback: offset from original position
        targetPosition = { x: centerX + 50, y: centerY + 50 };
      }

      // Calculate offset to move nodes so their center is at target position
      const offsetX = targetPosition.x - centerX;
      const offsetY = targetPosition.y - centerY;

      // Create new nodes with new IDs
      // Only apply offset to top-level nodes; children keep their relative positions
      const newNodes: Node[] = clipboard.nodes.map((node) => {
        const hasParentInClipboard = node.parentId && idMap.has(node.parentId);
        return {
          ...node,
          id: idMap.get(node.id)!,
          position: hasParentInClipboard
            ? node.position // Keep relative position for children
            : {
                x: node.position.x + offsetX,
                y: node.position.y + offsetY,
              },
          selected: true,
          // Preserve parent relationship and extent, or clear if parent not in selection
          parentId: hasParentInClipboard
            ? idMap.get(node.parentId!)
            : undefined,
          extent: hasParentInClipboard ? node.extent : undefined,
        };
      });

      // Sort nodes: parents must come before children in React Flow
      const sortedNewNodes = newNodes.sort((a, b) => {
        const aHasParent = !!a.parentId;
        const bHasParent = !!b.parentId;
        if (aHasParent && !bHasParent) return 1;
        if (!aHasParent && bHasParent) return -1;
        return 0;
      });

      // Create new edges with updated source/target IDs
      const newEdges: Edge[] = clipboard.edges.map((edge) => ({
        ...edge,
        id: generateNodeId("edge"),
        source: idMap.get(edge.source)!,
        target: idMap.get(edge.target)!,
        selected: false,
      }));

      // Deselect existing nodes, add new ones
      setNodes((nds) => [
        ...nds.map((n) => ({ ...n, selected: false })),
        ...sortedNewNodes,
      ]);
      setEdges((eds) => [...eds, ...newEdges]);
    },
    [
      clipboard,
      isLocked,
      mousePosition,
      screenToFlowPosition,
      saveSnapshot,
      setNodes,
      setEdges,
    ],
  );

  return {
    handleCopy,
    handleCut,
    handlePaste,
    hasClipboard,
  };
}
