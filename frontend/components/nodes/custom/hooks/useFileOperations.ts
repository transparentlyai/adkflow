import { useState } from "react";
import type { CustomNodeSchema } from "@/components/nodes/CustomNode/types";
import { useFileContentLoader } from "./helpers/useFileContentLoader";
import { useFileSaveHandler } from "./helpers/useFileSaveHandler";
import { useFilePickerHandler } from "./helpers/useFilePickerHandler";

// Re-export for backward compatibility
export type { FilePickerOptions } from "./helpers/useFilePickerHandler";

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
  /** Handler to save the file */
  handleFileSave: () => Promise<void>;
  /** Handler to change the file path via picker */
  handleChangeFile: () => void;
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
 * @returns File operation state and handlers
 */
export function useFileOperations(
  nodeId: string,
  schema: CustomNodeSchema,
  config: Record<string, unknown>,
  isExpanded: boolean,
): UseFileOperationsResult {
  const [isSaving, setIsSaving] = useState(false);
  const [savedContent, setSavedContent] = useState<string | null>(null);
  const [isContentLoaded, setIsContentLoaded] = useState(false);

  // Use helper hooks
  const { codeEditorField, filePath, codeContent } = useFileContentLoader({
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
    config,
    codeEditorField,
  });

  // Track dirty state for code editor
  const isDirty = isContentLoaded && codeContent !== savedContent;

  return {
    isSaving,
    savedContent,
    isContentLoaded,
    isDirty,
    handleFileSave,
    handleChangeFile,
  };
}
