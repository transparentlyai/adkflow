"use client";

import { useState, useEffect } from "react";
import { listDirectory, createDirectory } from "@/lib/api";
import type { DirectoryEntry } from "@/lib/types";
import { useTheme } from "@/contexts/ThemeContext";

interface PathPickerProps {
  isOpen: boolean;
  initialPath?: string;
  onSelect: (path: string) => void;
  onCancel: () => void;
  title?: string;
  description?: string;
}

export default function PathPicker({
  isOpen,
  initialPath = "~",
  onSelect,
  onCancel,
  title = "Select Directory",
  description = "Choose a directory for your project",
}: PathPickerProps) {
  const { theme } = useTheme();
  const [currentPath, setCurrentPath] = useState("");
  const [entries, setEntries] = useState<DirectoryEntry[]>([]);
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [manualPath, setManualPath] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadDirectory(initialPath);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialPath]);

  const loadDirectory = async (path: string) => {
    setLoading(true);
    setError("");

    try {
      const response = await listDirectory(path);
      setCurrentPath(response.current_path);
      setParentPath(response.parent_path);
      setEntries(response.entries);
      setManualPath(response.current_path);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (path: string) => {
    loadDirectory(path);
  };

  const handleGoUp = () => {
    if (parentPath) {
      loadDirectory(parentPath);
    }
  };

  const handleGoToManualPath = () => {
    if (manualPath.trim()) {
      loadDirectory(manualPath.trim());
    }
  };

  const handleShowNewFolder = () => {
    setShowNewFolder(true);
    setNewFolderName("");
    setError("");
  };

  const handleCancelNewFolder = () => {
    setShowNewFolder(false);
    setNewFolderName("");
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      setError("Please enter a folder name");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await createDirectory(currentPath, newFolderName.trim());

      // Refresh the directory listing
      await loadDirectory(currentPath);

      // Reset new folder state
      setShowNewFolder(false);
      setNewFolderName("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = () => {
    onSelect(currentPath);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        className="rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[80vh] flex flex-col"
        style={{
          backgroundColor: theme.colors.nodes.common.container.background,
        }}
      >
        {/* Header */}
        <div
          className="px-6 py-4 border-b"
          style={{ borderColor: theme.colors.nodes.common.container.border }}
        >
          <h2
            className="text-2xl font-bold"
            style={{ color: theme.colors.nodes.common.text.primary }}
          >
            {title}
          </h2>
          <p
            className="text-sm mt-1"
            style={{ color: theme.colors.nodes.common.text.secondary }}
          >
            {description}
          </p>
        </div>

        {/* Current Path & Navigation */}
        <div
          className="px-6 py-3 border-b"
          style={{
            backgroundColor: theme.colors.nodes.common.footer.background,
            borderColor: theme.colors.nodes.common.container.border,
          }}
        >
          <div className="flex items-center gap-2 mb-2">
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
            <div className="flex-1 flex items-center gap-2">
              <input
                type="text"
                value={manualPath}
                onChange={(e) => setManualPath(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleGoToManualPath()}
                className="flex-1 px-3 py-1 border rounded text-sm font-mono"
                style={{
                  borderColor: theme.colors.ui.border,
                  color: theme.colors.nodes.common.text.primary,
                  backgroundColor:
                    theme.colors.nodes.common.container.background,
                }}
                placeholder="/path/to/directory"
              />
              <button
                onClick={handleGoToManualPath}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
              >
                Go
              </button>
            </div>
            <button
              onClick={handleShowNewFolder}
              disabled={loading || showNewFolder}
              className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded text-sm font-medium transition-colors"
              title="Create new folder"
            >
              + New Folder
            </button>
          </div>

          {/* New Folder Input */}
          {showNewFolder && (
            <div
              className="flex items-center gap-2 mb-2 p-2 border rounded"
              style={{
                backgroundColor: theme.colors.nodes.common.container.background,
                borderColor: theme.colors.ui.border,
              }}
            >
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateFolder();
                  if (e.key === "Escape") handleCancelNewFolder();
                }}
                className="flex-1 px-3 py-1 border rounded text-sm"
                style={{
                  borderColor: theme.colors.ui.border,
                  color: theme.colors.nodes.common.text.primary,
                  backgroundColor:
                    theme.colors.nodes.common.container.background,
                }}
                placeholder="Folder name"
                autoFocus
                disabled={loading}
              />
              <button
                onClick={handleCreateFolder}
                disabled={loading}
                className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded text-sm font-medium transition-colors"
              >
                Create
              </button>
              <button
                onClick={handleCancelNewFolder}
                disabled={loading}
                className="px-3 py-1 rounded text-sm font-medium transition-colors hover:opacity-80 disabled:opacity-50"
                style={{
                  backgroundColor: theme.colors.ui.muted,
                  color: theme.colors.nodes.common.text.secondary,
                }}
              >
                Cancel
              </button>
            </div>
          )}

          <div
            className="text-xs font-mono"
            style={{ color: theme.colors.nodes.common.text.muted }}
          >
            Current: {currentPath}
          </div>
        </div>

        {/* Directory Listing */}
        <div className="flex-1 overflow-auto p-4 min-h-[300px]">
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
              <p className="text-sm">Empty directory</p>
            </div>
          )}

          {!loading && !error && entries.length > 0 && (
            <div className="space-y-1">
              {entries.map((entry) => (
                <button
                  key={entry.path}
                  onClick={() =>
                    entry.is_directory && handleNavigate(entry.path)
                  }
                  disabled={!entry.is_directory}
                  className={`w-full text-left px-4 py-2 rounded-md transition-colors flex items-center gap-3 ${
                    entry.is_directory ? "cursor-pointer" : "cursor-not-allowed"
                  }`}
                  style={{
                    backgroundColor: entry.is_directory
                      ? theme.colors.ui.muted
                      : "transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (entry.is_directory) {
                      e.currentTarget.style.backgroundColor =
                        theme.colors.ui.accent;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (entry.is_directory) {
                      e.currentTarget.style.backgroundColor =
                        theme.colors.ui.muted;
                    }
                  }}
                >
                  <span className="text-lg">
                    {entry.is_directory ? "📁" : "📄"}
                  </span>
                  <span
                    className="flex-1 text-sm"
                    style={{
                      color: entry.is_directory
                        ? theme.colors.nodes.common.text.primary
                        : theme.colors.nodes.common.text.muted,
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
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          className="px-6 py-4 border-t flex justify-between items-center"
          style={{
            backgroundColor: theme.colors.nodes.common.footer.background,
            borderColor: theme.colors.nodes.common.container.border,
          }}
        >
          <div
            className="text-xs"
            style={{ color: theme.colors.nodes.common.text.muted }}
          >
            {entries.filter((e) => e.is_directory).length} folders
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
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
            >
              Select This Directory
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
