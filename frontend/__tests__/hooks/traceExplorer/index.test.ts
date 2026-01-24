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

describe("useTraceExplorer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initial state", () => {
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
  });

  describe("loading traces", () => {
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
  });

  describe("error handling", () => {
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
  });

  describe("refresh", () => {
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
  });

  describe("project path changes", () => {
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
});
