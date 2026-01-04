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
import type { FilePickerProps } from "./types";
import { FilePickerNavigationBar } from "./FilePickerNavigationBar";
import { FilePickerBrowser } from "./FilePickerBrowser";
import { FilePickerCreateNew } from "./FilePickerCreateNew";
import { FilePickerFooter } from "./FilePickerFooter";

export type { FilePickerProps };

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
  selectDirectory = false,
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
      // In directory mode, only show directories
      if (selectDirectory) {
        return entry.is_directory;
      }
      if (entry.is_directory) return true;
      const passesExtensionFilter = extensionFilter(entry);
      const passesCustomFilter = fileFilter ? fileFilter(entry) : true;
      return passesExtensionFilter && passesCustomFilter;
    },
    [extensionFilter, fileFilter, selectDirectory],
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

      let currentDir = initialPath
        ? initialPath.substring(0, initialPath.lastIndexOf("/")) || projectPath
        : projectPath;

      let success = false;

      if (currentDir.startsWith(projectPath) && currentDir !== projectPath) {
        try {
          await ensureDirectory(currentDir);
        } catch {
          // Silently ignore - we'll fall back to walking up the tree
        }
      }

      while (currentDir && currentDir.length > 1) {
        success = await loadDirectoryWithFallback(currentDir);
        if (success) break;
        const parentDir = currentDir.substring(0, currentDir.lastIndexOf("/"));
        if (parentDir === currentDir || !parentDir) break;
        currentDir = parentDir;
      }

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
      const filteredEntries = response.entries.filter(combinedFilter);
      setEntries(filteredEntries);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoUp = () => {
    if (parentPath) {
      loadDirectory(parentPath);
      setSelectedFile(null);
    }
  };

  const handleFileClick = (entry: DirectoryEntry) => {
    if (entry.is_directory) {
      loadDirectory(entry.path);
      setSelectedFile(null);
      setNewFileName("");
    } else {
      setSelectedFile(entry.path);
      setNewFileName("");
    }
  };

  const handleSelect = () => {
    let finalPath: string | null = null;

    if (selectDirectory) {
      // In directory mode, select the current directory
      finalPath = currentPath;
    } else if (allowCreate && newFileName.trim()) {
      finalPath = `${currentPath}/${newFileName.trim()}`;
    } else if (selectedFile) {
      finalPath = selectedFile;
    }

    if (finalPath) {
      const relativePath = finalPath.startsWith(projectPath)
        ? finalPath.substring(projectPath.length + 1)
        : finalPath;
      onSelect(relativePath);
    }
  };

  const getRelativePath = (path: string) => {
    if (path.startsWith(projectPath)) {
      const relative = path.substring(projectPath.length);
      return relative.startsWith("/") ? relative.substring(1) : relative || "/";
    }
    return path;
  };

  const handleNewFileNameChange = (name: string) => {
    setNewFileName(name);
    if (name.trim()) {
      setSelectedFile(null);
    }
  };

  const canSelect =
    selectDirectory || selectedFile || (allowCreate && newFileName.trim());

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
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

        <FilePickerNavigationBar
          theme={theme}
          parentPath={parentPath}
          manualPath={manualPath}
          loading={loading}
          onGoUp={handleGoUp}
          onManualPathChange={setManualPath}
          onNavigate={loadDirectory}
        />

        <FilePickerBrowser
          theme={theme}
          entries={entries}
          loading={loading}
          error={error}
          selectedFile={selectedFile}
          onFileClick={handleFileClick}
        />

        {allowCreate && (
          <FilePickerCreateNew
            theme={theme}
            currentPath={currentPath}
            newFileName={newFileName}
            projectPath={projectPath}
            onNewFileNameChange={handleNewFileNameChange}
            onSubmit={handleSelect}
            getRelativePath={getRelativePath}
          />
        )}

        {(selectDirectory || (selectedFile && !newFileName.trim())) && (
          <div
            className="px-6 py-2 border-t"
            style={{
              backgroundColor: theme.colors.ui.primary + "15",
              borderColor: theme.colors.ui.primary + "30",
            }}
          >
            <div className="text-sm">
              <span style={{ color: theme.colors.nodes.common.text.secondary }}>
                {selectDirectory ? "Directory: " : "Selected: "}
              </span>
              <span
                className="font-mono"
                style={{ color: theme.colors.ui.primary }}
              >
                {getRelativePath(selectDirectory ? currentPath : selectedFile!)}
              </span>
            </div>
          </div>
        )}

        <FilePickerFooter
          theme={theme}
          entries={entries}
          defaultExtensions={defaultExtensions}
          filterLabel={filterLabel}
          showAllFiles={showAllFiles}
          canSelect={!!canSelect}
          allowCreate={allowCreate}
          newFileName={newFileName}
          selectDirectory={selectDirectory}
          onShowAllFilesChange={setShowAllFiles}
          onCancel={onCancel}
          onSelect={handleSelect}
        />
      </DialogContent>
    </Dialog>
  );
}
