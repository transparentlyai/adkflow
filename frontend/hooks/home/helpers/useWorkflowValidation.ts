import { useCallback } from "react";
import type { Node, Edge } from "@xyflow/react";
import type { ReactFlowCanvasRef } from "@/components/ReactFlowCanvas";
import type { TabState } from "@/lib/types";
import type { DisplayEvent } from "@/components/RunPanel";
import { validateWorkflow } from "@/lib/api";

interface UseWorkflowValidationProps {
  canvasRef: React.RefObject<ReactFlowCanvasRef | null>;
  currentProjectPath: string | null;
  activeTabId: string | null;
  activeTab: TabState | null;
  workflowName: string;
  isProjectSaved: boolean;
  setRunEvents: (events: DisplayEvent[]) => void;
  setLastRunStatus: (status: "completed" | "failed" | "running") => void;
  setIsRunPanelOpen: (open: boolean) => void;
  setIsValidationSaveDialogOpen: (open: boolean) => void;
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

export function useWorkflowValidation({
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
}: UseWorkflowValidationProps) {
  const showErrorsInConsole = useCallback(
    (errors: string[], nodeErrors: Record<string, string[]> = {}) => {
      canvasRef.current?.clearErrorHighlights();

      if (Object.keys(nodeErrors).length > 0) {
        canvasRef.current?.highlightErrorNodes(nodeErrors);
      }

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

  const executeValidateWorkflow = useCallback(async () => {
    if (!currentProjectPath) return;

    canvasRef.current?.clearErrorHighlights();

    try {
      const result = await validateWorkflow(currentProjectPath);

      if (result.node_errors && Object.keys(result.node_errors).length > 0) {
        canvasRef.current?.highlightErrorNodes(result.node_errors);
      }

      if (
        result.node_warnings &&
        Object.keys(result.node_warnings).length > 0
      ) {
        canvasRef.current?.highlightWarningNodes(result.node_warnings);
      }

      const events: DisplayEvent[] = [];

      result.errors.forEach((error, i) => {
        events.push({
          id: `validation-error-${Date.now()}-${i}`,
          type: "run_error" as const,
          content: error,
          timestamp: Date.now(),
        });
      });

      result.warnings.forEach((warning, i) => {
        events.push({
          id: `validation-warning-${Date.now()}-${i}`,
          type: "warning" as const,
          content: warning,
          timestamp: Date.now(),
        });
      });

      if (result.valid) {
        events.unshift({
          id: `validation-success-${Date.now()}`,
          type: "info" as const,
          content: `Validation passed (${result.agent_count} agents, ${result.tab_count} tabs)`,
          timestamp: Date.now(),
        });
      }

      setRunEvents(events);
      setLastRunStatus(result.valid ? "completed" : "failed");
      setIsRunPanelOpen(true);
    } catch (error) {
      console.error("Failed to validate:", error);
      showErrorsInConsole([(error as Error).message]);
    }
  }, [
    currentProjectPath,
    canvasRef,
    setRunEvents,
    setLastRunStatus,
    setIsRunPanelOpen,
    showErrorsInConsole,
  ]);

  const handleValidateWorkflow = useCallback(async () => {
    if (!currentProjectPath) return;

    if (activeTab?.hasUnsavedChanges || !isProjectSaved) {
      setIsValidationSaveDialogOpen(true);
      return;
    }

    await executeValidateWorkflow();
  }, [
    currentProjectPath,
    activeTab,
    isProjectSaved,
    setIsValidationSaveDialogOpen,
    executeValidateWorkflow,
  ]);

  const handleValidationSaveAndValidate = useCallback(async () => {
    setIsValidationSaveDialogOpen(false);

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

    await executeValidateWorkflow();
  }, [
    canvasRef,
    activeTabId,
    currentProjectPath,
    workflowName,
    setIsValidationSaveDialogOpen,
    setIsProjectSaved,
    saveTabFlow,
    executeValidateWorkflow,
  ]);

  const handleValidationSaveCancel = useCallback(() => {
    setIsValidationSaveDialogOpen(false);
  }, [setIsValidationSaveDialogOpen]);

  return {
    showErrorsInConsole,
    executeValidateWorkflow,
    handleValidateWorkflow,
    handleValidationSaveAndValidate,
    handleValidationSaveCancel,
  };
}
