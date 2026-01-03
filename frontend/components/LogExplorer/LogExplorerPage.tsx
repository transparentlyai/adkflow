/**
 * LogExplorerPage - Full page version of the Log Explorer
 *
 * Used when opening the Log Explorer in a dedicated browser tab.
 */

import { useState, useEffect } from "react";
import { AlertCircle, FileText, Activity } from "lucide-react";
import { useLogExplorer } from "@/hooks/logExplorer";
import { LogExplorerHeader } from "./LogExplorerHeader";
import { LogExplorerToolbar } from "./LogExplorerToolbar";
import { LogExplorerList } from "./LogExplorerList";
import type { TimeRangeFilter } from "@/app/debug/page";

interface LogExplorerPageProps {
  projectPath: string | null;
  /** Initial time filter from cross-tab navigation */
  initialTimeFilter?: TimeRangeFilter | null;
  /** Called after the time filter has been applied */
  onTimeFilterApplied?: () => void;
  /** Navigate to traces tab with optional time filter */
  onNavigateToTraces?: (timeRange?: TimeRangeFilter) => void;
}

export function LogExplorerPage({
  projectPath,
  initialTimeFilter,
  onTimeFilterApplied,
  onNavigateToTraces,
}: LogExplorerPageProps) {
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
    runs,
    isLoadingRuns,
    setLastRunOnly,
  } = useLogExplorer(projectPath);

  const [formatJson, setFormatJson] = useState(true);

  // Apply initial time filter from cross-tab navigation
  useEffect(() => {
    if (initialTimeFilter) {
      setFilters({
        startTime: initialTimeFilter.startTime,
        endTime: initialTimeFilter.endTime,
      });
      onTimeFilterApplied?.();
    }
  }, [initialTimeFilter, setFilters, onTimeFilterApplied]);

  // Check if time filter is active (for showing "View Traces" button)
  const hasTimeFilter = filters.startTime || filters.endTime;

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
        <div className="flex-1" />
        {onNavigateToTraces && (
          <button
            onClick={() =>
              onNavigateToTraces(
                hasTimeFilter
                  ? {
                      startTime: filters.startTime!,
                      endTime: filters.endTime!,
                    }
                  : undefined,
              )
            }
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
            title="View traces for this time range"
          >
            <Activity className="h-4 w-4" />
            View Traces
          </button>
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
            runs={runs}
            isLoadingRuns={isLoadingRuns}
            onLastRunOnlyChange={setLastRunOnly}
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
