import { useCallback } from "react";
import type { ReactFlowCanvasRef } from "@/components/ReactFlowCanvas";
import type { RunStatus, NodeExecutionState } from "@/lib/types";

interface UseExecutionStateHandlersProps {
  canvasRef: React.RefObject<ReactFlowCanvasRef | null>;
  setIsRunning: (running: boolean) => void;
  setIsRunPanelOpen: (open: boolean) => void;
  setCurrentRunId: (id: string | null) => void;
}

export function useExecutionStateHandlers({
  canvasRef,
  setIsRunning,
  setIsRunPanelOpen,
  setCurrentRunId,
}: UseExecutionStateHandlersProps) {
  const handleRunComplete = useCallback(
    (status: RunStatus) => {
      setIsRunning(false);
    },
    [setIsRunning],
  );

  const handleAgentStateChange = useCallback(
    (agentName: string, state: NodeExecutionState) => {
      canvasRef.current?.updateNodeExecutionState(agentName, state);
    },
    [canvasRef],
  );

  const handleToolStateChange = useCallback(
    (toolName: string, state: NodeExecutionState) => {
      canvasRef.current?.updateToolExecutionState(toolName, state);
    },
    [canvasRef],
  );

  const handleCallbackStateChange = useCallback(
    (callbackName: string, state: NodeExecutionState) => {
      canvasRef.current?.updateCallbackExecutionState(callbackName, state);
    },
    [canvasRef],
  );

  const handleUserInputStateChange = useCallback(
    (nodeId: string, isWaiting: boolean) => {
      canvasRef.current?.updateUserInputWaitingState(nodeId, isWaiting);
    },
    [canvasRef],
  );

  const handleClearExecutionState = useCallback(() => {
    canvasRef.current?.clearExecutionState();
  }, [canvasRef]);

  const handleCloseRunPanel = useCallback(() => {
    setIsRunPanelOpen(false);
    setCurrentRunId(null);
    setIsRunning(false);
    canvasRef.current?.clearExecutionState();
    canvasRef.current?.clearErrorHighlights();
  }, [canvasRef, setIsRunPanelOpen, setCurrentRunId, setIsRunning]);

  const handleMonitorUpdate = useCallback(
    (nodeId: string, value: string, valueType: string, timestamp: string) => {
      canvasRef.current?.updateMonitorValue(
        nodeId,
        value,
        valueType,
        timestamp,
      );
    },
    [canvasRef],
  );

  const handleClearAllMonitors = useCallback(() => {
    canvasRef.current?.clearAllMonitors();
  }, [canvasRef]);

  return {
    handleRunComplete,
    handleAgentStateChange,
    handleToolStateChange,
    handleCallbackStateChange,
    handleUserInputStateChange,
    handleClearExecutionState,
    handleCloseRunPanel,
    handleMonitorUpdate,
    handleClearAllMonitors,
  };
}
