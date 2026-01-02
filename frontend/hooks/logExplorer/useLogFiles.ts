import { useState, useEffect, useCallback } from "react";
import { getLogFiles, type LogFileInfo } from "@/lib/api";

interface UseLogFilesResult {
  files: LogFileInfo[];
  selectedFile: string | null;
  setSelectedFile: (file: string | null) => void;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useLogFiles(projectPath: string | null): UseLogFilesResult {
  const [files, setFiles] = useState<LogFileInfo[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load files on mount
  useEffect(() => {
    if (!projectPath) return;

    const loadFiles = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await getLogFiles(projectPath);
        setFiles(response.files);

        // Auto-select first JSONL file
        const jsonlFile = response.files.find((f) => f.name.endsWith(".jsonl"));
        if (jsonlFile) {
          setSelectedFile(jsonlFile.name);
        } else if (response.files.length > 0) {
          setSelectedFile(response.files[0].name);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load files");
      } finally {
        setIsLoading(false);
      }
    };

    loadFiles();
  }, [projectPath]);

  // Refresh files
  const refresh = useCallback(async () => {
    if (!projectPath) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await getLogFiles(projectPath);
      setFiles(response.files);

      // Check if selected file still exists
      if (selectedFile) {
        const fileExists = response.files.some((f) => f.name === selectedFile);
        if (!fileExists && response.files.length > 0) {
          setSelectedFile(response.files[0].name);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh");
    } finally {
      setIsLoading(false);
    }
  }, [projectPath, selectedFile]);

  return {
    files,
    selectedFile,
    setSelectedFile,
    isLoading,
    error,
    refresh,
  };
}
