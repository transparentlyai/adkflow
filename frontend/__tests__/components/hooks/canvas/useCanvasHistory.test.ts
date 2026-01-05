import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCanvasHistory } from "@/components/hooks/canvas/useCanvasHistory";
import type { Node, Edge } from "@xyflow/react";
import { useRef, useState } from "react";

describe("useCanvasHistory", () => {
  const mockOnWorkflowChange = vi.fn();

  const createNode = (id: string, selected = false): Node => ({
    id,
    type: "agent",
    position: { x: 0, y: 0 },
    data: { name: id },
    selected,
  });

  const createEdge = (id: string, source: string, target: string): Edge => ({
    id,
    source,
    target,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getContentHash", () => {
    it("should strip selection state from nodes", () => {
      const { result } = renderHook(() => {
        const [nodes, setNodes] = useState<Node[]>([]);
        const [edges, setEdges] = useState<Edge[]>([]);
        const undoStackRef = useRef<{ nodes: Node[]; edges: Edge[] }[]>([]);
        const redoStackRef = useRef<{ nodes: Node[]; edges: Edge[] }[]>([]);
        const prevContentRef = useRef<string>("");

        return useCanvasHistory({
          nodes,
          edges,
          setNodes,
          setEdges,
          undoStackRef,
          redoStackRef,
          maxHistorySize: 50,
          prevContentRef,
        });
      });

      const selectedNode = createNode("node1", true);
      const unselectedNode = createNode("node1", false);

      const hash1 = result.current.getContentHash([selectedNode], []);
      const hash2 = result.current.getContentHash([unselectedNode], []);

      expect(hash1).toBe(hash2);
    });

    it("should strip dragging state from nodes", () => {
      const { result } = renderHook(() => {
        const [nodes, setNodes] = useState<Node[]>([]);
        const [edges, setEdges] = useState<Edge[]>([]);
        const undoStackRef = useRef<{ nodes: Node[]; edges: Edge[] }[]>([]);
        const redoStackRef = useRef<{ nodes: Node[]; edges: Edge[] }[]>([]);
        const prevContentRef = useRef<string>("");

        return useCanvasHistory({
          nodes,
          edges,
          setNodes,
          setEdges,
          undoStackRef,
          redoStackRef,
          maxHistorySize: 50,
          prevContentRef,
        });
      });

      const node1 = { ...createNode("node1"), dragging: true };
      const node2 = { ...createNode("node1"), dragging: false };

      const hash1 = result.current.getContentHash([node1], []);
      const hash2 = result.current.getContentHash([node2], []);

      expect(hash1).toBe(hash2);
    });

    it("should include edges in hash", () => {
      const { result } = renderHook(() => {
        const [nodes, setNodes] = useState<Node[]>([]);
        const [edges, setEdges] = useState<Edge[]>([]);
        const undoStackRef = useRef<{ nodes: Node[]; edges: Edge[] }[]>([]);
        const redoStackRef = useRef<{ nodes: Node[]; edges: Edge[] }[]>([]);
        const prevContentRef = useRef<string>("");

        return useCanvasHistory({
          nodes,
          edges,
          setNodes,
          setEdges,
          undoStackRef,
          redoStackRef,
          maxHistorySize: 50,
          prevContentRef,
        });
      });

      const hash1 = result.current.getContentHash([], []);
      const hash2 = result.current.getContentHash(
        [],
        [createEdge("edge1", "node1", "node2")],
      );

      expect(hash1).not.toBe(hash2);
    });
  });

  describe("saveSnapshot", () => {
    it("should save current state to undo stack", () => {
      const { result } = renderHook(() => {
        const [nodes, setNodes] = useState<Node[]>([createNode("node1")]);
        const [edges, setEdges] = useState<Edge[]>([]);
        const undoStackRef = useRef<{ nodes: Node[]; edges: Edge[] }[]>([]);
        const redoStackRef = useRef<{ nodes: Node[]; edges: Edge[] }[]>([]);
        const prevContentRef = useRef<string>("");

        return {
          hook: useCanvasHistory({
            nodes,
            edges,
            setNodes,
            setEdges,
            undoStackRef,
            redoStackRef,
            maxHistorySize: 50,
            prevContentRef,
          }),
          undoStackRef,
          redoStackRef,
        };
      });

      expect(result.current.undoStackRef.current.length).toBe(0);

      act(() => {
        result.current.hook.saveSnapshot();
      });

      expect(result.current.undoStackRef.current.length).toBe(1);
      expect(result.current.undoStackRef.current[0].nodes).toHaveLength(1);
    });

    it("should clear redo stack when saving new snapshot", () => {
      const { result } = renderHook(() => {
        const [nodes, setNodes] = useState<Node[]>([]);
        const [edges, setEdges] = useState<Edge[]>([]);
        const undoStackRef = useRef<{ nodes: Node[]; edges: Edge[] }[]>([]);
        const redoStackRef = useRef<{ nodes: Node[]; edges: Edge[] }[]>([
          { nodes: [], edges: [] },
        ]);
        const prevContentRef = useRef<string>("");

        return {
          hook: useCanvasHistory({
            nodes,
            edges,
            setNodes,
            setEdges,
            undoStackRef,
            redoStackRef,
            maxHistorySize: 50,
            prevContentRef,
          }),
          redoStackRef,
        };
      });

      expect(result.current.redoStackRef.current.length).toBe(1);

      act(() => {
        result.current.hook.saveSnapshot();
      });

      expect(result.current.redoStackRef.current.length).toBe(0);
    });

    it("should respect max history size", () => {
      const { result } = renderHook(() => {
        const [nodes, setNodes] = useState<Node[]>([]);
        const [edges, setEdges] = useState<Edge[]>([]);
        const undoStackRef = useRef<{ nodes: Node[]; edges: Edge[] }[]>([]);
        const redoStackRef = useRef<{ nodes: Node[]; edges: Edge[] }[]>([]);
        const prevContentRef = useRef<string>("");

        return {
          hook: useCanvasHistory({
            nodes,
            edges,
            setNodes,
            setEdges,
            undoStackRef,
            redoStackRef,
            maxHistorySize: 3,
            prevContentRef,
          }),
          undoStackRef,
        };
      });

      act(() => {
        result.current.hook.saveSnapshot();
        result.current.hook.saveSnapshot();
        result.current.hook.saveSnapshot();
        result.current.hook.saveSnapshot();
      });

      expect(result.current.undoStackRef.current.length).toBe(3);
    });
  });

  describe("handleUndo", () => {
    it("should do nothing if undo stack is empty", () => {
      const { result } = renderHook(() => {
        const [nodes, setNodes] = useState<Node[]>([createNode("node1")]);
        const [edges, setEdges] = useState<Edge[]>([]);
        const undoStackRef = useRef<{ nodes: Node[]; edges: Edge[] }[]>([]);
        const redoStackRef = useRef<{ nodes: Node[]; edges: Edge[] }[]>([]);
        const prevContentRef = useRef<string>("");

        return {
          hook: useCanvasHistory({
            nodes,
            edges,
            setNodes,
            setEdges,
            undoStackRef,
            redoStackRef,
            maxHistorySize: 50,
            prevContentRef,
          }),
          nodes,
        };
      });

      const initialNodes = result.current.nodes;

      act(() => {
        result.current.hook.handleUndo();
      });

      expect(result.current.nodes).toBe(initialNodes);
    });

    it("should restore previous state", () => {
      const { result } = renderHook(() => {
        const [nodes, setNodes] = useState<Node[]>([createNode("node2")]);
        const [edges, setEdges] = useState<Edge[]>([]);
        const undoStackRef = useRef<{ nodes: Node[]; edges: Edge[] }[]>([
          { nodes: [createNode("node1")], edges: [] },
        ]);
        const redoStackRef = useRef<{ nodes: Node[]; edges: Edge[] }[]>([]);
        const prevContentRef = useRef<string>("");

        return {
          hook: useCanvasHistory({
            nodes,
            edges,
            setNodes,
            setEdges,
            undoStackRef,
            redoStackRef,
            maxHistorySize: 50,
            prevContentRef,
          }),
          nodes,
          undoStackRef,
        };
      });

      expect(result.current.nodes[0].id).toBe("node2");

      act(() => {
        result.current.hook.handleUndo();
      });

      expect(result.current.nodes[0].id).toBe("node1");
      expect(result.current.undoStackRef.current.length).toBe(0);
    });

    it("should save current state to redo stack", () => {
      const { result } = renderHook(() => {
        const [nodes, setNodes] = useState<Node[]>([createNode("node2")]);
        const [edges, setEdges] = useState<Edge[]>([]);
        const undoStackRef = useRef<{ nodes: Node[]; edges: Edge[] }[]>([
          { nodes: [createNode("node1")], edges: [] },
        ]);
        const redoStackRef = useRef<{ nodes: Node[]; edges: Edge[] }[]>([]);
        const prevContentRef = useRef<string>("");

        return {
          hook: useCanvasHistory({
            nodes,
            edges,
            setNodes,
            setEdges,
            undoStackRef,
            redoStackRef,
            maxHistorySize: 50,
            prevContentRef,
          }),
          redoStackRef,
        };
      });

      expect(result.current.redoStackRef.current.length).toBe(0);

      act(() => {
        result.current.hook.handleUndo();
      });

      expect(result.current.redoStackRef.current.length).toBe(1);
      expect(result.current.redoStackRef.current[0].nodes[0].id).toBe("node2");
    });
  });

  describe("handleRedo", () => {
    it("should do nothing if redo stack is empty", () => {
      const { result } = renderHook(() => {
        const [nodes, setNodes] = useState<Node[]>([createNode("node1")]);
        const [edges, setEdges] = useState<Edge[]>([]);
        const undoStackRef = useRef<{ nodes: Node[]; edges: Edge[] }[]>([]);
        const redoStackRef = useRef<{ nodes: Node[]; edges: Edge[] }[]>([]);
        const prevContentRef = useRef<string>("");

        return {
          hook: useCanvasHistory({
            nodes,
            edges,
            setNodes,
            setEdges,
            undoStackRef,
            redoStackRef,
            maxHistorySize: 50,
            prevContentRef,
          }),
          nodes,
        };
      });

      const initialNodes = result.current.nodes;

      act(() => {
        result.current.hook.handleRedo();
      });

      expect(result.current.nodes).toBe(initialNodes);
    });

    it("should restore next state", () => {
      const { result } = renderHook(() => {
        const [nodes, setNodes] = useState<Node[]>([createNode("node1")]);
        const [edges, setEdges] = useState<Edge[]>([]);
        const undoStackRef = useRef<{ nodes: Node[]; edges: Edge[] }[]>([]);
        const redoStackRef = useRef<{ nodes: Node[]; edges: Edge[] }[]>([
          { nodes: [createNode("node2")], edges: [] },
        ]);
        const prevContentRef = useRef<string>("");

        return {
          hook: useCanvasHistory({
            nodes,
            edges,
            setNodes,
            setEdges,
            undoStackRef,
            redoStackRef,
            maxHistorySize: 50,
            prevContentRef,
          }),
          nodes,
          redoStackRef,
        };
      });

      expect(result.current.nodes[0].id).toBe("node1");

      act(() => {
        result.current.hook.handleRedo();
      });

      expect(result.current.nodes[0].id).toBe("node2");
      expect(result.current.redoStackRef.current.length).toBe(0);
    });

    it("should save current state to undo stack", () => {
      const { result } = renderHook(() => {
        const [nodes, setNodes] = useState<Node[]>([createNode("node1")]);
        const [edges, setEdges] = useState<Edge[]>([]);
        const undoStackRef = useRef<{ nodes: Node[]; edges: Edge[] }[]>([]);
        const redoStackRef = useRef<{ nodes: Node[]; edges: Edge[] }[]>([
          { nodes: [createNode("node2")], edges: [] },
        ]);
        const prevContentRef = useRef<string>("");

        return {
          hook: useCanvasHistory({
            nodes,
            edges,
            setNodes,
            setEdges,
            undoStackRef,
            redoStackRef,
            maxHistorySize: 50,
            prevContentRef,
          }),
          undoStackRef,
        };
      });

      expect(result.current.undoStackRef.current.length).toBe(0);

      act(() => {
        result.current.hook.handleRedo();
      });

      expect(result.current.undoStackRef.current.length).toBe(1);
      expect(result.current.undoStackRef.current[0].nodes[0].id).toBe("node1");
    });
  });

  describe("onWorkflowChange callback", () => {
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
});
