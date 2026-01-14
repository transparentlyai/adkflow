import { useCallback } from "react";
import type { Edge, Connection, OnConnectStartParams } from "@xyflow/react";
import type { HandleTypeInfo } from "@/lib/types";
import { isTypeCompatible } from "@/lib/types";
import { useConnection } from "@/contexts/ConnectionContext";

interface UseConnectionTrackingParams {
  handleTypeRegistry: Record<string, HandleTypeInfo>;
  edges: Edge[];
}

export function useConnectionTracking({
  handleTypeRegistry,
  edges,
}: UseConnectionTrackingParams) {
  const { startConnection, endConnection, expandNodeForConnection } =
    useConnection();

  // Track drag start to update connection context for visual feedback
  const onConnectStart = useCallback(
    (_event: MouseEvent | TouchEvent, params: OnConnectStartParams) => {
      const key = `${params.nodeId}:${params.handleId}`;
      const typeInfo = handleTypeRegistry[key];
      if (
        typeInfo?.outputSource &&
        typeInfo?.outputType &&
        params.nodeId &&
        params.handleId
      ) {
        startConnection(
          params.nodeId,
          params.handleId,
          typeInfo.outputSource,
          typeInfo.outputType,
        );

        // Auto-expand node when dragging from universal "output" handle
        // This allows user to pick the specific handle they want
        if (params.handleId === "output") {
          expandNodeForConnection(params.nodeId);
        }
      }
    },
    [handleTypeRegistry, startConnection, expandNodeForConnection],
  );

  // Clear drag state when connection ends
  const onConnectEnd = useCallback(() => {
    endConnection();
  }, [endConnection]);

  // Validate connection types - centralized validation for performance
  const isValidConnection = useCallback(
    (connection: Edge | Connection) => {
      // Prevent self-connections
      if (connection.source === connection.target) return false;

      const sourceKey = `${connection.source}:${connection.sourceHandle ?? ""}`;
      const targetKey = `${connection.target}:${connection.targetHandle ?? ""}`;

      const sourceInfo = handleTypeRegistry[sourceKey];
      const targetInfo = handleTypeRegistry[targetKey];

      // Check type compatibility first
      const typeCompatible = isTypeCompatible(
        sourceInfo?.outputSource,
        sourceInfo?.outputType,
        targetInfo?.acceptedSources,
        targetInfo?.acceptedTypes,
      );

      if (!typeCompatible) return false;

      // Check multiplicity constraint for target handle
      // If multiple: false, only allow one connection to the handle
      if (targetInfo?.multiple === false) {
        const existingConnection = edges.find(
          (edge) =>
            edge.target === connection.target &&
            edge.targetHandle === connection.targetHandle,
        );
        if (existingConnection) return false;
      }

      return true;
    },
    [handleTypeRegistry, edges],
  );

  return {
    onConnectStart,
    onConnectEnd,
    isValidConnection,
  };
}
