import { describe, it, expect, vi, beforeEach } from "vitest";
import { AxiosError, AxiosHeaders } from "axios";

// Mock the apiClient
const mockGet = vi.fn();
const mockPut = vi.fn();

vi.mock("@/lib/api/client", () => ({
  apiClient: {
    get: mockGet,
    put: mockPut,
  },
}));

describe("Settings API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("loadProjectSettings", () => {
    it("should load project settings", async () => {
      const mockResponse = {
        data: {
          settings: {
            model: "gemini-2.0-flash",
            temperature: 0.7,
          },
          env: {
            GOOGLE_API_KEY: "***",
          },
        },
      };
      mockGet.mockResolvedValueOnce(mockResponse);

      const { loadProjectSettings } = await import("@/lib/api/settings");
      const result = await loadProjectSettings("/project");

      expect(mockGet).toHaveBeenCalledWith("/api/project/settings", {
        params: { path: "/project" },
      });
      expect(result).toEqual(mockResponse.data);
    });

    it("should handle error when loading settings", async () => {
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

      const { loadProjectSettings } = await import("@/lib/api/settings");

      await expect(loadProjectSettings("/invalid")).rejects.toThrow(
        "Project not found",
      );
    });

    it("should handle non-axios error", async () => {
      const genericError = new Error("Network error");
      mockGet.mockRejectedValueOnce(genericError);

      const { loadProjectSettings } = await import("@/lib/api/settings");

      await expect(loadProjectSettings("/project")).rejects.toThrow(
        "Network error",
      );
    });
  });

  describe("saveProjectSettings", () => {
    it("should save project settings", async () => {
      const mockResponse = {
        data: { success: true },
      };
      mockPut.mockResolvedValueOnce(mockResponse);

      const settings = { model: "gemini-2.5-pro", temperature: 0.5 };
      const env = { GOOGLE_API_KEY: "new-key" };

      const { saveProjectSettings } = await import("@/lib/api/settings");
      const result = await saveProjectSettings(
        "/project",
        settings as any,
        env,
      );

      expect(mockPut).toHaveBeenCalledWith("/api/project/settings", {
        project_path: "/project",
        settings,
        env,
      });
      expect(result).toEqual(mockResponse.data);
    });

    it("should handle error when saving settings", async () => {
      const axiosError = new Error("Request failed") as AxiosError;
      (axiosError as AxiosError).isAxiosError = true;
      (axiosError as AxiosError).response = {
        data: { detail: "Invalid settings" },
        status: 400,
        statusText: "Bad Request",
        headers: {},
        config: { headers: new AxiosHeaders() },
      };
      mockPut.mockRejectedValueOnce(axiosError);

      const { saveProjectSettings } = await import("@/lib/api/settings");

      await expect(
        saveProjectSettings("/project", {} as any, {}),
      ).rejects.toThrow("Invalid settings");
    });

    it("should handle non-axios error when saving", async () => {
      const genericError = new Error("Network error");
      mockPut.mockRejectedValueOnce(genericError);

      const { saveProjectSettings } = await import("@/lib/api/settings");

      await expect(
        saveProjectSettings("/project", {} as any, {}),
      ).rejects.toThrow("Network error");
    });
  });
});
