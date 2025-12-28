import { useCallback } from "react";
import type { ReactFlowCanvasRef } from "@/components/ReactFlowCanvas";
import type { DisplayEvent } from "@/components/RunPanel";
import { validateWorkflow } from "@/lib/api";

interface UseWorkflowValidationProps {
  canvasRef: React.RefObject<ReactFlowCanvasRef | null>;
  currentProjectPath: string | null;
  setRunEvents: (events: DisplayEvent[]) => void;
  setLastRunStatus: (status: "completed" | "failed" | "running") => void;
  setIsRunPanelOpen: (open: boolean) => void;
}

export function useWorkflowValidation({
  canvasRef,
  currentProjectPath,
  setRunEvents,
  setLastRunStatus,
  setIsRunPanelOpen,
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
    [canvasRef, setRunEvents, setLastRunStatus, setIsRunPanelOpen]
  );

  const handleValidateWorkflow = useCallback(async () => {
    if (!currentProjectPath) return;

    canvasRef.current?.clearErrorHighlights();

    try {
      const result = await validateWorkflow(currentProjectPath);

      if (result.node_errors && Object.keys(result.node_errors).length > 0) {
        canvasRef.current?.highlightErrorNodes(result.node_errors);
      }

      if (result.node_warnings && Object.keys(result.node_warnings).length > 0) {
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
  }, [currentProjectPath, canvasRef, setRunEvents, setLastRunStatus, setIsRunPanelOpen, showErrorsInConsole]);

  return {
    showErrorsInConsole,
    handleValidateWorkflow,
  };
}
