import { useCallback } from "react";
import type { ReactFlowCanvasRef } from "@/components/ReactFlowCanvas";
import type { NodeCreationDialogState } from "../useHomeState";

interface NodeDialogConfig {
  nodeType: string;
  fileExtension: string;
  folder: string;
  sanitizeForPath: (name: string) => string;
  extractNameFromPath: (filePath: string) => string;
}

interface UseNodeDialogFactoryProps {
  canvasRef: React.RefObject<ReactFlowCanvasRef | null>;
  activeTabId: string | null;
  markTabDirty: (tabId: string) => void;
  dialogState: NodeCreationDialogState;
  setDialogState: (state: NodeCreationDialogState) => void;
  config: NodeDialogConfig;
}

export function useNodeDialogFactory({
  canvasRef,
  activeTabId,
  markTabDirty,
  dialogState,
  setDialogState,
  config,
}: UseNodeDialogFactoryProps) {
  const handleRequest = useCallback(
    (position: { x: number; y: number }) => {
      setDialogState({ isOpen: true, position });
    },
    [setDialogState]
  );

  const handleCreate = useCallback(
    (name: string) => {
      const sanitizedName = config.sanitizeForPath(name);
      const filePath = `${config.folder}/${sanitizedName}${config.fileExtension}`;

      if (canvasRef.current) {
        canvasRef.current.addBuiltinSchemaNode(config.nodeType, dialogState.position, {
          name,
          file_path: filePath,
        });
      }

      setDialogState({ isOpen: false });
      if (activeTabId) {
        markTabDirty(activeTabId);
      }
    },
    [canvasRef, dialogState.position, activeTabId, markTabDirty, setDialogState, config]
  );

  const handleCancel = useCallback(() => {
    setDialogState({ isOpen: false });
  }, [setDialogState]);

  const handleSelectExisting = useCallback(
    (filePath: string) => {
      const name = config.extractNameFromPath(filePath);

      if (canvasRef.current) {
        canvasRef.current.addBuiltinSchemaNode(config.nodeType, dialogState.position, {
          name,
          file_path: filePath,
        });
      }

      setDialogState({ isOpen: false });
      if (activeTabId) {
        markTabDirty(activeTabId);
      }
    },
    [canvasRef, dialogState.position, activeTabId, markTabDirty, setDialogState, config]
  );

  return {
    handleRequest,
    handleCreate,
    handleCancel,
    handleSelectExisting,
  };
}

// Pre-configured sanitizers
export const sanitizeForDash = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");

export const sanitizeForUnderscore = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "_");

// Pre-configured name extractors
export const extractPromptName = (filePath: string) => {
  const fileName = filePath.split("/").pop() || filePath;
  return fileName.replace(/\.prompt\.md$/, "").replace(/\.md$/, "");
};

export const extractContextName = (filePath: string) => {
  const fileName = filePath.split("/").pop() || filePath;
  return fileName.replace(/\.context\.md$/, "").replace(/\.md$/, "");
};

export const extractPyName = (filePath: string) => {
  const fileName = filePath.split("/").pop() || filePath;
  return fileName.replace(/\.py$/, "");
};

export const extractGenericName = (filePath: string) => {
  const fileName = filePath.split("/").pop() || filePath;
  return fileName.replace(/\.[^/.]+$/, "");
};
