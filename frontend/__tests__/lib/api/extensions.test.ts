import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the apiClient
const mockGet = vi.fn();

vi.mock("@/lib/api/client", () => ({
  apiClient: {
    get: mockGet,
  },
}));

describe("Extensions API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getExtensionNodes", () => {
    it("should get extension nodes", async () => {
      const mockResponse = {
        data: {
          nodes: [
            { id: "ext1", name: "Extension 1" },
            { id: "ext2", name: "Extension 2" },
          ],
          menu_tree: { category1: ["ext1", "ext2"] },
          count: 2,
        },
      };
      mockGet.mockResolvedValueOnce(mockResponse);

      const { getExtensionNodes } = await import("@/lib/api/extensions");
      const result = await getExtensionNodes();

      expect(mockGet).toHaveBeenCalledWith("/api/extensions/nodes");
      expect(result).toEqual(mockResponse.data);
    });

    it("should return empty response on error", async () => {
      mockGet.mockRejectedValueOnce(new Error("Server error"));

      const { getExtensionNodes } = await import("@/lib/api/extensions");
      const result = await getExtensionNodes();

      expect(result).toEqual({ nodes: [], menu_tree: {}, count: 0 });
    });

    it("should return empty response on network error", async () => {
      mockGet.mockRejectedValueOnce(new Error("Network unreachable"));

      const { getExtensionNodes } = await import("@/lib/api/extensions");
      const result = await getExtensionNodes();

      expect(result).toEqual({ nodes: [], menu_tree: {}, count: 0 });
    });
  });
});
