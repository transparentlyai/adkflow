import { useCallback, useState } from "react";
import { useReactFlow } from "@xyflow/react";
import type { FieldDefinition } from "@/components/nodes/CustomNode/types";

export interface FileLoadConfirmState {
  pendingFilePath: string;
  existingContent: string;
}

interface UseFileLoadConfirmationParams {
  nodeId: string;
  filePickerField: FieldDefinition | undefined;
  setSavedContent: (value: string | null) => void;
  setIsContentLoaded: (value: boolean) => void;
  loadFileContent: (filePath: string) => Promise<void>;
  onReset: () => void;
}

export function useFileLoadConfirmation({
  nodeId,
  filePickerField,
  setSavedContent,
  setIsContentLoaded,
  loadFileContent,
  onReset,
}: UseFileLoadConfirmationParams) {
  const { setNodes } = useReactFlow();

  const [fileLoadConfirm, setFileLoadConfirm] =
    useState<FileLoadConfirmState | null>(null);

  // Show confirmation dialog
  const showConfirmation = useCallback(
    (pendingFilePath: string, existingContent: string) => {
      setFileLoadConfirm({ pendingFilePath, existingContent });
    },
    [],
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
    onReset();

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
    onReset,
  ]);

  return {
    fileLoadConfirm,
    showConfirmation,
    handleConfirmLoad,
    handleCancelLoad,
  };
}
