import type { ReactFlowCanvasRef } from "@/components/ReactFlowCanvas";
import type { NodeCreationDialogState, FilePickerState } from "./useHomeState";
import {
  useNodeDialogFactory,
  sanitizeForDash,
  sanitizeForUnderscore,
  extractPromptName,
  extractContextName,
  extractPyName,
  extractGenericName,
} from "./helpers/useNodeDialogFactory";
import { useCanvasDialogHandlers } from "./helpers/useCanvasDialogHandlers";

interface UseDialogHandlersProps {
  canvasRef: React.RefObject<ReactFlowCanvasRef | null>;
  currentProjectPath: string | null;
  activeTabId: string | null;
  markTabDirty: (tabId: string) => void;

  // Prompt dialog
  promptDialogState: NodeCreationDialogState;
  setPromptDialogState: (state: NodeCreationDialogState) => void;

  // Context dialog
  contextDialogState: NodeCreationDialogState;
  setContextDialogState: (state: NodeCreationDialogState) => void;

  // Tool dialog
  toolDialogState: NodeCreationDialogState;
  setToolDialogState: (state: NodeCreationDialogState) => void;

  // Process dialog
  processDialogState: NodeCreationDialogState;
  setProcessDialogState: (state: NodeCreationDialogState) => void;

  // Output file dialog
  outputFileDialogState: NodeCreationDialogState;
  setOutputFileDialogState: (state: NodeCreationDialogState) => void;

  // Clear canvas dialog
  isClearDialogOpen: boolean;
  setIsClearDialogOpen: (open: boolean) => void;

  // File picker
  filePickerState: FilePickerState;
  setFilePickerState: (state: FilePickerState) => void;
}

export function useDialogHandlers({
  canvasRef,
  currentProjectPath,
  activeTabId,
  markTabDirty,
  promptDialogState,
  setPromptDialogState,
  contextDialogState,
  setContextDialogState,
  toolDialogState,
  setToolDialogState,
  processDialogState,
  setProcessDialogState,
  outputFileDialogState,
  setOutputFileDialogState,
  isClearDialogOpen,
  setIsClearDialogOpen,
  filePickerState,
  setFilePickerState,
}: UseDialogHandlersProps) {
  // Node dialog handlers using factory
  const promptHandlers = useNodeDialogFactory({
    canvasRef,
    activeTabId,
    markTabDirty,
    dialogState: promptDialogState,
    setDialogState: setPromptDialogState,
    config: {
      nodeType: "prompt",
      fileExtension: ".prompt.md",
      folder: "prompts",
      sanitizeForPath: sanitizeForDash,
      extractNameFromPath: extractPromptName,
    },
  });

  const contextHandlers = useNodeDialogFactory({
    canvasRef,
    activeTabId,
    markTabDirty,
    dialogState: contextDialogState,
    setDialogState: setContextDialogState,
    config: {
      nodeType: "context",
      fileExtension: ".context.md",
      folder: "static",
      sanitizeForPath: sanitizeForDash,
      extractNameFromPath: extractContextName,
    },
  });

  const toolHandlers = useNodeDialogFactory({
    canvasRef,
    activeTabId,
    markTabDirty,
    dialogState: toolDialogState,
    setDialogState: setToolDialogState,
    config: {
      nodeType: "tool",
      fileExtension: ".py",
      folder: "tools",
      sanitizeForPath: sanitizeForUnderscore,
      extractNameFromPath: extractPyName,
    },
  });

  const processHandlers = useNodeDialogFactory({
    canvasRef,
    activeTabId,
    markTabDirty,
    dialogState: processDialogState,
    setDialogState: setProcessDialogState,
    config: {
      nodeType: "process",
      fileExtension: ".py",
      folder: "tools",
      sanitizeForPath: sanitizeForUnderscore,
      extractNameFromPath: extractPyName,
    },
  });

  const outputFileHandlers = useNodeDialogFactory({
    canvasRef,
    activeTabId,
    markTabDirty,
    dialogState: outputFileDialogState,
    setDialogState: setOutputFileDialogState,
    config: {
      nodeType: "outputFile",
      fileExtension: ".txt",
      folder: "outputs",
      sanitizeForPath: sanitizeForDash,
      extractNameFromPath: extractGenericName,
    },
  });

  // Canvas and file picker handlers
  const canvasHandlers = useCanvasDialogHandlers({
    canvasRef,
    currentProjectPath,
    isClearDialogOpen,
    setIsClearDialogOpen,
    filePickerState,
    setFilePickerState,
  });

  return {
    // Prompt
    handleRequestPromptCreation: promptHandlers.handleRequest,
    handleCreatePrompt: promptHandlers.handleCreate,
    handleCancelPromptCreation: promptHandlers.handleCancel,
    handleSelectExistingPrompt: promptHandlers.handleSelectExisting,

    // Context
    handleRequestContextCreation: contextHandlers.handleRequest,
    handleCreateContext: contextHandlers.handleCreate,
    handleCancelContextCreation: contextHandlers.handleCancel,
    handleSelectExistingContext: contextHandlers.handleSelectExisting,

    // Tool
    handleRequestToolCreation: toolHandlers.handleRequest,
    handleCreateTool: toolHandlers.handleCreate,
    handleCancelToolCreation: toolHandlers.handleCancel,
    handleSelectExistingTool: toolHandlers.handleSelectExisting,

    // Process
    handleRequestProcessCreation: processHandlers.handleRequest,
    handleCreateProcess: processHandlers.handleCreate,
    handleCancelProcessCreation: processHandlers.handleCancel,
    handleSelectExistingProcess: processHandlers.handleSelectExisting,

    // Output file
    handleRequestOutputFileCreation: outputFileHandlers.handleRequest,
    handleCreateOutputFile: outputFileHandlers.handleCreate,
    handleCancelOutputFileCreation: outputFileHandlers.handleCancel,
    handleSelectExistingOutputFile: outputFileHandlers.handleSelectExisting,

    // Canvas and file operations
    ...canvasHandlers,
  };
}
