import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useConnectionHandlers } from "@/components/hooks/canvas/useConnectionHandlers";
import type { Node, Connection, NodeChange, EdgeChange } from "@xyflow/react";
import type { HandleTypeInfo } from "@/lib/types";

// Mock the helper hooks
vi.mock("@/components/hooks/canvas/helpers/useConnectionTracking", () => ({
  useConnectionTracking: vi.fn(() => ({
    onConnectStart: vi.fn(),
    onConnectEnd: vi.fn(),
    isValidConnection: vi.fn(() => true),
  })),
}));

vi.mock("@/components/hooks/canvas/helpers/useNodeDragParenting", () => ({
  useNodeDragParenting: vi.fn(() => ({
    onNodeDragStop: vi.fn(),
  })),
}));

// Mock @xyflow/react functions
vi.mock("@xyflow/react", async () => {
  const actual = await vi.importActual("@xyflow/react");
  return {
    ...actual,
    applyNodeChanges: vi.fn((changes, nodes) => nodes),
    applyEdgeChanges: vi.fn((changes, edges) => edges),
    addEdge: vi.fn((edge, edges) => [...edges, edge]),
  };
});

describe("useConnectionHandlers", () => {
  const mockSetNodes = vi.fn();
  const mockSetEdges = vi.fn();

  const createNode = (id: string): Node => ({
    id,
    type: "agent",
    position: { x: 0, y: 0 },
    data: { name: id },
  });

  const handleTypeRegistry: Record<string, HandleTypeInfo> = {
    "node1:output": {
      outputSource: "agent",
      outputType: "str",
    },
    "node2:input": {
      acceptedSources: ["agent"],
      acceptedTypes: ["str"],
    },
    "prompt1:output": {
      outputSource: "prompt",
      outputType: "str",
    },
    "tool1:output": {
      outputSource: "tool",
      outputType: "dict",
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("onConnectStart", () => {
    it("should use useConnectionTracking hook", async () => {
      const { useConnectionTracking } =
        await import("@/components/hooks/canvas/helpers/useConnectionTracking");
      const mockOnConnectStart = vi.fn();
      vi.mocked(useConnectionTracking).mockReturnValue({
        onConnectStart: mockOnConnectStart,
        onConnectEnd: vi.fn(),
        isValidConnection: vi.fn(() => true),
      });

      const { result } = renderHook(() =>
        useConnectionHandlers({
          nodes: [],
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
          handleTypeRegistry,
          linkEdgeColor: "#888888",
        }),
      );

      expect(result.current.onConnectStart).toBe(mockOnConnectStart);
    });
  });

  describe("onConnectEnd", () => {
    it("should use useConnectionTracking hook", async () => {
      const { useConnectionTracking } =
        await import("@/components/hooks/canvas/helpers/useConnectionTracking");
      const mockOnConnectEnd = vi.fn();
      vi.mocked(useConnectionTracking).mockReturnValue({
        onConnectStart: vi.fn(),
        onConnectEnd: mockOnConnectEnd,
        isValidConnection: vi.fn(() => true),
      });

      const { result } = renderHook(() =>
        useConnectionHandlers({
          nodes: [],
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
          handleTypeRegistry,
          linkEdgeColor: "#888888",
        }),
      );

      expect(result.current.onConnectEnd).toBe(mockOnConnectEnd);
    });
  });

  describe("isValidConnection", () => {
    it("should use useConnectionTracking hook", async () => {
      const { useConnectionTracking } =
        await import("@/components/hooks/canvas/helpers/useConnectionTracking");
      const mockIsValidConnection = vi.fn(() => true);
      vi.mocked(useConnectionTracking).mockReturnValue({
        onConnectStart: vi.fn(),
        onConnectEnd: vi.fn(),
        isValidConnection: mockIsValidConnection,
      });

      const { result } = renderHook(() =>
        useConnectionHandlers({
          nodes: [],
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
          handleTypeRegistry,
          linkEdgeColor: "#888888",
        }),
      );

      expect(result.current.isValidConnection).toBe(mockIsValidConnection);
    });
  });

  describe("onNodeDragStop", () => {
    it("should use useNodeDragParenting hook", async () => {
      const { useNodeDragParenting } =
        await import("@/components/hooks/canvas/helpers/useNodeDragParenting");
      const mockOnNodeDragStop = vi.fn();
      vi.mocked(useNodeDragParenting).mockReturnValue({
        onNodeDragStop: mockOnNodeDragStop,
      });

      const { result } = renderHook(() =>
        useConnectionHandlers({
          nodes: [],
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
          handleTypeRegistry,
          linkEdgeColor: "#888888",
        }),
      );

      expect(result.current.onNodeDragStop).toBe(mockOnNodeDragStop);
    });
  });

  describe("onNodesChange", () => {
    it("should apply node changes", () => {
      mockSetNodes.mockImplementation((fn) => {
        if (typeof fn === "function") {
          fn([]);
        }
      });

      const { result } = renderHook(() =>
        useConnectionHandlers({
          nodes: [],
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
          handleTypeRegistry,
          linkEdgeColor: "#888888",
        }),
      );

      const changes: NodeChange[] = [
        { id: "node1", type: "position", position: { x: 100, y: 100 } },
      ];

      act(() => {
        result.current.onNodesChange(changes);
      });

      expect(mockSetNodes).toHaveBeenCalled();
    });
  });

  describe("onEdgesChange", () => {
    it("should apply edge changes", () => {
      mockSetEdges.mockImplementation((fn) => {
        if (typeof fn === "function") {
          fn([]);
        }
      });

      const { result } = renderHook(() =>
        useConnectionHandlers({
          nodes: [],
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
          handleTypeRegistry,
          linkEdgeColor: "#888888",
        }),
      );

      const changes: EdgeChange[] = [{ id: "edge1", type: "remove" }];

      act(() => {
        result.current.onEdgesChange(changes);
      });

      expect(mockSetEdges).toHaveBeenCalled();
    });
  });

  describe("onConnect", () => {
    it("should do nothing if canvas is locked", () => {
      const { result } = renderHook(() =>
        useConnectionHandlers({
          nodes: [],
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
          handleTypeRegistry,
          isLocked: true,
          linkEdgeColor: "#888888",
        }),
      );

      const connection: Connection = {
        source: "node1",
        target: "node2",
        sourceHandle: "output",
        targetHandle: "input",
      };

      act(() => {
        result.current.onConnect(connection);
      });

      expect(mockSetEdges).not.toHaveBeenCalled();
    });

    it("should add regular edge for non-link connections", () => {
      mockSetEdges.mockImplementation((fn) => {
        if (typeof fn === "function") {
          fn([]);
        }
      });

      const { result } = renderHook(() =>
        useConnectionHandlers({
          nodes: [],
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
          handleTypeRegistry,
          linkEdgeColor: "#888888",
        }),
      );

      const connection: Connection = {
        source: "node1",
        target: "node2",
        sourceHandle: "output",
        targetHandle: "input",
      };

      act(() => {
        result.current.onConnect(connection);
      });

      expect(mockSetEdges).toHaveBeenCalled();
    });

    it("should auto-detect target handle for collapsed agent nodes with prompt source", () => {
      const { result } = renderHook(() =>
        useConnectionHandlers({
          nodes: [],
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
          handleTypeRegistry,
          linkEdgeColor: "#888888",
        }),
      );

      const connection: Connection = {
        source: "prompt1",
        sourceHandle: "output",
        target: "agent_1",
        targetHandle: "input",
      };

      mockSetEdges.mockImplementation((fn) => {
        if (typeof fn === "function") {
          fn([]);
        }
      });

      act(() => {
        result.current.onConnect(connection);
      });

      // Should detect prompt source and use prompt-input handle
      expect(mockSetEdges).toHaveBeenCalled();
      const edgeAdder = mockSetEdges.mock.calls[0][0];
      if (typeof edgeAdder === "function") {
        const result = edgeAdder([]);
        expect(result[0].targetHandle).toBe("prompt-input");
      }
    });

    it("should auto-detect target handle for collapsed agent nodes with tool source", () => {
      const { result } = renderHook(() =>
        useConnectionHandlers({
          nodes: [],
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
          handleTypeRegistry,
          linkEdgeColor: "#888888",
        }),
      );

      const connection: Connection = {
        source: "tool1",
        sourceHandle: "output",
        target: "agent_1",
        targetHandle: "input",
      };

      mockSetEdges.mockImplementation((fn) => {
        if (typeof fn === "function") {
          fn([]);
        }
      });

      act(() => {
        result.current.onConnect(connection);
      });

      // Should detect tool source and use tools-input handle
      expect(mockSetEdges).toHaveBeenCalled();
      const edgeAdder = mockSetEdges.mock.calls[0][0];
      if (typeof edgeAdder === "function") {
        const result = edgeAdder([]);
        expect(result[0].targetHandle).toBe("tools-input");
      }
    });

    it("should auto-detect target handle for collapsed agent nodes with agent source", () => {
      const { result } = renderHook(() =>
        useConnectionHandlers({
          nodes: [],
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
          handleTypeRegistry,
          linkEdgeColor: "#888888",
        }),
      );

      const connection: Connection = {
        source: "node1",
        sourceHandle: "output",
        target: "agent_1",
        targetHandle: "input",
      };

      mockSetEdges.mockImplementation((fn) => {
        if (typeof fn === "function") {
          fn([]);
        }
      });

      act(() => {
        result.current.onConnect(connection);
      });

      // Should detect agent source and use agent-input handle
      expect(mockSetEdges).toHaveBeenCalled();
      const edgeAdder = mockSetEdges.mock.calls[0][0];
      if (typeof edgeAdder === "function") {
        const result = edgeAdder([]);
        expect(result[0].targetHandle).toBe("agent-input");
      }
    });

    it("should create styled edge for link connections", () => {
      const { result } = renderHook(() =>
        useConnectionHandlers({
          nodes: [],
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
          handleTypeRegistry,
          linkEdgeColor: "#666666",
        }),
      );

      const connection: Connection = {
        source: "node1",
        sourceHandle: "link-output",
        target: "node2",
        targetHandle: "link-input",
      };

      mockSetEdges.mockImplementation((fn) => {
        if (typeof fn === "function") {
          fn([]);
        }
      });

      act(() => {
        result.current.onConnect(connection);
      });

      expect(mockSetEdges).toHaveBeenCalled();
      const edgeAdder = mockSetEdges.mock.calls[0][0];
      if (typeof edgeAdder === "function") {
        const result = edgeAdder([]);
        expect(result[0].style).toEqual({
          strokeWidth: 2,
          stroke: "#666666",
          strokeDasharray: "5 5",
        });
        expect(result[0].type).toBe("default");
      }
    });

    it("should prevent mixing link and regular handles", () => {
      const { result } = renderHook(() =>
        useConnectionHandlers({
          nodes: [],
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
          handleTypeRegistry,
          linkEdgeColor: "#888888",
        }),
      );

      // Link source to regular target
      const connection1: Connection = {
        source: "node1",
        sourceHandle: "link-output",
        target: "node2",
        targetHandle: "regular-input",
      };

      act(() => {
        result.current.onConnect(connection1);
      });

      expect(mockSetEdges).not.toHaveBeenCalled();

      // Regular source to link target
      const connection2: Connection = {
        source: "node1",
        sourceHandle: "regular-output",
        target: "node2",
        targetHandle: "link-input",
      };

      act(() => {
        result.current.onConnect(connection2);
      });

      expect(mockSetEdges).not.toHaveBeenCalled();
    });
  });

  describe("integration", () => {
    it("should provide all connection handlers", () => {
      const { result } = renderHook(() =>
        useConnectionHandlers({
          nodes: [],
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
          handleTypeRegistry,
          linkEdgeColor: "#888888",
        }),
      );

      expect(result.current.onConnectStart).toBeDefined();
      expect(result.current.onConnectEnd).toBeDefined();
      expect(result.current.isValidConnection).toBeDefined();
      expect(result.current.onNodesChange).toBeDefined();
      expect(result.current.onEdgesChange).toBeDefined();
      expect(result.current.onConnect).toBeDefined();
      expect(result.current.onNodeDragStop).toBeDefined();
    });

    it("should pass correct params to helper hooks", async () => {
      const { useConnectionTracking } =
        await import("@/components/hooks/canvas/helpers/useConnectionTracking");
      const { useNodeDragParenting } =
        await import("@/components/hooks/canvas/helpers/useNodeDragParenting");

      const nodes = [createNode("node1")];

      renderHook(() =>
        useConnectionHandlers({
          nodes,
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
          handleTypeRegistry,
          isLocked: true,
          linkEdgeColor: "#888888",
        }),
      );

      expect(useConnectionTracking).toHaveBeenCalledWith({
        handleTypeRegistry,
      });

      expect(useNodeDragParenting).toHaveBeenCalledWith({
        nodes,
        setNodes: mockSetNodes,
        isLocked: true,
      });
    });
  });

  describe("memoization", () => {
    it("should memoize onNodesChange", () => {
      const { result, rerender } = renderHook(() =>
        useConnectionHandlers({
          nodes: [],
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
          handleTypeRegistry,
          linkEdgeColor: "#888888",
        }),
      );

      const firstHandler = result.current.onNodesChange;
      rerender();

      expect(result.current.onNodesChange).toBe(firstHandler);
    });

    it("should memoize onEdgesChange", () => {
      const { result, rerender } = renderHook(() =>
        useConnectionHandlers({
          nodes: [],
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
          handleTypeRegistry,
          linkEdgeColor: "#888888",
        }),
      );

      const firstHandler = result.current.onEdgesChange;
      rerender();

      expect(result.current.onEdgesChange).toBe(firstHandler);
    });

    it("should update onConnect when dependencies change", () => {
      const { result, rerender } = renderHook(
        ({ isLocked }) =>
          useConnectionHandlers({
            nodes: [],
            setNodes: mockSetNodes,
            setEdges: mockSetEdges,
            handleTypeRegistry,
            isLocked,
            linkEdgeColor: "#888888",
          }),
        { initialProps: { isLocked: false } },
      );

      const firstHandler = result.current.onConnect;
      rerender({ isLocked: true });

      expect(result.current.onConnect).not.toBe(firstHandler);
    });
  });
});
