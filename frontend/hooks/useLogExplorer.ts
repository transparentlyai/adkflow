/**
 * Hook for managing log explorer state and data fetching
 *
 * Provides access to log files, entries, stats, and filtering.
 * Only available when running in dev mode (./adkflow dev).
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useProject } from "@/contexts/ProjectContext";
import {
  getLogFiles,
  getLogEntries,
  getLogStats,
  type LogFileInfo,
  type LogEntry,
  type LogStats,
  type LogEntriesOptions,
} from "@/lib/api";

export interface LogFilters {
  level: string | null;
  category: string | null;
  search: string;
  startTime: string | null;
  endTime: string | null;
}

export interface UseLogExplorerResult {
  /** Available log files */
  files: LogFileInfo[];
  /** Currently selected file name */
  selectedFile: string | null;
  /** Set the selected file */
  setSelectedFile: (file: string | null) => void;

  /** Current page of log entries */
  entries: LogEntry[];
  /** Stats for the current file */
  stats: LogStats | null;
  /** Total matching entries */
  totalCount: number;

  /** Current filter settings */
  filters: LogFilters;
  /** Update filters (partial update) */
  setFilters: (filters: Partial<LogFilters>) => void;
  /** Reset all filters */
  resetFilters: () => void;

  /** Current offset for pagination */
  offset: number;
  /** Whether more entries are available */
  hasMore: boolean;
  /** Load the next page of entries */
  loadMore: () => Promise<void>;

  /** Loading state */
  isLoading: boolean;
  /** Loading more entries */
  isLoadingMore: boolean;
  /** Error message if any */
  error: string | null;

  /** Refresh files and entries */
  refresh: () => Promise<void>;
  /** Export filtered entries as JSONL */
  exportFiltered: () => Promise<void>;
}

const DEFAULT_FILTERS: LogFilters = {
  level: null,
  category: null,
  search: "",
  startTime: null,
  endTime: null,
};

const PAGE_SIZE = 500;

/**
 * Hook to manage log explorer state
 *
 * @example
 * ```tsx
 * const {
 *   files,
 *   entries,
 *   filters,
 *   setFilters,
 *   isLoading,
 * } = useLogExplorer();
 *
 * return (
 *   <div>
 *     <input
 *       value={filters.search}
 *       onChange={(e) => setFilters({ search: e.target.value })}
 *     />
 *     {entries.map((entry) => (
 *       <LogEntryRow key={entry.lineNumber} entry={entry} />
 *     ))}
 *   </div>
 * );
 * ```
 */
export function useLogExplorer(
  projectPathOverride?: string | null,
): UseLogExplorerResult {
  const { projectPath: contextProjectPath } = useProject();
  const projectPath = projectPathOverride ?? contextProjectPath;

  // File state
  const [files, setFiles] = useState<LogFileInfo[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  // Entries state
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<LogStats | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);

  // Filters state
  const [filters, setFiltersState] = useState<LogFilters>(DEFAULT_FILTERS);

  // Loading state
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refresh key to force entry reload
  const [refreshKey, setRefreshKey] = useState(0);

  // Debounce ref for search
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Load files on mount
  useEffect(() => {
    if (!projectPath) return;

    const loadFiles = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await getLogFiles(projectPath);
        setFiles(response.files);

        // Auto-select first JSONL file
        const jsonlFile = response.files.find((f) => f.name.endsWith(".jsonl"));
        if (jsonlFile) {
          setSelectedFile(jsonlFile.name);
        } else if (response.files.length > 0) {
          setSelectedFile(response.files[0].name);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load files");
      } finally {
        setIsLoading(false);
      }
    };

    loadFiles();
  }, [projectPath]);

  // Load entries when file or filters change
  useEffect(() => {
    if (!projectPath || !selectedFile) return;

    const loadEntries = async () => {
      setIsLoading(true);
      setError(null);
      setOffset(0);

      try {
        const options: LogEntriesOptions = {
          fileName: selectedFile,
          offset: 0,
          limit: PAGE_SIZE,
        };

        if (filters.level) options.level = filters.level;
        if (filters.category) options.category = filters.category;
        if (filters.search) options.search = filters.search;
        if (filters.startTime) options.startTime = filters.startTime;
        if (filters.endTime) options.endTime = filters.endTime;

        const [entriesResponse, statsResponse] = await Promise.all([
          getLogEntries(projectPath, options),
          getLogStats(projectPath, selectedFile),
        ]);

        setEntries(entriesResponse.entries);
        setTotalCount(entriesResponse.totalCount);
        setHasMore(entriesResponse.hasMore);
        setStats(statsResponse);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load entries");
        setEntries([]);
        setStats(null);
      } finally {
        setIsLoading(false);
      }
    };

    // Debounce search filter
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    if (filters.search) {
      searchDebounceRef.current = setTimeout(loadEntries, 300);
    } else {
      loadEntries();
    }

    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [projectPath, selectedFile, filters, refreshKey]);

  // Set filters with partial update
  const setFilters = useCallback((update: Partial<LogFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...update }));
  }, []);

  // Reset filters
  const resetFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
  }, []);

  // Load more entries
  const loadMore = useCallback(async () => {
    if (!projectPath || !selectedFile || isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    const newOffset = offset + PAGE_SIZE;

    try {
      const options: LogEntriesOptions = {
        fileName: selectedFile,
        offset: newOffset,
        limit: PAGE_SIZE,
      };

      if (filters.level) options.level = filters.level;
      if (filters.category) options.category = filters.category;
      if (filters.search) options.search = filters.search;
      if (filters.startTime) options.startTime = filters.startTime;
      if (filters.endTime) options.endTime = filters.endTime;

      const response = await getLogEntries(projectPath, options);

      setEntries((prev) => [...prev, ...response.entries]);
      setOffset(newOffset);
      setHasMore(response.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load more");
    } finally {
      setIsLoadingMore(false);
    }
  }, [projectPath, selectedFile, isLoadingMore, hasMore, offset, filters]);

  // Refresh data
  const refresh = useCallback(async () => {
    if (!projectPath) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await getLogFiles(projectPath);
      setFiles(response.files);

      // Check if selected file still exists
      if (selectedFile) {
        const fileExists = response.files.some((f) => f.name === selectedFile);
        if (!fileExists && response.files.length > 0) {
          // File was deleted, select a new one (this triggers entry reload)
          setSelectedFile(response.files[0].name);
        } else {
          // File still exists, force entry reload via refreshKey
          setRefreshKey((k) => k + 1);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh");
    } finally {
      setIsLoading(false);
    }
  }, [projectPath, selectedFile]);

  // Export filtered entries
  const exportFiltered = useCallback(async () => {
    if (!projectPath || !selectedFile) return;

    try {
      const options: LogEntriesOptions = {
        fileName: selectedFile,
        offset: 0,
        limit: 10000,
      };

      if (filters.level) options.level = filters.level;
      if (filters.category) options.category = filters.category;
      if (filters.search) options.search = filters.search;
      if (filters.startTime) options.startTime = filters.startTime;
      if (filters.endTime) options.endTime = filters.endTime;

      const response = await getLogEntries(projectPath, options);

      // Convert to JSONL
      const jsonl = response.entries
        .map((e) =>
          JSON.stringify({
            timestamp: e.timestamp,
            level: e.level,
            category: e.category,
            message: e.message,
            context: e.context,
            duration_ms: e.durationMs,
            exception: e.exception,
          }),
        )
        .join("\n");

      // Download
      const blob = new Blob([jsonl], { type: "application/jsonl" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `filtered-logs-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.jsonl`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to export");
    }
  }, [projectPath, selectedFile, filters]);

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
