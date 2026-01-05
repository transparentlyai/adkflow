import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLogFilters } from "@/hooks/logExplorer/useLogFilters";
import { DEFAULT_FILTERS } from "@/hooks/logExplorer/types";

describe("useLogFilters", () => {
  it("should initialize with default filters", () => {
    const { result } = renderHook(() => useLogFilters());

    expect(result.current.filters).toEqual(DEFAULT_FILTERS);
  });

  it("should update filters with setFilters", () => {
    const { result } = renderHook(() => useLogFilters());

    act(() => {
      result.current.setFilters({ level: "ERROR" });
    });

    expect(result.current.filters.level).toBe("ERROR");
    expect(result.current.filters.search).toBe("");
  });

  it("should update multiple filters at once", () => {
    const { result } = renderHook(() => useLogFilters());

    act(() => {
      result.current.setFilters({
        level: "DEBUG",
        category: "runner",
        search: "test",
      });
    });

    expect(result.current.filters.level).toBe("DEBUG");
    expect(result.current.filters.category).toBe("runner");
    expect(result.current.filters.search).toBe("test");
  });

  it("should reset filters to default", () => {
    const { result } = renderHook(() => useLogFilters());

    act(() => {
      result.current.setFilters({
        level: "ERROR",
        search: "something",
      });
    });

    expect(result.current.filters.level).toBe("ERROR");

    act(() => {
      result.current.resetFilters();
    });

    expect(result.current.filters).toEqual(DEFAULT_FILTERS);
  });

  it("should preserve existing filters when updating", () => {
    const { result } = renderHook(() => useLogFilters());

    act(() => {
      result.current.setFilters({ level: "ERROR" });
    });

    act(() => {
      result.current.setFilters({ category: "agent" });
    });

    expect(result.current.filters.level).toBe("ERROR");
    expect(result.current.filters.category).toBe("agent");
  });

  it("should support lastRunOnly filter", () => {
    const { result } = renderHook(() => useLogFilters());

    expect(result.current.filters.lastRunOnly).toBe(false);

    act(() => {
      result.current.setFilters({ lastRunOnly: true });
    });

    expect(result.current.filters.lastRunOnly).toBe(true);
  });

  it("should support time range filters", () => {
    const { result } = renderHook(() => useLogFilters());

    act(() => {
      result.current.setFilters({
        startTime: "2024-01-15T00:00:00Z",
        endTime: "2024-01-15T23:59:59Z",
      });
    });

    expect(result.current.filters.startTime).toBe("2024-01-15T00:00:00Z");
    expect(result.current.filters.endTime).toBe("2024-01-15T23:59:59Z");
  });

  it("should support runId filter", () => {
    const { result } = renderHook(() => useLogFilters());

    act(() => {
      result.current.setFilters({ runId: "run-123" });
    });

    expect(result.current.filters.runId).toBe("run-123");
  });
});
