/**
 * Hook for managing log explorer state and data fetching
 *
 * Provides access to log files, entries, stats, and filtering.
 * Only available when running in dev mode (./adkflow dev).
 */

import { useCallback } from "react";
import { useProject } from "@/contexts/ProjectContext";
import { useLogFiles } from "./useLogFiles";
import { useLogEntries } from "./useLogEntries";
import { useLogFilters } from "./useLogFilters";
import { useLogRuns } from "./useLogRuns";
import { useExportLogEntries } from "./useExportLogEntries";
import type { UseLogExplorerResult, LogFilters } from "./types";

export type { LogFilters, UseLogExplorerResult };

export function useLogExplorer(
  projectPathOverride?: string | null,
  isRunning: boolean = false,
): UseLogExplorerResult {
  const { projectPath: contextProjectPath } = useProject();
  const projectPath = projectPathOverride ?? contextProjectPath;

  // Compose sub-hooks
  const {
    files,
    selectedFile,
    setSelectedFile,
    isLoading: filesLoading,
    error: filesError,
    refresh: refreshFiles,
  } = useLogFiles(projectPath);

  const { filters, setFilters, resetFilters } = useLogFilters();

  const {
    runs,
    lastRunId,
    isLoading: runsLoading,
    refresh: refreshRuns,
    triggerRefresh: triggerRunsRefresh,
  } = useLogRuns(projectPath, selectedFile, isRunning);

  // Handle lastRunOnly toggle
  const setLastRunOnly = useCallback(
    (lastRunOnly: boolean) => {
      if (lastRunOnly && lastRunId) {
        setFilters({ lastRunOnly: true, runId: lastRunId });
      } else {
        setFilters({ lastRunOnly: false, runId: null });
      }
    },
    [lastRunId, setFilters],
  );

  const {
    entries,
    stats,
    totalCount,
    offset,
    hasMore,
    isLoading: entriesLoading,
    isLoadingMore,
    error: entriesError,
    loadMore,
    triggerRefresh,
  } = useLogEntries(projectPath, selectedFile, filters);

  const { exportFiltered, exportError } = useExportLogEntries(
    projectPath,
    selectedFile,
    filters,
  );

  // Combine loading and error states
  const isLoading = filesLoading || entriesLoading;
  const error = filesError || entriesError || exportError;

  // Refresh files, runs, and entries
  const refresh = useCallback(async () => {
    await refreshFiles();
    triggerRunsRefresh();
    triggerRefresh();
  }, [refreshFiles, triggerRunsRefresh, triggerRefresh]);

  return {
    files,
    selectedFile,
    setSelectedFile,
    entries,
    stats,
    totalCount,
    filters,
    setFilters,
    resetFilters,
    offset,
    hasMore,
    loadMore,
    isLoading,
    isLoadingMore,
    error,
    refresh,
    exportFiltered,
    // Run-related properties
    runs,
    lastRunId,
    isLoadingRuns: runsLoading,
    setLastRunOnly,
  };
}

export default useLogExplorer;
