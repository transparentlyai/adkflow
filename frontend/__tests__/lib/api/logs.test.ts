import { describe, it, expect, vi, beforeEach } from "vitest";
import { AxiosError, AxiosHeaders } from "axios";

// Mock the apiClient
const mockGet = vi.fn();

vi.mock("@/lib/api/client", () => ({
  apiClient: {
    get: mockGet,
  },
}));

describe("Logs API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getLogFiles", () => {
    it("should get log files", async () => {
      const mockResponse = {
        data: {
          files: [
            {
              name: "adkflow.jsonl",
              path: "/project/logs/adkflow.jsonl",
              size_bytes: 1024,
              modified_at: "2024-01-01T12:00:00Z",
              line_count: 100,
            },
          ],
          log_dir: "/project/logs",
        },
      };
      mockGet.mockResolvedValueOnce(mockResponse);

      const { getLogFiles } = await import("@/lib/api/logs");
      const result = await getLogFiles("/project");

      expect(mockGet).toHaveBeenCalledWith("/api/debug/logs", {
        params: { project_path: "/project" },
      });
      expect(result.files).toHaveLength(1);
      expect(result.files[0].name).toBe("adkflow.jsonl");
      expect(result.files[0].sizeBytes).toBe(1024);
      expect(result.logDir).toBe("/project/logs");
    });

    it("should handle error", async () => {
      const axiosError = new Error("Request failed") as AxiosError;
      (axiosError as AxiosError).isAxiosError = true;
      (axiosError as AxiosError).response = {
        data: { detail: "No logs directory" },
        status: 404,
        statusText: "Not Found",
        headers: {},
        config: { headers: new AxiosHeaders() },
      };
      mockGet.mockRejectedValueOnce(axiosError);

      const { getLogFiles } = await import("@/lib/api/logs");

      await expect(getLogFiles("/invalid")).rejects.toThrow(
        "No logs directory",
      );
    });
  });

  describe("getLogEntries", () => {
    it("should get log entries with default options", async () => {
      const mockResponse = {
        data: {
          entries: [
            {
              line_number: 1,
              timestamp: "2024-01-01T12:00:00Z",
              level: "INFO",
              category: "runner",
              message: "Starting workflow",
              context: null,
              duration_ms: null,
              exception: null,
              run_id: "run-123",
            },
          ],
          total_count: 1,
          has_more: false,
          file_name: "adkflow.jsonl",
          applied_filters: {},
        },
      };
      mockGet.mockResolvedValueOnce(mockResponse);

      const { getLogEntries } = await import("@/lib/api/logs");
      const result = await getLogEntries("/project");

      expect(mockGet).toHaveBeenCalledWith("/api/debug/logs/entries", {
        params: { project_path: "/project" },
      });
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].lineNumber).toBe(1);
      expect(result.entries[0].runId).toBe("run-123");
      expect(result.totalCount).toBe(1);
      expect(result.hasMore).toBe(false);
    });

    it("should get log entries with all options", async () => {
      const mockResponse = {
        data: {
          entries: [],
          total_count: 0,
          has_more: false,
          file_name: "custom.jsonl",
          applied_filters: { level: "ERROR" },
        },
      };
      mockGet.mockResolvedValueOnce(mockResponse);

      const { getLogEntries } = await import("@/lib/api/logs");
      await getLogEntries("/project", {
        fileName: "custom.jsonl",
        offset: 10,
        limit: 50,
        level: "ERROR",
        category: "runner",
        search: "error",
        startTime: "2024-01-01T00:00:00Z",
        endTime: "2024-01-02T00:00:00Z",
        runId: "run-456",
      });

      expect(mockGet).toHaveBeenCalledWith("/api/debug/logs/entries", {
        params: {
          project_path: "/project",
          file_name: "custom.jsonl",
          offset: 10,
          limit: 50,
          level: "ERROR",
          category: "runner",
          search: "error",
          start_time: "2024-01-01T00:00:00Z",
          end_time: "2024-01-02T00:00:00Z",
          run_id: "run-456",
        },
      });
    });

    it("should handle entries with exception", async () => {
      const mockResponse = {
        data: {
          entries: [
            {
              line_number: 1,
              timestamp: "2024-01-01T12:00:00Z",
              level: "ERROR",
              category: "runner",
              message: "Error occurred",
              context: { agent: "TestAgent" },
              duration_ms: 100,
              exception: {
                type: "ValueError",
                message: "Invalid value",
                traceback: ["line1", "line2"],
              },
              run_id: null,
            },
          ],
          total_count: 1,
          has_more: false,
          file_name: "adkflow.jsonl",
          applied_filters: {},
        },
      };
      mockGet.mockResolvedValueOnce(mockResponse);

      const { getLogEntries } = await import("@/lib/api/logs");
      const result = await getLogEntries("/project");

      expect(result.entries[0].exception).toEqual({
        type: "ValueError",
        message: "Invalid value",
        traceback: ["line1", "line2"],
      });
      expect(result.entries[0].durationMs).toBe(100);
      expect(result.entries[0].context).toEqual({ agent: "TestAgent" });
    });

    it("should handle error", async () => {
      const axiosError = new Error("Request failed") as AxiosError;
      (axiosError as AxiosError).isAxiosError = true;
      (axiosError as AxiosError).response = {
        data: { detail: "Invalid filter" },
        status: 400,
        statusText: "Bad Request",
        headers: {},
        config: { headers: new AxiosHeaders() },
      };
      mockGet.mockRejectedValueOnce(axiosError);

      const { getLogEntries } = await import("@/lib/api/logs");

      await expect(getLogEntries("/project")).rejects.toThrow("Invalid filter");
    });
  });

  describe("getLogStats", () => {
    it("should get log stats with default file name", async () => {
      const mockResponse = {
        data: {
          total_lines: 500,
          level_counts: { INFO: 400, ERROR: 50, DEBUG: 50 },
          category_counts: { runner: 300, agent: 200 },
          time_range: {
            start: "2024-01-01T00:00:00Z",
            end: "2024-01-01T23:59:59Z",
          },
          file_size_bytes: 51200,
        },
      };
      mockGet.mockResolvedValueOnce(mockResponse);

      const { getLogStats } = await import("@/lib/api/logs");
      const result = await getLogStats("/project");

      expect(mockGet).toHaveBeenCalledWith("/api/debug/logs/stats", {
        params: { project_path: "/project", file_name: "adkflow.jsonl" },
      });
      expect(result.totalLines).toBe(500);
      expect(result.levelCounts).toEqual({ INFO: 400, ERROR: 50, DEBUG: 50 });
      expect(result.fileSizeBytes).toBe(51200);
    });

    it("should get log stats with custom file name", async () => {
      const mockResponse = {
        data: {
          total_lines: 100,
          level_counts: {},
          category_counts: {},
          time_range: { start: null, end: null },
          file_size_bytes: 0,
        },
      };
      mockGet.mockResolvedValueOnce(mockResponse);

      const { getLogStats } = await import("@/lib/api/logs");
      await getLogStats("/project", "custom.jsonl");

      expect(mockGet).toHaveBeenCalledWith("/api/debug/logs/stats", {
        params: { project_path: "/project", file_name: "custom.jsonl" },
      });
    });

    it("should handle error", async () => {
      const axiosError = new Error("Request failed") as AxiosError;
      (axiosError as AxiosError).isAxiosError = true;
      (axiosError as AxiosError).response = {
        data: { detail: "File not found" },
        status: 404,
        statusText: "Not Found",
        headers: {},
        config: { headers: new AxiosHeaders() },
      };
      mockGet.mockRejectedValueOnce(axiosError);

      const { getLogStats } = await import("@/lib/api/logs");

      await expect(getLogStats("/project")).rejects.toThrow("File not found");
    });
  });

  describe("getLogRuns", () => {
    it("should get log runs with default file name", async () => {
      const mockResponse = {
        data: {
          runs: [
            {
              run_id: "run-123",
              first_timestamp: "2024-01-01T10:00:00Z",
              last_timestamp: "2024-01-01T10:05:00Z",
              entry_count: 50,
            },
            {
              run_id: "run-456",
              first_timestamp: "2024-01-01T11:00:00Z",
              last_timestamp: "2024-01-01T11:10:00Z",
              entry_count: 100,
            },
          ],
          file_name: "adkflow.jsonl",
        },
      };
      mockGet.mockResolvedValueOnce(mockResponse);

      const { getLogRuns } = await import("@/lib/api/logs");
      const result = await getLogRuns("/project");

      expect(mockGet).toHaveBeenCalledWith("/api/debug/logs/runs", {
        params: { project_path: "/project", file_name: "adkflow.jsonl" },
      });
      expect(result.runs).toHaveLength(2);
      expect(result.runs[0].runId).toBe("run-123");
      expect(result.runs[0].entryCount).toBe(50);
      expect(result.fileName).toBe("adkflow.jsonl");
    });

    it("should get log runs with custom file name", async () => {
      const mockResponse = {
        data: {
          runs: [],
          file_name: "custom.jsonl",
        },
      };
      mockGet.mockResolvedValueOnce(mockResponse);

      const { getLogRuns } = await import("@/lib/api/logs");
      await getLogRuns("/project", "custom.jsonl");

      expect(mockGet).toHaveBeenCalledWith("/api/debug/logs/runs", {
        params: { project_path: "/project", file_name: "custom.jsonl" },
      });
    });

    it("should handle error", async () => {
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

      const { getLogRuns } = await import("@/lib/api/logs");

      await expect(getLogRuns("/project")).rejects.toThrow("Server error");
    });
  });

  describe("non-axios error handling", () => {
    it("should rethrow non-axios error in getLogFiles", async () => {
      const genericError = new Error("Network error");
      mockGet.mockRejectedValueOnce(genericError);

      const { getLogFiles } = await import("@/lib/api/logs");

      await expect(getLogFiles("/project")).rejects.toThrow("Network error");
    });

    it("should rethrow non-axios error in getLogEntries", async () => {
      const genericError = new Error("Network error");
      mockGet.mockRejectedValueOnce(genericError);

      const { getLogEntries } = await import("@/lib/api/logs");

      await expect(getLogEntries("/project")).rejects.toThrow("Network error");
    });

    it("should rethrow non-axios error in getLogStats", async () => {
      const genericError = new Error("Network error");
      mockGet.mockRejectedValueOnce(genericError);

      const { getLogStats } = await import("@/lib/api/logs");

      await expect(getLogStats("/project")).rejects.toThrow("Network error");
    });

    it("should rethrow non-axios error in getLogRuns", async () => {
      const genericError = new Error("Network error");
      mockGet.mockRejectedValueOnce(genericError);

      const { getLogRuns } = await import("@/lib/api/logs");

      await expect(getLogRuns("/project")).rejects.toThrow("Network error");
    });
  });
});
