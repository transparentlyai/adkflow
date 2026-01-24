import { useMemo } from "react";
import type { CustomNodeSchema } from "@/components/nodes/CustomNode/types";

interface UseSchemaFieldsParams {
  schema: CustomNodeSchema;
  config: Record<string, unknown>;
}

export function useSchemaFields({ schema, config }: UseSchemaFieldsParams) {
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

  return {
    codeEditorField,
    filePickerField,
    filePath,
    codeContent,
  };
}
