"use client";

import { useCallback, useRef } from "react";
import { useStore } from "@xyflow/react";

// Shallow comparison for arrays of strings
function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * Get the display name from a source node
 */
function getSourceNodeName(sourceNode: {
  id: string;
  type?: string;
  data: Record<string, unknown>;
}): string {
  const sourceData = sourceNode.data;
  // Try various patterns for getting the display name
  const schema = sourceData?.schema as { label?: string } | undefined;
  const config = sourceData?.config as { name?: string } | undefined;

  return config?.name || schema?.label || sourceNode.type || "Connected";
}

/**
 * Hook to track connected source node names for specific handle IDs.
 * Returns an object with handle IDs as keys and arrays of connected node names as values.
 */
export function useConnectedHandleNames(
  nodeId: string,
  handleIds: string[],
): Record<string, string[]> {
  // Use ref to implement shallow comparison for the result
  const prevResultRef = useRef<Record<string, string[]>>({});

  return useStore(
    useCallback(
      (state) => {
        const result: Record<string, string[]> = {};

        for (const handleId of handleIds) {
          const names: string[] = [];

          for (const edge of state.edges) {
            // Check if edge targets this node on the specific handle
            // Also check "input" as the generic input handle
            if (
              edge.target === nodeId &&
              (edge.targetHandle === handleId || edge.targetHandle === "input")
            ) {
              const sourceNode = state.nodes.find((n) => n.id === edge.source);
              if (sourceNode) {
                names.push(
                  getSourceNodeName(
                    sourceNode as {
                      id: string;
                      type?: string;
                      data: Record<string, unknown>;
                    },
                  ),
                );
              }
            }
          }

          result[handleId] = names;
        }

        // Shallow comparison to avoid unnecessary re-renders
        let changed = false;
        for (const handleId of handleIds) {
          if (
            !arraysEqual(
              prevResultRef.current[handleId] || [],
              result[handleId],
            )
          ) {
            changed = true;
            break;
          }
        }

        if (changed) {
          prevResultRef.current = result;
          return result;
        }

        return prevResultRef.current;
      },
      [nodeId, handleIds],
    ),
  );
}

/**
 * Hook to get a single connected node name for a handle.
 * Returns undefined if no connection.
 */
export function useConnectedHandleName(
  nodeId: string,
  handleId: string,
): string | undefined {
  return useStore(
    useCallback(
      (state) => {
        for (const edge of state.edges) {
          if (
            edge.target === nodeId &&
            (edge.targetHandle === handleId || edge.targetHandle === "input")
          ) {
            const sourceNode = state.nodes.find((n) => n.id === edge.source);
            if (sourceNode) {
              return getSourceNodeName(
                sourceNode as {
                  id: string;
                  type?: string;
                  data: Record<string, unknown>;
                },
              );
            }
          }
        }
        return undefined;
      },
      [nodeId, handleId],
    ),
  );
}
