import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useLogEntries } from "@/hooks/logExplorer/useLogEntries";
import type { LogFilters } from "@/hooks/logExplorer/types";
import { DEFAULT_FILTERS } from "@/hooks/logExplorer/types";

const mockGetLogEntries = vi.fn();
const mockGetLogStats = vi.fn();

vi.mock("@/lib/api", () => ({
  getLogEntries: (...args: unknown[]) => mockGetLogEntries(...args),
  getLogStats: (...args: unknown[]) => mockGetLogStats(...args),
}));

describe("useLogEntries - lastRunOnly polling", () => {
  const mockEntries = [
    { timestamp: "2024-01-15T10:00:00Z", level: "INFO", message: "Test 1" },
    { timestamp: "2024-01-15T10:01:00Z", level: "ERROR", message: "Test 2" },
  ];

  const mockStats = {
    totalCount: 100,
    levels: { INFO: 50, ERROR: 25, WARNING: 25 },
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockGetLogEntries.mockResolvedValue({
      entries: mockEntries,
      totalCount: 100,
      hasMore: true,
    });
    mockGetLogStats.mockResolvedValue(mockStats);
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
