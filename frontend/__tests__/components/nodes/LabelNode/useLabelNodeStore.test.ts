import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useLabelNodeStore } from "@/components/nodes/LabelNode/useLabelNodeStore";
import { DEFAULT_WIDTH } from "@/components/nodes/LabelNode/types";

// Mock @xyflow/react
const mockUseStore = vi.fn();

vi.mock("@xyflow/react", () => ({
  useStore: (selector: unknown) => mockUseStore(selector),
}));

describe("useLabelNodeStore", () => {
  const nodeId = "test-node-id";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("parentId", () => {
    it("should return parentId when node exists", () => {
      const mockState = {
        nodes: [{ id: nodeId, parentId: "parent-123" }],
      };

      mockUseStore.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() => useLabelNodeStore(nodeId));

      expect(result.current.parentId).toBe("parent-123");
    });

    it("should return undefined when node has no parent", () => {
      const mockState = {
        nodes: [{ id: nodeId, parentId: undefined }],
      };

      mockUseStore.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() => useLabelNodeStore(nodeId));

      expect(result.current.parentId).toBeUndefined();
    });

    it("should return undefined when node does not exist", () => {
      const mockState = {
        nodes: [],
      };

      mockUseStore.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() => useLabelNodeStore(nodeId));

      expect(result.current.parentId).toBeUndefined();
    });
  });

  describe("nodeWidth", () => {
    it("should return measured width when available", () => {
      const mockState = {
        nodes: [{ id: nodeId, measured: { width: 250, height: 100 } }],
      };

      mockUseStore.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() => useLabelNodeStore(nodeId));

      expect(result.current.nodeWidth).toBe(250);
    });

    it("should return style width when measured width not available", () => {
      const mockState = {
        nodes: [{ id: nodeId, style: { width: 150, height: 80 } }],
      };

      mockUseStore.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() => useLabelNodeStore(nodeId));

      expect(result.current.nodeWidth).toBe(150);
    });

    it("should return DEFAULT_WIDTH when no width available", () => {
      const mockState = {
        nodes: [{ id: nodeId }],
      };

      mockUseStore.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() => useLabelNodeStore(nodeId));

      expect(result.current.nodeWidth).toBe(DEFAULT_WIDTH);
    });

    it("should prefer measured width over style width", () => {
      const mockState = {
        nodes: [
          {
            id: nodeId,
            measured: { width: 200, height: 100 },
            style: { width: 150, height: 80 },
          },
        ],
      };

      mockUseStore.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() => useLabelNodeStore(nodeId));

      expect(result.current.nodeWidth).toBe(200);
    });

    it("should return DEFAULT_WIDTH when node does not exist", () => {
      const mockState = {
        nodes: [],
      };

      mockUseStore.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() => useLabelNodeStore(nodeId));

      expect(result.current.nodeWidth).toBe(DEFAULT_WIDTH);
    });
  });

  describe("fontScaleWidth", () => {
    it("should return fontScaleWidth when set in node data", () => {
      const mockState = {
        nodes: [{ id: nodeId, data: { fontScaleWidth: 180 } }],
      };

      mockUseStore.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() => useLabelNodeStore(nodeId));

      expect(result.current.fontScaleWidth).toBe(180);
    });

    it("should return undefined when fontScaleWidth not set", () => {
      const mockState = {
        nodes: [{ id: nodeId, data: {} }],
      };

      mockUseStore.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() => useLabelNodeStore(nodeId));

      expect(result.current.fontScaleWidth).toBeUndefined();
    });

    it("should return undefined when node does not exist", () => {
      const mockState = {
        nodes: [],
      };

      mockUseStore.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() => useLabelNodeStore(nodeId));

      expect(result.current.fontScaleWidth).toBeUndefined();
    });
  });

  describe("manuallyResized", () => {
    it("should return true when node was manually resized", () => {
      const mockState = {
        nodes: [{ id: nodeId, data: { manuallyResized: true } }],
      };

      mockUseStore.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() => useLabelNodeStore(nodeId));

      expect(result.current.manuallyResized).toBe(true);
    });

    it("should return false when node was not manually resized", () => {
      const mockState = {
        nodes: [{ id: nodeId, data: { manuallyResized: false } }],
      };

      mockUseStore.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() => useLabelNodeStore(nodeId));

      expect(result.current.manuallyResized).toBe(false);
    });

    it("should return undefined when manuallyResized not set", () => {
      const mockState = {
        nodes: [{ id: nodeId, data: {} }],
      };

      mockUseStore.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() => useLabelNodeStore(nodeId));

      expect(result.current.manuallyResized).toBeUndefined();
    });

    it("should return undefined when node does not exist", () => {
      const mockState = {
        nodes: [],
      };

      mockUseStore.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() => useLabelNodeStore(nodeId));

      expect(result.current.manuallyResized).toBeUndefined();
    });
  });
});
