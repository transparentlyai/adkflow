import { useCallback, useRef } from "react";
import { useReactFlow, type Node, type Viewport } from "@xyflow/react";

/**
 * Hook for Alt+Click zoom shortcut:
 * - Alt+Click on node: saves current viewport, then zooms to fit the clicked node
 * - Alt+Click on canvas: restores the previously saved viewport (if any)
 */
export function useAltClickZoom() {
  const { getViewport, setViewport, fitView } = useReactFlow();
  const savedViewportRef = useRef<Viewport | null>(null);

  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      if (!event.altKey) return;

      // Save current viewport before zooming
      savedViewportRef.current = getViewport();

      // Zoom to fit the clicked node
      fitView({
        nodes: [node],
        padding: 0.2,
        duration: 300,
      });
    },
    [getViewport, fitView],
  );

  const onPaneClick = useCallback(
    (event: React.MouseEvent) => {
      if (!event.altKey) return;

      // Restore saved viewport if available
      if (savedViewportRef.current) {
        setViewport(savedViewportRef.current, { duration: 300 });
        savedViewportRef.current = null;
      }
    },
    [setViewport],
  );

  return {
    onNodeClick,
    onPaneClick,
  };
}
