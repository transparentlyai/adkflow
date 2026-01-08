import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAltClickZoom } from "@/components/hooks/canvas/useAltClickZoom";
import type { Node } from "@xyflow/react";

// Mock @xyflow/react
const mockGetViewport = vi.fn(() => ({ x: 0, y: 0, zoom: 1 }));
const mockSetViewport = vi.fn();
const mockFitView = vi.fn();

vi.mock("@xyflow/react", async () => {
  const actual = await vi.importActual("@xyflow/react");
  return {
    ...actual,
    useReactFlow: vi.fn(() => ({
      getViewport: mockGetViewport,
      setViewport: mockSetViewport,
      fitView: mockFitView,
    })),
  };
});

describe("useAltClickZoom", () => {
  const createNode = (id: string): Node => ({
    id,
    type: "agent",
    position: { x: 0, y: 0 },
    data: { name: id },
  });

  const createMouseEvent = (altKey: boolean): React.MouseEvent => {
    return {
      altKey,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as React.MouseEvent;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetViewport.mockReturnValue({ x: 0, y: 0, zoom: 1 });
  });

  describe("onNodeClick", () => {
    it("should do nothing when Alt key is not pressed", () => {
      const { result } = renderHook(() => useAltClickZoom());
      const node = createNode("node1");
      const event = createMouseEvent(false);

      act(() => {
        result.current.onNodeClick(event, node);
      });

      expect(mockGetViewport).not.toHaveBeenCalled();
      expect(mockFitView).not.toHaveBeenCalled();
    });

    it("should save viewport and zoom to node when Alt key is pressed", () => {
      const { result } = renderHook(() => useAltClickZoom());
      const node = createNode("node1");
      const event = createMouseEvent(true);

      act(() => {
        result.current.onNodeClick(event, node);
      });

      expect(mockGetViewport).toHaveBeenCalledTimes(1);
      expect(mockFitView).toHaveBeenCalledWith({
        nodes: [node],
        padding: 0.2,
        duration: 300,
      });
    });

    it("should save different viewport states on multiple node clicks", () => {
      const { result } = renderHook(() => useAltClickZoom());
      const node1 = createNode("node1");
      const node2 = createNode("node2");
      const event = createMouseEvent(true);

      // First click with viewport1
      mockGetViewport.mockReturnValue({ x: 100, y: 100, zoom: 1.5 });
      act(() => {
        result.current.onNodeClick(event, node1);
      });

      expect(mockGetViewport).toHaveBeenCalledTimes(1);
      expect(mockFitView).toHaveBeenCalledWith({
        nodes: [node1],
        padding: 0.2,
        duration: 300,
      });

      // Second click with viewport2 (overwrites saved viewport)
      mockGetViewport.mockReturnValue({ x: 200, y: 200, zoom: 2.0 });
      act(() => {
        result.current.onNodeClick(event, node2);
      });

      expect(mockGetViewport).toHaveBeenCalledTimes(2);
      expect(mockFitView).toHaveBeenCalledWith({
        nodes: [node2],
        padding: 0.2,
        duration: 300,
      });
    });
  });

  describe("onPaneClick", () => {
    it("should do nothing when Alt key is not pressed", () => {
      const { result } = renderHook(() => useAltClickZoom());
      const event = createMouseEvent(false);

      act(() => {
        result.current.onPaneClick(event);
      });

      expect(mockSetViewport).not.toHaveBeenCalled();
    });

    it("should do nothing when Alt key is pressed but no viewport was saved", () => {
      const { result } = renderHook(() => useAltClickZoom());
      const event = createMouseEvent(true);

      act(() => {
        result.current.onPaneClick(event);
      });

      expect(mockSetViewport).not.toHaveBeenCalled();
    });

    it("should restore saved viewport when Alt key is pressed", () => {
      const { result } = renderHook(() => useAltClickZoom());
      const node = createNode("node1");
      const savedViewport = { x: 100, y: 200, zoom: 1.5 };

      // First save a viewport by clicking a node
      mockGetViewport.mockReturnValue(savedViewport);
      act(() => {
        result.current.onNodeClick(createMouseEvent(true), node);
      });

      // Then restore it by clicking the pane
      act(() => {
        result.current.onPaneClick(createMouseEvent(true));
      });

      expect(mockSetViewport).toHaveBeenCalledWith(savedViewport, {
        duration: 300,
      });
    });

    it("should clear saved viewport after restoration", () => {
      const { result } = renderHook(() => useAltClickZoom());
      const node = createNode("node1");
      const savedViewport = { x: 100, y: 200, zoom: 1.5 };

      // Save viewport
      mockGetViewport.mockReturnValue(savedViewport);
      act(() => {
        result.current.onNodeClick(createMouseEvent(true), node);
      });

      // Restore viewport (first time)
      act(() => {
        result.current.onPaneClick(createMouseEvent(true));
      });

      expect(mockSetViewport).toHaveBeenCalledTimes(1);
      expect(mockSetViewport).toHaveBeenCalledWith(savedViewport, {
        duration: 300,
      });

      // Try to restore again (should do nothing)
      vi.clearAllMocks();
      act(() => {
        result.current.onPaneClick(createMouseEvent(true));
      });

      expect(mockSetViewport).not.toHaveBeenCalled();
    });
  });

  describe("integration", () => {
    it("should support zoom to node and restore workflow", () => {
      const { result } = renderHook(() => useAltClickZoom());
      const node = createNode("node1");
      const initialViewport = { x: 0, y: 0, zoom: 1 };

      // Start with initial viewport
      mockGetViewport.mockReturnValue(initialViewport);

      // Alt+Click on node to zoom in
      act(() => {
        result.current.onNodeClick(createMouseEvent(true), node);
      });

      expect(mockGetViewport).toHaveBeenCalledTimes(1);
      expect(mockFitView).toHaveBeenCalledWith({
        nodes: [node],
        padding: 0.2,
        duration: 300,
      });

      // Alt+Click on pane to restore
      act(() => {
        result.current.onPaneClick(createMouseEvent(true));
      });

      expect(mockSetViewport).toHaveBeenCalledWith(initialViewport, {
        duration: 300,
      });
    });

    it("should handle multiple zoom cycles", () => {
      const { result } = renderHook(() => useAltClickZoom());
      const node1 = createNode("node1");
      const node2 = createNode("node2");
      const viewport1 = { x: 0, y: 0, zoom: 1 };
      const viewport2 = { x: 50, y: 50, zoom: 1.2 };

      // First cycle: zoom to node1
      mockGetViewport.mockReturnValue(viewport1);
      act(() => {
        result.current.onNodeClick(createMouseEvent(true), node1);
      });

      // Restore from node1 zoom
      act(() => {
        result.current.onPaneClick(createMouseEvent(true));
      });

      expect(mockSetViewport).toHaveBeenCalledWith(viewport1, {
        duration: 300,
      });

      // Second cycle: zoom to node2 with different viewport
      vi.clearAllMocks();
      mockGetViewport.mockReturnValue(viewport2);
      act(() => {
        result.current.onNodeClick(createMouseEvent(true), node2);
      });

      // Restore from node2 zoom
      act(() => {
        result.current.onPaneClick(createMouseEvent(true));
      });

      expect(mockSetViewport).toHaveBeenCalledWith(viewport2, {
        duration: 300,
      });
    });
  });

  describe("memoization", () => {
    it("should memoize onNodeClick handler", () => {
      const { result, rerender } = renderHook(() => useAltClickZoom());

      const firstHandler = result.current.onNodeClick;
      rerender();

      expect(result.current.onNodeClick).toBe(firstHandler);
    });

    it("should memoize onPaneClick handler", () => {
      const { result, rerender } = renderHook(() => useAltClickZoom());

      const firstHandler = result.current.onPaneClick;
      rerender();

      expect(result.current.onPaneClick).toBe(firstHandler);
    });
  });

  describe("edge cases", () => {
    it("should handle null node gracefully", () => {
      const { result } = renderHook(() => useAltClickZoom());
      const event = createMouseEvent(true);

      expect(() => {
        act(() => {
          result.current.onNodeClick(event, null as unknown as Node);
        });
      }).not.toThrow();
    });

    it("should preserve viewport reference integrity", () => {
      const { result } = renderHook(() => useAltClickZoom());
      const node = createNode("node1");
      const viewport = { x: 123, y: 456, zoom: 2.5 };

      mockGetViewport.mockReturnValue(viewport);

      // Save viewport
      act(() => {
        result.current.onNodeClick(createMouseEvent(true), node);
      });

      // Modify original viewport object
      viewport.x = 999;
      viewport.y = 999;
      viewport.zoom = 3.0;

      // Restore - should use the saved reference (which was modified)
      act(() => {
        result.current.onPaneClick(createMouseEvent(true));
      });

      expect(mockSetViewport).toHaveBeenCalledWith(viewport, {
        duration: 300,
      });
    });
  });
});
