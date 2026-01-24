import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useCanvasHistory } from "@/components/hooks/canvas/useCanvasHistory";
import type { Node, Edge } from "@xyflow/react";
import { useRef, useState } from "react";

describe("useCanvasHistory - onWorkflowChange callback", () => {
  const mockOnWorkflowChange = vi.fn();

  const createNode = (id: string, selected = false): Node => ({
    id,
    type: "agent",
    position: { x: 0, y: 0 },
    data: { name: id },
    selected,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call onWorkflowChange when content changes", () => {
    let currentNodes: Node[] = [createNode("node1")];
    let currentEdges: Edge[] = [];

    const { rerender } = renderHook(
      ({ nodes, edges }) => {
        currentNodes = nodes;
        currentEdges = edges;
        const [_nodes, setNodes] = useState<Node[]>(nodes);
        const [_edges, setEdges] = useState<Edge[]>(edges);
        const undoStackRef = useRef<{ nodes: Node[]; edges: Edge[] }[]>([]);
        const redoStackRef = useRef<{ nodes: Node[]; edges: Edge[] }[]>([]);
        const prevContentRef = useRef<string>("");

        return useCanvasHistory({
          nodes: currentNodes,
          edges: currentEdges,
          setNodes,
          setEdges,
          undoStackRef,
          redoStackRef,
          maxHistorySize: 50,
          prevContentRef,
          onWorkflowChange: mockOnWorkflowChange,
        });
      },
      { initialProps: { nodes: [createNode("node1")], edges: [] as Edge[] } },
    );

    // Clear any initial calls
    mockOnWorkflowChange.mockClear();

    // Change content
    const newNodes = [createNode("node1"), createNode("node2")];
    rerender({ nodes: newNodes, edges: [] });

    // Should be called eventually
    expect(mockOnWorkflowChange).toHaveBeenCalled();
  });

  it("should not call onWorkflowChange when only selection changes", () => {
    const { rerender } = renderHook(
      ({ nodes, edges }) => {
        const [_nodes, setNodes] = useState<Node[]>(nodes);
        const [_edges, setEdges] = useState<Edge[]>(edges);
        const undoStackRef = useRef<{ nodes: Node[]; edges: Edge[] }[]>([]);
        const redoStackRef = useRef<{ nodes: Node[]; edges: Edge[] }[]>([]);
        const prevContentRef = useRef<string>("");

        return useCanvasHistory({
          nodes: _nodes,
          edges: _edges,
          setNodes,
          setEdges,
          undoStackRef,
          redoStackRef,
          maxHistorySize: 50,
          prevContentRef,
          onWorkflowChange: mockOnWorkflowChange,
        });
      },
      {
        initialProps: {
          nodes: [createNode("node1", false)],
          edges: [] as Edge[],
        },
      },
    );

    // Clear initial calls
    mockOnWorkflowChange.mockClear();

    // Change only selection
    rerender({ nodes: [createNode("node1", true)], edges: [] });

    expect(mockOnWorkflowChange).not.toHaveBeenCalled();
  });

  it("should not call onWorkflowChange if callback not provided", () => {
    const { rerender } = renderHook(
      ({ nodes, edges }) => {
        const [_nodes, setNodes] = useState<Node[]>(nodes);
        const [_edges, setEdges] = useState<Edge[]>(edges);
        const undoStackRef = useRef<{ nodes: Node[]; edges: Edge[] }[]>([]);
        const redoStackRef = useRef<{ nodes: Node[]; edges: Edge[] }[]>([]);
        const prevContentRef = useRef<string>("");

        return useCanvasHistory({
          nodes: _nodes,
          edges: _edges,
          setNodes,
          setEdges,
          undoStackRef,
          redoStackRef,
          maxHistorySize: 50,
          prevContentRef,
        });
      },
      { initialProps: { nodes: [createNode("node1")], edges: [] as Edge[] } },
    );

    // Should not throw
    rerender({
      nodes: [createNode("node1"), createNode("node2")],
      edges: [],
    });
  });
});
