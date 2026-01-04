import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import React from "react";

// Mock the dependencies
vi.mock("@/contexts/ProjectContext", () => ({
  useProject: vi.fn(() => ({ projectPath: "/test/project" })),
}));

const mockIsDebugModeAvailable = vi.fn();
const mockGetLoggingConfig = vi.fn();
const mockUpdateLoggingConfig = vi.fn();
const mockGetLoggingCategories = vi.fn();
const mockResetLoggingConfig = vi.fn();

vi.mock("@/lib/api", () => ({
  isDebugModeAvailable: () => mockIsDebugModeAvailable(),
  getLoggingConfig: (...args: unknown[]) => mockGetLoggingConfig(...args),
  updateLoggingConfig: (...args: unknown[]) => mockUpdateLoggingConfig(...args),
  getLoggingCategories: (...args: unknown[]) =>
    mockGetLoggingCategories(...args),
  resetLoggingConfig: (...args: unknown[]) => mockResetLoggingConfig(...args),
}));

describe("useLoggingConfig", () => {
  const mockConfig = {
    globalLevel: "INFO",
    categories: { runner: "DEBUG" },
    fileEnabled: true,
    filePath: "/logs/app.log",
    fileClearBeforeRun: true,
    traceClearBeforeRun: false,
    consoleColored: true,
    consoleFormat: "rich",
  };

  const mockCategories = [
    { name: "runner", level: "DEBUG", enabled: true, children: [] },
    { name: "agent", level: "INFO", enabled: true, children: [] },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsDebugModeAvailable.mockResolvedValue(true);
    mockGetLoggingConfig.mockResolvedValue(mockConfig);
    mockGetLoggingCategories.mockResolvedValue(mockCategories);
    mockUpdateLoggingConfig.mockResolvedValue(mockConfig);
    mockResetLoggingConfig.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should start with loading state", async () => {
    const { useLoggingConfig } = await import("@/hooks/useLoggingConfig");

    const { result } = renderHook(() => useLoggingConfig());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it("should detect dev mode and load config", async () => {
    const { useLoggingConfig } = await import("@/hooks/useLoggingConfig");

    const { result } = renderHook(() => useLoggingConfig());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isDevMode).toBe(true);
    expect(result.current.config).toEqual(mockConfig);
    expect(result.current.categories).toEqual(mockCategories);
    expect(result.current.error).toBeNull();
  });

  it("should handle non-dev mode", async () => {
    mockIsDebugModeAvailable.mockResolvedValue(false);

    const { useLoggingConfig } = await import("@/hooks/useLoggingConfig");

    const { result } = renderHook(() => useLoggingConfig());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isDevMode).toBe(false);
    expect(result.current.config).toBeNull();
    expect(mockGetLoggingConfig).not.toHaveBeenCalled();
  });

  it("should handle error during initial load", async () => {
    mockIsDebugModeAvailable.mockRejectedValue(new Error("Network error"));

    const { useLoggingConfig } = await import("@/hooks/useLoggingConfig");

    const { result } = renderHook(() => useLoggingConfig());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe("Network error");
  });

  it("should update config", async () => {
    const updatedConfig = { ...mockConfig, globalLevel: "DEBUG" };
    mockUpdateLoggingConfig.mockResolvedValue(updatedConfig);

    const { useLoggingConfig } = await import("@/hooks/useLoggingConfig");

    const { result } = renderHook(() => useLoggingConfig());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.updateConfig({ globalLevel: "DEBUG" });
    });

    expect(mockUpdateLoggingConfig).toHaveBeenCalledWith(
      { globalLevel: "DEBUG" },
      "/test/project",
    );
    expect(result.current.config?.globalLevel).toBe("DEBUG");
  });

  it("should not update config when not in dev mode", async () => {
    mockIsDebugModeAvailable.mockResolvedValue(false);

    const { useLoggingConfig } = await import("@/hooks/useLoggingConfig");

    const { result } = renderHook(() => useLoggingConfig());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.updateConfig({ globalLevel: "DEBUG" });
    });

    expect(mockUpdateLoggingConfig).not.toHaveBeenCalled();
  });

  it("should refresh config", async () => {
    const { useLoggingConfig } = await import("@/hooks/useLoggingConfig");

    const { result } = renderHook(() => useLoggingConfig());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Clear mocks to check refresh calls
    mockGetLoggingConfig.mockClear();
    mockGetLoggingCategories.mockClear();

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockGetLoggingConfig).toHaveBeenCalled();
    expect(mockGetLoggingCategories).toHaveBeenCalled();
  });

  it("should reset config", async () => {
    const { useLoggingConfig } = await import("@/hooks/useLoggingConfig");

    const { result } = renderHook(() => useLoggingConfig());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.resetConfig();
    });

    expect(mockResetLoggingConfig).toHaveBeenCalledWith("/test/project");
  });

  it("should use project path override", async () => {
    const { useLoggingConfig } = await import("@/hooks/useLoggingConfig");

    const { result } = renderHook(() => useLoggingConfig("/override/project"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockGetLoggingConfig).toHaveBeenCalledWith("/override/project");
  });

  it("should call update config API", async () => {
    const updatedConfig = { ...mockConfig, globalLevel: "ERROR" };
    mockUpdateLoggingConfig.mockResolvedValue(updatedConfig);

    const { useLoggingConfig } = await import("@/hooks/useLoggingConfig");

    const { result } = renderHook(() => useLoggingConfig());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.updateConfig({ globalLevel: "ERROR" });
    });

    expect(mockUpdateLoggingConfig).toHaveBeenCalled();
  });

  it("should call reset config API", async () => {
    const { useLoggingConfig } = await import("@/hooks/useLoggingConfig");

    const { result } = renderHook(() => useLoggingConfig());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.resetConfig();
    });

    expect(mockResetLoggingConfig).toHaveBeenCalled();
  });
});
