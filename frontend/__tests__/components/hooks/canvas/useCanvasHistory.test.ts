import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCanvasHistory } from "@/components/hooks/canvas/useCanvasHistory";
import type { Node, Edge } from "@xyflow/react";
import { useRef, useState } from "react";

describe("useCanvasHistory", () => {
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
});
