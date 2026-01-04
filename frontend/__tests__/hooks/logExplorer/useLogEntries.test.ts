import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useLogEntries } from "@/hooks/logExplorer/useLogEntries";
import type { LogFilters } from "@/hooks/logExplorer/types";
import { DEFAULT_FILTERS } from "@/hooks/logExplorer/types";

const mockGetLogEntries = vi.fn();
const mockGetLogStats = vi.fn();

vi.mock("@/lib/api", () => ({
  getLogEntries: (...args: unknown[]) => mockGetLogEntries(...args),
  getLogStats: (...args: unknown[]) => mockGetLogStats(...args),
}));

describe("useLogEntries", () => {
  const mockEntries = [
    { timestamp: "2024-01-15T10:00:00Z", level: "INFO", message: "Test 1" },
    { timestamp: "2024-01-15T10:01:00Z", level: "ERROR", message: "Test 2" },
  ];

  const mockStats = {
    totalCount: 100,
    levels: { INFO: 50, ERROR: 25, WARNING: 25 },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetLogEntries.mockResolvedValue({
      entries: mockEntries,
      totalCount: 100,
      hasMore: true,
    });
    mockGetLogStats.mockResolvedValue(mockStats);
  });

  it("should initialize with empty state when no project path", () => {
    const { result } = renderHook(() =>
      useLogEntries(null, null, DEFAULT_FILTERS),
    );

    expect(result.current.entries).toEqual([]);
    expect(result.current.stats).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("should initialize with empty state when no selected file", () => {
    const { result } = renderHook(() =>
      useLogEntries("/project", null, DEFAULT_FILTERS),
    );

    expect(result.current.entries).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it("should load entries when project and file are provided", async () => {
    const { result } = renderHook(() =>
      useLogEntries("/project", "app.log", DEFAULT_FILTERS),
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.entries).toEqual(mockEntries);
    expect(result.current.stats).toEqual(mockStats);
    expect(result.current.totalCount).toBe(100);
    expect(result.current.hasMore).toBe(true);
  });

  it("should pass filters to API", async () => {
    const filters: LogFilters = {
      ...DEFAULT_FILTERS,
      level: "ERROR",
      category: "runner",
    };

    const { result } = renderHook(() =>
      useLogEntries("/project", "app.log", filters),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockGetLogEntries).toHaveBeenCalledWith("/project", {
      fileName: "app.log",
      offset: 0,
      limit: 500,
      level: "ERROR",
      category: "runner",
    });
  });

  it("should handle error when loading entries", async () => {
    mockGetLogEntries.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() =>
      useLogEntries("/project", "app.log", DEFAULT_FILTERS),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe("Network error");
    expect(result.current.entries).toEqual([]);
  });

  it("should load more entries", async () => {
    const { result } = renderHook(() =>
      useLogEntries("/project", "app.log", DEFAULT_FILTERS),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    mockGetLogEntries.mockResolvedValueOnce({
      entries: [
        { timestamp: "2024-01-15T10:02:00Z", level: "INFO", message: "Test 3" },
      ],
      totalCount: 100,
      hasMore: false,
    });

    await act(async () => {
      await result.current.loadMore();
    });

    expect(result.current.entries.length).toBe(3);
    expect(result.current.hasMore).toBe(false);
  });

  it("should trigger refresh", async () => {
    const { result } = renderHook(() =>
      useLogEntries("/project", "app.log", DEFAULT_FILTERS),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    mockGetLogEntries.mockClear();

    act(() => {
      result.current.triggerRefresh();
    });

    await waitFor(() => {
      expect(mockGetLogEntries).toHaveBeenCalled();
    });
  });

  it("should pass time filters to API", async () => {
    const filters: LogFilters = {
      ...DEFAULT_FILTERS,
      startTime: "2024-01-15T00:00:00Z",
      endTime: "2024-01-15T23:59:59Z",
    };

    const { result } = renderHook(() =>
      useLogEntries("/project", "app.log", filters),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockGetLogEntries).toHaveBeenCalledWith("/project", {
      fileName: "app.log",
      offset: 0,
      limit: 500,
      startTime: "2024-01-15T00:00:00Z",
      endTime: "2024-01-15T23:59:59Z",
    });
  });

  it("should pass runId filter to API", async () => {
    const filters: LogFilters = {
      ...DEFAULT_FILTERS,
      runId: "run-123",
    };

    const { result } = renderHook(() =>
      useLogEntries("/project", "app.log", filters),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockGetLogEntries).toHaveBeenCalledWith("/project", {
      fileName: "app.log",
      offset: 0,
      limit: 500,
      runId: "run-123",
    });
  });

  it("should not load more when hasMore is false", async () => {
    // First setup: set hasMore to false
    mockGetLogEntries.mockResolvedValueOnce({
      entries: mockEntries,
      totalCount: 2,
      hasMore: false,
    });

    const { result } = renderHook(() =>
      useLogEntries("/project", "app.log", DEFAULT_FILTERS),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasMore).toBe(false);
    const callCount = mockGetLogEntries.mock.calls.length;

    // Try to load more when hasMore is false
    await act(async () => {
      await result.current.loadMore();
    });

    // Should not have made another call
    expect(mockGetLogEntries.mock.calls.length).toBe(callCount);
  });

  it("should handle error when loading more entries", async () => {
    const { result } = renderHook(() =>
      useLogEntries("/project", "app.log", DEFAULT_FILTERS),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    mockGetLogEntries.mockRejectedValueOnce(new Error("Load more failed"));

    await act(async () => {
      await result.current.loadMore();
    });

    expect(result.current.error).toBe("Load more failed");
  });

  it("should pass level and category filters to loadMore", async () => {
    const filters: LogFilters = {
      ...DEFAULT_FILTERS,
      level: "ERROR",
      category: "runner",
    };

    const { result } = renderHook(() =>
      useLogEntries("/project", "app.log", filters),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    mockGetLogEntries.mockClear();
    mockGetLogEntries.mockResolvedValueOnce({
      entries: [],
      totalCount: 100,
      hasMore: false,
    });

    await act(async () => {
      await result.current.loadMore();
    });

    expect(mockGetLogEntries).toHaveBeenCalledWith("/project", {
      fileName: "app.log",
      offset: 500,
      limit: 500,
      level: "ERROR",
      category: "runner",
    });
  });

  it("should not load more without project path", async () => {
    const { result } = renderHook(() =>
      useLogEntries(null, "app.log", DEFAULT_FILTERS),
    );

    await act(async () => {
      await result.current.loadMore();
    });

    // Should not have called API
    expect(mockGetLogEntries).not.toHaveBeenCalled();
  });

  it("should not load more without selected file", async () => {
    const { result } = renderHook(() =>
      useLogEntries("/project", null, DEFAULT_FILTERS),
    );

    await act(async () => {
      await result.current.loadMore();
    });

    // Should not have called API
    expect(mockGetLogEntries).not.toHaveBeenCalled();
  });

  describe("lastRunOnly polling", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should poll when lastRunOnly is true", async () => {
      const filters: LogFilters = {
        ...DEFAULT_FILTERS,
        lastRunOnly: true,
      };

      renderHook(() => useLogEntries("/project", "app.log", filters));

      // Wait for initial load
      await vi.runOnlyPendingTimersAsync();

      mockGetLogEntries.mockClear();

      // Advance timer to trigger poll
      await vi.advanceTimersByTimeAsync(3000);

      expect(mockGetLogEntries).toHaveBeenCalled();
    });

    it("should not poll when lastRunOnly is false", async () => {
      const filters: LogFilters = {
        ...DEFAULT_FILTERS,
        lastRunOnly: false,
      };

      renderHook(() => useLogEntries("/project", "app.log", filters));

      // Wait for initial load
      await vi.runOnlyPendingTimersAsync();

      mockGetLogEntries.mockClear();

      // Advance timer - should NOT poll
      await vi.advanceTimersByTimeAsync(5000);

      expect(mockGetLogEntries).not.toHaveBeenCalled();
    });

    it("should silently ignore polling errors", async () => {
      const filters: LogFilters = {
        ...DEFAULT_FILTERS,
        lastRunOnly: true,
      };

      const { result } = renderHook(() =>
        useLogEntries("/project", "app.log", filters),
      );

      // Wait for initial load
      await vi.runOnlyPendingTimersAsync();

      expect(result.current.error).toBeNull();

      // Make poll fail
      mockGetLogEntries.mockRejectedValue(new Error("Poll failed"));

      // Advance timer to trigger poll
      await vi.advanceTimersByTimeAsync(3000);

      // Error should still be null (polling errors are silently ignored)
      expect(result.current.error).toBeNull();
    });

    it("should stop polling on unmount", async () => {
      const filters: LogFilters = {
        ...DEFAULT_FILTERS,
        lastRunOnly: true,
      };

      const { unmount } = renderHook(() =>
        useLogEntries("/project", "app.log", filters),
      );

      // Wait for initial load
      await vi.runOnlyPendingTimersAsync();

      mockGetLogEntries.mockClear();

      unmount();

      // Advance timer - should NOT poll after unmount
      await vi.advanceTimersByTimeAsync(3000);

      expect(mockGetLogEntries).not.toHaveBeenCalled();
    });

    it("should pass filters to poll request", async () => {
      const filters: LogFilters = {
        ...DEFAULT_FILTERS,
        lastRunOnly: true,
        level: "ERROR",
        category: "test",
        search: "query",
        startTime: "2024-01-01",
        endTime: "2024-01-31",
        runId: "run-123",
      };

      renderHook(() => useLogEntries("/project", "app.log", filters));

      // Wait for initial load
      await vi.runOnlyPendingTimersAsync();

      mockGetLogEntries.mockClear();

      // Advance timer to trigger poll
      await vi.advanceTimersByTimeAsync(3000);

      expect(mockGetLogEntries).toHaveBeenCalledWith("/project", {
        fileName: "app.log",
        offset: 0,
        limit: 500,
        level: "ERROR",
        category: "test",
        search: "query",
        startTime: "2024-01-01",
        endTime: "2024-01-31",
        runId: "run-123",
      });
    });
  });

  describe("search debouncing", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should debounce search filter", async () => {
      const filters: LogFilters = {
        ...DEFAULT_FILTERS,
        search: "test query",
      };

      renderHook(() => useLogEntries("/project", "app.log", filters));

      // Initial call should be debounced
      expect(mockGetLogEntries).not.toHaveBeenCalled();

      // Advance past debounce timeout
      await vi.advanceTimersByTimeAsync(300);

      expect(mockGetLogEntries).toHaveBeenCalled();
    });

    it("should clear previous debounce timer when search changes", async () => {
      const filters1: LogFilters = {
        ...DEFAULT_FILTERS,
        search: "first query",
      };

      const { rerender } = renderHook(
        ({ filters }) => useLogEntries("/project", "app.log", filters),
        { initialProps: { filters: filters1 } },
      );

      // Initial call should be debounced
      expect(mockGetLogEntries).not.toHaveBeenCalled();

      // Advance only 100ms (not enough for debounce)
      await vi.advanceTimersByTimeAsync(100);

      // Change the search query
      const filters2: LogFilters = {
        ...DEFAULT_FILTERS,
        search: "second query",
      };
      rerender({ filters: filters2 });

      // Should still not have called (debounce reset)
      expect(mockGetLogEntries).not.toHaveBeenCalled();

      // Advance past debounce timeout
      await vi.advanceTimersByTimeAsync(300);

      // Now should have called with the second query
      expect(mockGetLogEntries).toHaveBeenCalled();
    });
  });
});
