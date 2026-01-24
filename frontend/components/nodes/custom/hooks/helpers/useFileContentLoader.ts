import { useCallback, useEffect, useRef } from "react";
import { flushSync } from "react-dom";
import { useReactFlow } from "@xyflow/react";
import { useProject } from "@/contexts/ProjectContext";
import { readPrompt } from "@/lib/api";
import type { CustomNodeSchema } from "@/components/nodes/CustomNode/types";
import { useSchemaFields } from "./useSchemaFields";
import {
  useFileLoadConfirmation,
  type FileLoadConfirmState,
} from "./useFileLoadConfirmation";

// Re-export for backwards compatibility
export type { FileLoadConfirmState };

interface UseFileContentLoaderParams {
  nodeId: string;
  schema: CustomNodeSchema;
  config: Record<string, unknown>;
  isExpanded: boolean;
  isContentLoaded: boolean;
  setIsContentLoaded: (value: boolean) => void;
  setSavedContent: (value: string | null) => void;
}

export function useFileContentLoader({
  nodeId,
  schema,
  config,
  isExpanded,
  isContentLoaded,
  setIsContentLoaded,
  setSavedContent,
}: UseFileContentLoaderParams) {
  const { setNodes } = useReactFlow();
  const { projectPath } = useProject();

  const { codeEditorField, filePickerField, filePath, codeContent } =
    useSchemaFields({ schema, config });

  // Track the file path we've already processed to avoid duplicate confirmations
  const processedFilePathRef = useRef<string | null>(null);
  const isLoadingRef = useRef(false);

  // Load file content (called directly or after confirmation)
  const loadFileContent = useCallback(
    async (filePathToLoad: string) => {
      if (!codeEditorField || !projectPath) return;

      isLoadingRef.current = true;
      try {
        const response = await readPrompt(projectPath, filePathToLoad);
        processedFilePathRef.current = filePathToLoad;

        // Use flushSync to force synchronous updates for ALL state changes.
        // This ensures React processes the updates immediately and the component
        // tree re-renders with the new content before we mark loading complete.
        flushSync(() => {
          setSavedContent(response.content);
          setIsContentLoaded(true);
        });

        // Update the node config with the loaded content
        setNodes((nodes) =>
          nodes.map((node) =>
            node.id === nodeId
              ? {
                  ...node,
                  data: {
                    ...node.data,
                    config: {
                      ...(node.data.config as Record<string, unknown>),
                      [codeEditorField.id]: response.content,
                    },
                  },
                }
              : node,
          ),
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        processedFilePathRef.current = filePathToLoad;
        setSavedContent(codeContent || "");
        setIsContentLoaded(true);
        if (!errorMessage.includes("not found")) {
          console.error("Failed to load file content:", error);
        }
      } finally {
        isLoadingRef.current = false;
      }
    },
    [
      codeEditorField,
      projectPath,
      nodeId,
      codeContent,
      setNodes,
      setSavedContent,
      setIsContentLoaded,
    ],
  );

  const resetRefs = useCallback(() => {
    processedFilePathRef.current = "";
    isLoadingRef.current = false;
  }, []);

  const {
    fileLoadConfirm,
    showConfirmation,
    handleConfirmLoad,
    handleCancelLoad,
  } = useFileLoadConfirmation({
    nodeId,
    filePickerField,
    setSavedContent,
    setIsContentLoaded,
    loadFileContent,
    onReset: resetRefs,
  });

  // Load content from file when expanded
  useEffect(() => {
    const loadContent = async () => {
      if (!isExpanded || isContentLoaded || isLoadingRef.current) return;
      if (fileLoadConfirm) return; // Wait for confirmation

      // Case 1: Node with code editor AND file path - load from file
      if (codeEditorField && filePath && projectPath) {
        if (processedFilePathRef.current === filePath) {
          setIsContentLoaded(true);
          return;
        }

        // Check if there's existing content that would be overwritten
        const existingContent = codeContent.trim();
        const isNewFileSelection = processedFilePathRef.current !== null;

        if (existingContent && isNewFileSelection) {
          showConfirmation(filePath, existingContent);
          return;
        }

        // Delay loading to give Monaco editor time to mount first
        await new Promise((resolve) => setTimeout(resolve, 200));
        await loadFileContent(filePath);
      }
      // Case 2: Node with code editor but NO file path
      else if (codeEditorField && !filePath) {
        processedFilePathRef.current = "";
        setSavedContent(codeContent || "");
        setIsContentLoaded(true);
      }
      // Case 3: Node without code editor
      else if (!codeEditorField) {
        setSavedContent("");
        setIsContentLoaded(true);
      }
      // Case 4: Code editor + file path but no projectPath
      else if (codeEditorField && filePath && !projectPath) {
        setSavedContent(codeContent || "");
        setIsContentLoaded(true);
      }
    };
    loadContent();
  }, [
    isExpanded,
    isContentLoaded,
    filePath,
    projectPath,
    codeEditorField,
    codeContent,
    fileLoadConfirm,
    loadFileContent,
    showConfirmation,
    setSavedContent,
    setIsContentLoaded,
  ]);

  // Reset content loaded state when file path changes
  useEffect(() => {
    if (filePath) {
      setIsContentLoaded(false);
      setSavedContent(null);
    }
  }, [filePath, setIsContentLoaded, setSavedContent]);

  return {
    codeEditorField,
    filePickerField,
    filePath,
    codeContent,
    fileLoadConfirm,
    handleConfirmLoad,
    handleCancelLoad,
  };
}
