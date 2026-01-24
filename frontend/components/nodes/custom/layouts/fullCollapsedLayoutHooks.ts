"use client";

import { useCallback, useRef } from "react";
import { useStore } from "@xyflow/react";
import { arraysEqual } from "./collapsedLayoutUtils";

/**
 * Hook to get connected prompt name for a node
 * Only re-renders when the actual prompt name changes
 */
export function useConnectedPromptName(nodeId: string): string | undefined {
  return useStore(
    useCallback(
      (state) => {
        for (const edge of state.edges) {
          if (
            edge.target === nodeId &&
            (edge.targetHandle === "prompt-input" ||
              edge.targetHandle === "input")
          ) {
            const sourceNode = state.nodes.find((n) => n.id === edge.source);
            if (sourceNode && sourceNode.id.startsWith("prompt_")) {
              const promptData = sourceNode.data as {
                prompt?: { name?: string };
              };
              return promptData?.prompt?.name || "Prompt";
            }
          }
        }
        return undefined;
      },
      [nodeId],
    ),
  );
}

/**
 * Hook to get connected tool names for a node
 * Uses ref-based memoization for stable array identity
 */
export function useConnectedToolNames(nodeId: string): string[] {
  const connectedToolNamesRef = useRef<string[]>([]);

  return useStore(
    useCallback(
      (state) => {
        const toolNames: string[] = [];
        for (const edge of state.edges) {
          if (
            edge.target === nodeId &&
            (edge.targetHandle === "tools-input" ||
              edge.targetHandle === "input")
          ) {
            const sourceNode = state.nodes.find((n) => n.id === edge.source);
            if (sourceNode) {
              if (sourceNode.id.startsWith("tool_")) {
                const toolData = sourceNode.data as { name?: string };
                toolNames.push(toolData?.name || "Tool");
              } else if (sourceNode.id.startsWith("agentTool_")) {
                const agentToolData = sourceNode.data as { name?: string };
                toolNames.push(agentToolData?.name || "AgentTool");
              }
            }
          }
        }
        // Only return new array if content changed (shallow comparison)
        if (arraysEqual(connectedToolNamesRef.current, toolNames)) {
          return connectedToolNamesRef.current;
        }
        connectedToolNamesRef.current = toolNames;
        return toolNames;
      },
      [nodeId],
    ),
  );
}
