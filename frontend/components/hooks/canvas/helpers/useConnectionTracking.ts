import { useCallback } from "react";
import type { Edge, Connection, OnConnectStartParams } from "@xyflow/react";
import type { HandleTypeInfo } from "@/lib/types";
import { isTypeCompatible } from "@/lib/types";
import { useConnection } from "@/contexts/ConnectionContext";

interface UseConnectionTrackingParams {
  handleTypeRegistry: Record<string, HandleTypeInfo>;
}

export function useConnectionTracking({
  handleTypeRegistry,
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

      return isTypeCompatible(
        sourceInfo?.outputSource,
        sourceInfo?.outputType,
        targetInfo?.acceptedSources,
        targetInfo?.acceptedTypes,
      );
    },
    [handleTypeRegistry],
  );

  return {
    onConnectStart,
    onConnectEnd,
    isValidConnection,
  };
}
