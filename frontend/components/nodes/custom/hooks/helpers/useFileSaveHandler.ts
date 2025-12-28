import { useCallback } from "react";
import { useProject } from "@/contexts/ProjectContext";

interface UseFileSaveHandlerParams {
  filePath: string;
  codeContent: string;
  codeEditorField: { id: string } | undefined;
  setIsSaving: (value: boolean) => void;
  setSavedContent: (value: string) => void;
}

export function useFileSaveHandler({
  filePath,
  codeContent,
  codeEditorField,
  setIsSaving,
  setSavedContent,
}: UseFileSaveHandlerParams) {
  const { onSaveFile } = useProject();

  // Save file handler
  const handleFileSave = useCallback(async () => {
    if (!onSaveFile || !filePath || !codeEditorField) return;
    setIsSaving(true);
    try {
      await onSaveFile(filePath, codeContent);
      setSavedContent(codeContent);
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setIsSaving(false);
    }
  }, [onSaveFile, filePath, codeContent, codeEditorField, setIsSaving, setSavedContent]);

  return { handleFileSave };
}
