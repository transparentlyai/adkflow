import { useCallback } from "react";
import { useReactFlow } from "@xyflow/react";
import type { CustomNodeData } from "@/components/nodes/CustomNode/types";

export interface UseConfigChangeOptions {
  nodeId: string;
  unitId: string;
  requestModelChange: (model: string) => boolean;
}

export interface UseConfigChangeResult {
  handleConfigChange: (fieldId: string, value: unknown) => void;
  baseConfigChange: (fieldId: string, value: unknown) => void;
}

/**
 * Hook that provides config change handlers for CustomNode.
 *
 * Handles:
 * - Direct config updates (baseConfigChange)
 * - Intercepting model changes for Agent nodes to show confirmation dialog
 *
 * IMPORTANT: We use node.data.config from the setNodes callback parameter,
 * NOT the config prop from the closure. This ensures we always have the
 * latest config even if there are concurrent setNodes updates (e.g., from
 * file sync subscription).
 */
export function useConfigChange({
  nodeId,
  unitId,
  requestModelChange,
}: UseConfigChangeOptions): UseConfigChangeResult {
  const { setNodes } = useReactFlow();

  // Base config change handler - directly updates config
  const baseConfigChange = useCallback(
    (fieldId: string, value: unknown) => {
      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                data: {
                  ...node.data,
                  config: {
                    ...((node.data as unknown as CustomNodeData).config || {}),
                    [fieldId]: value,
                  },
                },
              }
            : node,
        ),
      );
    },
    [nodeId, setNodes],
  );

  // Config change handler - intercepts model changes for confirmation
  const handleConfigChange = useCallback(
    (fieldId: string, value: unknown) => {
      // Intercept model changes for Agent nodes
      if (fieldId === "model" && unitId === "builtin.agent") {
        const dialogShown = requestModelChange(value as string);
        if (dialogShown) {
          // Dialog will handle the change
          return;
        }
      }
      // For all other fields, apply directly
      baseConfigChange(fieldId, value);
    },
    [unitId, requestModelChange, baseConfigChange],
  );

  return {
    handleConfigChange,
    baseConfigChange,
  };
}
