import { describe, it, expect, vi, beforeEach } from "vitest";
import { AxiosError, AxiosHeaders } from "axios";

// Mock the apiClient
const mockGet = vi.fn();

vi.mock("@/lib/api/client", () => ({
  apiClient: {
    get: mockGet,
  },
}));

describe("DevMode API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getDevInfo", () => {
    it("should fetch dev info successfully", async () => {
      const mockResponse = {
        data: {
          devMode: true,
          branch: "main",
        },
      };
      mockGet.mockResolvedValueOnce(mockResponse);

      const { getDevInfo } = await import("@/lib/api/devMode");
      const result = await getDevInfo();

      expect(mockGet).toHaveBeenCalledWith("/api/dev/info");
      expect(result).toEqual(mockResponse.data);
    });

    it("should handle dev mode disabled", async () => {
      const mockResponse = {
        data: {
          devMode: false,
          branch: null,
        },
      };
      mockGet.mockResolvedValueOnce(mockResponse);

      const { getDevInfo } = await import("@/lib/api/devMode");
      const result = await getDevInfo();

      expect(result).toEqual({
        devMode: false,
        branch: null,
      });
    });

    it("should handle error when fetching dev info", async () => {
      const axiosError = new Error("Request failed") as AxiosError;
      (axiosError as AxiosError).isAxiosError = true;
      (axiosError as AxiosError).response = {
        data: { detail: "Server error" },
        status: 500,
        statusText: "Internal Server Error",
        headers: {},
        config: { headers: new AxiosHeaders() },
      };
      mockGet.mockRejectedValueOnce(axiosError);

      const { getDevInfo } = await import("@/lib/api/devMode");

      await expect(getDevInfo()).rejects.toThrow("Request failed");
    });

    it("should handle network error", async () => {
      const networkError = new Error("Network error");
      mockGet.mockRejectedValueOnce(networkError);

      const { getDevInfo } = await import("@/lib/api/devMode");

      await expect(getDevInfo()).rejects.toThrow("Network error");
    });
  });
});
