"use client";

import { useCallback } from "react";
import { useStore } from "@xyflow/react";
import type { PortDefinition } from "@/components/nodes/CustomNode";

/**
 * Hook to track which inputs are connected and to what source nodes.
 * Returns a record mapping input ID to an array of connected source node display names.
 */
export function useConnectedInputs(
  nodeId: string,
  inputs: PortDefinition[],
): Record<string, string[]> {
  return useStore(
    useCallback(
      (state) => {
        const connections: Record<string, string[]> = {};
        for (const input of inputs) {
          const sources: string[] = [];
          for (const edge of state.edges) {
            if (
              edge.target === nodeId &&
              (edge.targetHandle === input.id || edge.targetHandle === "input")
            ) {
              const sourceNode = state.nodes.find((n) => n.id === edge.source);
              if (sourceNode) {
                const sourceData = sourceNode.data as Record<string, unknown>;
                const config = sourceData?.config as
                  | Record<string, unknown>
                  | undefined;
                const schema = sourceData?.schema as
                  | { label?: string }
                  | undefined;
                const name =
                  (config?.name as string) ||
                  schema?.label ||
                  sourceNode.type ||
                  "Connected";
                sources.push(name);
              }
            }
          }
          if (sources.length > 0) {
            connections[input.id] = sources;
          }
        }
        return connections;
      },
      [nodeId, inputs],
    ),
  );
}
