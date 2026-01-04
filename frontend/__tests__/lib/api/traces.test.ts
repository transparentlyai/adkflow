import { describe, it, expect, vi, beforeEach } from "vitest";
import { AxiosError, AxiosHeaders } from "axios";

// Mock the apiClient
const mockGet = vi.fn();

vi.mock("@/lib/api/client", () => ({
  apiClient: {
    get: mockGet,
  },
}));

describe("Traces API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getTraces", () => {
    it("should get traces with default options", async () => {
      const mockResponse = {
        data: {
          traces: [
            {
              trace_id: "trace-123",
              span_count: 5,
              root_span_name: "workflow_run",
              start_time: "2024-01-01T10:00:00Z",
              end_time: "2024-01-01T10:01:00Z",
              duration_ms: 60000,
              status: "OK",
              has_errors: false,
            },
          ],
          total_count: 1,
          has_more: false,
          file_name: "traces.jsonl",
        },
      };
      mockGet.mockResolvedValueOnce(mockResponse);

      const { getTraces } = await import("@/lib/api/traces");
      const result = await getTraces("/project");

      expect(mockGet).toHaveBeenCalledWith("/api/debug/traces", {
        params: { project_path: "/project" },
      });
      expect(result.traces).toHaveLength(1);
      expect(result.traces[0].traceId).toBe("trace-123");
      expect(result.traces[0].spanCount).toBe(5);
      expect(result.traces[0].hasErrors).toBe(false);
      expect(result.totalCount).toBe(1);
      expect(result.hasMore).toBe(false);
    });

    it("should get traces with all options", async () => {
      const mockResponse = {
        data: {
          traces: [],
          total_count: 0,
          has_more: false,
          file_name: "custom-traces.jsonl",
        },
      };
      mockGet.mockResolvedValueOnce(mockResponse);

      const { getTraces } = await import("@/lib/api/traces");
      await getTraces("/project", {
        fileName: "custom-traces.jsonl",
        offset: 10,
        limit: 20,
        startTime: "2024-01-01T00:00:00Z",
        endTime: "2024-01-02T00:00:00Z",
      });

      expect(mockGet).toHaveBeenCalledWith("/api/debug/traces", {
        params: {
          project_path: "/project",
          file_name: "custom-traces.jsonl",
          offset: 10,
          limit: 20,
          start_time: "2024-01-01T00:00:00Z",
          end_time: "2024-01-02T00:00:00Z",
        },
      });
    });

    it("should handle error", async () => {
      const axiosError = new Error("Request failed") as AxiosError;
      (axiosError as AxiosError).isAxiosError = true;
      (axiosError as AxiosError).response = {
        data: { detail: "Traces not found" },
        status: 404,
        statusText: "Not Found",
        headers: {},
        config: { headers: new AxiosHeaders() },
      };
      mockGet.mockRejectedValueOnce(axiosError);

      const { getTraces } = await import("@/lib/api/traces");

      await expect(getTraces("/invalid")).rejects.toThrow("Traces not found");
    });
  });

  describe("getTrace", () => {
    it("should get a single trace with span hierarchy", async () => {
      const mockResponse = {
        data: {
          trace_id: "trace-123",
          spans: [
            {
              trace_id: "trace-123",
              span_id: "span-1",
              parent_span_id: null,
              name: "root_span",
              start_time: "2024-01-01T10:00:00Z",
              end_time: "2024-01-01T10:01:00Z",
              duration_ms: 60000,
              status: "OK",
              attributes: { key: "value" },
              children: [
                {
                  trace_id: "trace-123",
                  span_id: "span-2",
                  parent_span_id: "span-1",
                  name: "child_span",
                  start_time: "2024-01-01T10:00:30Z",
                  end_time: "2024-01-01T10:00:45Z",
                  duration_ms: 15000,
                  status: "OK",
                  attributes: {},
                  children: [],
                },
              ],
            },
          ],
          flat_spans: [
            {
              trace_id: "trace-123",
              span_id: "span-1",
              parent_span_id: null,
              name: "root_span",
              start_time: "2024-01-01T10:00:00Z",
              end_time: "2024-01-01T10:01:00Z",
              duration_ms: 60000,
              status: "OK",
              attributes: {},
              children: [],
            },
          ],
          span_count: 2,
          duration_ms: 60000,
          start_time: "2024-01-01T10:00:00Z",
          end_time: "2024-01-01T10:01:00Z",
        },
      };
      mockGet.mockResolvedValueOnce(mockResponse);

      const { getTrace } = await import("@/lib/api/traces");
      const result = await getTrace("/project", "trace-123");

      expect(mockGet).toHaveBeenCalledWith("/api/debug/traces/trace-123", {
        params: { project_path: "/project", file_name: "traces.jsonl" },
      });
      expect(result.traceId).toBe("trace-123");
      expect(result.spans).toHaveLength(1);
      expect(result.spans[0].children).toHaveLength(1);
      expect(result.spanCount).toBe(2);
      expect(result.durationMs).toBe(60000);
    });

    it("should get trace with custom file name", async () => {
      const mockResponse = {
        data: {
          trace_id: "trace-123",
          spans: [],
          flat_spans: [],
          span_count: 0,
          duration_ms: null,
          start_time: null,
          end_time: null,
        },
      };
      mockGet.mockResolvedValueOnce(mockResponse);

      const { getTrace } = await import("@/lib/api/traces");
      await getTrace("/project", "trace-123", "custom.jsonl");

      expect(mockGet).toHaveBeenCalledWith("/api/debug/traces/trace-123", {
        params: { project_path: "/project", file_name: "custom.jsonl" },
      });
    });

    it("should handle error", async () => {
      const axiosError = new Error("Request failed") as AxiosError;
      (axiosError as AxiosError).isAxiosError = true;
      (axiosError as AxiosError).response = {
        data: { detail: "Trace not found" },
        status: 404,
        statusText: "Not Found",
        headers: {},
        config: { headers: new AxiosHeaders() },
      };
      mockGet.mockRejectedValueOnce(axiosError);

      const { getTrace } = await import("@/lib/api/traces");

      await expect(getTrace("/project", "invalid")).rejects.toThrow(
        "Trace not found",
      );
    });
  });

  describe("getTraceStats", () => {
    it("should get trace stats with default file name", async () => {
      const mockResponse = {
        data: {
          total_traces: 100,
          total_spans: 500,
          span_name_counts: { workflow_run: 100, agent_step: 400 },
          status_counts: { OK: 480, ERROR: 20 },
          time_range: {
            start: "2024-01-01T00:00:00Z",
            end: "2024-01-01T23:59:59Z",
          },
          file_size_bytes: 102400,
        },
      };
      mockGet.mockResolvedValueOnce(mockResponse);

      const { getTraceStats } = await import("@/lib/api/traces");
      const result = await getTraceStats("/project");

      expect(mockGet).toHaveBeenCalledWith("/api/debug/traces/stats", {
        params: { project_path: "/project", file_name: "traces.jsonl" },
      });
      expect(result.totalTraces).toBe(100);
      expect(result.totalSpans).toBe(500);
      expect(result.spanNameCounts).toEqual({
        workflow_run: 100,
        agent_step: 400,
      });
      expect(result.fileSizeBytes).toBe(102400);
    });

    it("should get trace stats with custom file name", async () => {
      const mockResponse = {
        data: {
          total_traces: 0,
          total_spans: 0,
          span_name_counts: {},
          status_counts: {},
          time_range: { start: null, end: null },
          file_size_bytes: 0,
        },
      };
      mockGet.mockResolvedValueOnce(mockResponse);

      const { getTraceStats } = await import("@/lib/api/traces");
      await getTraceStats("/project", "custom.jsonl");

      expect(mockGet).toHaveBeenCalledWith("/api/debug/traces/stats", {
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

      const { getTraceStats } = await import("@/lib/api/traces");

      await expect(getTraceStats("/project")).rejects.toThrow("Server error");
    });
  });

  describe("non-axios error handling", () => {
    it("should rethrow non-axios error in getTraces", async () => {
      const genericError = new Error("Network error");
      mockGet.mockRejectedValueOnce(genericError);

      const { getTraces } = await import("@/lib/api/traces");

      await expect(getTraces("/project")).rejects.toThrow("Network error");
    });

    it("should rethrow non-axios error in getTrace", async () => {
      const genericError = new Error("Network error");
      mockGet.mockRejectedValueOnce(genericError);

      const { getTrace } = await import("@/lib/api/traces");

      await expect(getTrace("/project", "trace-123")).rejects.toThrow(
        "Network error",
      );
    });

    it("should rethrow non-axios error in getTraceStats", async () => {
      const genericError = new Error("Network error");
      mockGet.mockRejectedValueOnce(genericError);

      const { getTraceStats } = await import("@/lib/api/traces");

      await expect(getTraceStats("/project")).rejects.toThrow("Network error");
    });
  });
});
