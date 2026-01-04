"use client";

import { useCallback } from "react";
import { useStore } from "@xyflow/react";
import type {
  PortDefinition,
  DynamicInputConfig,
} from "@/components/nodes/CustomNode";

/**
 * Hook to track which inputs are connected and to what source nodes.
 * Returns a record mapping input ID to an array of connected source node display names.
 * Supports both static inputs from schema and dynamic inputs of type 'node'.
 */
export function useConnectedInputs(
  nodeId: string,
  inputs: PortDefinition[],
  dynamicInputs?: DynamicInputConfig[],
): Record<string, string[]> {
  return useStore(
    useCallback(
      (state) => {
        const connections: Record<string, string[]> = {};

        // Helper to get source node display name
        const getSourceName = (sourceNodeId: string): string => {
          const sourceNode = state.nodes.find((n) => n.id === sourceNodeId);
          if (!sourceNode) return "Connected";

          const sourceData = sourceNode.data as Record<string, unknown>;
          const config = sourceData?.config as
            | Record<string, unknown>
            | undefined;
          const schema = sourceData?.schema as { label?: string } | undefined;
          return (
            (config?.name as string) ||
            schema?.label ||
            sourceNode.type ||
            "Connected"
          );
        };

        // Track static inputs
        for (const input of inputs) {
          const sources: string[] = [];
          for (const edge of state.edges) {
            if (
              edge.target === nodeId &&
              (edge.targetHandle === input.id || edge.targetHandle === "input")
            ) {
              sources.push(getSourceName(edge.source));
            }
          }
          if (sources.length > 0) {
            connections[input.id] = sources;
          }
        }

        // Track dynamic inputs of type 'node'
        if (dynamicInputs) {
          const nodeInputs = dynamicInputs.filter(
            (di) => di.inputType === "node",
          );
          for (const di of nodeInputs) {
            const sources: string[] = [];
            for (const edge of state.edges) {
              if (edge.target === nodeId && edge.targetHandle === di.id) {
                sources.push(getSourceName(edge.source));
              }
            }
            if (sources.length > 0) {
              connections[di.id] = sources;
            }
          }
        }

        return connections;
      },
      [nodeId, inputs, dynamicInputs],
    ),
  );
}
