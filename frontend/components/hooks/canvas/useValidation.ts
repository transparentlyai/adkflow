import type { Node } from "@xyflow/react";
import { useValidationHighlights } from "./helpers/useValidationHighlights";
import { useDuplicateNameValidation } from "./helpers/useDuplicateNameValidation";

interface UseValidationParams {
  nodes: Node[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  duplicateErrorNodesRef: React.MutableRefObject<Map<string, string>>;
}

export function useValidation({
  nodes,
  setNodes,
  duplicateErrorNodesRef,
}: UseValidationParams) {
  // Use helper hooks
  const { highlightErrorNodes, highlightWarningNodes, clearErrorHighlights } =
    useValidationHighlights({ setNodes });

  // Run duplicate name validation effect
  useDuplicateNameValidation({ nodes, setNodes, duplicateErrorNodesRef });

  return {
    highlightErrorNodes,
    highlightWarningNodes,
    clearErrorHighlights,
  };
}
