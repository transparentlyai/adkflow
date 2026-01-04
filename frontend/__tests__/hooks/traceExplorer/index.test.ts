import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import React from "react";
import { useTraceExplorer } from "@/hooks/traceExplorer";

const mockGetTraces = vi.fn();
const mockGetTrace = vi.fn();
const mockGetTraceStats = vi.fn();

vi.mock("@/lib/api/traces", () => ({
  getTraces: (...args: unknown[]) => mockGetTraces(...args),
  getTrace: (...args: unknown[]) => mockGetTrace(...args),
  getTraceStats: (...args: unknown[]) => mockGetTraceStats(...args),
}));

vi.mock("@/contexts/ProjectContext", () => ({
  useProject: () => ({ projectPath: null }),
}));

describe("useTraceExplorer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return empty state when no project path", () => {
    const { result } = renderHook(() => useTraceExplorer());

    expect(result.current.traces).toEqual([]);
    expect(result.current.selectedTrace).toBeNull();
    expect(result.current.selectedSpan).toBeNull();
    expect(result.current.stats).toBeNull();
    expect(result.current.totalCount).toBe(0);
    expect(result.current.hasMore).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("should load traces when project path is provided via override", async () => {
    const mockTraces = [
      { traceId: "trace-1", startTime: "2024-01-15T10:00:00Z" },
      { traceId: "trace-2", startTime: "2024-01-15T09:00:00Z" },
    ];
    mockGetTraces.mockResolvedValue({
      traces: mockTraces,
      totalCount: 100,
      hasMore: true,
    });
    mockGetTraceStats.mockResolvedValue({
      totalTraces: 100,
      avgDuration: 500,
    });

    const { result } = renderHook(() => useTraceExplorer("/project"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.traces).toEqual(mockTraces);
    expect(result.current.totalCount).toBe(100);
    expect(result.current.hasMore).toBe(true);
    expect(mockGetTraces).toHaveBeenCalledWith("/project", {
      offset: 0,
      limit: 50,
    });
  });

  it("should load stats", async () => {
    const mockStats = { totalTraces: 100, avgDuration: 500 };
    mockGetTraces.mockResolvedValue({
      traces: [],
      totalCount: 0,
      hasMore: false,
    });
    mockGetTraceStats.mockResolvedValue(mockStats);

    const { result } = renderHook(() => useTraceExplorer("/project"));

    await waitFor(() => {
      expect(result.current.stats).toEqual(mockStats);
    });
  });

  it("should handle error when loading traces", async () => {
    mockGetTraces.mockRejectedValue(new Error("Network error"));
    mockGetTraceStats.mockResolvedValue({ totalTraces: 0 });

    const { result } = renderHook(() => useTraceExplorer("/project"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe("Network error");
    expect(result.current.traces).toEqual([]);
  });

  it("should handle non-Error objects in catch", async () => {
    mockGetTraces.mockRejectedValue("String error");
    mockGetTraceStats.mockResolvedValue({ totalTraces: 0 });

    const { result } = renderHook(() => useTraceExplorer("/project"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe("Failed to fetch traces");
  });

  it("should silently ignore stats errors", async () => {
    mockGetTraces.mockResolvedValue({
      traces: [],
      totalCount: 0,
      hasMore: false,
    });
    mockGetTraceStats.mockRejectedValue(new Error("Stats error"));

    const { result } = renderHook(() => useTraceExplorer("/project"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.stats).toBeNull();
  });

  it("should load more traces", async () => {
    const initialTraces = [
      { traceId: "trace-1", startTime: "2024-01-15T10:00:00Z" },
    ];
    mockGetTraces.mockResolvedValue({
      traces: initialTraces,
      totalCount: 100,
      hasMore: true,
    });
    mockGetTraceStats.mockResolvedValue({ totalTraces: 100 });

    const { result } = renderHook(() => useTraceExplorer("/project"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const moreTraces = [
      { traceId: "trace-2", startTime: "2024-01-15T09:00:00Z" },
    ];
    mockGetTraces.mockResolvedValue({
      traces: moreTraces,
      totalCount: 100,
      hasMore: false,
    });

    await act(async () => {
      result.current.loadMore();
    });

    await waitFor(() => {
      expect(result.current.isLoadingMore).toBe(false);
    });

    expect(result.current.traces.length).toBe(2);
    expect(result.current.hasMore).toBe(false);
  });

  it("should not load more when already loading", async () => {
    mockGetTraces.mockResolvedValue({
      traces: [],
      totalCount: 100,
      hasMore: true,
    });
    mockGetTraceStats.mockResolvedValue({ totalTraces: 100 });

    const { result } = renderHook(() => useTraceExplorer("/project"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Make the call hang
    mockGetTraces.mockImplementation(() => new Promise(() => {}));

    act(() => {
      result.current.loadMore();
    });

    // Try to load more again while loading
    const callCount = mockGetTraces.mock.calls.length;
    act(() => {
      result.current.loadMore();
    });

    // Should not have made another call
    expect(mockGetTraces.mock.calls.length).toBe(callCount);
  });

  it("should not load more when no more data", async () => {
    mockGetTraces.mockResolvedValue({
      traces: [],
      totalCount: 0,
      hasMore: false,
    });
    mockGetTraceStats.mockResolvedValue({ totalTraces: 0 });

    const { result } = renderHook(() => useTraceExplorer("/project"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const callCount = mockGetTraces.mock.calls.length;

    act(() => {
      result.current.loadMore();
    });

    expect(mockGetTraces.mock.calls.length).toBe(callCount);
  });

  it("should select a trace", async () => {
    mockGetTraces.mockResolvedValue({
      traces: [{ traceId: "trace-1", startTime: "2024-01-15T10:00:00Z" }],
      totalCount: 1,
      hasMore: false,
    });
    mockGetTraceStats.mockResolvedValue({ totalTraces: 1 });
    mockGetTrace.mockResolvedValue({
      traceId: "trace-1",
      spans: [{ spanId: "span-1", name: "root" }],
    });

    const { result } = renderHook(() => useTraceExplorer("/project"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.selectTrace("trace-1");
    });

    expect(result.current.selectedTrace).toEqual({
      traceId: "trace-1",
      spans: [{ spanId: "span-1", name: "root" }],
    });
    expect(result.current.selectedSpan).toEqual({
      spanId: "span-1",
      name: "root",
    });
  });

  it("should auto-select first span when selecting trace", async () => {
    mockGetTraces.mockResolvedValue({
      traces: [],
      totalCount: 0,
      hasMore: false,
    });
    mockGetTraceStats.mockResolvedValue({ totalTraces: 0 });
    mockGetTrace.mockResolvedValue({
      traceId: "trace-1",
      spans: [
        { spanId: "span-1", name: "first" },
        { spanId: "span-2", name: "second" },
      ],
    });

    const { result } = renderHook(() => useTraceExplorer("/project"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.selectTrace("trace-1");
    });

    expect(result.current.selectedSpan).toEqual({
      spanId: "span-1",
      name: "first",
    });
  });

  it("should set selectedSpan to null when trace has no spans", async () => {
    mockGetTraces.mockResolvedValue({
      traces: [],
      totalCount: 0,
      hasMore: false,
    });
    mockGetTraceStats.mockResolvedValue({ totalTraces: 0 });
    mockGetTrace.mockResolvedValue({
      traceId: "trace-1",
      spans: [],
    });

    const { result } = renderHook(() => useTraceExplorer("/project"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.selectTrace("trace-1");
    });

    expect(result.current.selectedSpan).toBeNull();
  });

  it("should clear selection when null traceId", async () => {
    mockGetTraces.mockResolvedValue({
      traces: [],
      totalCount: 0,
      hasMore: false,
    });
    mockGetTraceStats.mockResolvedValue({ totalTraces: 0 });
    mockGetTrace.mockResolvedValue({
      traceId: "trace-1",
      spans: [{ spanId: "span-1" }],
    });

    const { result } = renderHook(() => useTraceExplorer("/project"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // First select a trace
    await act(async () => {
      await result.current.selectTrace("trace-1");
    });

    expect(result.current.selectedTrace).not.toBeNull();

    // Then deselect
    await act(async () => {
      await result.current.selectTrace(null);
    });

    expect(result.current.selectedTrace).toBeNull();
    expect(result.current.selectedSpan).toBeNull();
  });

  it("should handle error when selecting trace", async () => {
    mockGetTraces.mockResolvedValue({
      traces: [],
      totalCount: 0,
      hasMore: false,
    });
    mockGetTraceStats.mockResolvedValue({ totalTraces: 0 });
    mockGetTrace.mockRejectedValue(new Error("Trace not found"));

    const { result } = renderHook(() => useTraceExplorer("/project"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.selectTrace("trace-1");
    });

    expect(result.current.error).toBe("Trace not found");
    expect(result.current.selectedTrace).toBeNull();
    expect(result.current.selectedSpan).toBeNull();
  });

  it("should handle non-Error when selecting trace", async () => {
    mockGetTraces.mockResolvedValue({
      traces: [],
      totalCount: 0,
      hasMore: false,
    });
    mockGetTraceStats.mockResolvedValue({ totalTraces: 0 });
    mockGetTrace.mockRejectedValue("String error");

    const { result } = renderHook(() => useTraceExplorer("/project"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.selectTrace("trace-1");
    });

    expect(result.current.error).toBe("Failed to fetch trace");
  });

  it("should select a span", async () => {
    mockGetTraces.mockResolvedValue({
      traces: [],
      totalCount: 0,
      hasMore: false,
    });
    mockGetTraceStats.mockResolvedValue({ totalTraces: 0 });

    const { result } = renderHook(() => useTraceExplorer("/project"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const span = { spanId: "span-1", name: "test" } as any;

    act(() => {
      result.current.selectSpan(span);
    });

    expect(result.current.selectedSpan).toEqual(span);
  });

  it("should clear span selection", async () => {
    mockGetTraces.mockResolvedValue({
      traces: [],
      totalCount: 0,
      hasMore: false,
    });
    mockGetTraceStats.mockResolvedValue({ totalTraces: 0 });

    const { result } = renderHook(() => useTraceExplorer("/project"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.selectSpan(null);
    });

    expect(result.current.selectedSpan).toBeNull();
  });

  it("should refresh traces", async () => {
    const initialTraces = [{ traceId: "trace-1" }];
    mockGetTraces.mockResolvedValue({
      traces: initialTraces,
      totalCount: 1,
      hasMore: false,
    });
    mockGetTraceStats.mockResolvedValue({ totalTraces: 1 });
    mockGetTrace.mockResolvedValue({
      traceId: "trace-1",
      spans: [{ spanId: "span-1" }],
    });

    const { result } = renderHook(() => useTraceExplorer("/project"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Select a trace first
    await act(async () => {
      await result.current.selectTrace("trace-1");
    });

    expect(result.current.selectedTrace).not.toBeNull();

    // Refresh
    const newTraces = [{ traceId: "trace-2" }];
    mockGetTraces.mockResolvedValue({
      traces: newTraces,
      totalCount: 1,
      hasMore: false,
    });

    act(() => {
      result.current.refresh();
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.traces).toEqual(newTraces);
    expect(result.current.selectedTrace).toBeNull();
    expect(result.current.selectedSpan).toBeNull();
  });

  it("should reset state when project path changes to null", async () => {
    const { result, rerender } = renderHook(
      ({ path }) => useTraceExplorer(path),
      { initialProps: { path: "/project" as string | null } },
    );

    mockGetTraces.mockResolvedValue({
      traces: [{ traceId: "trace-1" }],
      totalCount: 1,
      hasMore: false,
    });
    mockGetTraceStats.mockResolvedValue({ totalTraces: 1 });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Change to null project path
    rerender({ path: null });

    expect(result.current.traces).toEqual([]);
    expect(result.current.stats).toBeNull();
    expect(result.current.totalCount).toBe(0);
    expect(result.current.hasMore).toBe(false);
  });
});
