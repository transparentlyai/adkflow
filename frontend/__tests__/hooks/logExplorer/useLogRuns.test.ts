import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useLogRuns } from "@/hooks/logExplorer/useLogRuns";

const mockGetLogRuns = vi.fn();

vi.mock("@/lib/api", () => ({
  getLogRuns: (...args: unknown[]) => mockGetLogRuns(...args),
}));

describe("useLogRuns", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return empty state when no project path", () => {
    const { result } = renderHook(() => useLogRuns(null, null));

    expect(result.current.runs).toEqual([]);
    expect(result.current.lastRunId).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("should return empty state when no selected file", () => {
    const { result } = renderHook(() => useLogRuns("/project", null));

    expect(result.current.runs).toEqual([]);
    expect(result.current.lastRunId).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("should load runs when project and file are provided", async () => {
    const mockRuns = [
      { runId: "run-1", timestamp: "2024-01-15T10:00:00Z" },
      { runId: "run-2", timestamp: "2024-01-15T09:00:00Z" },
    ];
    mockGetLogRuns.mockResolvedValue({ runs: mockRuns });

    const { result } = renderHook(() => useLogRuns("/project", "app.log"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.runs).toEqual(mockRuns);
    expect(result.current.lastRunId).toBe("run-1");
    expect(mockGetLogRuns).toHaveBeenCalledWith("/project", "app.log");
  });

  it("should handle error when loading runs", async () => {
    mockGetLogRuns.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useLogRuns("/project", "app.log"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe("Network error");
    expect(result.current.runs).toEqual([]);
  });

  it("should handle non-Error objects in catch", async () => {
    mockGetLogRuns.mockRejectedValue("String error");

    const { result } = renderHook(() => useLogRuns("/project", "app.log"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe("Failed to load runs");
  });

  it("should refresh runs via triggerRefresh", async () => {
    const mockRuns = [{ runId: "run-1", timestamp: "2024-01-15T10:00:00Z" }];
    mockGetLogRuns.mockResolvedValue({ runs: mockRuns });

    const { result } = renderHook(() => useLogRuns("/project", "app.log"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const newRuns = [
      { runId: "run-2", timestamp: "2024-01-15T11:00:00Z" },
      { runId: "run-1", timestamp: "2024-01-15T10:00:00Z" },
    ];
    mockGetLogRuns.mockResolvedValue({ runs: newRuns });

    act(() => {
      result.current.triggerRefresh();
    });

    await waitFor(() => {
      expect(result.current.runs).toEqual(newRuns);
    });
  });

  it("should refresh runs via refresh function", async () => {
    const mockRuns = [{ runId: "run-1", timestamp: "2024-01-15T10:00:00Z" }];
    mockGetLogRuns.mockResolvedValue({ runs: mockRuns });

    const { result } = renderHook(() => useLogRuns("/project", "app.log"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const newRuns = [
      { runId: "run-2", timestamp: "2024-01-15T11:00:00Z" },
      { runId: "run-1", timestamp: "2024-01-15T10:00:00Z" },
    ];
    mockGetLogRuns.mockResolvedValue({ runs: newRuns });

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.runs).toEqual(newRuns);
  });

  it("should not refresh if no project or file", async () => {
    const { result } = renderHook(() => useLogRuns(null, null));

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockGetLogRuns).not.toHaveBeenCalled();
  });

  it("should handle error on refresh", async () => {
    const mockRuns = [{ runId: "run-1", timestamp: "2024-01-15T10:00:00Z" }];
    mockGetLogRuns.mockResolvedValue({ runs: mockRuns });

    const { result } = renderHook(() => useLogRuns("/project", "app.log"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    mockGetLogRuns.mockRejectedValue(new Error("Refresh failed"));

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.error).toBe("Refresh failed");
  });

  it("should handle non-Error on refresh", async () => {
    const mockRuns = [{ runId: "run-1", timestamp: "2024-01-15T10:00:00Z" }];
    mockGetLogRuns.mockResolvedValue({ runs: mockRuns });

    const { result } = renderHook(() => useLogRuns("/project", "app.log"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    mockGetLogRuns.mockRejectedValue("String error");

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.error).toBe("Failed to refresh runs");
  });

  it("should return lastRunId as null when no runs", async () => {
    mockGetLogRuns.mockResolvedValue({ runs: [] });

    const { result } = renderHook(() => useLogRuns("/project", "app.log"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.lastRunId).toBeNull();
  });

  describe("polling", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should not poll when isRunning is false", async () => {
      const mockRuns = [{ runId: "run-1", timestamp: "2024-01-15T10:00:00Z" }];
      mockGetLogRuns.mockResolvedValue({ runs: mockRuns });

      renderHook(() => useLogRuns("/project", "app.log", false));

      // Initial load
      await vi.runOnlyPendingTimersAsync();

      mockGetLogRuns.mockClear();

      // Advance time - should NOT trigger polling
      await vi.advanceTimersByTimeAsync(5000);

      expect(mockGetLogRuns).not.toHaveBeenCalled();
    });

    it("should poll when isRunning is true", async () => {
      const mockRuns = [{ runId: "run-1", timestamp: "2024-01-15T10:00:00Z" }];
      mockGetLogRuns.mockResolvedValue({ runs: mockRuns });

      renderHook(() => useLogRuns("/project", "app.log", true));

      // Initial load
      await vi.runOnlyPendingTimersAsync();

      mockGetLogRuns.mockClear();

      // Advance time - should trigger polling (3000ms interval)
      await vi.advanceTimersByTimeAsync(3000);

      expect(mockGetLogRuns).toHaveBeenCalled();
    });

    it("should update runs when run count changes during polling", async () => {
      const initialRuns = [
        { runId: "run-1", timestamp: "2024-01-15T10:00:00Z" },
      ];
      mockGetLogRuns.mockResolvedValue({ runs: initialRuns });

      const { result } = renderHook(() =>
        useLogRuns("/project", "app.log", true),
      );

      // Initial load
      await vi.runOnlyPendingTimersAsync();

      expect(result.current.runs).toEqual(initialRuns);

      // Mock new run added
      const newRuns = [
        { runId: "run-1", timestamp: "2024-01-15T10:00:00Z" },
        { runId: "run-2", timestamp: "2024-01-15T11:00:00Z" },
      ];
      mockGetLogRuns.mockResolvedValue({ runs: newRuns });

      // Advance time to trigger polling and wait for promises
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3000);
      });

      // Runs should be updated since count changed
      expect(result.current.runs).toEqual(newRuns);
    });

    it("should silently ignore polling errors", async () => {
      const mockRuns = [{ runId: "run-1", timestamp: "2024-01-15T10:00:00Z" }];
      mockGetLogRuns.mockResolvedValue({ runs: mockRuns });

      const { result } = renderHook(() =>
        useLogRuns("/project", "app.log", true),
      );

      // Initial load
      await vi.runOnlyPendingTimersAsync();

      expect(result.current.error).toBeNull();

      // Polling error
      mockGetLogRuns.mockRejectedValue(new Error("Polling error"));

      // Advance time to trigger polling
      await vi.advanceTimersByTimeAsync(3000);

      // Error should still be null (polling errors are ignored)
      expect(result.current.error).toBeNull();
    });

    it("should stop polling on unmount", async () => {
      const mockRuns = [{ runId: "run-1", timestamp: "2024-01-15T10:00:00Z" }];
      mockGetLogRuns.mockResolvedValue({ runs: mockRuns });

      const { unmount } = renderHook(() =>
        useLogRuns("/project", "app.log", true),
      );

      // Initial load
      await vi.runOnlyPendingTimersAsync();

      mockGetLogRuns.mockClear();

      // Unmount
      unmount();

      // Advance time - should NOT trigger polling since unmounted
      await vi.advanceTimersByTimeAsync(3000);

      expect(mockGetLogRuns).not.toHaveBeenCalled();
    });
  });
});
