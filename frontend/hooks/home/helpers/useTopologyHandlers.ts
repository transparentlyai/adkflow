import { useCallback } from "react";
import type { Node, Edge } from "@xyflow/react";
import type { ReactFlowCanvasRef } from "@/components/ReactFlowCanvas";
import type { TabState, TopologyResponse } from "@/lib/types";
import type { DisplayEvent } from "@/components/RunPanel";
import { getTopology } from "@/lib/api";

interface UseTopologyHandlersProps {
  canvasRef: React.RefObject<ReactFlowCanvasRef | null>;
  currentProjectPath: string | null;
  activeTabId: string | null;
  activeTab: TabState | null;
  workflowName: string;
  isProjectSaved: boolean;
  setIsProjectSaved: (saved: boolean) => void;
  setTopologyResult: (result: TopologyResponse | null) => void;
  setIsTopologySaveDialogOpen: (open: boolean) => void;
  setRunEvents: (events: DisplayEvent[]) => void;
  setLastRunStatus: (status: "completed" | "failed" | "running") => void;
  setIsRunPanelOpen: (open: boolean) => void;
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

export function useTopologyHandlers({
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
}: UseTopologyHandlersProps) {
  const showErrorsInConsole = useCallback(
    (errors: string[]) => {
      canvasRef.current?.clearErrorHighlights();

      const errorEvents: DisplayEvent[] = errors.map((error, i) => ({
        id: `validation-error-${Date.now()}-${i}`,
        type: "run_error" as const,
        content: error,
        timestamp: Date.now(),
      }));

      setRunEvents(errorEvents);
      setLastRunStatus("failed");
      setIsRunPanelOpen(true);
    },
    [canvasRef, setRunEvents, setLastRunStatus, setIsRunPanelOpen],
  );

  const executeShowTopology = useCallback(async () => {
    if (!currentProjectPath) return;

    try {
      const result = await getTopology(currentProjectPath);
      setTopologyResult(result);
    } catch (error) {
      console.error("Failed to get topology:", error);
      showErrorsInConsole([
        `Failed to generate topology: ${(error as Error).message}`,
      ]);
    }
  }, [currentProjectPath, setTopologyResult, showErrorsInConsole]);

  const handleShowTopology = useCallback(async () => {
    if (!currentProjectPath) return;

    if (activeTab?.hasUnsavedChanges || !isProjectSaved) {
      setIsTopologySaveDialogOpen(true);
      return;
    }

    await executeShowTopology();
  }, [
    currentProjectPath,
    activeTab,
    isProjectSaved,
    setIsTopologySaveDialogOpen,
    executeShowTopology,
  ]);

  const handleTopologySaveAndShow = useCallback(async () => {
    setIsTopologySaveDialogOpen(false);

    if (canvasRef.current && activeTabId && currentProjectPath) {
      const flow = canvasRef.current.saveFlow();
      if (flow) {
        const success = await saveTabFlow(
          currentProjectPath,
          activeTabId,
          flow,
          workflowName,
        );
        if (success) {
          setIsProjectSaved(true);
        }
      }
    }

    await executeShowTopology();
  }, [
    canvasRef,
    activeTabId,
    currentProjectPath,
    workflowName,
    setIsTopologySaveDialogOpen,
    setIsProjectSaved,
    saveTabFlow,
    executeShowTopology,
  ]);

  const handleTopologySaveCancel = useCallback(() => {
    setIsTopologySaveDialogOpen(false);
  }, [setIsTopologySaveDialogOpen]);

  return {
    showErrorsInConsole,
    executeShowTopology,
    handleShowTopology,
    handleTopologySaveAndShow,
    handleTopologySaveCancel,
  };
}
