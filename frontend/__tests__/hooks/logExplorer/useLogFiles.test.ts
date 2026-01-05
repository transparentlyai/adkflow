import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useLogFiles } from "@/hooks/logExplorer/useLogFiles";

const mockGetLogFiles = vi.fn();

vi.mock("@/lib/api", () => ({
  getLogFiles: (...args: unknown[]) => mockGetLogFiles(...args),
}));

describe("useLogFiles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return empty state when no project path", () => {
    const { result } = renderHook(() => useLogFiles(null));

    expect(result.current.files).toEqual([]);
    expect(result.current.selectedFile).toBeNull();
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("should load files when project path is provided", async () => {
    const mockFiles = [
      { name: "app.log", size: 1000, modifiedAt: "2024-01-15T10:00:00Z" },
      { name: "debug.log", size: 500, modifiedAt: "2024-01-14T10:00:00Z" },
    ];
    mockGetLogFiles.mockResolvedValue({ files: mockFiles });

    const { result } = renderHook(() => useLogFiles("/project"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.files).toEqual(mockFiles);
    expect(mockGetLogFiles).toHaveBeenCalledWith("/project");
  });

  it("should auto-select adkflow.jsonl if present", async () => {
    const mockFiles = [
      { name: "app.log", size: 1000, modifiedAt: "2024-01-15T10:00:00Z" },
      { name: "adkflow.jsonl", size: 500, modifiedAt: "2024-01-14T10:00:00Z" },
      { name: "other.jsonl", size: 200, modifiedAt: "2024-01-13T10:00:00Z" },
    ];
    mockGetLogFiles.mockResolvedValue({ files: mockFiles });

    const { result } = renderHook(() => useLogFiles("/project"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.selectedFile).toBe("adkflow.jsonl");
  });

  it("should auto-select first jsonl file if adkflow.jsonl not present", async () => {
    const mockFiles = [
      { name: "app.log", size: 1000, modifiedAt: "2024-01-15T10:00:00Z" },
      { name: "other.jsonl", size: 200, modifiedAt: "2024-01-13T10:00:00Z" },
    ];
    mockGetLogFiles.mockResolvedValue({ files: mockFiles });

    const { result } = renderHook(() => useLogFiles("/project"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.selectedFile).toBe("other.jsonl");
  });

  it("should auto-select first file if no jsonl files", async () => {
    const mockFiles = [
      { name: "app.log", size: 1000, modifiedAt: "2024-01-15T10:00:00Z" },
      { name: "debug.log", size: 500, modifiedAt: "2024-01-14T10:00:00Z" },
    ];
    mockGetLogFiles.mockResolvedValue({ files: mockFiles });

    const { result } = renderHook(() => useLogFiles("/project"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.selectedFile).toBe("app.log");
  });

  it("should not select file if empty list", async () => {
    mockGetLogFiles.mockResolvedValue({ files: [] });

    const { result } = renderHook(() => useLogFiles("/project"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.selectedFile).toBeNull();
    expect(result.current.files).toEqual([]);
  });

  it("should handle error when loading files", async () => {
    mockGetLogFiles.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useLogFiles("/project"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe("Network error");
    expect(result.current.files).toEqual([]);
  });

  it("should handle non-Error objects in catch", async () => {
    mockGetLogFiles.mockRejectedValue("String error");

    const { result } = renderHook(() => useLogFiles("/project"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe("Failed to load files");
  });

  it("should allow setting selected file manually", async () => {
    const mockFiles = [
      { name: "app.log", size: 1000, modifiedAt: "2024-01-15T10:00:00Z" },
      { name: "debug.log", size: 500, modifiedAt: "2024-01-14T10:00:00Z" },
    ];
    mockGetLogFiles.mockResolvedValue({ files: mockFiles });

    const { result } = renderHook(() => useLogFiles("/project"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.setSelectedFile("debug.log");
    });

    expect(result.current.selectedFile).toBe("debug.log");
  });

  it("should refresh files", async () => {
    const mockFiles = [
      { name: "app.log", size: 1000, modifiedAt: "2024-01-15T10:00:00Z" },
    ];
    mockGetLogFiles.mockResolvedValue({ files: mockFiles });

    const { result } = renderHook(() => useLogFiles("/project"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const newFiles = [
      { name: "app.log", size: 1000, modifiedAt: "2024-01-15T10:00:00Z" },
      { name: "new.log", size: 200, modifiedAt: "2024-01-16T10:00:00Z" },
    ];
    mockGetLogFiles.mockResolvedValue({ files: newFiles });

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.files).toEqual(newFiles);
  });

  it("should not refresh if no project path", async () => {
    const { result } = renderHook(() => useLogFiles(null));

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockGetLogFiles).not.toHaveBeenCalled();
  });

  it("should update selected file on refresh if current selection no longer exists", async () => {
    const mockFiles = [
      { name: "app.log", size: 1000, modifiedAt: "2024-01-15T10:00:00Z" },
      { name: "debug.log", size: 500, modifiedAt: "2024-01-14T10:00:00Z" },
    ];
    mockGetLogFiles.mockResolvedValue({ files: mockFiles });

    const { result } = renderHook(() => useLogFiles("/project"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.setSelectedFile("debug.log");
    });

    // On refresh, debug.log no longer exists
    const newFiles = [
      { name: "app.log", size: 1000, modifiedAt: "2024-01-15T10:00:00Z" },
    ];
    mockGetLogFiles.mockResolvedValue({ files: newFiles });

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.selectedFile).toBe("app.log");
  });

  it("should handle error on refresh", async () => {
    const mockFiles = [
      { name: "app.log", size: 1000, modifiedAt: "2024-01-15T10:00:00Z" },
    ];
    mockGetLogFiles.mockResolvedValue({ files: mockFiles });

    const { result } = renderHook(() => useLogFiles("/project"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    mockGetLogFiles.mockRejectedValue(new Error("Refresh failed"));

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.error).toBe("Refresh failed");
  });

  it("should handle non-Error on refresh", async () => {
    const mockFiles = [
      { name: "app.log", size: 1000, modifiedAt: "2024-01-15T10:00:00Z" },
    ];
    mockGetLogFiles.mockResolvedValue({ files: mockFiles });

    const { result } = renderHook(() => useLogFiles("/project"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    mockGetLogFiles.mockRejectedValue("String error");

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.error).toBe("Failed to refresh");
  });
});
