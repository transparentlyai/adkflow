import { useCallback } from "react";
import type { Node, Edge, ReactFlowInstance } from "@xyflow/react";

interface UseCanvasOperationsParams {
  nodes: Node[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  rfInstance: ReactFlowInstance | null;
  resetPositions: () => void;
}

export function useCanvasOperations({
  nodes,
  setNodes,
  setEdges,
  rfInstance,
  resetPositions,
}: UseCanvasOperationsParams) {
  /**
   * Clear the canvas
   */
  const clearCanvas = useCallback(() => {
    setNodes([]);
    setEdges([]);
    resetPositions();
  }, [setNodes, setEdges, resetPositions]);

  /**
   * Save flow using React Flow's native toObject method
   */
  const saveFlow = useCallback(() => {
    if (rfInstance) {
      return rfInstance.toObject();
    }
    return null;
  }, [rfInstance]);

  /**
   * Restore flow using React Flow's native restore pattern
   */
  const restoreFlow = useCallback(
    (flow: {
      nodes: Node[];
      edges: Edge[];
      viewport: { x: number; y: number; zoom: number };
    }) => {
      if (!flow) return;

      // Ensure group nodes have dragHandle set
      const processedNodes = (flow.nodes || []).map((node) => {
        if (node.type === "group") {
          return { ...node, dragHandle: ".group-drag-handle" };
        }
        return node;
      });

      setNodes(processedNodes);
      setEdges(flow.edges || []);

      // Restore viewport after nodes are rendered
      if (rfInstance && flow.viewport) {
        requestAnimationFrame(() => {
          rfInstance.setViewport(flow.viewport);
        });
      }
    },
    [rfInstance, setNodes, setEdges],
  );

  // Zoom methods
  const zoomIn = useCallback(() => {
    if (rfInstance) {
      rfInstance.zoomIn();
    }
  }, [rfInstance]);

  const zoomOut = useCallback(() => {
    if (rfInstance) {
      rfInstance.zoomOut();
    }
  }, [rfInstance]);

  const fitViewHandler = useCallback(() => {
    if (rfInstance) {
      rfInstance.fitView({ padding: 0.1 });
    }
  }, [rfInstance]);

  const focusNode = useCallback(
    (nodeId: string) => {
      if (!rfInstance) return;
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;

      // Center on node
      const x = node.position.x + (node.measured?.width ?? 100) / 2;
      const y = node.position.y + (node.measured?.height ?? 50) / 2;
      rfInstance.setCenter(x, y, { zoom: 1, duration: 300 });

      // Select the node
      setNodes((nds) => nds.map((n) => ({ ...n, selected: n.id === nodeId })));
    },
    [rfInstance, nodes, setNodes],
  );

  return {
    clearCanvas,
    saveFlow,
    restoreFlow,
    zoomIn,
    zoomOut,
    fitViewHandler,
    focusNode,
  };
}
