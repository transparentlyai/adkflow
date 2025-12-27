import { useCallback, useEffect } from "react";
import type { Node, Edge } from "@xyflow/react";

interface UseCanvasHistoryParams {
  nodes: Node[];
  edges: Edge[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  undoStackRef: React.MutableRefObject<{ nodes: Node[]; edges: Edge[] }[]>;
  redoStackRef: React.MutableRefObject<{ nodes: Node[]; edges: Edge[] }[]>;
  maxHistorySize: number;
  prevContentRef: React.MutableRefObject<string>;
  onWorkflowChange?: (data: { nodes: Node[]; edges: Edge[] }) => void;
}

export function useCanvasHistory({
  nodes,
  edges,
  setNodes,
  setEdges,
  undoStackRef,
  redoStackRef,
  maxHistorySize,
  prevContentRef,
  onWorkflowChange,
}: UseCanvasHistoryParams) {
  // Helper to strip non-content properties for comparison
  const getContentHash = useCallback((nodes: Node[], edges: Edge[]) => {
    const strippedNodes = nodes.map(({ selected, dragging, ...rest }) => rest);
    return JSON.stringify({ nodes: strippedNodes, edges });
  }, []);

  // Notify parent of workflow changes (only for actual content changes, not selection)
  useEffect(() => {
    if (onWorkflowChange) {
      const currentContent = getContentHash(nodes, edges);
      if (prevContentRef.current && prevContentRef.current !== currentContent) {
        onWorkflowChange({ nodes, edges });
      }
      prevContentRef.current = currentContent;
    }
  }, [nodes, edges, onWorkflowChange, getContentHash, prevContentRef]);

  // Save current state to undo stack before modifying operations
  const saveSnapshot = useCallback(() => {
    const snapshot = { nodes: [...nodes], edges: [...edges] };
    undoStackRef.current.push(snapshot);
    if (undoStackRef.current.length > maxHistorySize) {
      undoStackRef.current.shift();
    }
    // Clear redo stack when new action is performed
    redoStackRef.current = [];
  }, [nodes, edges, undoStackRef, redoStackRef, maxHistorySize]);

  // Undo last action
  const handleUndo = useCallback(() => {
    if (undoStackRef.current.length === 0) return;

    // Save current state to redo stack
    redoStackRef.current.push({ nodes: [...nodes], edges: [...edges] });

    // Restore previous state
    const previousState = undoStackRef.current.pop()!;
    setNodes(previousState.nodes);
    setEdges(previousState.edges);
  }, [nodes, edges, undoStackRef, redoStackRef, setNodes, setEdges]);

  // Redo last undone action
  const handleRedo = useCallback(() => {
    if (redoStackRef.current.length === 0) return;

    // Save current state to undo stack
    undoStackRef.current.push({ nodes: [...nodes], edges: [...edges] });

    // Restore next state
    const nextState = redoStackRef.current.pop()!;
    setNodes(nextState.nodes);
    setEdges(nextState.edges);
  }, [nodes, edges, undoStackRef, redoStackRef, setNodes, setEdges]);

  return {
    getContentHash,
    saveSnapshot,
    handleUndo,
    handleRedo,
  };
}
