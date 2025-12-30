import { useEffect, useRef } from "react";
import type { Node, Edge } from "@xyflow/react";
import type { CustomNodeData } from "@/components/nodes/CustomNode";

/**
 * Hook to apply 30% opacity to edges connected to handles on inactive tabs.
 *
 * When a node has tabs, handles on inactive tabs are still rendered (invisibly)
 * to maintain edge connectivity. This hook applies transparency to those edges
 * to indicate they're connected to a currently hidden handle.
 *
 * An edge becomes transparent if EITHER its source OR target handle is on an
 * inactive tab in its respective node.
 */
export function useEdgeTabOpacity(
  nodes: Node[],
  edges: Edge[],
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>,
) {
  const prevStateRef = useRef<string>("");

  useEffect(() => {
    // Build handle-to-tab map and active tabs for all nodes
    const nodeTabInfo = new Map<
      string,
      { activeTab?: string; handleTabs: Map<string, string> }
    >();

    nodes.forEach((node) => {
      const data = node.data as unknown as CustomNodeData;
      if (!data?.schema?.ui) return;

      const handleTabs = new Map<string, string>();
      data.schema.ui.inputs.forEach((input) => {
        if (input.tab) handleTabs.set(input.id, input.tab);
      });
      data.schema.ui.outputs.forEach((output) => {
        if (output.tab) handleTabs.set(output.id, output.tab);
      });

      nodeTabInfo.set(node.id, {
        activeTab: data.activeTab,
        handleTabs,
      });
    });

    // Check if state changed (only track activeTab changes, not full schema)
    const stateKey = JSON.stringify(
      [...nodeTabInfo.entries()].map(([id, info]) => [id, info.activeTab]),
    );
    if (stateKey === prevStateRef.current) return;
    prevStateRef.current = stateKey;

    // Update edge opacity
    setEdges((eds) =>
      eds.map((edge) => {
        const sourceInfo = nodeTabInfo.get(edge.source);
        const targetInfo = nodeTabInfo.get(edge.target);

        let isHidden = false;

        // Check source handle - is it on an inactive tab?
        if (sourceInfo && edge.sourceHandle) {
          const handleTab = sourceInfo.handleTabs.get(edge.sourceHandle);
          if (
            handleTab &&
            sourceInfo.activeTab &&
            handleTab !== sourceInfo.activeTab
          ) {
            isHidden = true;
          }
        }

        // Check target handle - is it on an inactive tab?
        if (targetInfo && edge.targetHandle) {
          const handleTab = targetInfo.handleTabs.get(edge.targetHandle);
          if (
            handleTab &&
            targetInfo.activeTab &&
            handleTab !== targetInfo.activeTab
          ) {
            isHidden = true;
          }
        }

        const targetOpacity = isHidden ? 0.3 : 1;
        const currentOpacity = edge.style?.opacity ?? 1;

        // Skip update if opacity is already correct
        if (currentOpacity === targetOpacity) return edge;

        return {
          ...edge,
          style: { ...edge.style, opacity: targetOpacity },
        };
      }),
    );
  }, [nodes, edges, setEdges]);
}
