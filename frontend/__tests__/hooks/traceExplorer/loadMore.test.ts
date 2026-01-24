import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
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

describe("useTraceExplorer - loadMore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
