import { useCallback } from "react";
import type { Node, Edge, ReactFlowInstance } from "@xyflow/react";
import type { CustomNodeSchema } from "@/components/nodes/CustomNode";
import {
  stripTransientFieldsFromNodes,
  hydrateNodesWithSchemas,
} from "@/lib/nodeHydration";

interface UseCanvasOperationsParams {
  nodes: Node[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  rfInstance: ReactFlowInstance | null;
  resetPositions: () => void;
  customNodeSchemas?: CustomNodeSchema[];
}

export function useCanvasOperations({
  nodes,
  setNodes,
  setEdges,
  rfInstance,
  resetPositions,
  customNodeSchemas,
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
   * Save flow with transient fields stripped.
   * This produces smaller JSON by removing schema, handleTypes, executionState, etc.
   * These fields are reconstructed on load via restoreFlow.
   */
  const saveFlow = useCallback(() => {
    if (rfInstance) {
      const flow = rfInstance.toObject();
      return {
        ...flow,
        nodes: stripTransientFieldsFromNodes(flow.nodes),
      };
    }
    return null;
  }, [rfInstance]);

  /**
   * Restore flow and hydrate nodes with their schemas.
   * This reconstructs schema, handleTypes, and other derived fields.
   */
  const restoreFlow = useCallback(
    (flow: {
      nodes: Node[];
      edges: Edge[];
      viewport: { x: number; y: number; zoom: number };
    }) => {
      if (!flow) return;

      // Hydrate nodes with schemas (reconstructs schema, handleTypes, etc.)
      const hydratedNodes = hydrateNodesWithSchemas(
        flow.nodes || [],
        customNodeSchemas,
      );

      setNodes(hydratedNodes);
      setEdges(flow.edges || []);

      // Restore viewport after nodes are rendered
      if (rfInstance && flow.viewport) {
        requestAnimationFrame(() => {
          rfInstance.setViewport(flow.viewport);
        });
      }
    },
    [rfInstance, setNodes, setEdges, customNodeSchemas],
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
      // Use rfInstance.getNodes() to always get the latest nodes from React Flow's store
      // This avoids stale closure issues when focusNode is called after restoreFlow
      const currentNodes = rfInstance.getNodes();
      const node = currentNodes.find((n) => n.id === nodeId);
      if (!node) return;

      // Calculate absolute position (child nodes have positions relative to parent)
      let absoluteX = node.position.x;
      let absoluteY = node.position.y;
      if (node.parentId) {
        const parentNode = currentNodes.find((n) => n.id === node.parentId);
        if (parentNode) {
          absoluteX += parentNode.position.x;
          absoluteY += parentNode.position.y;
        }
      }

      // Center on node
      const x = absoluteX + (node.measured?.width ?? 100) / 2;
      const y = absoluteY + (node.measured?.height ?? 50) / 2;
      rfInstance.setCenter(x, y, { zoom: 1, duration: 300 });

      // Select the node
      setNodes((nds) => nds.map((n) => ({ ...n, selected: n.id === nodeId })));
    },
    [rfInstance, setNodes],
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
