import { useState, useCallback, useEffect, useMemo } from "react";
import { useReactFlow } from "@xyflow/react";
import { useProject } from "@/contexts/ProjectContext";
import { readPrompt } from "@/lib/api";
import type { CustomNodeSchema } from "@/components/nodes/CustomNode/types";

/**
 * Options for file picker dialog
 */
export interface FilePickerOptions {
  extensions: string[];
  filterLabel: string;
}

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
  const { setNodes } = useReactFlow();
  const { projectPath, onSaveFile, onRequestFilePicker } = useProject();

  const [isSaving, setIsSaving] = useState(false);
  const [savedContent, setSavedContent] = useState<string | null>(null);
  const [isContentLoaded, setIsContentLoaded] = useState(false);

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

  // Track dirty state for code editor
  const isDirty = isContentLoaded && codeContent !== savedContent;

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
  ]);

  // Reset content loaded state when file path changes
  useEffect(() => {
    if (filePath) {
      setIsContentLoaded(false);
      setSavedContent(null);
    }
  }, [filePath]);

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
  }, [onSaveFile, filePath, codeContent, codeEditorField]);

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

  return {
    isSaving,
    savedContent,
    isContentLoaded,
    isDirty,
    handleFileSave,
    handleChangeFile,
  };
}
