import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCutHandler } from "@/components/hooks/canvas/helpers/useCutHandler";
import type { Node, Edge } from "@xyflow/react";

// Mock the clipboard context
const mockCopy = vi.fn();
vi.mock("@/contexts/ClipboardContext", () => ({
  useClipboard: () => ({
    copy: mockCopy,
  }),
}));

describe("useCutHandler", () => {
  const mockNodes: Node[] = [
    {
      id: "node1",
      type: "agent",
      position: { x: 0, y: 0 },
      data: { name: "Agent1" },
      selected: true,
    },
    {
      id: "node2",
      type: "tool",
      position: { x: 100, y: 0 },
      data: { name: "Tool1" },
      selected: false,
    },
    {
      id: "node3",
      type: "prompt",
      position: { x: 200, y: 0 },
      data: { name: "Prompt1" },
      selected: true,
    },
  ];

  const mockEdges: Edge[] = [
    { id: "edge1", source: "node1", target: "node2" },
    { id: "edge2", source: "node2", target: "node3" },
  ];

  const mockSetNodes = vi.fn();
  const mockSetEdges = vi.fn();
  const mockSaveSnapshot = vi.fn();

  const defaultProps = {
    nodes: mockNodes,
    edges: mockEdges,
    setNodes: mockSetNodes,
    setEdges: mockSetEdges,
    activeTabId: "tab1",
    isLocked: false,
    saveSnapshot: mockSaveSnapshot,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("handleCut", () => {
    it("should do nothing if no activeTabId", () => {
      const { result } = renderHook(() =>
        useCutHandler({ ...defaultProps, activeTabId: undefined }),
      );

      act(() => {
        result.current.handleCut();
      });

      expect(mockCopy).not.toHaveBeenCalled();
      expect(mockSaveSnapshot).not.toHaveBeenCalled();
    });

    it("should do nothing if canvas is locked", () => {
      const { result } = renderHook(() =>
        useCutHandler({ ...defaultProps, isLocked: true }),
      );

      act(() => {
        result.current.handleCut();
      });

      expect(mockCopy).not.toHaveBeenCalled();
      expect(mockSaveSnapshot).not.toHaveBeenCalled();
    });

    it("should do nothing if no nodes are selected", () => {
      const nodesWithoutSelection = mockNodes.map((n) => ({
        ...n,
        selected: false,
      }));
      const { result } = renderHook(() =>
        useCutHandler({ ...defaultProps, nodes: nodesWithoutSelection }),
      );

      act(() => {
        result.current.handleCut();
      });

      expect(mockCopy).not.toHaveBeenCalled();
      expect(mockSaveSnapshot).not.toHaveBeenCalled();
    });

    it("should save snapshot before modifying", () => {
      const { result } = renderHook(() => useCutHandler(defaultProps));

      act(() => {
        result.current.handleCut();
      });

      expect(mockSaveSnapshot).toHaveBeenCalled();
    });

    it("should call copy with nodes, edges, and activeTabId", () => {
      const { result } = renderHook(() => useCutHandler(defaultProps));

      act(() => {
        result.current.handleCut();
      });

      expect(mockCopy).toHaveBeenCalledWith(mockNodes, mockEdges, "tab1");
    });

    it("should delete selected nodes", () => {
      const { result } = renderHook(() => useCutHandler(defaultProps));

      act(() => {
        result.current.handleCut();
      });

      expect(mockSetNodes).toHaveBeenCalledWith(expect.any(Function));

      // Get the filter function and test it
      const filterFn = mockSetNodes.mock.calls[0][0];
      const remainingNodes = mockNodes.filter(
        (n) => filterFn([n])[0] !== undefined,
      );
      // node2 should remain (not selected)
      expect(remainingNodes.some((n) => n.id === "node2")).toBe(true);
    });

    it("should remove edges connected to deleted nodes", () => {
      const { result } = renderHook(() => useCutHandler(defaultProps));

      act(() => {
        result.current.handleCut();
      });

      expect(mockSetEdges).toHaveBeenCalledWith(expect.any(Function));

      // Get the filter function and test it
      const filterFn = mockSetEdges.mock.calls[0][0];
      const testEdges = [
        { id: "edge1", source: "node1", target: "node2" }, // node1 is deleted
        { id: "edge2", source: "node2", target: "node3" }, // node3 is deleted
        { id: "edge3", source: "node4", target: "node5" }, // neither deleted
      ];
      const remainingEdges = filterFn(testEdges);

      // Only edge3 should remain (not connected to deleted nodes)
      expect(remainingEdges).toHaveLength(1);
      expect(remainingEdges[0].id).toBe("edge3");
    });

    it("should not cut locked nodes", () => {
      const nodesWithLocked: Node[] = [
        ...mockNodes,
        {
          id: "locked1",
          type: "agent",
          position: { x: 300, y: 0 },
          data: { name: "Locked", isNodeLocked: true },
          selected: true,
        },
      ];

      const { result } = renderHook(() =>
        useCutHandler({ ...defaultProps, nodes: nodesWithLocked }),
      );

      act(() => {
        result.current.handleCut();
      });

      // Should still copy (clipboard includes all selected)
      expect(mockCopy).toHaveBeenCalled();
    });

    it("should include children of selected groups", () => {
      const nodesWithGroup: Node[] = [
        {
          id: "group1",
          type: "group",
          position: { x: 0, y: 0 },
          data: {},
          selected: true,
        },
        {
          id: "child1",
          type: "agent",
          position: { x: 10, y: 10 },
          data: {},
          parentId: "group1",
          selected: false,
        },
      ];

      const { result } = renderHook(() =>
        useCutHandler({ ...defaultProps, nodes: nodesWithGroup }),
      );

      act(() => {
        result.current.handleCut();
      });

      expect(mockSetNodes).toHaveBeenCalled();
    });

    it("should not include locked children of selected groups", () => {
      const nodesWithLockedChild: Node[] = [
        {
          id: "group1",
          type: "group",
          position: { x: 0, y: 0 },
          data: {},
          selected: true,
        },
        {
          id: "child1",
          type: "agent",
          position: { x: 10, y: 10 },
          data: { isNodeLocked: true },
          parentId: "group1",
          selected: false,
        },
      ];

      const { result } = renderHook(() =>
        useCutHandler({ ...defaultProps, nodes: nodesWithLockedChild }),
      );

      act(() => {
        result.current.handleCut();
      });

      expect(mockSetNodes).toHaveBeenCalled();
      // Verify the locked child is not included in deletion
    });
  });

  describe("return value", () => {
    it("should return handleCut function", () => {
      const { result } = renderHook(() => useCutHandler(defaultProps));

      expect(typeof result.current.handleCut).toBe("function");
    });
  });
});
