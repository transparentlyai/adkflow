import { useCallback } from "react";
import type { ReactFlowInstance } from "@xyflow/react";

interface UseViewportPositionParams {
  rfInstance: ReactFlowInstance | null;
}

export function useViewportPosition({ rfInstance }: UseViewportPositionParams) {
  /**
   * Get the center of the current viewport in flow coordinates
   */
  const getViewportCenter = useCallback(() => {
    if (!rfInstance) {
      return { x: 400, y: 300 };
    }
    const { x, y, zoom } = rfInstance.getViewport();
    // Get the dimensions of the React Flow container
    const domNode = document.querySelector(".react-flow");
    if (!domNode) {
      return { x: 400, y: 300 };
    }
    const { width, height } = domNode.getBoundingClientRect();
    // Calculate center in flow coordinates
    const centerX = (-x + width / 2) / zoom;
    const centerY = (-y + height / 2) / zoom;
    return { x: centerX, y: centerY };
  }, [rfInstance]);

  return { getViewportCenter };
}
