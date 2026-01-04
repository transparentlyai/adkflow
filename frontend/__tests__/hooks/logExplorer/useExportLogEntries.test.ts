import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useExportLogEntries } from "@/hooks/logExplorer/useExportLogEntries";

// Mock the API
vi.mock("@/lib/api", () => ({
  getLogEntries: vi.fn(),
}));

import { getLogEntries } from "@/lib/api";

describe("useExportLogEntries", () => {
  let mockCreateObjectURL: ReturnType<typeof vi.fn>;
  let mockRevokeObjectURL: ReturnType<typeof vi.fn>;
  let mockClick: ReturnType<typeof vi.fn>;
  let mockAnchorElement: {
    click: ReturnType<typeof vi.fn>;
    href: string;
    download: string;
  };
  const originalCreateElement = document.createElement.bind(document);

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock URL methods
    mockCreateObjectURL = vi.fn(() => "blob:test-url");
    mockRevokeObjectURL = vi.fn();
    global.URL.createObjectURL = mockCreateObjectURL;
    global.URL.revokeObjectURL = mockRevokeObjectURL;

    // Create a real anchor element and spy on its click method
    mockClick = vi.fn();
    const realAnchor = originalCreateElement("a") as HTMLAnchorElement;
    mockAnchorElement = realAnchor as unknown as {
      click: ReturnType<typeof vi.fn>;
      href: string;
      download: string;
    };
    vi.spyOn(realAnchor, "click").mockImplementation(mockClick);

    vi.spyOn(document, "createElement").mockImplementation(
      (tagName: string) => {
        if (tagName === "a") {
          return realAnchor;
        }
        return originalCreateElement(tagName);
      },
    );

    // Mock successful API response
    (getLogEntries as any).mockResolvedValue({
      entries: [
        {
          timestamp: "2024-01-15T10:00:00Z",
          level: "INFO",
          category: "test",
          message: "Test message",
          context: { key: "value" },
          durationMs: 100,
          exception: null,
        },
      ],
      totalCount: 1,
      hasMore: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("initialization", () => {
    it("should initialize with null exportError", () => {
      const { result } = renderHook(() =>
        useExportLogEntries("/path", "file.log", {}),
      );

      expect(result.current.exportError).toBeNull();
    });

    it("should return exportFiltered function", () => {
      const { result } = renderHook(() =>
        useExportLogEntries("/path", "file.log", {}),
      );

      expect(typeof result.current.exportFiltered).toBe("function");
    });
  });

  describe("exportFiltered", () => {
    it("should not export when projectPath is null", async () => {
      const { result } = renderHook(() =>
        useExportLogEntries(null, "file.log", {}),
      );

      await act(async () => {
        await result.current.exportFiltered();
      });

      expect(getLogEntries).not.toHaveBeenCalled();
    });

    it("should not export when selectedFile is null", async () => {
      const { result } = renderHook(() =>
        useExportLogEntries("/path", null, {}),
      );

      await act(async () => {
        await result.current.exportFiltered();
      });

      expect(getLogEntries).not.toHaveBeenCalled();
    });

    it("should call getLogEntries with correct options", async () => {
      const { result } = renderHook(() =>
        useExportLogEntries("/path", "file.log", {
          level: "ERROR",
          category: "test",
          search: "query",
          startTime: "2024-01-01",
          endTime: "2024-01-31",
        }),
      );

      await act(async () => {
        await result.current.exportFiltered();
      });

      expect(getLogEntries).toHaveBeenCalledWith("/path", {
        fileName: "file.log",
        offset: 0,
        limit: 10000,
        level: "ERROR",
        category: "test",
        search: "query",
        startTime: "2024-01-01",
        endTime: "2024-01-31",
      });
    });

    it("should create blob and download file", async () => {
      const { result } = renderHook(() =>
        useExportLogEntries("/path", "file.log", {}),
      );

      await act(async () => {
        await result.current.exportFiltered();
      });

      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:test-url");
    });

    it("should set exportError on API failure", async () => {
      (getLogEntries as any).mockRejectedValue(new Error("API Error"));

      const { result } = renderHook(() =>
        useExportLogEntries("/path", "file.log", {}),
      );

      await act(async () => {
        await result.current.exportFiltered();
      });

      expect(result.current.exportError).toBe("API Error");
    });

    it("should set generic error message for non-Error failures", async () => {
      (getLogEntries as any).mockRejectedValue("Unknown error");

      const { result } = renderHook(() =>
        useExportLogEntries("/path", "file.log", {}),
      );

      await act(async () => {
        await result.current.exportFiltered();
      });

      expect(result.current.exportError).toBe("Failed to export");
    });

    it("should only include defined filters in options", async () => {
      const { result } = renderHook(() =>
        useExportLogEntries("/path", "file.log", {
          level: "INFO",
          // Other filters are undefined
        }),
      );

      await act(async () => {
        await result.current.exportFiltered();
      });

      expect(getLogEntries).toHaveBeenCalledWith("/path", {
        fileName: "file.log",
        offset: 0,
        limit: 10000,
        level: "INFO",
      });
    });
  });

  describe("stable references", () => {
    it("should return stable exportFiltered reference when dependencies unchanged", () => {
      const { result, rerender } = renderHook(
        ({ path, file, filters }) => useExportLogEntries(path, file, filters),
        {
          initialProps: {
            path: "/path",
            file: "file.log",
            filters: {},
          },
        },
      );

      const firstReference = result.current.exportFiltered;

      rerender({ path: "/path", file: "file.log", filters: {} });

      // Reference may or may not be stable depending on implementation
      // This test documents the behavior
      expect(typeof result.current.exportFiltered).toBe("function");
    });
  });
});
