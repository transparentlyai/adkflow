import { useEffect, useMemo } from "react";
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

  // Find code_editor field in schema
  const codeEditorField = useMemo(() => {
    return schema.ui.fields.find(
      (f) => f.widget === "code_editor" || f.widget === "monaco_editor",
    );
  }, [schema]);

  // Get file path from config (look for file_path field)
  const filePath = useMemo(() => {
    return (config.file_path as string) || "";
  }, [config.file_path]);

  // Get current code content from config
  const codeContent = useMemo(() => {
    if (!codeEditorField) return "";
    return (config[codeEditorField.id] as string) || "";
  }, [codeEditorField, config]);

  // Load content from file when expanded, or initialize dirty tracking for nodes without file
  useEffect(() => {
    const loadContent = async () => {
      if (!isExpanded || isContentLoaded) return;

      // Case 1: Node with code editor AND file path - load from file
      if (codeEditorField && filePath && projectPath) {
        try {
          const response = await readPrompt(projectPath, filePath);
          // Update config with loaded content
          setNodes((nodes) =>
            nodes.map((node) =>
              node.id === nodeId
                ? {
                    ...node,
                    data: {
                      ...node.data,
                      config: {
                        ...config,
                        [codeEditorField.id]: response.content,
                      },
                    },
                  }
                : node,
            ),
          );
          setSavedContent(response.content);
          setIsContentLoaded(true);
        } catch (error) {
          // File not found is expected for new nodes - treat current content as saved
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          if (errorMessage.includes("not found")) {
            setSavedContent(codeContent || "");
            setIsContentLoaded(true);
          } else {
            console.error("Failed to load file content:", error);
            // Still mark as loaded so we don't retry forever
            setSavedContent(codeContent || "");
            setIsContentLoaded(true);
          }
        }
      }
      // Case 2: Node with code editor but NO file path - track dirty against current content
      else if (codeEditorField && !filePath) {
        setSavedContent(codeContent || "");
        setIsContentLoaded(true);
      }
      // Case 3: Node without code editor - no dirty tracking needed
      else if (!codeEditorField) {
        setSavedContent("");
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
    nodeId,
    config,
    codeContent,
    setNodes,
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
    filePath,
    codeContent,
  };
}
