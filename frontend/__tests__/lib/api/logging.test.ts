import { describe, it, expect, vi, beforeEach } from "vitest";
import { AxiosError, AxiosHeaders } from "axios";

// Mock the apiClient
const mockGet = vi.fn();
const mockPut = vi.fn();
const mockPost = vi.fn();

vi.mock("@/lib/api/client", () => ({
  apiClient: {
    get: mockGet,
    put: mockPut,
    post: mockPost,
  },
}));

describe("Logging API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("isDebugModeAvailable", () => {
    it("should return true when debug endpoint is available", async () => {
      mockGet.mockResolvedValueOnce({ data: {} });

      const { isDebugModeAvailable } = await import("@/lib/api/logging");
      const result = await isDebugModeAvailable();

      expect(mockGet).toHaveBeenCalledWith("/api/debug/logging");
      expect(result).toBe(true);
    });

    it("should return false when debug endpoint is not available", async () => {
      mockGet.mockRejectedValueOnce(new Error("Not found"));

      const { isDebugModeAvailable } = await import("@/lib/api/logging");
      const result = await isDebugModeAvailable();

      expect(result).toBe(false);
    });
  });

  describe("getLoggingConfig", () => {
    it("should get logging config without project path", async () => {
      const mockResponse = {
        data: {
          global_level: "INFO",
          categories: { runner: "DEBUG" },
          file_enabled: true,
          file_path: "/logs/app.log",
          file_clear_before_run: true,
          trace_clear_before_run: false,
          console_colored: true,
          console_format: "rich",
        },
      };
      mockGet.mockResolvedValueOnce(mockResponse);

      const { getLoggingConfig } = await import("@/lib/api/logging");
      const result = await getLoggingConfig();

      expect(mockGet).toHaveBeenCalledWith("/api/debug/logging", {
        params: {},
      });
      expect(result).toEqual({
        globalLevel: "INFO",
        categories: { runner: "DEBUG" },
        fileEnabled: true,
        filePath: "/logs/app.log",
        fileClearBeforeRun: true,
        traceClearBeforeRun: false,
        consoleColored: true,
        consoleFormat: "rich",
      });
    });

    it("should get logging config with project path", async () => {
      const mockResponse = {
        data: {
          global_level: "DEBUG",
          categories: {},
          file_enabled: false,
          file_path: null,
          file_clear_before_run: false,
          trace_clear_before_run: true,
          console_colored: false,
          console_format: "plain",
        },
      };
      mockGet.mockResolvedValueOnce(mockResponse);

      const { getLoggingConfig } = await import("@/lib/api/logging");
      await getLoggingConfig("/project");

      expect(mockGet).toHaveBeenCalledWith("/api/debug/logging", {
        params: { project_path: "/project" },
      });
    });

    it("should handle error when getting config", async () => {
      const axiosError = new Error("Request failed") as AxiosError;
      (axiosError as AxiosError).isAxiosError = true;
      (axiosError as AxiosError).response = {
        data: { detail: "Debug mode not available" },
        status: 404,
        statusText: "Not Found",
        headers: {},
        config: { headers: new AxiosHeaders() },
      };
      mockGet.mockRejectedValueOnce(axiosError);

      const { getLoggingConfig } = await import("@/lib/api/logging");

      await expect(getLoggingConfig()).rejects.toThrow(
        "Debug mode not available",
      );
    });
  });

  describe("updateLoggingConfig", () => {
    it("should update logging config", async () => {
      const mockResponse = {
        data: {
          success: true,
          config: {
            global_level: "DEBUG",
            categories: { runner: "TRACE" },
            file_enabled: true,
            file_path: "/logs/app.log",
            file_clear_before_run: true,
            trace_clear_before_run: true,
            console_colored: true,
            console_format: "rich",
          },
        },
      };
      mockPut.mockResolvedValueOnce(mockResponse);

      const update = {
        globalLevel: "DEBUG",
        categories: { runner: "TRACE" },
        fileEnabled: true,
      };

      const { updateLoggingConfig } = await import("@/lib/api/logging");
      const result = await updateLoggingConfig(update);

      expect(mockPut).toHaveBeenCalledWith(
        "/api/debug/logging",
        {
          global_level: "DEBUG",
          categories: { runner: "TRACE" },
          file_enabled: true,
          file_clear_before_run: undefined,
          trace_clear_before_run: undefined,
          console_colored: undefined,
        },
        { params: {} },
      );
      expect(result.globalLevel).toBe("DEBUG");
    });

    it("should update with project path", async () => {
      const mockResponse = {
        data: {
          success: true,
          config: {
            global_level: "INFO",
            categories: {},
            file_enabled: false,
            file_path: null,
            file_clear_before_run: false,
            trace_clear_before_run: false,
            console_colored: true,
            console_format: "rich",
          },
        },
      };
      mockPut.mockResolvedValueOnce(mockResponse);

      const { updateLoggingConfig } = await import("@/lib/api/logging");
      await updateLoggingConfig({ consoleColored: true }, "/project");

      expect(mockPut).toHaveBeenCalledWith(
        "/api/debug/logging",
        expect.any(Object),
        { params: { project_path: "/project" } },
      );
    });

    it("should handle error when updating config", async () => {
      const axiosError = new Error("Request failed") as AxiosError;
      (axiosError as AxiosError).isAxiosError = true;
      (axiosError as AxiosError).response = {
        data: { detail: "Invalid configuration" },
        status: 400,
        statusText: "Bad Request",
        headers: {},
        config: { headers: new AxiosHeaders() },
      };
      mockPut.mockRejectedValueOnce(axiosError);

      const { updateLoggingConfig } = await import("@/lib/api/logging");

      await expect(updateLoggingConfig({})).rejects.toThrow(
        "Invalid configuration",
      );
    });
  });

  describe("getLoggingCategories", () => {
    it("should get logging categories", async () => {
      const mockResponse = {
        data: [
          {
            name: "runner",
            level: "DEBUG",
            enabled: true,
            children: ["agent"],
          },
          { name: "agent", level: "INFO", enabled: true, children: [] },
        ],
      };
      mockGet.mockResolvedValueOnce(mockResponse);

      const { getLoggingCategories } = await import("@/lib/api/logging");
      const result = await getLoggingCategories();

      expect(mockGet).toHaveBeenCalledWith("/api/debug/logging/categories", {
        params: {},
      });
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("runner");
    });

    it("should get categories with project path", async () => {
      mockGet.mockResolvedValueOnce({ data: [] });

      const { getLoggingCategories } = await import("@/lib/api/logging");
      await getLoggingCategories("/project");

      expect(mockGet).toHaveBeenCalledWith("/api/debug/logging/categories", {
        params: { project_path: "/project" },
      });
    });

    it("should handle error when getting categories", async () => {
      const axiosError = new Error("Request failed") as AxiosError;
      (axiosError as AxiosError).isAxiosError = true;
      (axiosError as AxiosError).response = {
        data: { detail: "Server error" },
        status: 500,
        statusText: "Server Error",
        headers: {},
        config: { headers: new AxiosHeaders() },
      };
      mockGet.mockRejectedValueOnce(axiosError);

      const { getLoggingCategories } = await import("@/lib/api/logging");

      await expect(getLoggingCategories()).rejects.toThrow("Server error");
    });
  });

  describe("resetLoggingConfig", () => {
    it("should reset logging config", async () => {
      mockPost.mockResolvedValueOnce({ data: { success: true } });

      const { resetLoggingConfig } = await import("@/lib/api/logging");
      await resetLoggingConfig();

      expect(mockPost).toHaveBeenCalledWith("/api/debug/logging/reset", null, {
        params: {},
      });
    });

    it("should reset with project path", async () => {
      mockPost.mockResolvedValueOnce({ data: { success: true } });

      const { resetLoggingConfig } = await import("@/lib/api/logging");
      await resetLoggingConfig("/project");

      expect(mockPost).toHaveBeenCalledWith("/api/debug/logging/reset", null, {
        params: { project_path: "/project" },
      });
    });

    it("should handle error when resetting", async () => {
      const axiosError = new Error("Request failed") as AxiosError;
      (axiosError as AxiosError).isAxiosError = true;
      (axiosError as AxiosError).response = {
        data: { detail: "Reset failed" },
        status: 500,
        statusText: "Server Error",
        headers: {},
        config: { headers: new AxiosHeaders() },
      };
      mockPost.mockRejectedValueOnce(axiosError);

      const { resetLoggingConfig } = await import("@/lib/api/logging");

      await expect(resetLoggingConfig()).rejects.toThrow("Reset failed");
    });
  });

  describe("non-axios error handling", () => {
    it("should rethrow non-axios error in getLoggingConfig", async () => {
      const genericError = new Error("Network error");
      mockGet.mockRejectedValueOnce(genericError);

      const { getLoggingConfig } = await import("@/lib/api/logging");

      await expect(getLoggingConfig()).rejects.toThrow("Network error");
    });

    it("should rethrow non-axios error in updateLoggingConfig", async () => {
      const genericError = new Error("Network error");
      mockPut.mockRejectedValueOnce(genericError);

      const { updateLoggingConfig } = await import("@/lib/api/logging");

      await expect(updateLoggingConfig({})).rejects.toThrow("Network error");
    });

    it("should rethrow non-axios error in getLoggingCategories", async () => {
      const genericError = new Error("Network error");
      mockGet.mockRejectedValueOnce(genericError);

      const { getLoggingCategories } = await import("@/lib/api/logging");

      await expect(getLoggingCategories()).rejects.toThrow("Network error");
    });

    it("should rethrow non-axios error in resetLoggingConfig", async () => {
      const genericError = new Error("Network error");
      mockPost.mockRejectedValueOnce(genericError);

      const { resetLoggingConfig } = await import("@/lib/api/logging");

      await expect(resetLoggingConfig()).rejects.toThrow("Network error");
    });
  });
});
