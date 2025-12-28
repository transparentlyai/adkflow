import { useCallback } from "react";
import type { Node } from "@xyflow/react";

interface UseValidationHighlightsParams {
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
}

export function useValidationHighlights({
  setNodes,
}: UseValidationHighlightsParams) {
  // Highlight nodes with validation errors and their messages
  const highlightErrorNodes = useCallback(
    (nodeErrors: Record<string, string[]>) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (nodeErrors[node.id]) {
            return {
              ...node,
              data: {
                ...node.data,
                hasValidationError: true,
                validationErrors: nodeErrors[node.id],
              },
            };
          }
          return node;
        }),
      );
    },
    [setNodes],
  );

  // Highlight nodes with validation warnings and their messages
  const highlightWarningNodes = useCallback(
    (nodeWarnings: Record<string, string[]>) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (nodeWarnings[node.id]) {
            return {
              ...node,
              data: {
                ...node.data,
                hasValidationWarning: true,
                validationWarnings: nodeWarnings[node.id],
              },
            };
          }
          return node;
        }),
      );
    },
    [setNodes],
  );

  // Clear validation error and warning highlights
  const clearErrorHighlights = useCallback(() => {
    setNodes((nds) =>
      nds.map((node) => {
        const data = node.data as Record<string, unknown>;
        if (
          data.hasValidationError ||
          data.hasValidationWarning ||
          data.validationErrors ||
          data.validationWarnings
        ) {
          const {
            hasValidationError,
            hasValidationWarning,
            validationErrors,
            validationWarnings,
            ...restData
          } = data;
          return { ...node, data: restData };
        }
        return node;
      }),
    );
  }, [setNodes]);

  return {
    highlightErrorNodes,
    highlightWarningNodes,
    clearErrorHighlights,
  };
}
