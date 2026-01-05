import { describe, it, expect, vi, beforeEach } from "vitest";
import { AxiosError, AxiosHeaders } from "axios";

// Mock axios before importing the module
vi.mock("axios", async () => {
  const actual = await vi.importActual("axios");
  return {
    ...actual,
    default: {
      ...actual.default,
      isAxiosError: (error: unknown): error is AxiosError => {
        return error instanceof Error && "isAxiosError" in error;
      },
    },
  };
});

// Mock the apiClient
const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock("@/lib/api/client", () => ({
  apiClient: {
    get: mockGet,
    post: mockPost,
  },
}));

describe("Project API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("loadProject", () => {
    it("should successfully load a project", async () => {
      const mockResponse = {
        data: {
          success: true,
          manifest: { name: "test-project", version: "3.0" },
        },
      };
      mockGet.mockResolvedValueOnce(mockResponse);

      const { loadProject } = await import("@/lib/api/project");
      const result = await loadProject("/path/to/project");

      expect(mockGet).toHaveBeenCalledWith("/api/project/load", {
        params: { path: "/path/to/project" },
      });
      expect(result).toEqual(mockResponse.data);
    });

    it("should throw error with detail message on axios error", async () => {
      const axiosError = new Error("Request failed") as AxiosError;
      (axiosError as AxiosError).isAxiosError = true;
      (axiosError as AxiosError).response = {
        data: { detail: "Project not found" },
        status: 404,
        statusText: "Not Found",
        headers: {},
        config: { headers: new AxiosHeaders() },
      };
      mockGet.mockRejectedValueOnce(axiosError);

      const { loadProject } = await import("@/lib/api/project");

      await expect(loadProject("/invalid/path")).rejects.toThrow(
        "Project not found",
      );
    });

    it("should throw default error message when detail is missing", async () => {
      const axiosError = new Error("Request failed") as AxiosError;
      (axiosError as AxiosError).isAxiosError = true;
      (axiosError as AxiosError).response = {
        data: {},
        status: 500,
        statusText: "Server Error",
        headers: {},
        config: { headers: new AxiosHeaders() },
      };
      mockGet.mockRejectedValueOnce(axiosError);

      const { loadProject } = await import("@/lib/api/project");

      await expect(loadProject("/path")).rejects.toThrow(
        "Failed to load project",
      );
    });

    it("should rethrow non-axios errors", async () => {
      const genericError = new Error("Network error");
      mockGet.mockRejectedValueOnce(genericError);

      const { loadProject } = await import("@/lib/api/project");

      await expect(loadProject("/path")).rejects.toThrow("Network error");
    });
  });

  describe("saveProject", () => {
    it("should successfully save a project", async () => {
      const mockResponse = {
        data: { success: true, path: "/path/to/project" },
      };
      mockPost.mockResolvedValueOnce(mockResponse);

      const flow = { nodes: [], edges: [] };
      const { saveProject } = await import("@/lib/api/project");
      const result = await saveProject("/path/to/project", flow as any);

      expect(mockPost).toHaveBeenCalledWith("/api/project/save", {
        path: "/path/to/project",
        flow,
      });
      expect(result).toEqual(mockResponse.data);
    });

    it("should handle string detail in error", async () => {
      const axiosError = new Error("Request failed") as AxiosError;
      (axiosError as AxiosError).isAxiosError = true;
      (axiosError as AxiosError).response = {
        data: { detail: "Permission denied" },
        status: 403,
        statusText: "Forbidden",
        headers: {},
        config: { headers: new AxiosHeaders() },
      };
      mockPost.mockRejectedValueOnce(axiosError);

      const { saveProject } = await import("@/lib/api/project");

      await expect(saveProject("/path", {} as any)).rejects.toThrow(
        "Permission denied",
      );
    });

    it("should handle array detail in error (validation errors)", async () => {
      const axiosError = new Error("Request failed") as AxiosError;
      (axiosError as AxiosError).isAxiosError = true;
      (axiosError as AxiosError).response = {
        data: {
          detail: [
            { loc: ["body", "flow"], msg: "field required" },
            { loc: ["body", "path"], msg: "invalid path" },
          ],
        },
        status: 422,
        statusText: "Unprocessable Entity",
        headers: {},
        config: { headers: new AxiosHeaders() },
      };
      mockPost.mockRejectedValueOnce(axiosError);

      const { saveProject } = await import("@/lib/api/project");

      await expect(saveProject("/path", {} as any)).rejects.toThrow(
        /body -> flow: field required/,
      );
    });

    it("should handle object detail in error", async () => {
      const axiosError = new Error("Request failed") as AxiosError;
      (axiosError as AxiosError).isAxiosError = true;
      (axiosError as AxiosError).response = {
        data: {
          detail: { code: "ERROR_001", message: "Something went wrong" },
        },
        status: 500,
        statusText: "Server Error",
        headers: {},
        config: { headers: new AxiosHeaders() },
      };
      mockPost.mockRejectedValueOnce(axiosError);

      const { saveProject } = await import("@/lib/api/project");

      await expect(saveProject("/path", {} as any)).rejects.toThrow(
        /ERROR_001/,
      );
    });
  });

  describe("createPrompt", () => {
    it("should successfully create a prompt", async () => {
      const mockResponse = {
        data: { success: true, file_path: "prompts/test.md" },
      };
      mockPost.mockResolvedValueOnce(mockResponse);

      const { createPrompt } = await import("@/lib/api/project");
      const result = await createPrompt("/project", "test");

      expect(mockPost).toHaveBeenCalledWith("/api/project/prompt/create", {
        project_path: "/project",
        prompt_name: "test",
      });
      expect(result).toEqual(mockResponse.data);
    });

    it("should handle error when creating prompt", async () => {
      const axiosError = new Error("Request failed") as AxiosError;
      (axiosError as AxiosError).isAxiosError = true;
      (axiosError as AxiosError).response = {
        data: { detail: "Prompt already exists" },
        status: 409,
        statusText: "Conflict",
        headers: {},
        config: { headers: new AxiosHeaders() },
      };
      mockPost.mockRejectedValueOnce(axiosError);

      const { createPrompt } = await import("@/lib/api/project");

      await expect(createPrompt("/project", "test")).rejects.toThrow(
        "Prompt already exists",
      );
    });
  });

  describe("createContext", () => {
    it("should successfully create a context", async () => {
      const mockResponse = {
        data: { success: true, file_path: "contexts/test.md" },
      };
      mockPost.mockResolvedValueOnce(mockResponse);

      const { createContext } = await import("@/lib/api/project");
      const result = await createContext("/project", "test");

      expect(mockPost).toHaveBeenCalledWith("/api/project/context/create", {
        project_path: "/project",
        context_name: "test",
      });
      expect(result).toEqual(mockResponse.data);
    });

    it("should handle error when creating context", async () => {
      const axiosError = new Error("Request failed") as AxiosError;
      (axiosError as AxiosError).isAxiosError = true;
      (axiosError as AxiosError).response = {
        data: { detail: "Context already exists" },
        status: 409,
        statusText: "Conflict",
        headers: {},
        config: { headers: new AxiosHeaders() },
      };
      mockPost.mockRejectedValueOnce(axiosError);

      const { createContext } = await import("@/lib/api/project");

      await expect(createContext("/project", "test")).rejects.toThrow(
        "Context already exists",
      );
    });
  });

  describe("createTool", () => {
    it("should successfully create a tool", async () => {
      const mockResponse = {
        data: { success: true, file_path: "tools/test.py" },
      };
      mockPost.mockResolvedValueOnce(mockResponse);

      const { createTool } = await import("@/lib/api/project");
      const result = await createTool("/project", "test");

      expect(mockPost).toHaveBeenCalledWith("/api/project/tool/create", {
        project_path: "/project",
        tool_name: "test",
      });
      expect(result).toEqual(mockResponse.data);
    });

    it("should handle error when creating tool", async () => {
      const axiosError = new Error("Request failed") as AxiosError;
      (axiosError as AxiosError).isAxiosError = true;
      (axiosError as AxiosError).response = {
        data: { detail: "Tool already exists" },
        status: 409,
        statusText: "Conflict",
        headers: {},
        config: { headers: new AxiosHeaders() },
      };
      mockPost.mockRejectedValueOnce(axiosError);

      const { createTool } = await import("@/lib/api/project");

      await expect(createTool("/project", "test")).rejects.toThrow(
        "Tool already exists",
      );
    });
  });

  describe("readPrompt", () => {
    it("should successfully read a prompt", async () => {
      const mockResponse = {
        data: { content: "# Test Prompt\nThis is a test." },
      };
      mockPost.mockResolvedValueOnce(mockResponse);

      const { readPrompt } = await import("@/lib/api/project");
      const result = await readPrompt("/project", "prompts/test.md");

      expect(mockPost).toHaveBeenCalledWith("/api/project/prompt/read", {
        project_path: "/project",
        file_path: "prompts/test.md",
      });
      expect(result).toEqual(mockResponse.data);
    });

    it("should handle error when reading prompt", async () => {
      const axiosError = new Error("Request failed") as AxiosError;
      (axiosError as AxiosError).isAxiosError = true;
      (axiosError as AxiosError).response = {
        data: { detail: "Prompt not found" },
        status: 404,
        statusText: "Not Found",
        headers: {},
        config: { headers: new AxiosHeaders() },
      };
      mockPost.mockRejectedValueOnce(axiosError);

      const { readPrompt } = await import("@/lib/api/project");

      await expect(readPrompt("/project", "prompts/test.md")).rejects.toThrow(
        "Prompt not found",
      );
    });
  });

  describe("savePrompt", () => {
    it("should successfully save a prompt", async () => {
      const mockResponse = { data: { success: true } };
      mockPost.mockResolvedValueOnce(mockResponse);

      const { savePrompt } = await import("@/lib/api/project");
      const result = await savePrompt(
        "/project",
        "prompts/test.md",
        "New content",
      );

      expect(mockPost).toHaveBeenCalledWith("/api/project/prompt/save", {
        project_path: "/project",
        file_path: "prompts/test.md",
        content: "New content",
      });
      expect(result).toEqual(mockResponse.data);
    });

    it("should handle error when saving prompt", async () => {
      const axiosError = new Error("Request failed") as AxiosError;
      (axiosError as AxiosError).isAxiosError = true;
      (axiosError as AxiosError).response = {
        data: { detail: "Failed to save" },
        status: 500,
        statusText: "Server Error",
        headers: {},
        config: { headers: new AxiosHeaders() },
      };
      mockPost.mockRejectedValueOnce(axiosError);

      const { savePrompt } = await import("@/lib/api/project");

      await expect(
        savePrompt("/project", "prompts/test.md", "content"),
      ).rejects.toThrow("Failed to save");
    });
  });

  describe("readFileChunk", () => {
    it("should read file chunk with default options", async () => {
      const mockResponse = {
        data: { lines: ["line1", "line2"], total: 100, hasMore: true },
      };
      mockPost.mockResolvedValueOnce(mockResponse);

      const { readFileChunk } = await import("@/lib/api/project");
      const result = await readFileChunk("/project", "file.log");

      expect(mockPost).toHaveBeenCalledWith("/api/project/file/chunk", {
        project_path: "/project",
        file_path: "file.log",
        offset: 0,
        limit: 500,
        reverse: true,
      });
      expect(result).toEqual(mockResponse.data);
    });

    it("should read file chunk with custom options", async () => {
      const mockResponse = {
        data: { lines: ["line1"], total: 100, hasMore: false },
      };
      mockPost.mockResolvedValueOnce(mockResponse);

      const { readFileChunk } = await import("@/lib/api/project");
      await readFileChunk("/project", "file.log", 50, 100, false);

      expect(mockPost).toHaveBeenCalledWith("/api/project/file/chunk", {
        project_path: "/project",
        file_path: "file.log",
        offset: 50,
        limit: 100,
        reverse: false,
      });
    });

    it("should handle error when reading file chunk", async () => {
      const axiosError = new Error("Request failed") as AxiosError;
      (axiosError as AxiosError).isAxiosError = true;
      (axiosError as AxiosError).response = {
        data: { detail: "File not found" },
        status: 404,
        statusText: "Not Found",
        headers: {},
        config: { headers: new AxiosHeaders() },
      };
      mockPost.mockRejectedValueOnce(axiosError);

      const { readFileChunk } = await import("@/lib/api/project");

      await expect(readFileChunk("/project", "file.log")).rejects.toThrow(
        "File not found",
      );
    });
  });

  describe("non-axios error handling", () => {
    it("should rethrow non-axios error in saveProject", async () => {
      const genericError = new Error("Network error");
      mockPost.mockRejectedValueOnce(genericError);

      const { saveProject } = await import("@/lib/api/project");

      await expect(saveProject("/path", {} as any)).rejects.toThrow(
        "Network error",
      );
    });

    it("should rethrow non-axios error in createPrompt", async () => {
      const genericError = new Error("Network error");
      mockPost.mockRejectedValueOnce(genericError);

      const { createPrompt } = await import("@/lib/api/project");

      await expect(createPrompt("/project", "test")).rejects.toThrow(
        "Network error",
      );
    });

    it("should rethrow non-axios error in createContext", async () => {
      const genericError = new Error("Network error");
      mockPost.mockRejectedValueOnce(genericError);

      const { createContext } = await import("@/lib/api/project");

      await expect(createContext("/project", "test")).rejects.toThrow(
        "Network error",
      );
    });

    it("should rethrow non-axios error in createTool", async () => {
      const genericError = new Error("Network error");
      mockPost.mockRejectedValueOnce(genericError);

      const { createTool } = await import("@/lib/api/project");

      await expect(createTool("/project", "test")).rejects.toThrow(
        "Network error",
      );
    });

    it("should rethrow non-axios error in readPrompt", async () => {
      const genericError = new Error("Network error");
      mockPost.mockRejectedValueOnce(genericError);

      const { readPrompt } = await import("@/lib/api/project");

      await expect(readPrompt("/project", "prompts/test.md")).rejects.toThrow(
        "Network error",
      );
    });

    it("should rethrow non-axios error in savePrompt", async () => {
      const genericError = new Error("Network error");
      mockPost.mockRejectedValueOnce(genericError);

      const { savePrompt } = await import("@/lib/api/project");

      await expect(
        savePrompt("/project", "prompts/test.md", "content"),
      ).rejects.toThrow("Network error");
    });

    it("should rethrow non-axios error in readFileChunk", async () => {
      const genericError = new Error("Network error");
      mockPost.mockRejectedValueOnce(genericError);

      const { readFileChunk } = await import("@/lib/api/project");

      await expect(readFileChunk("/project", "file.log")).rejects.toThrow(
        "Network error",
      );
    });
  });
});
