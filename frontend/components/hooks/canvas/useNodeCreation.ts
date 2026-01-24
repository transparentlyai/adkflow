import type { Node, ReactFlowInstance } from "@xyflow/react";
import { useViewportPosition } from "./helpers/useViewportPosition";
import { useLayoutNodeCreation } from "./helpers/useLayoutNodeCreation";
import { useSchemaNodeCreation } from "./helpers/useSchemaNodeCreation";

interface UseNodeCreationParams {
  nodes: Node[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  rfInstance: ReactFlowInstance | null;
  activeTabId: string | null;
  // Position state for layout nodes only (group, label)
  groupPosition: { x: number; y: number };
  setGroupPosition: React.Dispatch<
    React.SetStateAction<{ x: number; y: number }>
  >;
  labelPosition: { x: number; y: number };
  setLabelPosition: React.Dispatch<
    React.SetStateAction<{ x: number; y: number }>
  >;
}

export function useNodeCreation({
  nodes,
  setNodes,
  rfInstance,
  activeTabId,
  groupPosition,
  setGroupPosition,
  labelPosition,
  setLabelPosition,
}: UseNodeCreationParams) {
  // Get viewport center helper
  const { getViewportCenter } = useViewportPosition({ rfInstance });

  // Layout node creation (group, label)
  const { addGroupNode, addLabelNode } = useLayoutNodeCreation({
    setNodes,
    groupPosition,
    setGroupPosition,
    labelPosition,
    setLabelPosition,
    activeTabId,
  });

  // Schema-driven node creation (custom and builtin)
  const { addCustomNode, addBuiltinSchemaNode } = useSchemaNodeCreation({
    nodes,
    setNodes,
    getViewportCenter,
    activeTabId,
  });

  return {
    getViewportCenter,
    addGroupNode,
    addLabelNode,
    addCustomNode,
    addBuiltinSchemaNode,
  };
}
