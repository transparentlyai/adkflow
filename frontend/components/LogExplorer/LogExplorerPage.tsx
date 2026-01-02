/**
 * LogExplorerPage - Full page version of the Log Explorer
 *
 * Used when opening the Log Explorer in a dedicated browser tab.
 */

import { useState } from "react";
import { AlertCircle, FileText } from "lucide-react";
import { useLogExplorer } from "@/hooks/logExplorer";
import { LogExplorerHeader } from "./LogExplorerHeader";
import { LogExplorerToolbar } from "./LogExplorerToolbar";
import { LogExplorerList } from "./LogExplorerList";

interface LogExplorerPageProps {
  projectPath: string | null;
}

export function LogExplorerPage({ projectPath }: LogExplorerPageProps) {
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
    <div className="h-screen flex flex-col bg-background">
      {/* Page header */}
      <div className="px-4 py-3 border-b flex items-center gap-3 flex-shrink-0">
        <FileText className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-lg font-semibold">Log Explorer</h1>
        {projectPath && (
          <span className="text-sm text-muted-foreground">
            — {projectPath.split("/").pop()}
          </span>
        )}
      </div>

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
          No project specified. Open the Log Explorer from within a project.
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
    </div>
  );
}
