"use client";

import { useState, useEffect, useCallback } from "react";
import { listDirectory, ensureDirectory } from "@/lib/api";
import type { DirectoryEntry } from "@/lib/types";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface FilePickerProps {
  isOpen: boolean;
  projectPath: string;
  initialPath?: string;
  onSelect: (path: string) => void;
  onCancel: () => void;
  title?: string;
  description?: string;
  fileFilter?: (entry: DirectoryEntry) => boolean;
  /** Default file extensions to filter by (e.g., ['.md', '.txt']) */
  defaultExtensions?: string[];
  /** Label for the filter (e.g., "Markdown files") */
  filterLabel?: string;
  /** Allow creating new files (save mode) */
  allowCreate?: boolean;
}

export default function FilePicker({
  isOpen,
  projectPath,
  initialPath,
  onSelect,
  onCancel,
  title = "Select File",
  description = "Choose a file from your project",
  fileFilter,
  defaultExtensions,
  filterLabel,
  allowCreate,
}: FilePickerProps) {
  const { theme } = useTheme();
  const [currentPath, setCurrentPath] = useState("");
  const [entries, setEntries] = useState<DirectoryEntry[]>([]);
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [manualPath, setManualPath] = useState("");
  const [showAllFiles, setShowAllFiles] = useState(
    !defaultExtensions || defaultExtensions.length === 0,
  );
  const [newFileName, setNewFileName] = useState("");

  // Filter function based on extensions
  const extensionFilter = useCallback(
    (entry: DirectoryEntry): boolean => {
      if (showAllFiles || !defaultExtensions || defaultExtensions.length === 0)
        return true;
      const ext = "." + entry.name.split(".").pop()?.toLowerCase();
      return defaultExtensions.some((e) => e.toLowerCase() === ext);
    },
    [showAllFiles, defaultExtensions],
  );

  // Combined filter: custom filter AND extension filter
  const combinedFilter = useCallback(
    (entry: DirectoryEntry): boolean => {
      if (entry.is_directory) return true;
      const passesExtensionFilter = extensionFilter(entry);
      const passesCustomFilter = fileFilter ? fileFilter(entry) : true;
      return passesExtensionFilter && passesCustomFilter;
    },
    [extensionFilter, fileFilter],
  );

  useEffect(() => {
    const loadDirectoryWithFallback = async (
      path: string,
    ): Promise<boolean> => {
      try {
        const response = await listDirectory(path);
        setCurrentPath(response.current_path);
        setParentPath(response.parent_path);
        setManualPath(response.current_path);

        // Filter entries using combined filter
        const filteredEntries = response.entries.filter(combinedFilter);
        setEntries(filteredEntries);
        return true;
      } catch {
        return false;
      }
    };

    const initializeDirectory = async () => {
      if (!isOpen || !projectPath) return;

      setLoading(true);
      setError("");
      setSelectedFile(null);

      // Start from initialPath directory or project root
      let currentDir = initialPath
        ? initialPath.substring(0, initialPath.lastIndexOf("/")) || projectPath
        : projectPath;

      let success = false;

      // If the target directory is within the project, try to create it first
      if (currentDir.startsWith(projectPath) && currentDir !== projectPath) {
        try {
          await ensureDirectory(currentDir);
        } catch {
          // Silently ignore - we'll fall back to walking up the tree
        }
      }

      // Walk up the directory tree until we find a valid directory
      while (currentDir && currentDir.length > 1) {
        success = await loadDirectoryWithFallback(currentDir);
        if (success) break;

        // Go one level up
        const parentDir = currentDir.substring(0, currentDir.lastIndexOf("/"));
        if (parentDir === currentDir || !parentDir) break;
        currentDir = parentDir;
      }

      // Final fallback: user's home directory
      if (!success) {
        success = await loadDirectoryWithFallback("~");
      }

      if (!success) {
        setError("Failed to load directory");
      }

      setLoading(false);
    };

    initializeDirectory();
  }, [isOpen, projectPath, initialPath, combinedFilter]);

  const loadDirectory = async (path: string) => {
    setLoading(true);
    setError("");

    try {
      const response = await listDirectory(path);
      setCurrentPath(response.current_path);
      setParentPath(response.parent_path);
      setManualPath(response.current_path);

      // Filter entries using combined filter
      const filteredEntries = response.entries.filter(combinedFilter);
      setEntries(filteredEntries);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (path: string) => {
    loadDirectory(path);
    setSelectedFile(null);
  };

  const handleGoUp = () => {
    if (parentPath) {
      loadDirectory(parentPath);
      setSelectedFile(null);
    }
  };

  const handleFileClick = (entry: DirectoryEntry) => {
    if (entry.is_directory) {
      handleNavigate(entry.path);
      setNewFileName("");
    } else {
      setSelectedFile(entry.path);
      setNewFileName("");
    }
  };

  const handleSelect = () => {
    let finalPath: string | null = null;

    // If creating a new file, use currentPath + newFileName
    if (allowCreate && newFileName.trim()) {
      finalPath = `${currentPath}/${newFileName.trim()}`;
    } else if (selectedFile) {
      finalPath = selectedFile;
    }

    if (finalPath) {
      // Return relative path from project root
      const relativePath = finalPath.startsWith(projectPath)
        ? finalPath.substring(projectPath.length + 1)
        : finalPath;
      onSelect(relativePath);
    }
  };

  const canSelect = selectedFile || (allowCreate && newFileName.trim());

  // Get relative path for display
  const getRelativePath = (path: string) => {
    if (path.startsWith(projectPath)) {
      const relative = path.substring(projectPath.length);
      return relative.startsWith("/") ? relative.substring(1) : relative || "/";
    }
    return path;
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onCancel();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-2xl max-h-[70vh] flex flex-col p-0 gap-0 z-[60]"
        style={{
          backgroundColor: theme.colors.nodes.common.container.background,
        }}
      >
        <DialogHeader
          className="px-6 py-4 border-b"
          style={{ borderColor: theme.colors.nodes.common.container.border }}
        >
          <DialogTitle
            style={{ color: theme.colors.nodes.common.text.primary }}
          >
            {title}
          </DialogTitle>
          <DialogDescription
            style={{ color: theme.colors.nodes.common.text.secondary }}
          >
            {description}
          </DialogDescription>
        </DialogHeader>

        <div
          className="px-6 py-3 border-b"
          style={{
            backgroundColor: theme.colors.nodes.common.footer.background,
            borderColor: theme.colors.nodes.common.container.border,
          }}
        >
          <div className="flex items-center gap-2">
            <button
              onClick={handleGoUp}
              disabled={!parentPath || loading}
              className="px-3 py-1 rounded text-sm font-medium transition-colors hover:opacity-80 disabled:opacity-50"
              style={{
                backgroundColor: theme.colors.ui.muted,
                color: theme.colors.nodes.common.text.secondary,
              }}
              title="Go up one directory"
            >
              ↑ Up
            </button>
            <input
              type="text"
              value={manualPath}
              onChange={(e) => setManualPath(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && manualPath.trim()) {
                  loadDirectory(manualPath.trim());
                }
              }}
              className="flex-1 text-sm font-mono rounded px-2 py-1 border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              style={{
                color: theme.colors.nodes.common.text.secondary,
                backgroundColor: theme.colors.nodes.common.container.background,
                borderColor: theme.colors.ui.border,
              }}
              placeholder="Enter path..."
            />
            <button
              onClick={() =>
                manualPath.trim() && loadDirectory(manualPath.trim())
              }
              disabled={loading || !manualPath.trim()}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded text-sm font-medium transition-colors"
            >
              Go
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 min-h-[250px]">
          {loading && (
            <div
              className="flex items-center justify-center h-full"
              style={{ color: theme.colors.nodes.common.text.muted }}
            >
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                Loading...
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {!loading && !error && entries.length === 0 && (
            <div
              className="text-center py-8"
              style={{ color: theme.colors.nodes.common.text.muted }}
            >
              <p className="text-sm">No files found</p>
            </div>
          )}

          {!loading && !error && entries.length > 0 && (
            <div className="space-y-1">
              {entries.map((entry) => {
                const isSelected = selectedFile === entry.path;
                return (
                  <button
                    key={entry.path}
                    onClick={() => handleFileClick(entry)}
                    className="w-full text-left px-4 py-2 rounded-md transition-colors flex items-center gap-3"
                    style={{
                      backgroundColor: isSelected
                        ? theme.colors.ui.primary + "20"
                        : entry.is_directory
                          ? theme.colors.ui.muted
                          : "transparent",
                      boxShadow: isSelected
                        ? `0 0 0 2px ${theme.colors.ui.primary}`
                        : "none",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor =
                          theme.colors.ui.accent;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor =
                          entry.is_directory
                            ? theme.colors.ui.muted
                            : "transparent";
                      }
                    }}
                  >
                    <span className="text-lg">
                      {entry.is_directory ? "📁" : getFileIcon(entry.name)}
                    </span>
                    <span
                      className="flex-1 text-sm"
                      style={{
                        color: entry.is_directory
                          ? theme.colors.nodes.common.text.secondary
                          : theme.colors.nodes.common.text.primary,
                        fontWeight: entry.is_directory ? 500 : 400,
                      }}
                    >
                      {entry.name}
                    </span>
                    {entry.is_directory && (
                      <span
                        className="text-xs"
                        style={{ color: theme.colors.nodes.common.text.muted }}
                      >
                        →
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {allowCreate && (
          <div
            className="px-6 py-3 border-t"
            style={{
              backgroundColor: theme.colors.nodes.common.footer.background,
              borderColor: theme.colors.nodes.common.container.border,
            }}
          >
            <div className="flex items-center gap-2">
              <label
                className="text-sm whitespace-nowrap"
                style={{ color: theme.colors.nodes.common.text.secondary }}
              >
                New file:
              </label>
              <input
                type="text"
                value={newFileName}
                onChange={(e) => {
                  setNewFileName(e.target.value);
                  if (e.target.value.trim()) {
                    setSelectedFile(null);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newFileName.trim()) {
                    handleSelect();
                  }
                }}
                placeholder="Enter filename..."
                className="flex-1 text-sm font-mono rounded px-2 py-1 border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                style={{
                  color: theme.colors.nodes.common.text.secondary,
                  backgroundColor:
                    theme.colors.nodes.common.container.background,
                  borderColor: theme.colors.ui.border,
                }}
              />
            </div>
            {newFileName.trim() && (
              <div
                className="mt-1 text-xs font-mono truncate"
                style={{ color: theme.colors.nodes.common.text.muted }}
              >
                {getRelativePath(currentPath)}/{newFileName.trim()}
              </div>
            )}
          </div>
        )}

        {selectedFile && !newFileName.trim() && (
          <div
            className="px-6 py-2 border-t"
            style={{
              backgroundColor: theme.colors.ui.primary + "15",
              borderColor: theme.colors.ui.primary + "30",
            }}
          >
            <div className="text-sm">
              <span style={{ color: theme.colors.nodes.common.text.secondary }}>
                Selected:{" "}
              </span>
              <span
                className="font-mono"
                style={{ color: theme.colors.ui.primary }}
              >
                {getRelativePath(selectedFile)}
              </span>
            </div>
          </div>
        )}

        <div
          className="px-6 py-4 border-t flex justify-between items-center"
          style={{
            backgroundColor: theme.colors.nodes.common.footer.background,
            borderColor: theme.colors.nodes.common.container.border,
          }}
        >
          <div className="flex items-center gap-4">
            <div
              className="text-xs"
              style={{ color: theme.colors.nodes.common.text.muted }}
            >
              {entries.filter((e) => !e.is_directory).length} files,{" "}
              {entries.filter((e) => e.is_directory).length} folders
            </div>
            {defaultExtensions && defaultExtensions.length > 0 && (
              <label
                className="flex items-center gap-2 text-xs cursor-pointer"
                style={{ color: theme.colors.nodes.common.text.secondary }}
              >
                <input
                  type="checkbox"
                  checked={showAllFiles}
                  onChange={(e) => setShowAllFiles(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                  style={{ borderColor: theme.colors.ui.border }}
                />
                <span>Show all files</span>
                {!showAllFiles && filterLabel && (
                  <span style={{ color: theme.colors.nodes.common.text.muted }}>
                    ({filterLabel})
                  </span>
                )}
              </label>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 font-medium transition-colors hover:opacity-80"
              style={{ color: theme.colors.nodes.common.text.secondary }}
            >
              Cancel
            </button>
            <button
              onClick={handleSelect}
              disabled={!canSelect}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-md transition-colors"
            >
              {allowCreate && newFileName.trim() ? "Create" : "Select"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function getFileIcon(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "md":
      return "📝";
    case "py":
      return "🐍";
    case "js":
    case "ts":
    case "tsx":
    case "jsx":
      return "📜";
    case "json":
    case "yaml":
    case "yml":
      return "⚙️";
    default:
      return "📄";
  }
}
