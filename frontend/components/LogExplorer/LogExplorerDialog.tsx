/**
 * LogExplorerDialog - Main dialog for browsing log files
 *
 * Provides a full-featured log exploration interface with:
 * - File selection
 * - Level/category/text filtering
 * - Virtual scrolling for large files
 * - Expandable log entries with full context
 * - Export functionality
 */

import { useState } from "react";
import { AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLogExplorer } from "@/hooks/useLogExplorer";
import { LogExplorerHeader } from "./LogExplorerHeader";
import { LogExplorerToolbar } from "./LogExplorerToolbar";
import { LogExplorerList } from "./LogExplorerList";

interface LogExplorerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectPath: string | null;
}

export function LogExplorerDialog({
  open,
  onOpenChange,
  projectPath,
}: LogExplorerDialogProps) {
  const {
    files,
    selectedFile,
    setSelectedFile,
    entries,
    stats,
    totalCount,
    filters,
    setFilters,
    resetFilters,
    hasMore,
    loadMore,
    isLoading,
    isLoadingMore,
    error,
    refresh,
    exportFiltered,
  } = useLogExplorer(projectPath);

  const [formatJson, setFormatJson] = useState(true);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 py-3 border-b flex-shrink-0">
          <DialogTitle>Log Explorer</DialogTitle>
        </DialogHeader>

        {/* Error banner */}
        {error && (
          <div className="px-4 py-2 bg-destructive/10 text-destructive flex items-center gap-2 text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* No project selected */}
        {!projectPath && (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            No project selected. Open a project to view logs.
          </div>
        )}

        {/* No log files */}
        {projectPath && files.length === 0 && !isLoading && (
          <div className="flex-1 flex items-center justify-center text-muted-foreground flex-col gap-2">
            <span>No log files found in project.</span>
            <span className="text-xs">
              Run your workflow to generate logs in the logs/ directory.
            </span>
          </div>
        )}

        {/* Main content */}
        {projectPath && (files.length > 0 || isLoading) && (
          <>
            <LogExplorerHeader
              files={files}
              selectedFile={selectedFile}
              onSelectFile={setSelectedFile}
              stats={stats}
              totalCount={totalCount}
              isLoading={isLoading}
              onRefresh={refresh}
              onExport={exportFiltered}
            />

            <LogExplorerToolbar
              filters={filters}
              onFiltersChange={setFilters}
              onResetFilters={resetFilters}
              stats={stats}
              formatJson={formatJson}
              onFormatJsonChange={setFormatJson}
            />

            <LogExplorerList
              entries={entries}
              isLoading={isLoading}
              isLoadingMore={isLoadingMore}
              hasMore={hasMore}
              onLoadMore={loadMore}
              searchTerm={filters.search || undefined}
              formatJson={formatJson}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
