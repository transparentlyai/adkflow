/**
 * Hook for managing trace explorer state and data fetching
 *
 * Provides access to traces, span details, and statistics.
 * Only available when running in dev mode (./adkflow dev).
 */

import { useState, useCallback, useEffect } from "react";
import { useProject } from "@/contexts/ProjectContext";
import {
  getTraces,
  getTrace,
  getTraceStats,
  type TraceInfo,
  type TraceSpan,
  type TraceDetailResponse,
  type TraceStats,
} from "@/lib/api/traces";

export interface UseTraceExplorerResult {
  /** List of traces */
  traces: TraceInfo[];
  /** Currently selected trace */
  selectedTrace: TraceDetailResponse | null;
  /** Currently selected span within a trace */
  selectedSpan: TraceSpan | null;
  /** Trace statistics */
  stats: TraceStats | null;
  /** Total number of traces */
  totalCount: number;
  /** Whether more traces exist */
  hasMore: boolean;
  /** Loading state for initial fetch */
  isLoading: boolean;
  /** Loading state for loading more */
  isLoadingMore: boolean;
  /** Loading state for selected trace */
  isLoadingTrace: boolean;
  /** Error message if any */
  error: string | null;
  /** Load more traces */
  loadMore: () => void;
  /** Select a trace by ID */
  selectTrace: (traceId: string | null) => void;
  /** Select a span within the current trace */
  selectSpan: (span: TraceSpan | null) => void;
  /** Refresh traces */
  refresh: () => void;
}

const LIMIT = 50;

export function useTraceExplorer(
  projectPathOverride?: string | null,
): UseTraceExplorerResult {
  const { projectPath: contextProjectPath } = useProject();
  const projectPath = projectPathOverride ?? contextProjectPath;

  const [traces, setTraces] = useState<TraceInfo[]>([]);
  const [selectedTrace, setSelectedTrace] =
    useState<TraceDetailResponse | null>(null);
  const [selectedSpan, setSelectedSpan] = useState<TraceSpan | null>(null);
  const [stats, setStats] = useState<TraceStats | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isLoadingTrace, setIsLoadingTrace] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch traces
  const fetchTraces = useCallback(
    async (append: boolean = false) => {
      if (!projectPath) return;

      const currentOffset = append ? offset : 0;

      try {
        if (append) {
          setIsLoadingMore(true);
        } else {
          setIsLoading(true);
        }
        setError(null);

        const response = await getTraces(projectPath, {
          offset: currentOffset,
          limit: LIMIT,
        });

        if (append) {
          setTraces((prev) => [...prev, ...response.traces]);
        } else {
          setTraces(response.traces);
        }

        setTotalCount(response.totalCount);
        setHasMore(response.hasMore);
        setOffset(currentOffset + response.traces.length);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch traces",
        );
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [projectPath, offset],
  );

  // Fetch stats
  const fetchStats = useCallback(async () => {
    if (!projectPath) return;

    try {
      const statsData = await getTraceStats(projectPath);
      setStats(statsData);
    } catch {
      // Silently ignore stats errors
    }
  }, [projectPath]);

  // Initial fetch
  useEffect(() => {
    if (projectPath) {
      fetchTraces(false);
      fetchStats();
    } else {
      setTraces([]);
      setStats(null);
      setTotalCount(0);
      setHasMore(false);
      setOffset(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectPath]);

  // Load more
  const loadMore = useCallback(() => {
    if (!isLoadingMore && hasMore) {
      fetchTraces(true);
    }
  }, [fetchTraces, isLoadingMore, hasMore]);

  // Select a trace
  const selectTrace = useCallback(
    async (traceId: string | null) => {
      if (!traceId || !projectPath) {
        setSelectedTrace(null);
        setSelectedSpan(null);
        return;
      }

      try {
        setIsLoadingTrace(true);
        setError(null);
        const traceData = await getTrace(projectPath, traceId);
        setSelectedTrace(traceData);
        // Auto-select first root span
        if (traceData.spans.length > 0) {
          setSelectedSpan(traceData.spans[0]);
        } else {
          setSelectedSpan(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch trace");
        setSelectedTrace(null);
        setSelectedSpan(null);
      } finally {
        setIsLoadingTrace(false);
      }
    },
    [projectPath],
  );

  // Select a span
  const selectSpan = useCallback((span: TraceSpan | null) => {
    setSelectedSpan(span);
  }, []);

  // Refresh
  const refresh = useCallback(() => {
    setOffset(0);
    setSelectedTrace(null);
    setSelectedSpan(null);
    fetchTraces(false);
    fetchStats();
  }, [fetchTraces, fetchStats]);

  return {
    traces,
    selectedTrace,
    selectedSpan,
    stats,
    totalCount,
    hasMore,
    isLoading,
    isLoadingMore,
    isLoadingTrace,
    error,
    loadMore,
    selectTrace,
    selectSpan,
    refresh,
  };
}

export default useTraceExplorer;
