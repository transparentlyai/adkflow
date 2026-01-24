import { useImperativeHandle, type RefObject } from "react";
import type { Node, Edge } from "@xyflow/react";
import type { CustomNodeSchema } from "@/components/nodes/CustomNode";
import { builtinNodeSchemas } from "@/lib/builtinNodeHelpers";
import type { ReactFlowCanvasRef } from "@/components/ReactFlowCanvas.types";

interface NodeCreation {
  addGroupNode: (position?: { x: number; y: number }) => void;
  addLabelNode: (position?: { x: number; y: number }) => void;
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
}

interface CanvasOperations {
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
  fitViewHandler: () => void;
  focusNode: (nodeId: string) => void;
}

interface ExecutionState {
  updateNodeExecutionState: ReactFlowCanvasRef["updateNodeExecutionState"];
  updateToolExecutionState: ReactFlowCanvasRef["updateToolExecutionState"];
  updateCallbackExecutionState: ReactFlowCanvasRef["updateCallbackExecutionState"];
  updateUserInputWaitingState: ReactFlowCanvasRef["updateUserInputWaitingState"];
  clearExecutionState: ReactFlowCanvasRef["clearExecutionState"];
  updateMonitorValue: ReactFlowCanvasRef["updateMonitorValue"];
  clearAllMonitors: ReactFlowCanvasRef["clearAllMonitors"];
}

interface Validation {
  highlightErrorNodes: ReactFlowCanvasRef["highlightErrorNodes"];
  highlightWarningNodes: ReactFlowCanvasRef["highlightWarningNodes"];
  clearErrorHighlights: ReactFlowCanvasRef["clearErrorHighlights"];
}

interface UseCanvasImperativeHandleParams {
  ref: RefObject<ReactFlowCanvasRef | null> | ((instance: ReactFlowCanvasRef | null) => void) | null;
  nodeCreation: NodeCreation;
  canvasOperations: CanvasOperations;
  executionState: ExecutionState;
  validation: Validation;
  customNodeSchemas: CustomNodeSchema[];
}

/**
 * Hook to set up the imperative handle for ReactFlowCanvas.
 * Exposes canvas methods to parent components via ref.
 */
export function useCanvasImperativeHandle({
  ref,
  nodeCreation,
  canvasOperations,
  executionState,
  validation,
  customNodeSchemas,
}: UseCanvasImperativeHandleParams) {
  useImperativeHandle(ref, () => ({
    // Layout nodes (non-schema-driven)
    addGroupNode: nodeCreation.addGroupNode,
    addLabelNode: nodeCreation.addLabelNode,
    // Schema-driven node creation
    addCustomNode: nodeCreation.addCustomNode,
    addBuiltinSchemaNode: nodeCreation.addBuiltinSchemaNode,
    customNodeSchemas,
    builtinNodeSchemas,
    // Canvas operations
    clearCanvas: canvasOperations.clearCanvas,
    saveFlow: canvasOperations.saveFlow,
    restoreFlow: canvasOperations.restoreFlow,
    zoomIn: canvasOperations.zoomIn,
    zoomOut: canvasOperations.zoomOut,
    fitView: canvasOperations.fitViewHandler,
    focusNode: canvasOperations.focusNode,
    // Execution state
    updateNodeExecutionState: executionState.updateNodeExecutionState,
    updateToolExecutionState: executionState.updateToolExecutionState,
    updateCallbackExecutionState: executionState.updateCallbackExecutionState,
    updateUserInputWaitingState: executionState.updateUserInputWaitingState,
    clearExecutionState: executionState.clearExecutionState,
    updateMonitorValue: executionState.updateMonitorValue,
    clearAllMonitors: executionState.clearAllMonitors,
    // Validation
    highlightErrorNodes: validation.highlightErrorNodes,
    highlightWarningNodes: validation.highlightWarningNodes,
    clearErrorHighlights: validation.clearErrorHighlights,
  }));
}
