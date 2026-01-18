import { useState, useEffect, useRef } from "react";
import { useReactFlow } from "@xyflow/react";
import type { CustomNodeSchema } from "@/components/nodes/CustomNode/types";
import {
  useFileContentLoader,
  type FileLoadConfirmState,
} from "./helpers/useFileContentLoader";
import { useFileSaveHandler } from "./helpers/useFileSaveHandler";
import { useFilePickerHandler } from "./helpers/useFilePickerHandler";

// Re-export for backward compatibility
export type { FilePickerOptions } from "./helpers/useFilePickerHandler";
export type { FileLoadConfirmState } from "./helpers/useFileContentLoader";

/**
 * Return type for useFileOperations hook
 */
export interface UseFileOperationsResult {
  /** Whether a file save is in progress */
  isSaving: boolean;
  /** The last saved content (for dirty tracking) */
  savedContent: string | null;
  /** Whether content has been loaded from file */
  isContentLoaded: boolean;
  /** Whether the current content differs from saved content */
  isDirty: boolean;
  /** The current file path (from file picker field) */
  filePath: string;
  /** Handler to save the file */
  handleFileSave: () => Promise<void>;
  /** Handler to change the file path via picker */
  handleChangeFile: () => void;
  /** State for file load confirmation dialog */
  fileLoadConfirm: FileLoadConfirmState | null;
  /** Handler to confirm file load */
  handleConfirmLoad: () => void;
  /** Handler to cancel file load */
  handleCancelLoad: () => void;
}

/** File save state from node data (for detecting external saves) */
interface FileSaveStateParam {
  filePath: string;
  content: string;
  isDirty: boolean;
}

/**
 * Hook to manage file operations for nodes with code_editor widget.
 *
 * This hook handles:
 * - Loading content from file when node expands
 * - Tracking dirty state (content differs from saved)
 * - Saving content to file
 * - Changing file path via picker
 *
 * @param nodeId - The node's unique identifier
 * @param schema - The node's schema definition
 * @param config - The node's current configuration
 * @param isExpanded - Whether the node is currently expanded
 * @param externalFileSaveState - File save state from node data (for detecting project-level saves)
 * @returns File operation state and handlers
 */
export function useFileOperations(
  nodeId: string,
  schema: CustomNodeSchema,
  config: Record<string, unknown>,
  isExpanded: boolean,
  externalFileSaveState?: FileSaveStateParam,
): UseFileOperationsResult {
  const { setNodes } = useReactFlow();
  const [isSaving, setIsSaving] = useState(false);
  const [savedContent, setSavedContent] = useState<string | null>(null);
  const [isContentLoaded, setIsContentLoaded] = useState(false);

  // Track last synced state to avoid unnecessary updates
  const lastSyncedRef = useRef<{
    filePath: string;
    content: string;
    isDirty: boolean;
  } | null>(null);

  // Track the last isDirty value we synced to detect external saves
  const lastSyncedIsDirtyRef = useRef<boolean>(false);

  // Use helper hooks
  const {
    codeEditorField,
    filePickerField,
    filePath,
    codeContent,
    fileLoadConfirm,
    handleConfirmLoad,
    handleCancelLoad,
  } = useFileContentLoader({
    nodeId,
    schema,
    config,
    isExpanded,
    isContentLoaded,
    setIsContentLoaded,
    setSavedContent,
  });

  const { handleFileSave } = useFileSaveHandler({
    filePath,
    codeContent,
    codeEditorField,
    setIsSaving,
    setSavedContent,
  });

  const { handleChangeFile } = useFilePickerHandler({
    nodeId,
    filePath,
    filePathFieldId: filePickerField?.id || "file_path",
    config,
    codeEditorField,
  });

  // Track dirty state - only when editing a file (not inline content)
  const isDirty = !!filePath && isContentLoaded && codeContent !== savedContent;

  // Sync dirty state to node data for project-level save
  useEffect(() => {
    // Only sync when we have a file path and content is loaded
    if (!filePath || !isContentLoaded) {
      // Clear fileSaveState if no file path
      if (lastSyncedRef.current !== null) {
        lastSyncedRef.current = null;
        lastSyncedIsDirtyRef.current = false;
        setNodes((nodes) =>
          nodes.map((node) =>
            node.id === nodeId
              ? {
                  ...node,
                  data: {
                    ...node.data,
                    fileSaveState: undefined,
                  },
                }
              : node,
          ),
        );
      }
      return;
    }

    // Check if state has changed
    const newState = { filePath, content: codeContent, isDirty };
    const lastState = lastSyncedRef.current;

    if (
      lastState &&
      lastState.filePath === newState.filePath &&
      lastState.content === newState.content &&
      lastState.isDirty === newState.isDirty
    ) {
      return; // No change, skip update
    }

    // Update refs and sync to node data
    lastSyncedRef.current = newState;
    lastSyncedIsDirtyRef.current = isDirty;
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                fileSaveState: newState,
              },
            }
          : node,
      ),
    );
  }, [nodeId, filePath, codeContent, isDirty, isContentLoaded, setNodes]);

  // Watch for external save (project-level save cleared isDirty in node data)
  useEffect(() => {
    if (!filePath || !isContentLoaded) return;
    // Only check when we previously synced isDirty = true
    if (!lastSyncedIsDirtyRef.current) return;
    // Only process if external state exists and shows not dirty
    if (!externalFileSaveState || externalFileSaveState.isDirty) return;

    // External save happened - update savedContent to clear local dirty state
    setSavedContent(externalFileSaveState.content);
    lastSyncedIsDirtyRef.current = false;
  }, [filePath, isContentLoaded, externalFileSaveState, setSavedContent]);

  return {
    isSaving,
    savedContent,
    isContentLoaded,
    isDirty,
    filePath,
    handleFileSave,
    handleChangeFile,
    fileLoadConfirm,
    handleConfirmLoad,
    handleCancelLoad,
  };
}
