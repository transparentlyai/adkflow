import { useState, useEffect, useCallback, useRef } from "react";
import { getLogRuns, type RunInfo } from "@/lib/api";

const POLL_INTERVAL_MS = 3000; // Poll every 3 seconds

interface UseLogRunsResult {
  runs: RunInfo[];
  lastRunId: string | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  triggerRefresh: () => void;
}

export function useLogRuns(
  projectPath: string | null,
  selectedFile: string | null,
  isRunning: boolean = false,
): UseLogRunsResult {
  const [runs, setRuns] = useState<RunInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const lastRunCountRef = useRef(0);

  // Load runs when file changes or refresh is triggered
  useEffect(() => {
    if (!projectPath || !selectedFile) {
      setRuns([]);
      lastRunCountRef.current = 0;
      return;
    }

    const loadRuns = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await getLogRuns(projectPath, selectedFile);
        setRuns(response.runs);
        lastRunCountRef.current = response.runs.length;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load runs");
        setRuns([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadRuns();
  }, [projectPath, selectedFile, refreshKey]);

  // Auto-poll for new runs only while a workflow is actively running
  useEffect(() => {
    if (!projectPath || !selectedFile || !isRunning) return;

    const pollForNewRuns = async () => {
      try {
        const response = await getLogRuns(projectPath, selectedFile);
        // Only update if run count changed (new run added)
        if (response.runs.length !== lastRunCountRef.current) {
          setRuns(response.runs);
          lastRunCountRef.current = response.runs.length;
        }
      } catch {
        // Silently ignore polling errors
      }
    };

    const intervalId = setInterval(pollForNewRuns, POLL_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [projectPath, selectedFile, isRunning]);

  // Trigger a refresh (increment key to re-run effect)
  const triggerRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  // Refresh runs (async version)
  const refresh = useCallback(async () => {
    if (!projectPath || !selectedFile) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await getLogRuns(projectPath, selectedFile);
      setRuns(response.runs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh runs");
    } finally {
      setIsLoading(false);
    }
  }, [projectPath, selectedFile]);

  // The most recent run (first in the list, sorted by timestamp desc)
  const lastRunId = runs.length > 0 ? runs[0].runId : null;

  return {
    runs,
    lastRunId,
    isLoading,
    error,
    refresh,
    triggerRefresh,
  };
}
