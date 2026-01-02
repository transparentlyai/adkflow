/**
 * Hook for managing log explorer state and data fetching
 *
 * Provides access to log files, entries, stats, and filtering.
 * Only available when running in dev mode (./adkflow dev).
 */

import { useProject } from "@/contexts/ProjectContext";
import { useLogFiles } from "./useLogFiles";
import { useLogEntries } from "./useLogEntries";
import { useLogFilters } from "./useLogFilters";
import { useExportLogEntries } from "./useExportLogEntries";
import type { UseLogExplorerResult, LogFilters } from "./types";

export type { LogFilters, UseLogExplorerResult };

export function useLogExplorer(
  projectPathOverride?: string | null,
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

  // Refresh both files and entries
  const refresh = async () => {
    await refreshFiles();
    triggerRefresh();
  };

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
  };
}

export default useLogExplorer;
