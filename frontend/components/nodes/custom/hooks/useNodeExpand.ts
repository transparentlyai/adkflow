import { useState, useCallback, useEffect } from "react";
import { useReactFlow } from "@xyflow/react";
import { useConnection } from "@/contexts/ConnectionContext";
import type { CustomNodeData, CustomNodeSchema } from "@/components/nodes/CustomNode/types";

export interface UseNodeExpandOptions {
  nodeId: string;
  schema: CustomNodeSchema;
  initialExpanded: boolean;
}

export interface UseNodeExpandResult {
  isExpanded: boolean;
  toggleExpand: () => void;
}

/**
 * Hook that manages expand/collapse state for CustomNode.
 *
 * Handles:
 * - Toggling expanded state with position persistence
 * - Auto-expanding when requested by ConnectionContext (edge drag from universal handle)
 */
export function useNodeExpand({
  nodeId,
  schema,
  initialExpanded,
}: UseNodeExpandOptions): UseNodeExpandResult {
  const { setNodes } = useReactFlow();
  const { nodeToExpand, clearExpansionRequest } = useConnection();
  const [isExpanded, setIsExpanded] = useState(initialExpanded);

  const toggleExpand = useCallback(() => {
    const newExpanded = !isExpanded;

    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id !== nodeId) return node;

        const nodeData = node.data as unknown as CustomNodeData;
        const currentPosition = node.position;

        if (newExpanded) {
          // Expanding: save current as contractedPosition, restore expandedPosition
          return {
            ...node,
            position: nodeData.expandedPosition ?? currentPosition,
            data: {
              ...node.data,
              contractedPosition: currentPosition,
              isExpanded: true,
            },
          };
        } else {
          // Collapsing: save current as expandedPosition, restore contractedPosition
          return {
            ...node,
            position: nodeData.contractedPosition ?? currentPosition,
            data: {
              ...node.data,
              expandedPosition: currentPosition,
              isExpanded: false,
            },
          };
        }
      }),
    );

    setIsExpanded(newExpanded);
  }, [nodeId, isExpanded, setNodes]);

  // Auto-expand when requested by ConnectionContext (edge drag from universal handle)
  useEffect(() => {
    if (
      nodeToExpand === nodeId &&
      !isExpanded &&
      schema.ui.expandable &&
      // Only expand if node has multiple outputs (single output auto-routes)
      schema.ui.outputs.filter(
        (o) =>
          !schema.ui.handle_layout?.additional_handles?.some(
            (h) => h.id === o.id,
          ),
      ).length > 1
    ) {
      toggleExpand();
      clearExpansionRequest();
      // Cancel the edge drag by dispatching mouseup after expansion
      // This allows user to pick the specific output handle they want
      requestAnimationFrame(() => {
        document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
      });
    } else if (nodeToExpand === nodeId) {
      // Clear even if we didn't expand (single output, already expanded, or not expandable)
      clearExpansionRequest();
    }
  }, [
    nodeToExpand,
    nodeId,
    isExpanded,
    schema.ui.expandable,
    schema.ui.outputs,
    schema.ui.handle_layout?.additional_handles,
    toggleExpand,
    clearExpansionRequest,
  ]);

  return {
    isExpanded,
    toggleExpand,
  };
}
