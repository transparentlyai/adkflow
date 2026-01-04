import { describe, it, expect, vi, beforeEach } from "vitest";
import { AxiosError, AxiosHeaders } from "axios";

// Mock the apiClient
const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock("@/lib/api/client", () => ({
  apiClient: {
    get: mockGet,
    post: mockPost,
  },
  API_BASE_URL: "http://localhost:8000",
}));

// Mock EventSource
class MockEventSource {
  url: string;
  constructor(url: string) {
    this.url = url;
  }
}

vi.stubGlobal("EventSource", MockEventSource);

describe("Execution API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("startRun", () => {
    it("should start a workflow run", async () => {
      const mockResponse = {
        data: { run_id: "run-123", status: "running" },
      };
      mockPost.mockResolvedValueOnce(mockResponse);

      const request = { project_path: "/project", input: "test input" };
      const { startRun } = await import("@/lib/api/execution");
      const result = await startRun(request as any);

      expect(mockPost).toHaveBeenCalledWith("/api/execution/run", request);
      expect(result).toEqual(mockResponse.data);
    });

    it("should handle error when starting run", async () => {
      const axiosError = new Error("Request failed") as AxiosError;
      (axiosError as AxiosError).isAxiosError = true;
      (axiosError as AxiosError).response = {
        data: { detail: "Invalid workflow" },
        status: 400,
        statusText: "Bad Request",
        headers: {},
        config: { headers: new AxiosHeaders() },
      };
      mockPost.mockRejectedValueOnce(axiosError);

      const { startRun } = await import("@/lib/api/execution");

      await expect(startRun({} as any)).rejects.toThrow("Invalid workflow");
    });
  });

  describe("getRunStatus", () => {
    it("should get run status", async () => {
      const mockResponse = {
        data: { run_id: "run-123", status: "completed", output: "result" },
      };
      mockGet.mockResolvedValueOnce(mockResponse);

      const { getRunStatus } = await import("@/lib/api/execution");
      const result = await getRunStatus("run-123");

      expect(mockGet).toHaveBeenCalledWith("/api/execution/run/run-123/status");
      expect(result).toEqual(mockResponse.data);
    });

    it("should handle error when getting status", async () => {
      const axiosError = new Error("Request failed") as AxiosError;
      (axiosError as AxiosError).isAxiosError = true;
      (axiosError as AxiosError).response = {
        data: { detail: "Run not found" },
        status: 404,
        statusText: "Not Found",
        headers: {},
        config: { headers: new AxiosHeaders() },
      };
      mockGet.mockRejectedValueOnce(axiosError);

      const { getRunStatus } = await import("@/lib/api/execution");

      await expect(getRunStatus("invalid")).rejects.toThrow("Run not found");
    });
  });

  describe("cancelRun", () => {
    it("should cancel a running workflow", async () => {
      const mockResponse = {
        data: { success: true, message: "Run cancelled" },
      };
      mockPost.mockResolvedValueOnce(mockResponse);

      const { cancelRun } = await import("@/lib/api/execution");
      const result = await cancelRun("run-123");

      expect(mockPost).toHaveBeenCalledWith(
        "/api/execution/run/run-123/cancel",
      );
      expect(result).toEqual({ success: true, message: "Run cancelled" });
    });

    it("should handle error when cancelling run", async () => {
      const axiosError = new Error("Request failed") as AxiosError;
      (axiosError as AxiosError).isAxiosError = true;
      (axiosError as AxiosError).response = {
        data: { detail: "Run already completed" },
        status: 400,
        statusText: "Bad Request",
        headers: {},
        config: { headers: new AxiosHeaders() },
      };
      mockPost.mockRejectedValueOnce(axiosError);

      const { cancelRun } = await import("@/lib/api/execution");

      await expect(cancelRun("run-123")).rejects.toThrow(
        "Run already completed",
      );
    });
  });

  describe("validateWorkflow", () => {
    it("should validate a workflow", async () => {
      const mockResponse = {
        data: { valid: true, errors: [] },
      };
      mockPost.mockResolvedValueOnce(mockResponse);

      const { validateWorkflow } = await import("@/lib/api/execution");
      const result = await validateWorkflow("/project");

      expect(mockPost).toHaveBeenCalledWith("/api/execution/validate", {
        project_path: "/project",
      });
      expect(result).toEqual(mockResponse.data);
    });

    it("should handle error when validating workflow", async () => {
      const axiosError = new Error("Request failed") as AxiosError;
      (axiosError as AxiosError).isAxiosError = true;
      (axiosError as AxiosError).response = {
        data: { detail: "Invalid workflow configuration" },
        status: 400,
        statusText: "Bad Request",
        headers: {},
        config: { headers: new AxiosHeaders() },
      };
      mockPost.mockRejectedValueOnce(axiosError);

      const { validateWorkflow } = await import("@/lib/api/execution");

      await expect(validateWorkflow("/invalid")).rejects.toThrow(
        "Invalid workflow configuration",
      );
    });
  });

  describe("getTopology", () => {
    it("should get workflow topology", async () => {
      const mockResponse = {
        data: { agents: [], connections: [] },
      };
      mockPost.mockResolvedValueOnce(mockResponse);

      const { getTopology } = await import("@/lib/api/execution");
      const result = await getTopology("/project");

      expect(mockPost).toHaveBeenCalledWith("/api/execution/topology", {
        project_path: "/project",
      });
      expect(result).toEqual(mockResponse.data);
    });

    it("should handle error when getting topology", async () => {
      const axiosError = new Error("Request failed") as AxiosError;
      (axiosError as AxiosError).isAxiosError = true;
      (axiosError as AxiosError).response = {
        data: { detail: "Failed to compile workflow" },
        status: 500,
        statusText: "Internal Server Error",
        headers: {},
        config: { headers: new AxiosHeaders() },
      };
      mockPost.mockRejectedValueOnce(axiosError);

      const { getTopology } = await import("@/lib/api/execution");

      await expect(getTopology("/project")).rejects.toThrow(
        "Failed to compile workflow",
      );
    });
  });

  describe("createRunEventSource", () => {
    it("should create EventSource with correct URL", async () => {
      const { createRunEventSource } = await import("@/lib/api/execution");
      const eventSource = createRunEventSource("run-123");

      expect(eventSource).toBeInstanceOf(MockEventSource);
      expect(eventSource.url).toBe(
        "http://localhost:8000/api/execution/run/run-123/events",
      );
    });
  });

  describe("submitUserInput", () => {
    it("should submit user input", async () => {
      const mockResponse = {
        data: { success: true },
      };
      mockPost.mockResolvedValueOnce(mockResponse);

      const submission = { input: "user response" };
      const { submitUserInput } = await import("@/lib/api/execution");
      const result = await submitUserInput("run-123", submission as any);

      expect(mockPost).toHaveBeenCalledWith(
        "/api/execution/run/run-123/input",
        submission,
      );
      expect(result).toEqual(mockResponse.data);
    });

    it("should handle error when submitting user input", async () => {
      const axiosError = new Error("Request failed") as AxiosError;
      (axiosError as AxiosError).isAxiosError = true;
      (axiosError as AxiosError).response = {
        data: { detail: "Input timeout" },
        status: 408,
        statusText: "Request Timeout",
        headers: {},
        config: { headers: new AxiosHeaders() },
      };
      mockPost.mockRejectedValueOnce(axiosError);

      const { submitUserInput } = await import("@/lib/api/execution");

      await expect(
        submitUserInput("run-123", { input: "test" } as any),
      ).rejects.toThrow("Input timeout");
    });
  });

  describe("non-axios error handling", () => {
    it("should rethrow non-axios error in startRun", async () => {
      const genericError = new Error("Network error");
      mockPost.mockRejectedValueOnce(genericError);

      const { startRun } = await import("@/lib/api/execution");

      await expect(startRun({} as any)).rejects.toThrow("Network error");
    });

    it("should rethrow non-axios error in getRunStatus", async () => {
      const genericError = new Error("Network error");
      mockGet.mockRejectedValueOnce(genericError);

      const { getRunStatus } = await import("@/lib/api/execution");

      await expect(getRunStatus("run-123")).rejects.toThrow("Network error");
    });

    it("should rethrow non-axios error in cancelRun", async () => {
      const genericError = new Error("Network error");
      mockPost.mockRejectedValueOnce(genericError);

      const { cancelRun } = await import("@/lib/api/execution");

      await expect(cancelRun("run-123")).rejects.toThrow("Network error");
    });

    it("should rethrow non-axios error in validateWorkflow", async () => {
      const genericError = new Error("Network error");
      mockPost.mockRejectedValueOnce(genericError);

      const { validateWorkflow } = await import("@/lib/api/execution");

      await expect(validateWorkflow("/project")).rejects.toThrow(
        "Network error",
      );
    });

    it("should rethrow non-axios error in getTopology", async () => {
      const genericError = new Error("Network error");
      mockPost.mockRejectedValueOnce(genericError);

      const { getTopology } = await import("@/lib/api/execution");

      await expect(getTopology("/project")).rejects.toThrow("Network error");
    });

    it("should rethrow non-axios error in submitUserInput", async () => {
      const genericError = new Error("Network error");
      mockPost.mockRejectedValueOnce(genericError);

      const { submitUserInput } = await import("@/lib/api/execution");

      await expect(submitUserInput("run-123", {} as any)).rejects.toThrow(
        "Network error",
      );
    });
  });
});
