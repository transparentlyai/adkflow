import type { Node, Edge } from "@xyflow/react";
import type { ReactFlowCanvasRef } from "@/components/ReactFlowCanvas";
import type { TabState } from "@/lib/types";
import type { DisplayEvent } from "@/components/RunPanel";
import type { RunStatus, TopologyResponse } from "@/lib/types";
import { useWorkflowExecution } from "./helpers/useWorkflowExecution";
import { useWorkflowValidation } from "./helpers/useWorkflowValidation";
import { useTopologyHandlers } from "./helpers/useTopologyHandlers";
import { useExecutionStateHandlers } from "./helpers/useExecutionStateHandlers";

interface UseRunWorkflowProps {
  canvasRef: React.RefObject<ReactFlowCanvasRef | null>;
  currentProjectPath: string | null;
  activeTabId: string | null;
  activeTab: TabState | null;
  workflowName: string;
  isRunning: boolean;
  isProjectSaved: boolean;
  setIsRunning: (running: boolean) => void;
  setCurrentRunId: (id: string | null) => void;
  setIsRunPanelOpen: (open: boolean) => void;
  setRunEvents: (events: DisplayEvent[]) => void;
  setLastRunStatus: (status: RunStatus) => void;
  setIsRunConfirmDialogOpen: (open: boolean) => void;
  setIsProjectSaved: (saved: boolean) => void;
  setTopologyResult: (result: TopologyResponse | null) => void;
  setIsTopologySaveDialogOpen: (open: boolean) => void;
  setIsValidationSaveDialogOpen: (open: boolean) => void;
  saveTabFlow: (
    projectPath: string,
    tabId: string,
    flow: {
      nodes: Node[];
      edges: Edge[];
      viewport: { x: number; y: number; zoom: number };
    },
    projectName?: string,
  ) => Promise<boolean>;
}

export function useRunWorkflow({
  canvasRef,
  currentProjectPath,
  activeTabId,
  activeTab,
  workflowName,
  isRunning,
  isProjectSaved,
  setIsRunning,
  setCurrentRunId,
  setIsRunPanelOpen,
  setRunEvents,
  setLastRunStatus,
  setIsRunConfirmDialogOpen,
  setIsProjectSaved,
  setTopologyResult,
  setIsTopologySaveDialogOpen,
  setIsValidationSaveDialogOpen,
  saveTabFlow,
}: UseRunWorkflowProps) {
  const executionHandlers = useWorkflowExecution({
    canvasRef,
    currentProjectPath,
    activeTabId,
    activeTab,
    workflowName,
    isRunning,
    isProjectSaved,
    setIsRunning,
    setCurrentRunId,
    setIsRunPanelOpen,
    setRunEvents,
    setLastRunStatus,
    setIsRunConfirmDialogOpen,
    setIsProjectSaved,
    saveTabFlow,
  });

  const validationHandlers = useWorkflowValidation({
    canvasRef,
    currentProjectPath,
    activeTabId,
    activeTab,
    workflowName,
    isProjectSaved,
    setRunEvents,
    setLastRunStatus,
    setIsRunPanelOpen,
    setIsValidationSaveDialogOpen,
    setIsProjectSaved,
    saveTabFlow,
  });

  const topologyHandlers = useTopologyHandlers({
    canvasRef,
    currentProjectPath,
    activeTabId,
    activeTab,
    workflowName,
    isProjectSaved,
    setIsProjectSaved,
    setTopologyResult,
    setIsTopologySaveDialogOpen,
    setRunEvents,
    setLastRunStatus,
    setIsRunPanelOpen,
    saveTabFlow,
  });

  const stateHandlers = useExecutionStateHandlers({
    canvasRef,
    setIsRunning,
    setIsRunPanelOpen,
    setCurrentRunId,
  });

  return {
    handleRunWorkflow: executionHandlers.handleRunWorkflow,
    handleRunConfirmSaveAndRun: executionHandlers.handleRunConfirmSaveAndRun,
    handleRunConfirmCancel: executionHandlers.handleRunConfirmCancel,
    handleValidateWorkflow: validationHandlers.handleValidateWorkflow,
    handleValidationSaveAndValidate:
      validationHandlers.handleValidationSaveAndValidate,
    handleValidationSaveCancel: validationHandlers.handleValidationSaveCancel,
    handleShowTopology: topologyHandlers.handleShowTopology,
    handleTopologySaveAndShow: topologyHandlers.handleTopologySaveAndShow,
    handleTopologySaveCancel: topologyHandlers.handleTopologySaveCancel,
    handleRunComplete: stateHandlers.handleRunComplete,
    handleAgentStateChange: stateHandlers.handleAgentStateChange,
    handleToolStateChange: stateHandlers.handleToolStateChange,
    handleCallbackStateChange: stateHandlers.handleCallbackStateChange,
    handleUserInputStateChange: stateHandlers.handleUserInputStateChange,
    handleClearExecutionState: stateHandlers.handleClearExecutionState,
    handleCloseRunPanel: stateHandlers.handleCloseRunPanel,
  };
}
