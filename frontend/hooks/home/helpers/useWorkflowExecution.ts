import { useCallback } from "react";
import type { Node, Edge } from "@xyflow/react";
import type { ReactFlowCanvasRef } from "@/components/ReactFlowCanvas";
import type { TabState } from "@/lib/types";
import type { DisplayEvent } from "@/components/RunPanel";
import { startRun, validateWorkflow } from "@/lib/api";

interface UseWorkflowExecutionProps {
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
  setLastRunStatus: (status: "completed" | "failed" | "running") => void;
  setIsRunConfirmDialogOpen: (open: boolean) => void;
  setIsProjectSaved: (saved: boolean) => void;
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

export function useWorkflowExecution({
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
}: UseWorkflowExecutionProps) {
  const executeRunWorkflow = useCallback(async () => {
    if (!currentProjectPath || isRunning) return;

    canvasRef.current?.clearErrorHighlights();

    try {
      const validation = await validateWorkflow(currentProjectPath);

      if (
        validation.node_errors &&
        Object.keys(validation.node_errors).length > 0
      ) {
        canvasRef.current?.highlightErrorNodes(validation.node_errors);
      }

      if (
        validation.node_warnings &&
        Object.keys(validation.node_warnings).length > 0
      ) {
        canvasRef.current?.highlightWarningNodes(validation.node_warnings);
      }

      if (!validation.valid) {
        const events: DisplayEvent[] = [];

        validation.errors.forEach((error, i) => {
          events.push({
            id: `validation-error-${Date.now()}-${i}`,
            type: "run_error" as const,
            content: error,
            timestamp: Date.now(),
          });
        });

        validation.warnings.forEach((warning, i) => {
          events.push({
            id: `validation-warning-${Date.now()}-${i}`,
            type: "warning" as const,
            content: warning,
            timestamp: Date.now(),
          });
        });

        setRunEvents(events);
        setLastRunStatus("failed");
        setIsRunPanelOpen(true);
        return;
      }
    } catch (error) {
      console.error("Failed to validate:", error);
      const errorEvents: DisplayEvent[] = [
        {
          id: `validation-error-${Date.now()}`,
          type: "run_error" as const,
          content: `Validation failed: ${(error as Error).message}`,
          timestamp: Date.now(),
        },
      ];
      setRunEvents(errorEvents);
      setLastRunStatus("failed");
      setIsRunPanelOpen(true);
      return;
    }

    try {
      setIsRunning(true);
      const response = await startRun({
        project_path: currentProjectPath,
        tab_id: activeTabId ?? undefined,
      });
      setCurrentRunId(response.run_id);
      setIsRunPanelOpen(true);
    } catch (error) {
      console.error("Failed to start run:", error);
      const errorEvents: DisplayEvent[] = [
        {
          id: `run-error-${Date.now()}`,
          type: "run_error" as const,
          content: `Failed to start workflow: ${(error as Error).message}`,
          timestamp: Date.now(),
        },
      ];
      setRunEvents(errorEvents);
      setLastRunStatus("failed");
      setIsRunPanelOpen(true);
      setIsRunning(false);
    }
  }, [
    currentProjectPath,
    isRunning,
    activeTabId,
    canvasRef,
    setIsRunning,
    setCurrentRunId,
    setIsRunPanelOpen,
    setRunEvents,
    setLastRunStatus,
  ]);

  const handleRunWorkflow = useCallback(async () => {
    if (!currentProjectPath || isRunning) return;

    if (activeTab?.hasUnsavedChanges || !isProjectSaved) {
      setIsRunConfirmDialogOpen(true);
      return;
    }

    await executeRunWorkflow();
  }, [
    currentProjectPath,
    isRunning,
    activeTab,
    isProjectSaved,
    setIsRunConfirmDialogOpen,
    executeRunWorkflow,
  ]);

  const handleRunConfirmSaveAndRun = useCallback(async () => {
    setIsRunConfirmDialogOpen(false);

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

    await executeRunWorkflow();
  }, [
    canvasRef,
    activeTabId,
    currentProjectPath,
    workflowName,
    setIsRunConfirmDialogOpen,
    setIsProjectSaved,
    saveTabFlow,
    executeRunWorkflow,
  ]);

  const handleRunConfirmCancel = useCallback(() => {
    setIsRunConfirmDialogOpen(false);
  }, [setIsRunConfirmDialogOpen]);

  return {
    executeRunWorkflow,
    handleRunWorkflow,
    handleRunConfirmSaveAndRun,
    handleRunConfirmCancel,
  };
}
