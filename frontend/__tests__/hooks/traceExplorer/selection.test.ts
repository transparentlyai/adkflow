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

function setupDefaultMocks() {
  mockGetTraces.mockResolvedValue({
    traces: [],
    totalCount: 0,
    hasMore: false,
  });
  mockGetTraceStats.mockResolvedValue({ totalTraces: 0 });
}

describe("useTraceExplorer - trace selection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    setupDefaultMocks();
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
    setupDefaultMocks();
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
    setupDefaultMocks();
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
    setupDefaultMocks();
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
    setupDefaultMocks();
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
});

describe("useTraceExplorer - span selection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should select a span", async () => {
    setupDefaultMocks();

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
    setupDefaultMocks();

    const { result } = renderHook(() => useTraceExplorer("/project"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.selectSpan(null);
    });

    expect(result.current.selectedSpan).toBeNull();
  });
});
