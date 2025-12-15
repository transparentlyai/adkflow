"use client";

import { useState, useEffect } from "react";
import { listDirectory, createDirectory } from "@/lib/api";
import type { DirectoryEntry } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronRight, FolderPlus, Folder, FileText, ArrowUp, Loader2 } from "lucide-react";

interface InlinePathPickerProps {
  currentPath: string;
  onPathChange: (path: string) => void;
  onSelect: (path: string) => void;
  onCancel?: () => void;
  height?: string;
  showCancelButton?: boolean;
}

export default function InlinePathPicker({
  currentPath,
  onPathChange,
  onSelect,
  onCancel,
  height = "300px",
  showCancelButton = true,
}: InlinePathPickerProps) {
  const [internalPath, setInternalPath] = useState(currentPath || "~");
  const [entries, setEntries] = useState<DirectoryEntry[]>([]);
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);

  useEffect(() => {
    loadDirectory(currentPath || "~");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDirectory = async (path: string) => {
    setLoading(true);
    setError("");

    try {
      const response = await listDirectory(path);
      setInternalPath(response.current_path);
      setParentPath(response.parent_path);
      setEntries(response.entries);
      onPathChange(response.current_path);
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

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      setError("Please enter a folder name");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await createDirectory(internalPath, newFolderName.trim());
      await loadDirectory(internalPath);
      setShowNewFolder(false);
      setNewFolderName("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = () => {
    onSelect(internalPath);
  };

  // Build breadcrumb parts
  const pathParts = internalPath.split("/").filter(Boolean);
  const breadcrumbs = pathParts.map((part, index) => ({
    name: part,
    path: "/" + pathParts.slice(0, index + 1).join("/"),
  }));

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-background">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-1 px-3 py-2 bg-muted/50 border-b border-border overflow-x-auto">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleGoUp}
          disabled={!parentPath || loading}
          className="h-7 px-2 shrink-0"
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-0.5 text-sm overflow-x-auto">
          <button
            onClick={() => loadDirectory("/")}
            className="px-1.5 py-0.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground shrink-0"
          >
            /
          </button>
          {breadcrumbs.map((crumb, index) => (
            <div key={crumb.path} className="flex items-center shrink-0">
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
              <button
                onClick={() => loadDirectory(crumb.path)}
                className={`px-1.5 py-0.5 rounded hover:bg-accent truncate max-w-[120px] ${
                  index === breadcrumbs.length - 1
                    ? "text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title={crumb.name}
              >
                {crumb.name}
              </button>
            </div>
          ))}
        </div>
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowNewFolder(true)}
          disabled={loading || showNewFolder}
          className="h-7 px-2 shrink-0"
        >
          <FolderPlus className="h-4 w-4" />
        </Button>
      </div>

      {/* New Folder Input */}
      {showNewFolder && (
        <div className="flex items-center gap-2 p-2 bg-accent/50 border-b border-border">
          <Input
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateFolder();
              if (e.key === "Escape") {
                setShowNewFolder(false);
                setNewFolderName("");
              }
            }}
            placeholder="New folder name"
            autoFocus
            disabled={loading}
            className="h-8 text-sm"
          />
          <Button size="sm" onClick={handleCreateFolder} disabled={loading} className="h-8">
            Create
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowNewFolder(false);
              setNewFolderName("");
            }}
            disabled={loading}
            className="h-8"
          >
            Cancel
          </Button>
        </div>
      )}

      {/* Directory Listing */}
      <div className="overflow-y-auto" style={{ height }}>
        {loading && (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Loading...
          </div>
        )}

        {error && !loading && (
          <div className="p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {!loading && !error && entries.length === 0 && (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Empty directory
          </div>
        )}

        {!loading && !error && entries.length > 0 && (
          <div className="divide-y divide-border">
            {entries.map((entry) => (
              <button
                key={entry.path}
                onClick={() => entry.is_directory && handleNavigate(entry.path)}
                disabled={!entry.is_directory}
                className={`w-full text-left px-3 py-2 flex items-center gap-3 transition-colors ${
                  entry.is_directory
                    ? "hover:bg-accent cursor-pointer"
                    : "text-muted-foreground cursor-not-allowed opacity-50"
                }`}
              >
                {entry.is_directory ? (
                  <Folder className="h-4 w-4 text-primary shrink-0" />
                ) : (
                  <FileText className="h-4 w-4 shrink-0" />
                )}
                <span className="text-sm truncate">{entry.name}</span>
                {entry.is_directory && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer with current path and action buttons */}
      <div className="px-3 py-2 bg-muted/50 border-t border-border">
        <div className="text-xs text-muted-foreground font-mono truncate mb-2" title={internalPath}>
          {internalPath}
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSelect} size="sm" className="flex-1">
            Select This Directory
          </Button>
          {showCancelButton && onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
