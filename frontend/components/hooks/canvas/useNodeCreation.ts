import type { Node, ReactFlowInstance } from "@xyflow/react";
import { useViewportPosition } from "./helpers/useViewportPosition";
import { useLayoutNodeCreation } from "./helpers/useLayoutNodeCreation";
import { useSchemaNodeCreation } from "./helpers/useSchemaNodeCreation";

interface UseNodeCreationParams {
  nodes: Node[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  rfInstance: ReactFlowInstance | null;
  activeTabId: string | null;
  // Position state and setters
  groupPosition: { x: number; y: number };
  setGroupPosition: React.Dispatch<
    React.SetStateAction<{ x: number; y: number }>
  >;
  labelPosition: { x: number; y: number };
  setLabelPosition: React.Dispatch<
    React.SetStateAction<{ x: number; y: number }>
  >;
  // Note: Other position states are kept for backward compatibility but not used here
  agentPosition: { x: number; y: number };
  setAgentPosition: React.Dispatch<
    React.SetStateAction<{ x: number; y: number }>
  >;
  promptPosition: { x: number; y: number };
  setPromptPosition: React.Dispatch<
    React.SetStateAction<{ x: number; y: number }>
  >;
  contextPosition: { x: number; y: number };
  setContextPosition: React.Dispatch<
    React.SetStateAction<{ x: number; y: number }>
  >;
  inputProbePosition: { x: number; y: number };
  setInputProbePosition: React.Dispatch<
    React.SetStateAction<{ x: number; y: number }>
  >;
  outputProbePosition: { x: number; y: number };
  setOutputProbePosition: React.Dispatch<
    React.SetStateAction<{ x: number; y: number }>
  >;
  logProbePosition: { x: number; y: number };
  setLogProbePosition: React.Dispatch<
    React.SetStateAction<{ x: number; y: number }>
  >;
  outputFilePosition: { x: number; y: number };
  setOutputFilePosition: React.Dispatch<
    React.SetStateAction<{ x: number; y: number }>
  >;
  toolPosition: { x: number; y: number };
  setToolPosition: React.Dispatch<
    React.SetStateAction<{ x: number; y: number }>
  >;
  agentToolPosition: { x: number; y: number };
  setAgentToolPosition: React.Dispatch<
    React.SetStateAction<{ x: number; y: number }>
  >;
  variablePosition: { x: number; y: number };
  setVariablePosition: React.Dispatch<
    React.SetStateAction<{ x: number; y: number }>
  >;
  processPosition: { x: number; y: number };
  setProcessPosition: React.Dispatch<
    React.SetStateAction<{ x: number; y: number }>
  >;
  teleportOutPosition: { x: number; y: number };
  setTeleportOutPosition: React.Dispatch<
    React.SetStateAction<{ x: number; y: number }>
  >;
  teleportInPosition: { x: number; y: number };
  setTeleportInPosition: React.Dispatch<
    React.SetStateAction<{ x: number; y: number }>
  >;
  userInputPosition: { x: number; y: number };
  setUserInputPosition: React.Dispatch<
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
