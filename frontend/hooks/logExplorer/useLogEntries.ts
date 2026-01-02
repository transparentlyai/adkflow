import { useState, useEffect, useCallback, useRef } from "react";
import {
  getLogEntries,
  getLogStats,
  type LogEntry,
  type LogStats,
  type LogEntriesOptions,
} from "@/lib/api";
import type { LogFilters } from "./types";
import { PAGE_SIZE } from "./types";

interface UseLogEntriesResult {
  entries: LogEntry[];
  stats: LogStats | null;
  totalCount: number;
  offset: number;
  hasMore: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  loadMore: () => Promise<void>;
  triggerRefresh: () => void;
}

export function useLogEntries(
  projectPath: string | null,
  selectedFile: string | null,
  filters: LogFilters,
): UseLogEntriesResult {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<LogStats | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

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

  const triggerRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return {
    entries,
    stats,
    totalCount,
    offset,
    hasMore,
    isLoading,
    isLoadingMore,
    error,
    loadMore,
    triggerRefresh,
  };
}
