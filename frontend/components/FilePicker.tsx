"use client";

import { useState, useEffect } from "react";
import { listDirectory } from "@/lib/api";
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
}: FilePickerProps) {
  const [currentPath, setCurrentPath] = useState("");
  const [entries, setEntries] = useState<DirectoryEntry[]>([]);
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  useEffect(() => {
    const loadInitialDirectory = async (path: string) => {
      setLoading(true);
      setError("");

      try {
        const response = await listDirectory(path);
        setCurrentPath(response.current_path);

        // Only allow navigating up to project root
        if (response.parent_path && response.current_path !== projectPath &&
            response.current_path.startsWith(projectPath)) {
          setParentPath(response.parent_path);
        } else if (response.current_path === projectPath) {
          setParentPath(null);
        } else {
          setParentPath(response.parent_path);
        }

        // Filter entries if a filter is provided
        let filteredEntries = response.entries;
        if (fileFilter) {
          filteredEntries = response.entries.filter(
            entry => entry.is_directory || fileFilter(entry)
          );
        }

        setEntries(filteredEntries);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen && projectPath) {
      // Start from initialPath directory or project root
      const startPath = initialPath
        ? initialPath.substring(0, initialPath.lastIndexOf("/")) || projectPath
        : projectPath;
      loadInitialDirectory(startPath);

      // Pre-select the current file if provided
      if (initialPath) {
        setSelectedFile(initialPath);
      }
    }
  }, [isOpen, projectPath, initialPath, fileFilter]);

  const loadDirectory = async (path: string) => {
    setLoading(true);
    setError("");

    try {
      const response = await listDirectory(path);
      setCurrentPath(response.current_path);

      // Only allow navigating up to project root
      if (response.parent_path && response.current_path !== projectPath &&
          response.current_path.startsWith(projectPath)) {
        setParentPath(response.parent_path);
      } else if (response.current_path === projectPath) {
        setParentPath(null);
      } else {
        setParentPath(response.parent_path);
      }

      // Filter entries if a filter is provided
      let filteredEntries = response.entries;
      if (fileFilter) {
        filteredEntries = response.entries.filter(
          entry => entry.is_directory || fileFilter(entry)
        );
      }

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
    } else {
      setSelectedFile(entry.path);
    }
  };

  const handleSelect = () => {
    if (selectedFile) {
      // Return relative path from project root
      const relativePath = selectedFile.startsWith(projectPath)
        ? selectedFile.substring(projectPath.length + 1)
        : selectedFile;
      onSelect(relativePath);
    }
  };

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
              disabled={!parentPath || loading || currentPath === projectPath}
              className="px-3 py-1 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 rounded text-sm font-medium transition-colors"
              title="Go up one directory"
            >
              ↑ Up
            </button>
            <div className="flex-1 text-sm font-mono text-gray-600 truncate">
              /{getRelativePath(currentPath)}
            </div>
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

        {/* Selected file display */}
        {selectedFile && (
          <div className="px-6 py-2 bg-blue-50 border-t border-blue-100">
            <div className="text-sm">
              <span className="text-gray-600">Selected: </span>
              <span className="font-mono text-blue-700">{getRelativePath(selectedFile)}</span>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
          <div className="text-xs text-gray-500">
            {entries.filter(e => !e.is_directory).length} files, {entries.filter(e => e.is_directory).length} folders
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
              disabled={!selectedFile}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-md transition-colors"
            >
              Select File
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
