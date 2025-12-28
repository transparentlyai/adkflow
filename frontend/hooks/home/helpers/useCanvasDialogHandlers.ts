import { useCallback } from "react";
import type { ReactFlowCanvasRef } from "@/components/ReactFlowCanvas";
import type { FilePickerOptions } from "@/contexts/ProjectContext";
import { readPrompt, savePrompt } from "@/lib/api";
import type { FilePickerState } from "../useHomeState";

interface UseCanvasDialogHandlersProps {
  canvasRef: React.RefObject<ReactFlowCanvasRef | null>;
  currentProjectPath: string | null;
  isClearDialogOpen: boolean;
  setIsClearDialogOpen: (open: boolean) => void;
  filePickerState: FilePickerState;
  setFilePickerState: (state: FilePickerState) => void;
}

export function useCanvasDialogHandlers({
  canvasRef,
  currentProjectPath,
  setIsClearDialogOpen,
  filePickerState,
  setFilePickerState,
}: UseCanvasDialogHandlersProps) {
  // Clear canvas handlers
  const handleClearCanvasClick = useCallback(() => {
    setIsClearDialogOpen(true);
  }, [setIsClearDialogOpen]);

  const handleClearCanvasConfirm = useCallback(() => {
    canvasRef.current?.clearCanvas();
    setIsClearDialogOpen(false);
  }, [canvasRef, setIsClearDialogOpen]);

  const handleClearCanvasCancel = useCallback(() => {
    setIsClearDialogOpen(false);
  }, [setIsClearDialogOpen]);

  // Zoom handlers
  const handleZoomIn = useCallback(() => {
    canvasRef.current?.zoomIn?.();
  }, [canvasRef]);

  const handleZoomOut = useCallback(() => {
    canvasRef.current?.zoomOut?.();
  }, [canvasRef]);

  const handleFitView = useCallback(() => {
    canvasRef.current?.fitView?.();
  }, [canvasRef]);

  // File save handler for editor nodes
  const handleSaveFile = useCallback(
    async (filePath: string, content: string) => {
      if (!currentProjectPath) return;
      await savePrompt(currentProjectPath, filePath, content);
    },
    [currentProjectPath]
  );

  // File picker handlers
  const handleRequestFilePicker = useCallback(
    (currentFilePath: string, onSelect: (newPath: string) => void, options?: FilePickerOptions) => {
      const fullPath =
        currentFilePath && !currentFilePath.startsWith("/") && currentProjectPath
          ? `${currentProjectPath}/${currentFilePath}`
          : currentFilePath;
      setFilePickerState({
        isOpen: true,
        initialPath: fullPath,
        callback: onSelect,
        options,
      });
    },
    [currentProjectPath, setFilePickerState]
  );

  const handleFilePickerSelect = useCallback(
    async (newPath: string) => {
      if (filePickerState.callback && currentProjectPath) {
        try {
          await readPrompt(currentProjectPath, newPath);
          filePickerState.callback(newPath);
        } catch (error) {
          console.error("Failed to read file:", error);
          filePickerState.callback(newPath);
        }
      }
      setFilePickerState({ isOpen: false, callback: null });
    },
    [filePickerState.callback, currentProjectPath, setFilePickerState]
  );

  const handleFilePickerCancel = useCallback(() => {
    setFilePickerState({ isOpen: false, callback: null });
  }, [setFilePickerState]);

  return {
    handleClearCanvasClick,
    handleClearCanvasConfirm,
    handleClearCanvasCancel,
    handleZoomIn,
    handleZoomOut,
    handleFitView,
    handleSaveFile,
    handleRequestFilePicker,
    handleFilePickerSelect,
    handleFilePickerCancel,
  };
}
