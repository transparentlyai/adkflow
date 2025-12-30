import { useEffect, useRef } from "react";
import type { Node, Edge } from "@xyflow/react";

interface EdgeColors {
  default: string;
  connected: string;
}

export function useEdgeHighlight(
  nodes: Node[],
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>,
  colors: EdgeColors,
) {
  const prevSelectedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Get current selected node IDs
    const selectedIds = new Set(
      nodes.filter((n) => n.selected).map((n) => n.id),
    );

    // Only update if selection changed
    const prevIds = prevSelectedIdsRef.current;
    const changed =
      selectedIds.size !== prevIds.size ||
      [...selectedIds].some((id) => !prevIds.has(id));

    if (!changed) return;
    prevSelectedIdsRef.current = selectedIds;

    // Update edge stroke color based on connected node selection
    setEdges((eds) =>
      eds.map((edge) => {
        const isConnected =
          selectedIds.has(edge.source) || selectedIds.has(edge.target);
        const targetColor = isConnected ? colors.connected : colors.default;

        // Get current stroke color from edge style
        const currentStroke = edge.style?.stroke;

        // Skip if color is already correct
        if (currentStroke === targetColor) return edge;

        // Preserve existing style properties (strokeWidth, strokeDasharray, etc.)
        // Only update the stroke color
        return {
          ...edge,
          style: {
            ...edge.style,
            stroke: targetColor,
          },
        };
      }),
    );
  }, [nodes, setEdges, colors.connected, colors.default]);
}
