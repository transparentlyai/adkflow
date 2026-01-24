import type { Node, Edge } from "@xyflow/react";
import type { CustomNodeSchema } from "@/components/nodes/CustomNode";
import type { NodeExecutionState } from "@/lib/types";

export interface ReactFlowCanvasProps {
  onWorkflowChange?: (data: { nodes: Node[]; edges: Edge[] }) => void;
  onRequestPromptCreation?: (position: { x: number; y: number }) => void;
  onRequestContextCreation?: (position: { x: number; y: number }) => void;
  onRequestToolCreation?: (position: { x: number; y: number }) => void;
  onRequestProcessCreation?: (position: { x: number; y: number }) => void;
  onRequestOutputFileCreation?: (position: { x: number; y: number }) => void;
  isLocked?: boolean;
  onToggleLock?: () => void;
  activeTabId?: string;
  onSave?: () => void;
}

export interface ReactFlowCanvasRef {
  // Layout nodes (non-schema-driven)
  addGroupNode: (position?: { x: number; y: number }) => void;
  addLabelNode: (position?: { x: number; y: number }) => void;
  // Schema-driven node creation
  addCustomNode: (
    schema: CustomNodeSchema,
    position?: { x: number; y: number }
  ) => string;
  addBuiltinSchemaNode: (
    nodeType: string,
    position?: { x: number; y: number },
    configOverrides?: Record<string, unknown>,
    parentGroupId?: string
  ) => string | null;
  customNodeSchemas: CustomNodeSchema[];
  builtinNodeSchemas: readonly CustomNodeSchema[];
  clearCanvas: () => void;
  saveFlow: () => {
    nodes: Node[];
    edges: Edge[];
    viewport: { x: number; y: number; zoom: number };
  } | null;
  restoreFlow: (flow: {
    nodes: Node[];
    edges: Edge[];
    viewport: { x: number; y: number; zoom: number };
  }) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  fitView: () => void;
  focusNode: (nodeId: string) => void;
  updateNodeExecutionState: (
    agentName: string,
    state: NodeExecutionState
  ) => void;
  updateToolExecutionState: (
    toolName: string,
    state: NodeExecutionState
  ) => void;
  updateCallbackExecutionState: (
    callbackName: string,
    state: NodeExecutionState
  ) => void;
  updateUserInputWaitingState: (nodeId: string, isWaiting: boolean) => void;
  clearExecutionState: () => void;
  highlightErrorNodes: (nodeErrors: Record<string, string[]>) => void;
  highlightWarningNodes: (nodeWarnings: Record<string, string[]>) => void;
  clearErrorHighlights: () => void;
  updateMonitorValue: (
    nodeId: string,
    value: string,
    valueType: string,
    timestamp: string
  ) => void;
  clearAllMonitors: () => void;
}
