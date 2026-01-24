import { useEffect } from "react";
import { useReactFlow } from "@xyflow/react";
import type { HandleTypes } from "@/components/nodes/custom/hooks/useCustomNodeHandleTypes";
import type { CustomNodeData } from "@/components/nodes/CustomNode/types";

export interface UseNodeStateSyncOptions {
  nodeId: string;
  handleTypes: HandleTypes;
  activeTab: string;
  currentHandleTypes: HandleTypes | undefined;
  currentActiveTab: string | undefined;
}

/**
 * Hook that syncs derived state (handleTypes, activeTab) to node.data.
 *
 * This ensures:
 * - handleTypes are updated when schema changes (for connection registry)
 * - activeTab is persisted (for edge opacity calculation via useEdgeTabOpacity)
 */
export function useNodeStateSync({
  nodeId,
  handleTypes,
  activeTab,
  currentHandleTypes,
  currentActiveTab,
}: UseNodeStateSyncOptions): void {
  const { setNodes } = useReactFlow();

  // Sync handleTypes to node.data for the connection registry
  // This ensures stale saved handleTypes are updated when schema changes
  useEffect(() => {
    const handleTypesChanged =
      JSON.stringify(currentHandleTypes) !== JSON.stringify(handleTypes);
    if (handleTypesChanged) {
      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, handleTypes } }
            : node,
        ),
      );
    }
  }, [nodeId, handleTypes, currentHandleTypes, setNodes]);

  // Sync activeTab to node.data for edge opacity calculation
  // This allows the useEdgeTabOpacity hook to know which tab is active
  useEffect(() => {
    if (currentActiveTab !== activeTab) {
      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, activeTab } }
            : node,
        ),
      );
    }
  }, [nodeId, activeTab, currentActiveTab, setNodes]);
}
