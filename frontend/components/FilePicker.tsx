"use client";

import { useState, useEffect } from "react";
import { listDirectory, ensureDirectory } from "@/lib/api";
import type { DirectoryEntry } from "@/lib/types";

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
  const [currentPath, setCurrentPath] = useState("");
  const [entries, setEntries] = useState<DirectoryEntry[]>([]);
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [manualPath, setManualPath] = useState("");
  const [showAllFiles, setShowAllFiles] = useState(!defaultExtensions || defaultExtensions.length === 0);
  const [newFileName, setNewFileName] = useState("");

  // Filter function based on extensions
  const extensionFilter = (entry: DirectoryEntry): boolean => {
    if (showAllFiles || !defaultExtensions || defaultExtensions.length === 0) return true;
    const ext = '.' + entry.name.split('.').pop()?.toLowerCase();
    return defaultExtensions.some(e => e.toLowerCase() === ext);
  };

  // Combined filter: custom filter AND extension filter
  const combinedFilter = (entry: DirectoryEntry): boolean => {
    if (entry.is_directory) return true;
    const passesExtensionFilter = extensionFilter(entry);
    const passesCustomFilter = fileFilter ? fileFilter(entry) : true;
    return passesExtensionFilter && passesCustomFilter;
  };

  useEffect(() => {
    const loadDirectoryWithFallback = async (path: string): Promise<boolean> => {
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
  }, [isOpen, projectPath, initialPath, fileFilter, showAllFiles, defaultExtensions]);

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[70vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-600 mt-1">{description}</p>
        </div>

        {/* Breadcrumb / Navigation */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <button
              onClick={handleGoUp}
              disabled={!parentPath || loading}
              className="px-3 py-1 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 rounded text-sm font-medium transition-colors"
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
              className="flex-1 text-sm font-mono text-gray-700 bg-white border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter path..."
            />
            <button
              onClick={() => manualPath.trim() && loadDirectory(manualPath.trim())}
              disabled={loading || !manualPath.trim()}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-400 text-white rounded text-sm font-medium transition-colors"
            >
              Go
            </button>
          </div>
        </div>

        {/* File Listing */}
        <div className="flex-1 overflow-auto p-4 min-h-[250px]">
          {loading && (
            <div className="flex items-center justify-center h-full text-gray-500">
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
            <div className="text-center text-gray-500 py-8">
              <p className="text-sm">No files found</p>
            </div>
          )}

          {!loading && !error && entries.length > 0 && (
            <div className="space-y-1">
              {entries.map((entry) => (
                <button
                  key={entry.path}
                  onClick={() => handleFileClick(entry)}
                  className={`w-full text-left px-4 py-2 rounded-md transition-colors flex items-center gap-3 ${
                    selectedFile === entry.path
                      ? "bg-blue-100 ring-2 ring-blue-500"
                      : entry.is_directory
                        ? "hover:bg-gray-100"
                        : "hover:bg-blue-50"
                  }`}
                >
                  <span className="text-lg">
                    {entry.is_directory ? "📁" : getFileIcon(entry.name)}
                  </span>
                  <span className={`flex-1 text-sm ${
                    entry.is_directory ? "text-gray-700 font-medium" : "text-gray-900"
                  }`}>
                    {entry.name}
                  </span>
                  {entry.is_directory && (
                    <span className="text-xs text-gray-400">→</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* New file input (when allowCreate is enabled) */}
        {allowCreate && (
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 whitespace-nowrap">New file:</label>
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
                className="flex-1 text-sm font-mono text-gray-700 bg-white border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            {newFileName.trim() && (
              <div className="mt-1 text-xs text-gray-500 font-mono truncate">
                {getRelativePath(currentPath)}/{newFileName.trim()}
              </div>
            )}
          </div>
        )}

        {/* Selected file display */}
        {selectedFile && !newFileName.trim() && (
          <div className="px-6 py-2 bg-blue-50 border-t border-blue-100">
            <div className="text-sm">
              <span className="text-gray-600">Selected: </span>
              <span className="font-mono text-blue-700">{getRelativePath(selectedFile)}</span>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="text-xs text-gray-500">
              {entries.filter(e => !e.is_directory).length} files, {entries.filter(e => e.is_directory).length} folders
            </div>
            {defaultExtensions && defaultExtensions.length > 0 && (
              <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showAllFiles}
                  onChange={(e) => setShowAllFiles(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Show all files</span>
                {!showAllFiles && filterLabel && (
                  <span className="text-gray-400">({filterLabel})</span>
                )}
              </label>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSelect}
              disabled={!canSelect}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-md transition-colors"
            >
              {allowCreate && newFileName.trim() ? "Create" : "Select"}
            </button>
          </div>
        </div>
      </div>
    </div>
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
