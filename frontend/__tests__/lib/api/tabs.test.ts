import { describe, it, expect, vi, beforeEach } from "vitest";
import { AxiosError, AxiosHeaders } from "axios";

// Mock the apiClient
const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPut = vi.fn();
const mockDelete = vi.fn();
const mockPatch = vi.fn();

vi.mock("@/lib/api/client", () => ({
  apiClient: {
    get: mockGet,
    post: mockPost,
    put: mockPut,
    delete: mockDelete,
    patch: mockPatch,
  },
}));

describe("Tabs API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listTabs", () => {
    it("should successfully list tabs", async () => {
      const mockResponse = {
        data: {
          tabs: [
            { id: "tab1", name: "Main", isDefault: true },
            { id: "tab2", name: "Test", isDefault: false },
          ],
        },
      };
      mockGet.mockResolvedValueOnce(mockResponse);

      const { listTabs } = await import("@/lib/api/tabs");
      const result = await listTabs("/project");

      expect(mockGet).toHaveBeenCalledWith("/api/project/tabs", {
        params: { path: "/project" },
      });
      expect(result).toEqual(mockResponse.data);
    });

    it("should handle error", async () => {
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

      const { listTabs } = await import("@/lib/api/tabs");

      await expect(listTabs("/invalid")).rejects.toThrow("Project not found");
    });
  });

  describe("createTab", () => {
    it("should create tab with default name", async () => {
      const mockResponse = {
        data: { id: "new-tab", name: "Untitled", success: true },
      };
      mockPost.mockResolvedValueOnce(mockResponse);

      const { createTab } = await import("@/lib/api/tabs");
      const result = await createTab("/project");

      expect(mockPost).toHaveBeenCalledWith("/api/project/tabs", {
        project_path: "/project",
        name: "Untitled",
      });
      expect(result).toEqual(mockResponse.data);
    });

    it("should create tab with custom name", async () => {
      const mockResponse = {
        data: { id: "new-tab", name: "Custom Tab", success: true },
      };
      mockPost.mockResolvedValueOnce(mockResponse);

      const { createTab } = await import("@/lib/api/tabs");
      await createTab("/project", "Custom Tab");

      expect(mockPost).toHaveBeenCalledWith("/api/project/tabs", {
        project_path: "/project",
        name: "Custom Tab",
      });
    });

    it("should handle error when creating tab", async () => {
      const axiosError = new Error("Request failed") as AxiosError;
      (axiosError as AxiosError).isAxiosError = true;
      (axiosError as AxiosError).response = {
        data: { detail: "Tab limit exceeded" },
        status: 400,
        statusText: "Bad Request",
        headers: {},
        config: { headers: new AxiosHeaders() },
      };
      mockPost.mockRejectedValueOnce(axiosError);

      const { createTab } = await import("@/lib/api/tabs");

      await expect(createTab("/project")).rejects.toThrow("Tab limit exceeded");
    });
  });

  describe("loadTab", () => {
    it("should load tab data", async () => {
      const mockResponse = {
        data: { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
      };
      mockGet.mockResolvedValueOnce(mockResponse);

      const { loadTab } = await import("@/lib/api/tabs");
      const result = await loadTab("/project", "tab-123");

      expect(mockGet).toHaveBeenCalledWith("/api/project/tabs/tab-123", {
        params: { path: "/project" },
      });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe("saveTab", () => {
    it("should save tab without project name", async () => {
      const mockResponse = { data: { success: true } };
      mockPut.mockResolvedValueOnce(mockResponse);

      const flow = { nodes: [], edges: [] };
      const { saveTab } = await import("@/lib/api/tabs");
      await saveTab("/project", "tab-123", flow as any);

      expect(mockPut).toHaveBeenCalledWith("/api/project/tabs/tab-123", {
        project_path: "/project",
        flow,
        project_name: undefined,
      });
    });

    it("should save tab with project name", async () => {
      const mockResponse = { data: { success: true } };
      mockPut.mockResolvedValueOnce(mockResponse);

      const flow = { nodes: [], edges: [] };
      const { saveTab } = await import("@/lib/api/tabs");
      await saveTab("/project", "tab-123", flow as any, "My Project");

      expect(mockPut).toHaveBeenCalledWith("/api/project/tabs/tab-123", {
        project_path: "/project",
        flow,
        project_name: "My Project",
      });
    });
  });

  describe("deleteTab", () => {
    it("should delete a tab", async () => {
      const mockResponse = { data: { success: true } };
      mockDelete.mockResolvedValueOnce(mockResponse);

      const { deleteTab } = await import("@/lib/api/tabs");
      const result = await deleteTab("/project", "tab-123");

      expect(mockDelete).toHaveBeenCalledWith("/api/project/tabs/tab-123", {
        params: { path: "/project" },
      });
      expect(result).toEqual({ success: true });
    });
  });

  describe("renameTab", () => {
    it("should rename a tab", async () => {
      const mockResponse = { data: { success: true } };
      mockPatch.mockResolvedValueOnce(mockResponse);

      const { renameTab } = await import("@/lib/api/tabs");
      const result = await renameTab("/project", "tab-123", "New Name");

      expect(mockPatch).toHaveBeenCalledWith(
        "/api/project/tabs/tab-123/rename",
        {
          project_path: "/project",
          name: "New Name",
        },
      );
      expect(result).toEqual({ success: true });
    });
  });

  describe("duplicateTab", () => {
    it("should duplicate a tab", async () => {
      const mockResponse = {
        data: { id: "tab-copy", name: "Tab (Copy)", success: true },
      };
      mockPost.mockResolvedValueOnce(mockResponse);

      const { duplicateTab } = await import("@/lib/api/tabs");
      const result = await duplicateTab("/project", "tab-123");

      expect(mockPost).toHaveBeenCalledWith(
        "/api/project/tabs/tab-123/duplicate",
        null,
        { params: { path: "/project" } },
      );
      expect(result).toEqual(mockResponse.data);
    });

    it("should handle error when duplicating tab", async () => {
      const axiosError = new Error("Request failed") as AxiosError;
      (axiosError as AxiosError).isAxiosError = true;
      (axiosError as AxiosError).response = {
        data: { detail: "Tab not found" },
        status: 404,
        statusText: "Not Found",
        headers: {},
        config: { headers: new AxiosHeaders() },
      };
      mockPost.mockRejectedValueOnce(axiosError);

      const { duplicateTab } = await import("@/lib/api/tabs");

      await expect(duplicateTab("/project", "invalid")).rejects.toThrow(
        "Tab not found",
      );
    });
  });

  describe("reorderTabs", () => {
    it("should reorder tabs", async () => {
      const mockResponse = { data: { success: true } };
      mockPut.mockResolvedValueOnce(mockResponse);

      const { reorderTabs } = await import("@/lib/api/tabs");
      const result = await reorderTabs("/project", ["tab2", "tab1", "tab3"]);

      expect(mockPut).toHaveBeenCalledWith("/api/project/tabs/reorder", {
        project_path: "/project",
        tab_ids: ["tab2", "tab1", "tab3"],
      });
      expect(result).toEqual({ success: true });
    });

    it("should handle error when reordering tabs", async () => {
      const axiosError = new Error("Request failed") as AxiosError;
      (axiosError as AxiosError).isAxiosError = true;
      (axiosError as AxiosError).response = {
        data: { detail: "Invalid tab order" },
        status: 400,
        statusText: "Bad Request",
        headers: {},
        config: { headers: new AxiosHeaders() },
      };
      mockPut.mockRejectedValueOnce(axiosError);

      const { reorderTabs } = await import("@/lib/api/tabs");

      await expect(reorderTabs("/project", [])).rejects.toThrow(
        "Invalid tab order",
      );
    });
  });

  describe("loadTab error handling", () => {
    it("should handle error when loading tab", async () => {
      const axiosError = new Error("Request failed") as AxiosError;
      (axiosError as AxiosError).isAxiosError = true;
      (axiosError as AxiosError).response = {
        data: { detail: "Tab not found" },
        status: 404,
        statusText: "Not Found",
        headers: {},
        config: { headers: new AxiosHeaders() },
      };
      mockGet.mockRejectedValueOnce(axiosError);

      const { loadTab } = await import("@/lib/api/tabs");

      await expect(loadTab("/project", "invalid")).rejects.toThrow(
        "Tab not found",
      );
    });
  });

  describe("saveTab error handling", () => {
    it("should handle error when saving tab", async () => {
      const axiosError = new Error("Request failed") as AxiosError;
      (axiosError as AxiosError).isAxiosError = true;
      (axiosError as AxiosError).response = {
        data: { detail: "Failed to save" },
        status: 500,
        statusText: "Internal Server Error",
        headers: {},
        config: { headers: new AxiosHeaders() },
      };
      mockPut.mockRejectedValueOnce(axiosError);

      const { saveTab } = await import("@/lib/api/tabs");

      await expect(saveTab("/project", "tab-123", {} as any)).rejects.toThrow(
        "Failed to save",
      );
    });
  });

  describe("deleteTab error handling", () => {
    it("should handle error when deleting tab", async () => {
      const axiosError = new Error("Request failed") as AxiosError;
      (axiosError as AxiosError).isAxiosError = true;
      (axiosError as AxiosError).response = {
        data: { detail: "Cannot delete default tab" },
        status: 400,
        statusText: "Bad Request",
        headers: {},
        config: { headers: new AxiosHeaders() },
      };
      mockDelete.mockRejectedValueOnce(axiosError);

      const { deleteTab } = await import("@/lib/api/tabs");

      await expect(deleteTab("/project", "default")).rejects.toThrow(
        "Cannot delete default tab",
      );
    });
  });

  describe("renameTab error handling", () => {
    it("should handle error when renaming tab", async () => {
      const axiosError = new Error("Request failed") as AxiosError;
      (axiosError as AxiosError).isAxiosError = true;
      (axiosError as AxiosError).response = {
        data: { detail: "Name already exists" },
        status: 409,
        statusText: "Conflict",
        headers: {},
        config: { headers: new AxiosHeaders() },
      };
      mockPatch.mockRejectedValueOnce(axiosError);

      const { renameTab } = await import("@/lib/api/tabs");

      await expect(
        renameTab("/project", "tab-123", "Existing"),
      ).rejects.toThrow("Name already exists");
    });
  });

  describe("non-axios error handling", () => {
    it("should rethrow non-axios error in duplicateTab", async () => {
      const genericError = new Error("Network error");
      mockPost.mockRejectedValueOnce(genericError);

      const { duplicateTab } = await import("@/lib/api/tabs");

      await expect(duplicateTab("/project", "tab-123")).rejects.toThrow(
        "Network error",
      );
    });

    it("should rethrow non-axios error in reorderTabs", async () => {
      const genericError = new Error("Network error");
      mockPut.mockRejectedValueOnce(genericError);

      const { reorderTabs } = await import("@/lib/api/tabs");

      await expect(reorderTabs("/project", ["tab1"])).rejects.toThrow(
        "Network error",
      );
    });

    it("should rethrow non-axios error in createTab", async () => {
      const genericError = new Error("Network error");
      mockPost.mockRejectedValueOnce(genericError);

      const { createTab } = await import("@/lib/api/tabs");

      await expect(createTab("/project")).rejects.toThrow("Network error");
    });

    it("should rethrow non-axios error in loadTab", async () => {
      const genericError = new Error("Network error");
      mockGet.mockRejectedValueOnce(genericError);

      const { loadTab } = await import("@/lib/api/tabs");

      await expect(loadTab("/project", "tab-123")).rejects.toThrow(
        "Network error",
      );
    });

    it("should rethrow non-axios error in saveTab", async () => {
      const genericError = new Error("Network error");
      mockPut.mockRejectedValueOnce(genericError);

      const { saveTab } = await import("@/lib/api/tabs");

      await expect(saveTab("/project", "tab-123", {} as any)).rejects.toThrow(
        "Network error",
      );
    });

    it("should rethrow non-axios error in deleteTab", async () => {
      const genericError = new Error("Network error");
      mockDelete.mockRejectedValueOnce(genericError);

      const { deleteTab } = await import("@/lib/api/tabs");

      await expect(deleteTab("/project", "tab-123")).rejects.toThrow(
        "Network error",
      );
    });

    it("should rethrow non-axios error in renameTab", async () => {
      const genericError = new Error("Network error");
      mockPatch.mockRejectedValueOnce(genericError);

      const { renameTab } = await import("@/lib/api/tabs");

      await expect(
        renameTab("/project", "tab-123", "New Name"),
      ).rejects.toThrow("Network error");
    });

    it("should rethrow non-axios error in listTabs", async () => {
      const genericError = new Error("Network error");
      mockGet.mockRejectedValueOnce(genericError);

      const { listTabs } = await import("@/lib/api/tabs");

      await expect(listTabs("/project")).rejects.toThrow("Network error");
    });
  });
});
