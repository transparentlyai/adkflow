import { useCallback } from "react";
import type { Node } from "@xyflow/react";
import type { NodeExecutionState } from "@/lib/types";
import { sanitizeAgentName } from "@/lib/utils";

interface UseExecutionStateParams {
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
}

export function useExecutionState({ setNodes }: UseExecutionStateParams) {
  // Update node execution state for real-time highlighting
  const updateNodeExecutionState = useCallback(
    (agentName: string, state: NodeExecutionState) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.type !== "agent") return node;
          const data = node.data as Record<string, unknown>;
          const config = data.config as Record<string, unknown> | undefined;
          const nodeName = (config?.name as string) || "";
          const sanitized = sanitizeAgentName(nodeName);
          if (
            nodeName.toLowerCase() === agentName.toLowerCase() ||
            sanitized === agentName
          ) {
            return {
              ...node,
              data: {
                ...data,
                executionState: state,
              },
            };
          }
          return node;
        }),
      );
    },
    [setNodes],
  );

  // Update tool execution state for real-time highlighting
  const updateToolExecutionState = useCallback(
    (toolName: string, state: NodeExecutionState) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.type !== "tool") return node;
          const data = node.data as Record<string, unknown>;
          const config = data.config as Record<string, unknown> | undefined;
          const nodeName = (config?.name as string) || "";
          if (nodeName.toLowerCase() === toolName.toLowerCase()) {
            return {
              ...node,
              data: {
                ...data,
                executionState: state,
              },
            };
          }
          return node;
        }),
      );
    },
    [setNodes],
  );

  // Update callback execution state for real-time highlighting
  const updateCallbackExecutionState = useCallback(
    (callbackName: string, state: NodeExecutionState) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.type !== "callback") return node;
          const data = node.data as Record<string, unknown>;
          const config = data.config as Record<string, unknown> | undefined;
          const nodeName = (config?.name as string) || "";
          if (nodeName.toLowerCase() === callbackName.toLowerCase()) {
            return {
              ...node,
              data: {
                ...data,
                executionState: state,
              },
            };
          }
          return node;
        }),
      );
    },
    [setNodes],
  );

  // Clear all execution states (when run completes)
  const clearExecutionState = useCallback(() => {
    setNodes((nds) =>
      nds.map((node) => {
        if (
          node.type === "agent" ||
          node.type === "tool" ||
          node.type === "callback"
        ) {
          const data = node.data as Record<string, unknown>;
          if (data.executionState && data.executionState !== "idle") {
            return {
              ...node,
              data: { ...data, executionState: "idle" as NodeExecutionState },
            };
          }
        } else if (node.type === "userInput") {
          const data = node.data as Record<string, unknown>;
          if (data.isWaitingForInput) {
            return {
              ...node,
              data: { ...data, isWaitingForInput: false },
            };
          }
        }
        return node;
      }),
    );
  }, [setNodes]);

  // Update user input node waiting state for glow effect
  const updateUserInputWaitingState = useCallback(
    (nodeId: string, isWaiting: boolean) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId && node.type === "userInput") {
            return {
              ...node,
              data: { ...node.data, isWaitingForInput: isWaiting },
            };
          }
          return node;
        }),
      );
    },
    [setNodes],
  );

  return {
    updateNodeExecutionState,
    updateToolExecutionState,
    updateCallbackExecutionState,
    clearExecutionState,
    updateUserInputWaitingState,
  };
}
