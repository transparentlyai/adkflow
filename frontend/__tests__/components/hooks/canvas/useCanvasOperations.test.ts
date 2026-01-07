import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCanvasOperations } from "@/components/hooks/canvas/useCanvasOperations";
import type { Node, Edge, ReactFlowInstance } from "@xyflow/react";
import type { CustomNodeSchema } from "@/components/nodes/CustomNode";

// Mock the nodeHydration module
vi.mock("@/lib/nodeHydration", () => ({
  stripTransientFieldsFromNodes: vi.fn((nodes) =>
    nodes.map((n: Node) => ({
      id: n.id,
      type: n.type,
      position: n.position,
      data: { name: n.data.name },
    })),
  ),
  hydrateNodesWithSchemas: vi.fn((nodes) => nodes),
}));

describe("useCanvasOperations", () => {
  const mockSetNodes = vi.fn();
  const mockSetEdges = vi.fn();
  const mockResetPositions = vi.fn();
  const mockRfInstance: Partial<ReactFlowInstance> = {
    toObject: vi.fn(),
    zoomIn: vi.fn(),
    zoomOut: vi.fn(),
    fitView: vi.fn(),
    setViewport: vi.fn(),
    setCenter: vi.fn(),
    getNodes: vi.fn(() => []),
  };

  const createNode = (id: string, x = 0, y = 0): Node => ({
    id,
    type: "agent",
    position: { x, y },
    data: { name: id },
    measured: { width: 100, height: 50 },
  });

  const createEdge = (id: string, source: string, target: string): Edge => ({
    id,
    source,
    target,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    global.requestAnimationFrame = vi.fn((cb) => {
      cb(0);
      return 0;
    }) as any;
  });

  describe("clearCanvas", () => {
    it("should clear nodes and edges", () => {
      const { result } = renderHook(() =>
        useCanvasOperations({
          nodes: [createNode("node1")],
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
          rfInstance: null,
          resetPositions: mockResetPositions,
        }),
      );

      act(() => {
        result.current.clearCanvas();
      });

      expect(mockSetNodes).toHaveBeenCalledWith([]);
      expect(mockSetEdges).toHaveBeenCalledWith([]);
    });

    it("should reset positions", () => {
      const { result } = renderHook(() =>
        useCanvasOperations({
          nodes: [],
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
          rfInstance: null,
          resetPositions: mockResetPositions,
        }),
      );

      act(() => {
        result.current.clearCanvas();
      });

      expect(mockResetPositions).toHaveBeenCalled();
    });
  });

  describe("saveFlow", () => {
    it("should return null when rfInstance is null", () => {
      const { result } = renderHook(() =>
        useCanvasOperations({
          nodes: [],
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
          rfInstance: null,
          resetPositions: mockResetPositions,
        }),
      );

      const flow = result.current.saveFlow();

      expect(flow).toBeNull();
    });

    it("should return flow with stripped nodes", () => {
      const nodes = [createNode("node1")];
      const edges = [createEdge("edge1", "node1", "node2")];
      const viewport = { x: 0, y: 0, zoom: 1 };

      (mockRfInstance.toObject as any).mockReturnValue({
        nodes,
        edges,
        viewport,
      });

      const { result } = renderHook(() =>
        useCanvasOperations({
          nodes,
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
          rfInstance: mockRfInstance as ReactFlowInstance,
          resetPositions: mockResetPositions,
        }),
      );

      const flow = result.current.saveFlow();

      expect(flow).toBeDefined();
      expect(flow?.nodes).toBeDefined();
      expect(flow?.edges).toEqual(edges);
      expect(flow?.viewport).toEqual(viewport);
    });

    it("should call stripTransientFieldsFromNodes", async () => {
      const { stripTransientFieldsFromNodes } =
        await import("@/lib/nodeHydration");

      const nodes = [createNode("node1")];
      (mockRfInstance.toObject as any).mockReturnValue({
        nodes,
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      });

      const { result } = renderHook(() =>
        useCanvasOperations({
          nodes,
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
          rfInstance: mockRfInstance as ReactFlowInstance,
          resetPositions: mockResetPositions,
        }),
      );

      result.current.saveFlow();

      expect(stripTransientFieldsFromNodes).toHaveBeenCalledWith(nodes);
    });
  });

  describe("restoreFlow", () => {
    it("should do nothing if flow is null", () => {
      const { result } = renderHook(() =>
        useCanvasOperations({
          nodes: [],
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
          rfInstance: mockRfInstance as ReactFlowInstance,
          resetPositions: mockResetPositions,
        }),
      );

      act(() => {
        result.current.restoreFlow(null as any);
      });

      expect(mockSetNodes).not.toHaveBeenCalled();
      expect(mockSetEdges).not.toHaveBeenCalled();
    });

    it("should restore nodes and edges", async () => {
      const nodes = [createNode("node1")];
      const edges = [createEdge("edge1", "node1", "node2")];
      const viewport = { x: 10, y: 20, zoom: 1.5 };

      const { result } = renderHook(() =>
        useCanvasOperations({
          nodes: [],
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
          rfInstance: mockRfInstance as ReactFlowInstance,
          resetPositions: mockResetPositions,
        }),
      );

      act(() => {
        result.current.restoreFlow({ nodes, edges, viewport });
      });

      expect(mockSetNodes).toHaveBeenCalledWith(nodes);
      expect(mockSetEdges).toHaveBeenCalledWith(edges);
    });

    it("should call hydrateNodesWithSchemas", async () => {
      const { hydrateNodesWithSchemas } = await import("@/lib/nodeHydration");

      const nodes = [createNode("node1")];
      const schemas: CustomNodeSchema[] = [
        {
          unit_id: "test",
          name: "Test",
          type: "node",
          ui: { inputs: [], outputs: [] },
        },
      ];

      const { result } = renderHook(() =>
        useCanvasOperations({
          nodes: [],
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
          rfInstance: mockRfInstance as ReactFlowInstance,
          resetPositions: mockResetPositions,
          customNodeSchemas: schemas,
        }),
      );

      act(() => {
        result.current.restoreFlow({
          nodes,
          edges: [],
          viewport: { x: 0, y: 0, zoom: 1 },
        });
      });

      expect(hydrateNodesWithSchemas).toHaveBeenCalledWith(nodes, schemas);
    });

    it("should restore viewport using requestAnimationFrame", () => {
      const viewport = { x: 10, y: 20, zoom: 1.5 };

      const { result } = renderHook(() =>
        useCanvasOperations({
          nodes: [],
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
          rfInstance: mockRfInstance as ReactFlowInstance,
          resetPositions: mockResetPositions,
        }),
      );

      act(() => {
        result.current.restoreFlow({
          nodes: [],
          edges: [],
          viewport,
        });
      });

      expect(global.requestAnimationFrame).toHaveBeenCalled();
      expect(mockRfInstance.setViewport).toHaveBeenCalledWith(viewport);
    });

    it("should handle missing viewport gracefully", () => {
      const { result } = renderHook(() =>
        useCanvasOperations({
          nodes: [],
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
          rfInstance: mockRfInstance as ReactFlowInstance,
          resetPositions: mockResetPositions,
        }),
      );

      act(() => {
        result.current.restoreFlow({
          nodes: [],
          edges: [],
          viewport: undefined as any,
        });
      });

      expect(mockRfInstance.setViewport).not.toHaveBeenCalled();
    });
  });

  describe("zoom methods", () => {
    it("should call zoomIn on rfInstance", () => {
      const { result } = renderHook(() =>
        useCanvasOperations({
          nodes: [],
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
          rfInstance: mockRfInstance as ReactFlowInstance,
          resetPositions: mockResetPositions,
        }),
      );

      act(() => {
        result.current.zoomIn();
      });

      expect(mockRfInstance.zoomIn).toHaveBeenCalled();
    });

    it("should not throw if rfInstance is null when calling zoomIn", () => {
      const { result } = renderHook(() =>
        useCanvasOperations({
          nodes: [],
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
          rfInstance: null,
          resetPositions: mockResetPositions,
        }),
      );

      expect(() => {
        act(() => {
          result.current.zoomIn();
        });
      }).not.toThrow();
    });

    it("should call zoomOut on rfInstance", () => {
      const { result } = renderHook(() =>
        useCanvasOperations({
          nodes: [],
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
          rfInstance: mockRfInstance as ReactFlowInstance,
          resetPositions: mockResetPositions,
        }),
      );

      act(() => {
        result.current.zoomOut();
      });

      expect(mockRfInstance.zoomOut).toHaveBeenCalled();
    });

    it("should not throw if rfInstance is null when calling zoomOut", () => {
      const { result } = renderHook(() =>
        useCanvasOperations({
          nodes: [],
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
          rfInstance: null,
          resetPositions: mockResetPositions,
        }),
      );

      expect(() => {
        act(() => {
          result.current.zoomOut();
        });
      }).not.toThrow();
    });
  });

  describe("fitViewHandler", () => {
    it("should call fitView on rfInstance with padding", () => {
      const { result } = renderHook(() =>
        useCanvasOperations({
          nodes: [],
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
          rfInstance: mockRfInstance as ReactFlowInstance,
          resetPositions: mockResetPositions,
        }),
      );

      act(() => {
        result.current.fitViewHandler();
      });

      expect(mockRfInstance.fitView).toHaveBeenCalledWith({ padding: 0.1 });
    });

    it("should not throw if rfInstance is null", () => {
      const { result } = renderHook(() =>
        useCanvasOperations({
          nodes: [],
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
          rfInstance: null,
          resetPositions: mockResetPositions,
        }),
      );

      expect(() => {
        act(() => {
          result.current.fitViewHandler();
        });
      }).not.toThrow();
    });
  });

  describe("focusNode", () => {
    it("should do nothing if rfInstance is null", () => {
      const { result } = renderHook(() =>
        useCanvasOperations({
          nodes: [createNode("node1", 100, 50)],
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
          rfInstance: null,
          resetPositions: mockResetPositions,
        }),
      );

      act(() => {
        result.current.focusNode("node1");
      });

      expect(mockSetNodes).not.toHaveBeenCalled();
    });

    it("should do nothing if node not found", () => {
      const node = createNode("node1", 100, 50);
      (mockRfInstance.getNodes as any).mockReturnValue([node]);

      const { result } = renderHook(() =>
        useCanvasOperations({
          nodes: [node],
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
          rfInstance: mockRfInstance as ReactFlowInstance,
          resetPositions: mockResetPositions,
        }),
      );

      act(() => {
        result.current.focusNode("nonexistent");
      });

      expect(mockRfInstance.setCenter).not.toHaveBeenCalled();
    });

    it("should center on node and select it", () => {
      const node = createNode("node1", 100, 50);
      (mockRfInstance.getNodes as any).mockReturnValue([node]);
      mockSetNodes.mockImplementation((fn) => {
        if (typeof fn === "function") {
          return fn([node]);
        }
      });

      const { result } = renderHook(() =>
        useCanvasOperations({
          nodes: [node],
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
          rfInstance: mockRfInstance as ReactFlowInstance,
          resetPositions: mockResetPositions,
        }),
      );

      act(() => {
        result.current.focusNode("node1");
      });

      // Center should be at node position + half width/height
      expect(mockRfInstance.setCenter).toHaveBeenCalledWith(150, 75, {
        zoom: 1,
        duration: 300,
      });

      expect(mockSetNodes).toHaveBeenCalled();
    });

    it("should use default dimensions if measured not available", () => {
      const nodeWithoutMeasured = {
        id: "node1",
        type: "agent",
        position: { x: 100, y: 50 },
        data: { name: "node1" },
      };

      (mockRfInstance.getNodes as any).mockReturnValue([nodeWithoutMeasured]);
      mockSetNodes.mockImplementation((fn) => {
        if (typeof fn === "function") {
          return fn([nodeWithoutMeasured]);
        }
      });

      const { result } = renderHook(() =>
        useCanvasOperations({
          nodes: [nodeWithoutMeasured],
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
          rfInstance: mockRfInstance as ReactFlowInstance,
          resetPositions: mockResetPositions,
        }),
      );

      act(() => {
        result.current.focusNode("node1");
      });

      // Default width 100, height 50
      expect(mockRfInstance.setCenter).toHaveBeenCalledWith(150, 75, {
        zoom: 1,
        duration: 300,
      });
    });

    it("should deselect other nodes when focusing", () => {
      const nodes = [
        createNode("node1", 100, 50),
        { ...createNode("node2", 200, 100), selected: true },
      ];

      (mockRfInstance.getNodes as any).mockReturnValue(nodes);
      mockSetNodes.mockImplementation((fn) => {
        if (typeof fn === "function") {
          const result = fn(nodes);
          expect(result[0].selected).toBe(true);
          expect(result[1].selected).toBe(false);
        }
      });

      const { result } = renderHook(() =>
        useCanvasOperations({
          nodes,
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
          rfInstance: mockRfInstance as ReactFlowInstance,
          resetPositions: mockResetPositions,
        }),
      );

      act(() => {
        result.current.focusNode("node1");
      });

      expect(mockSetNodes).toHaveBeenCalled();
    });

    it("should use rfInstance.getNodes() to get fresh nodes avoiding stale closures", () => {
      const initialNode = createNode("node1", 100, 50);
      const updatedNode = createNode("node1", 200, 100);

      // Initially return the initial node
      (mockRfInstance.getNodes as any).mockReturnValue([initialNode]);

      const { result } = renderHook(() =>
        useCanvasOperations({
          nodes: [initialNode],
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
          rfInstance: mockRfInstance as ReactFlowInstance,
          resetPositions: mockResetPositions,
        }),
      );

      // Simulate nodes being updated (e.g., after restoreFlow)
      // Update the mock to return the updated node
      (mockRfInstance.getNodes as any).mockReturnValue([updatedNode]);

      act(() => {
        result.current.focusNode("node1");
      });

      // Should use the updated position from rfInstance.getNodes(), not stale closure
      // Updated node is at 200, 100 with width 100, height 50
      expect(mockRfInstance.setCenter).toHaveBeenCalledWith(250, 125, {
        zoom: 1,
        duration: 300,
      });
      expect(mockRfInstance.getNodes).toHaveBeenCalled();
    });

    it("should calculate absolute position for child nodes by adding parent position", () => {
      const parentNode = createNode("parent", 100, 50);
      const childNode = {
        ...createNode("child", 20, 10),
        parentId: "parent",
      };

      (mockRfInstance.getNodes as any).mockReturnValue([parentNode, childNode]);
      mockSetNodes.mockImplementation((fn) => {
        if (typeof fn === "function") {
          return fn([parentNode, childNode]);
        }
      });

      const { result } = renderHook(() =>
        useCanvasOperations({
          nodes: [parentNode, childNode],
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
          rfInstance: mockRfInstance as ReactFlowInstance,
          resetPositions: mockResetPositions,
        }),
      );

      act(() => {
        result.current.focusNode("child");
      });

      // Absolute position: child (20, 10) + parent (100, 50) = (120, 60)
      // Center: (120 + 100/2, 60 + 50/2) = (170, 85)
      expect(mockRfInstance.setCenter).toHaveBeenCalledWith(170, 85, {
        zoom: 1,
        duration: 300,
      });
    });

    it("should handle child node without parent found", () => {
      const childNode = {
        ...createNode("child", 20, 10),
        parentId: "nonexistent-parent",
      };

      (mockRfInstance.getNodes as any).mockReturnValue([childNode]);
      mockSetNodes.mockImplementation((fn) => {
        if (typeof fn === "function") {
          return fn([childNode]);
        }
      });

      const { result } = renderHook(() =>
        useCanvasOperations({
          nodes: [childNode],
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
          rfInstance: mockRfInstance as ReactFlowInstance,
          resetPositions: mockResetPositions,
        }),
      );

      act(() => {
        result.current.focusNode("child");
      });

      // Should use child's position as-is if parent not found
      // Center: (20 + 100/2, 10 + 50/2) = (70, 35)
      expect(mockRfInstance.setCenter).toHaveBeenCalledWith(70, 35, {
        zoom: 1,
        duration: 300,
      });
    });
  });
});
