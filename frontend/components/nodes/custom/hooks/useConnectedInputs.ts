"use client";

import { useCallback } from "react";
import { useStore } from "@xyflow/react";
import type { PortDefinition } from "@/components/nodes/CustomNode";

/**
 * Hook to track which inputs are connected and to what source nodes.
 * Returns a record mapping input ID to the connected source node's display name.
 */
export function useConnectedInputs(
  nodeId: string,
  inputs: PortDefinition[],
): Record<string, string> {
  return useStore(
    useCallback(
      (state) => {
        const connections: Record<string, string> = {};
        for (const input of inputs) {
          for (const edge of state.edges) {
            if (
              edge.target === nodeId &&
              (edge.targetHandle === input.id || edge.targetHandle === "input")
            ) {
              const sourceNode = state.nodes.find((n) => n.id === edge.source);
              if (sourceNode) {
                const sourceData = sourceNode.data as Record<string, unknown>;
                const name =
                  (sourceData?.agent as { name?: string })?.name ||
                  (sourceData?.prompt as { name?: string })?.name ||
                  (sourceData?.schema as { label?: string })?.label ||
                  sourceNode.type ||
                  "Connected";
                connections[input.id] = name;
                break;
              }
            }
          }
        }
        return connections;
      },
      [nodeId, inputs],
    ),
  );
}
