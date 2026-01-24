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

describe("useLogEntries - search debouncing", () => {
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
