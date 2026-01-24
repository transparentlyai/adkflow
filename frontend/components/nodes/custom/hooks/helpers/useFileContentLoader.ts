import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useReactFlow } from "@xyflow/react";
import { useProject } from "@/contexts/ProjectContext";
import { readPrompt } from "@/lib/api";
import type { CustomNodeSchema } from "@/components/nodes/CustomNode/types";

interface UseFileContentLoaderParams {
  nodeId: string;
  schema: CustomNodeSchema;
  config: Record<string, unknown>;
  isExpanded: boolean;
  isContentLoaded: boolean;
  setIsContentLoaded: (value: boolean) => void;
  setSavedContent: (value: string | null) => void;
}

export interface FileLoadConfirmState {
  pendingFilePath: string;
  existingContent: string;
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

  // State for confirmation dialog
  const [fileLoadConfirm, setFileLoadConfirm] =
    useState<FileLoadConfirmState | null>(null);

  // Track the file path we've already processed to avoid duplicate confirmations
  const processedFilePathRef = useRef<string | null>(null);
  const isLoadingRef = useRef(false);

  // Find code_editor field in schema
  const codeEditorField = useMemo(() => {
    return schema.ui.fields.find(
      (f) => f.widget === "code_editor" || f.widget === "monaco_editor",
    );
  }, [schema]);

  // Find file_picker field in schema (for loading file content)
  const filePickerField = useMemo(() => {
    return schema.ui.fields.find((f) => f.widget === "file_picker");
  }, [schema]);

  // Get file path from config (look for file_picker field or legacy file_path)
  const filePath = useMemo(() => {
    if (filePickerField) {
      return (config[filePickerField.id] as string) || "";
    }
    return (config.file_path as string) || "";
  }, [config, filePickerField]);

  // Get current code content from config
  const codeContent = useMemo(() => {
    if (!codeEditorField) return "";
    return (config[codeEditorField.id] as string) || "";
  }, [codeEditorField, config]);

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
        // Without this, the setNodes update might be batched and Monaco won't
        // receive the new value until after it has already mounted with empty content.
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
        if (errorMessage.includes("not found")) {
          processedFilePathRef.current = filePathToLoad;
          setSavedContent(codeContent || "");
          setIsContentLoaded(true);
        } else {
          console.error("Failed to load file content:", error);
          processedFilePathRef.current = filePathToLoad;
          setSavedContent(codeContent || "");
          setIsContentLoaded(true);
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

  // Handle confirmation to load file
  const handleConfirmLoad = useCallback(() => {
    if (!fileLoadConfirm) return;
    setFileLoadConfirm(null);
    loadFileContent(fileLoadConfirm.pendingFilePath);
  }, [fileLoadConfirm, loadFileContent]);

  // Handle cancellation - clear file path and keep existing content
  const handleCancelLoad = useCallback(() => {
    if (!fileLoadConfirm) return;
    const existingContent = fileLoadConfirm.existingContent;
    setFileLoadConfirm(null);
    processedFilePathRef.current = "";
    isLoadingRef.current = false;

    // Clear the file path
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                config: {
                  ...(node.data.config as Record<string, unknown>),
                  [filePickerField?.id || "file_path"]: "",
                },
              },
            }
          : node,
      ),
    );
    setSavedContent(existingContent);
    setIsContentLoaded(true);
  }, [
    fileLoadConfirm,
    filePickerField,
    nodeId,
    setNodes,
    setSavedContent,
    setIsContentLoaded,
  ]);

  // Load content from file when expanded, or initialize dirty tracking for nodes without file
  useEffect(() => {
    const loadContent = async () => {
      if (!isExpanded || isContentLoaded || isLoadingRef.current) {
        return;
      }
      if (fileLoadConfirm) return; // Wait for confirmation

      // Case 1: Node with code editor AND file path - load from file
      if (codeEditorField && filePath && projectPath) {
        // Skip if we've already processed this exact file path
        if (processedFilePathRef.current === filePath) {
          setIsContentLoaded(true);
          return;
        }

        // Check if there's existing content that would be overwritten
        // Only ask for confirmation if this is a NEW file path selection (not initial load)
        const existingContent = codeContent.trim();
        const isNewFileSelection = processedFilePathRef.current !== null;

        if (existingContent && isNewFileSelection) {
          // Show confirmation dialog instead of loading immediately
          setFileLoadConfirm({
            pendingFilePath: filePath,
            existingContent,
          });
          return;
        }

        // Delay loading to give Monaco editor time to mount first
        // This ensures the editor is ready to receive the content update
        await new Promise((resolve) => setTimeout(resolve, 200));
        await loadFileContent(filePath);
      }
      // Case 2: Node with code editor but NO file path - track dirty against current content
      else if (codeEditorField && !filePath) {
        processedFilePathRef.current = "";
        setSavedContent(codeContent || "");
        setIsContentLoaded(true);
      }
      // Case 3: Node without code editor - no dirty tracking needed
      else if (!codeEditorField) {
        setSavedContent("");
        setIsContentLoaded(true);
      }
      // Case 4: Code editor + file path but no projectPath - cannot load file
      else if (codeEditorField && filePath && !projectPath) {
        setSavedContent(codeContent || "");
        setIsContentLoaded(true);
      }
    };
    loadContent();
  }, [
    nodeId,
    isExpanded,
    isContentLoaded,
    filePath,
    projectPath,
    codeEditorField,
    codeContent,
    fileLoadConfirm,
    loadFileContent,
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
    // Confirmation dialog state and handlers
    fileLoadConfirm,
    handleConfirmLoad,
    handleCancelLoad,
  };
}
