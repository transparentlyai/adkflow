"use client";

import { useCallback } from "react";
import { useStore } from "@xyflow/react";
import type {
  PortDefinition,
  DynamicInputConfig,
} from "@/components/nodes/CustomNode";

/**
 * Hook to track which inputs are connected and to what source/target nodes.
 * Returns a record mapping input ID to an array of connected node display names.
 *
 * For regular inputs (handleType: "target" or undefined): tracks incoming connections
 * For source inputs (handleType: "source"): tracks outgoing connections
 *
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

        // Helper to get node display name
        const getNodeName = (targetNodeId: string): string => {
          const targetNode = state.nodes.find((n) => n.id === targetNodeId);
          if (!targetNode) return "Connected";

          const targetData = targetNode.data as Record<string, unknown>;
          const config = targetData?.config as
            | Record<string, unknown>
            | undefined;
          const schema = targetData?.schema as { label?: string } | undefined;
          return (
            (config?.name as string) ||
            schema?.label ||
            targetNode.type ||
            "Connected"
          );
        };

        // Track static inputs
        for (const input of inputs) {
          const connectedNodes: string[] = [];

          // For source handles (handleType: "source"), track outgoing connections
          if (input.handleType === "source") {
            for (const edge of state.edges) {
              if (edge.source === nodeId && edge.sourceHandle === input.id) {
                connectedNodes.push(getNodeName(edge.target));
              }
            }
          } else {
            // For regular inputs (target handles), track incoming connections
            for (const edge of state.edges) {
              if (
                edge.target === nodeId &&
                (edge.targetHandle === input.id ||
                  edge.targetHandle === "input")
              ) {
                connectedNodes.push(getNodeName(edge.source));
              }
            }
          }

          if (connectedNodes.length > 0) {
            connections[input.id] = connectedNodes;
          }
        }

        // Track dynamic inputs (all types can have connections)
        if (dynamicInputs) {
          for (const di of dynamicInputs) {
            const sources: string[] = [];
            for (const edge of state.edges) {
              if (edge.target === nodeId && edge.targetHandle === di.id) {
                sources.push(getNodeName(edge.source));
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
