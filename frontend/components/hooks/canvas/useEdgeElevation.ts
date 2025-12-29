import { useEffect, useRef } from "react";
import type { Node, Edge } from "@xyflow/react";

const DEFAULT_Z_INDEX = 0; // Behind nodes
const ELEVATED_Z_INDEX = 2000; // Above nodes

export function useEdgeElevation(
  nodes: Node[],
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>,
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

    // Update edge z-index based on connected node selection
    setEdges((eds) =>
      eds.map((edge) => {
        const shouldElevate =
          selectedIds.has(edge.source) || selectedIds.has(edge.target);
        const newZIndex = shouldElevate ? ELEVATED_Z_INDEX : DEFAULT_Z_INDEX;

        // Avoid creating new object if z-index unchanged
        if (edge.zIndex === newZIndex) return edge;
        return { ...edge, zIndex: newZIndex };
      }),
    );
  }, [nodes, setEdges]);
}
