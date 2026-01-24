import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCanvasHistory } from "@/components/hooks/canvas/useCanvasHistory";
import type { Node, Edge } from "@xyflow/react";
import { useRef, useState } from "react";

describe("useCanvasHistory - undo/redo", () => {
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
});
