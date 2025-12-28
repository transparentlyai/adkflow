import { useCallback } from "react";
import { useReactFlow } from "@xyflow/react";
import { useProject } from "@/contexts/ProjectContext";

/**
 * Options for file picker dialog
 */
export interface FilePickerOptions {
  extensions: string[];
  filterLabel: string;
}

interface UseFilePickerHandlerParams {
  nodeId: string;
  filePath: string;
  config: Record<string, unknown>;
  codeEditorField: { id: string; language?: string } | undefined;
}

export function useFilePickerHandler({
  nodeId,
  filePath,
  config,
  codeEditorField,
}: UseFilePickerHandlerParams) {
  const { setNodes } = useReactFlow();
  const { onRequestFilePicker } = useProject();

  // Change file handler
  const handleChangeFile = useCallback(() => {
    if (!onRequestFilePicker) return;

    // Determine file extensions based on language
    const language = codeEditorField?.language || "python";
    const extensionMap: Record<string, FilePickerOptions> = {
      python: { extensions: [".py"], filterLabel: "Python files" },
      markdown: { extensions: [".md", ".txt"], filterLabel: "Markdown files" },
      json: { extensions: [".json"], filterLabel: "JSON files" },
      yaml: { extensions: [".yaml", ".yml"], filterLabel: "YAML files" },
      javascript: {
        extensions: [".js", ".jsx"],
        filterLabel: "JavaScript files",
      },
      typescript: {
        extensions: [".ts", ".tsx"],
        filterLabel: "TypeScript files",
      },
    };
    const options = extensionMap[language] || {
      extensions: [".*"],
      filterLabel: "All files",
    };

    onRequestFilePicker(
      filePath,
      (newPath) => {
        setNodes((nodes) =>
          nodes.map((node) =>
            node.id === nodeId
              ? {
                  ...node,
                  data: {
                    ...node.data,
                    config: { ...config, file_path: newPath },
                  },
                }
              : node,
          ),
        );
      },
      options,
    );
  }, [
    onRequestFilePicker,
    filePath,
    codeEditorField,
    nodeId,
    config,
    setNodes,
  ]);

  return { handleChangeFile };
}
