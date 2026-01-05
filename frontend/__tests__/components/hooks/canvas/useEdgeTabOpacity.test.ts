import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useEdgeTabOpacity } from "@/components/hooks/canvas/useEdgeTabOpacity";
import type { Node, Edge } from "@xyflow/react";

describe("useEdgeTabOpacity", () => {
  const mockSetEdges = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockSetEdges.mockImplementation((fn) => {
      if (typeof fn === "function") {
        return fn([]);
      }
      return fn;
    });
  });

  const createNode = (
    id: string,
    activeTab?: string,
    inputs: Array<{ id: string; tab?: string }> = [],
    outputs: Array<{ id: string; tab?: string }> = [],
  ): Node => ({
    id,
    type: "custom",
    position: { x: 0, y: 0 },
    data: {
      name: id,
      activeTab,
      schema: {
        ui: {
          inputs: inputs.map((i) => ({ id: i.id, name: i.id, tab: i.tab })),
          outputs: outputs.map((o) => ({ id: o.id, name: o.id, tab: o.tab })),
        },
      },
    },
  });

  const createEdge = (
    id: string,
    source: string,
    target: string,
    sourceHandle?: string,
    targetHandle?: string,
  ): Edge => ({
    id,
    source,
    target,
    sourceHandle,
    targetHandle,
  });

  describe("without tabs", () => {
    it("should not modify edges for nodes without tabs", () => {
      const nodes: Node[] = [createNode("node1"), createNode("node2")];
      const edges: Edge[] = [createEdge("edge1", "node1", "node2")];

      renderHook(() => useEdgeTabOpacity(nodes, edges, mockSetEdges));

      // setEdges should be called
      expect(mockSetEdges).toHaveBeenCalled();
    });
  });

  describe("with tabs", () => {
    it("should set opacity to 0.3 for edges on inactive tab", () => {
      const nodes: Node[] = [
        createNode(
          "node1",
          "tab1",
          [],
          [{ id: "output1", tab: "tab2" }], // output on inactive tab
        ),
        createNode("node2"),
      ];
      const edges: Edge[] = [
        createEdge("edge1", "node1", "node2", "output1", undefined),
      ];

      mockSetEdges.mockImplementation((fn) => {
        const result = fn(edges);
        expect(result[0].style?.opacity).toBe(0.3);
      });

      renderHook(() => useEdgeTabOpacity(nodes, edges, mockSetEdges));
    });

    it("should keep opacity at 1 for edges on active tab", () => {
      const nodes: Node[] = [
        createNode(
          "node1",
          "tab1",
          [],
          [{ id: "output1", tab: "tab1" }], // output on active tab
        ),
        createNode("node2"),
      ];
      const edges: Edge[] = [
        createEdge("edge1", "node1", "node2", "output1", undefined),
      ];

      mockSetEdges.mockImplementation((fn) => {
        const result = fn(edges);
        // Edge on active tab should have opacity 1 (or undefined which defaults to 1)
        expect(result[0].style?.opacity ?? 1).toBe(1);
      });

      renderHook(() => useEdgeTabOpacity(nodes, edges, mockSetEdges));
    });

    it("should set opacity to 0.3 if target handle is on inactive tab", () => {
      const nodes: Node[] = [
        createNode("node1"),
        createNode(
          "node2",
          "tab1",
          [{ id: "input1", tab: "tab2" }], // input on inactive tab
          [],
        ),
      ];
      const edges: Edge[] = [
        createEdge("edge1", "node1", "node2", undefined, "input1"),
      ];

      mockSetEdges.mockImplementation((fn) => {
        const result = fn(edges);
        expect(result[0].style?.opacity).toBe(0.3);
      });

      renderHook(() => useEdgeTabOpacity(nodes, edges, mockSetEdges));
    });
  });

  describe("memoization", () => {
    it("should not update edges if state has not changed", () => {
      const nodes: Node[] = [createNode("node1")];
      const edges: Edge[] = [];

      const { rerender } = renderHook(
        ({ nodes, edges }) => useEdgeTabOpacity(nodes, edges, mockSetEdges),
        { initialProps: { nodes, edges } },
      );

      const callCount = mockSetEdges.mock.calls.length;

      // Re-render with same nodes (same activeTab state)
      rerender({ nodes, edges });

      // Should not have called setEdges again due to memoization
      expect(mockSetEdges.mock.calls.length).toBe(callCount);
    });
  });
});
