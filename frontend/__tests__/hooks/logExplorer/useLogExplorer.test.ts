import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useLogExplorer } from "@/hooks/logExplorer";
import React from "react";

// Mock all dependencies
vi.mock("@/contexts/ProjectContext", () => ({
  useProject: vi.fn(() => ({ projectPath: "/default/path" })),
}));

const mockUseLogFiles = vi.fn();
vi.mock("@/hooks/logExplorer/useLogFiles", () => ({
  useLogFiles: (...args: unknown[]) => mockUseLogFiles(...args),
}));

const mockUseLogEntries = vi.fn();
vi.mock("@/hooks/logExplorer/useLogEntries", () => ({
  useLogEntries: (...args: unknown[]) => mockUseLogEntries(...args),
}));

const mockUseLogFilters = vi.fn();
vi.mock("@/hooks/logExplorer/useLogFilters", () => ({
  useLogFilters: (...args: unknown[]) => mockUseLogFilters(...args),
}));

const mockUseLogRuns = vi.fn();
vi.mock("@/hooks/logExplorer/useLogRuns", () => ({
  useLogRuns: (...args: unknown[]) => mockUseLogRuns(...args),
}));

const mockUseExportLogEntries = vi.fn();
vi.mock("@/hooks/logExplorer/useExportLogEntries", () => ({
  useExportLogEntries: (...args: unknown[]) => mockUseExportLogEntries(...args),
}));

import { useProject } from "@/contexts/ProjectContext";

describe("useLogExplorer", () => {
  const mockSetSelectedFile = vi.fn();
  const mockSetFilters = vi.fn();
  const mockResetFilters = vi.fn();
  const mockLoadMore = vi.fn();
  const mockTriggerRefresh = vi.fn();
  const mockRefreshFiles = vi.fn();
  const mockRefreshRuns = vi.fn();
  const mockTriggerRunsRefresh = vi.fn();
  const mockExportFiltered = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (useProject as any).mockReturnValue({ projectPath: "/default/path" });

    mockUseLogFiles.mockReturnValue({
      files: [{ name: "app.log", size: 1000 }],
      selectedFile: "app.log",
      setSelectedFile: mockSetSelectedFile,
      isLoading: false,
      error: null,
      refresh: mockRefreshFiles,
    });

    mockUseLogFilters.mockReturnValue({
      filters: { level: null, category: null, search: null },
      setFilters: mockSetFilters,
      resetFilters: mockResetFilters,
    });

    mockUseLogRuns.mockReturnValue({
      runs: [{ id: "run-1", timestamp: Date.now() }],
      lastRunId: "run-1",
      isLoading: false,
      refresh: mockRefreshRuns,
      triggerRefresh: mockTriggerRunsRefresh,
    });

    mockUseLogEntries.mockReturnValue({
      entries: [{ timestamp: "2024-01-15", level: "INFO", message: "test" }],
      stats: { totalCount: 100, levels: { INFO: 50 } },
      totalCount: 100,
      offset: 0,
      hasMore: true,
      isLoading: false,
      isLoadingMore: false,
      error: null,
      loadMore: mockLoadMore,
      triggerRefresh: mockTriggerRefresh,
    });

    mockUseExportLogEntries.mockReturnValue({
      exportFiltered: mockExportFiltered,
      exportError: null,
    });
  });

  describe("initialization", () => {
    it("should use context project path when no override provided", () => {
      renderHook(() => useLogExplorer());

      expect(mockUseLogFiles).toHaveBeenCalledWith("/default/path");
    });

    it("should use override path when provided", () => {
      renderHook(() => useLogExplorer("/override/path"));

      expect(mockUseLogFiles).toHaveBeenCalledWith("/override/path");
    });

    it("should pass isRunning to useLogRuns", () => {
      renderHook(() => useLogExplorer(null, true));

      expect(mockUseLogRuns).toHaveBeenCalledWith(
        "/default/path",
        "app.log",
        true,
      );
    });
  });

  describe("return values", () => {
    it("should return files from useLogFiles", () => {
      const { result } = renderHook(() => useLogExplorer());

      expect(result.current.files).toEqual([{ name: "app.log", size: 1000 }]);
    });

    it("should return selectedFile from useLogFiles", () => {
      const { result } = renderHook(() => useLogExplorer());

      expect(result.current.selectedFile).toBe("app.log");
    });

    it("should return entries from useLogEntries", () => {
      const { result } = renderHook(() => useLogExplorer());

      expect(result.current.entries).toEqual([
        { timestamp: "2024-01-15", level: "INFO", message: "test" },
      ]);
    });

    it("should return stats from useLogEntries", () => {
      const { result } = renderHook(() => useLogExplorer());

      expect(result.current.stats).toEqual({
        totalCount: 100,
        levels: { INFO: 50 },
      });
    });

    it("should return filters from useLogFilters", () => {
      const { result } = renderHook(() => useLogExplorer());

      expect(result.current.filters).toEqual({
        level: null,
        category: null,
        search: null,
      });
    });

    it("should return runs from useLogRuns", () => {
      const { result } = renderHook(() => useLogExplorer());

      expect(result.current.runs).toEqual([
        { id: "run-1", timestamp: expect.any(Number) },
      ]);
    });

    it("should return lastRunId from useLogRuns", () => {
      const { result } = renderHook(() => useLogExplorer());

      expect(result.current.lastRunId).toBe("run-1");
    });
  });

  describe("combined loading state", () => {
    it("should be loading when files are loading", () => {
      mockUseLogFiles.mockReturnValue({
        ...mockUseLogFiles(),
        isLoading: true,
      });

      const { result } = renderHook(() => useLogExplorer());

      expect(result.current.isLoading).toBe(true);
    });

    it("should be loading when entries are loading", () => {
      mockUseLogEntries.mockReturnValue({
        ...mockUseLogEntries(),
        isLoading: true,
      });

      const { result } = renderHook(() => useLogExplorer());

      expect(result.current.isLoading).toBe(true);
    });

    it("should not be loading when nothing is loading", () => {
      const { result } = renderHook(() => useLogExplorer());

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("combined error state", () => {
    it("should return files error", () => {
      mockUseLogFiles.mockReturnValue({
        ...mockUseLogFiles(),
        error: "Files error",
      });

      const { result } = renderHook(() => useLogExplorer());

      expect(result.current.error).toBe("Files error");
    });

    it("should return entries error", () => {
      mockUseLogEntries.mockReturnValue({
        ...mockUseLogEntries(),
        error: "Entries error",
      });

      const { result } = renderHook(() => useLogExplorer());

      expect(result.current.error).toBe("Entries error");
    });

    it("should return export error", () => {
      mockUseExportLogEntries.mockReturnValue({
        exportFiltered: mockExportFiltered,
        exportError: "Export error",
      });

      const { result } = renderHook(() => useLogExplorer());

      expect(result.current.error).toBe("Export error");
    });
  });

  describe("setLastRunOnly", () => {
    it("should set filters with lastRunId when enabling lastRunOnly", () => {
      const { result } = renderHook(() => useLogExplorer());

      act(() => {
        result.current.setLastRunOnly(true);
      });

      expect(mockSetFilters).toHaveBeenCalledWith({
        lastRunOnly: true,
        runId: "run-1",
      });
    });

    it("should clear runId when disabling lastRunOnly", () => {
      const { result } = renderHook(() => useLogExplorer());

      act(() => {
        result.current.setLastRunOnly(false);
      });

      expect(mockSetFilters).toHaveBeenCalledWith({
        lastRunOnly: false,
        runId: null,
      });
    });

    it("should not set runId when no lastRunId available", () => {
      mockUseLogRuns.mockReturnValue({
        ...mockUseLogRuns(),
        lastRunId: null,
      });

      const { result } = renderHook(() => useLogExplorer());

      act(() => {
        result.current.setLastRunOnly(true);
      });

      // When lastRunId is null, it should fall through to the else branch
      expect(mockSetFilters).toHaveBeenCalledWith({
        lastRunOnly: false,
        runId: null,
      });
    });
  });

  describe("refresh", () => {
    it("should refresh files, runs, and entries", async () => {
      mockRefreshFiles.mockResolvedValue(undefined);

      const { result } = renderHook(() => useLogExplorer());

      await act(async () => {
        await result.current.refresh();
      });

      expect(mockRefreshFiles).toHaveBeenCalled();
      expect(mockTriggerRunsRefresh).toHaveBeenCalled();
      expect(mockTriggerRefresh).toHaveBeenCalled();
    });
  });

  describe("delegate functions", () => {
    it("should delegate setSelectedFile", () => {
      const { result } = renderHook(() => useLogExplorer());

      act(() => {
        result.current.setSelectedFile("other.log");
      });

      expect(mockSetSelectedFile).toHaveBeenCalledWith("other.log");
    });

    it("should delegate setFilters", () => {
      const { result } = renderHook(() => useLogExplorer());

      act(() => {
        result.current.setFilters({ level: "ERROR" });
      });

      expect(mockSetFilters).toHaveBeenCalledWith({ level: "ERROR" });
    });

    it("should delegate resetFilters", () => {
      const { result } = renderHook(() => useLogExplorer());

      act(() => {
        result.current.resetFilters();
      });

      expect(mockResetFilters).toHaveBeenCalled();
    });

    it("should delegate loadMore", () => {
      const { result } = renderHook(() => useLogExplorer());

      act(() => {
        result.current.loadMore();
      });

      expect(mockLoadMore).toHaveBeenCalled();
    });

    it("should delegate exportFiltered", () => {
      const { result } = renderHook(() => useLogExplorer());

      act(() => {
        result.current.exportFiltered();
      });

      expect(mockExportFiltered).toHaveBeenCalled();
    });
  });
});
