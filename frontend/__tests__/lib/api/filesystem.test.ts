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
}));

describe("Filesystem API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAvailableTools", () => {
    it("should get available tools", async () => {
      const mockResponse = {
        data: {
          tools: [
            { name: "calculator", description: "Math operations" },
            { name: "search", description: "Web search" },
          ],
        },
      };
      mockGet.mockResolvedValueOnce(mockResponse);

      const { getAvailableTools } = await import("@/lib/api/filesystem");
      const result = await getAvailableTools();

      expect(mockGet).toHaveBeenCalledWith("/api/tools");
      expect(result).toEqual(mockResponse.data);
    });

    it("should handle error when fetching tools", async () => {
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

      const { getAvailableTools } = await import("@/lib/api/filesystem");

      await expect(getAvailableTools()).rejects.toThrow("Server error");
    });
  });

  describe("listDirectory", () => {
    it("should list directory contents", async () => {
      const mockResponse = {
        data: {
          path: "/home/user",
          entries: [
            { name: "documents", isDir: true },
            { name: "file.txt", isDir: false },
          ],
        },
      };
      mockGet.mockResolvedValueOnce(mockResponse);

      const { listDirectory } = await import("@/lib/api/filesystem");
      const result = await listDirectory("/home/user");

      expect(mockGet).toHaveBeenCalledWith("/api/filesystem/list", {
        params: { path: "/home/user" },
      });
      expect(result).toEqual(mockResponse.data);
    });

    it("should handle error when listing directory", async () => {
      const axiosError = new Error("Request failed") as AxiosError;
      (axiosError as AxiosError).isAxiosError = true;
      (axiosError as AxiosError).response = {
        data: { detail: "Permission denied" },
        status: 403,
        statusText: "Forbidden",
        headers: {},
        config: { headers: new AxiosHeaders() },
      };
      mockGet.mockRejectedValueOnce(axiosError);

      const { listDirectory } = await import("@/lib/api/filesystem");

      await expect(listDirectory("/root")).rejects.toThrow("Permission denied");
    });
  });

  describe("createDirectory", () => {
    it("should create a directory", async () => {
      const mockResponse = {
        data: { success: true, path: "/home/user/new-dir" },
      };
      mockPost.mockResolvedValueOnce(mockResponse);

      const { createDirectory } = await import("@/lib/api/filesystem");
      const result = await createDirectory("/home/user", "new-dir");

      expect(mockPost).toHaveBeenCalledWith("/api/filesystem/mkdir", {
        path: "/home/user",
        name: "new-dir",
      });
      expect(result).toEqual(mockResponse.data);
    });

    it("should handle error when creating directory", async () => {
      const axiosError = new Error("Request failed") as AxiosError;
      (axiosError as AxiosError).isAxiosError = true;
      (axiosError as AxiosError).response = {
        data: { detail: "Directory already exists" },
        status: 409,
        statusText: "Conflict",
        headers: {},
        config: { headers: new AxiosHeaders() },
      };
      mockPost.mockRejectedValueOnce(axiosError);

      const { createDirectory } = await import("@/lib/api/filesystem");

      await expect(createDirectory("/home", "existing")).rejects.toThrow(
        "Directory already exists",
      );
    });
  });

  describe("ensureDirectory", () => {
    it("should ensure a directory exists", async () => {
      const mockResponse = {
        data: { success: true, path: "/home/user/deep/nested/dir" },
      };
      mockPost.mockResolvedValueOnce(mockResponse);

      const { ensureDirectory } = await import("@/lib/api/filesystem");
      const result = await ensureDirectory("/home/user/deep/nested/dir");

      expect(mockPost).toHaveBeenCalledWith("/api/filesystem/ensure-dir", {
        path: "/home/user/deep/nested/dir",
      });
      expect(result).toEqual(mockResponse.data);
    });

    it("should handle error when ensuring directory", async () => {
      const axiosError = new Error("Request failed") as AxiosError;
      (axiosError as AxiosError).isAxiosError = true;
      (axiosError as AxiosError).response = {
        data: { detail: "Invalid path" },
        status: 400,
        statusText: "Bad Request",
        headers: {},
        config: { headers: new AxiosHeaders() },
      };
      mockPost.mockRejectedValueOnce(axiosError);

      const { ensureDirectory } = await import("@/lib/api/filesystem");

      await expect(ensureDirectory("invalid//path")).rejects.toThrow(
        "Invalid path",
      );
    });
  });

  describe("non-axios error handling", () => {
    it("should rethrow non-axios error in getAvailableTools", async () => {
      const genericError = new Error("Network error");
      mockGet.mockRejectedValueOnce(genericError);

      const { getAvailableTools } = await import("@/lib/api/filesystem");

      await expect(getAvailableTools()).rejects.toThrow("Network error");
    });

    it("should rethrow non-axios error in listDirectory", async () => {
      const genericError = new Error("Network error");
      mockGet.mockRejectedValueOnce(genericError);

      const { listDirectory } = await import("@/lib/api/filesystem");

      await expect(listDirectory("/home")).rejects.toThrow("Network error");
    });

    it("should rethrow non-axios error in createDirectory", async () => {
      const genericError = new Error("Network error");
      mockPost.mockRejectedValueOnce(genericError);

      const { createDirectory } = await import("@/lib/api/filesystem");

      await expect(createDirectory("/home", "new")).rejects.toThrow(
        "Network error",
      );
    });

    it("should rethrow non-axios error in ensureDirectory", async () => {
      const genericError = new Error("Network error");
      mockPost.mockRejectedValueOnce(genericError);

      const { ensureDirectory } = await import("@/lib/api/filesystem");

      await expect(ensureDirectory("/home/new")).rejects.toThrow(
        "Network error",
      );
    });
  });
});
