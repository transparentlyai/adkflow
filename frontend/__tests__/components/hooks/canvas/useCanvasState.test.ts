import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCanvasState } from "@/components/hooks/canvas/useCanvasState";
import type { Node, Edge } from "@xyflow/react";

// Mock the helper hooks
vi.mock("@/components/hooks/canvas/helpers/useDialogState", () => ({
  useDialogState: vi.fn(() => ({
    contextMenu: null,
    setContextMenu: vi.fn(),
    deleteConfirm: null,
    setDeleteConfirm: vi.fn(),
    groupDeleteConfirm: null,
    setGroupDeleteConfirm: vi.fn(),
    teleportNamePrompt: null,
    setTeleportNamePrompt: vi.fn(),
    teleportNameInput: "",
    setTeleportNameInput: vi.fn(),
  })),
}));

vi.mock("@/components/hooks/canvas/helpers/useNodePositionState", () => ({
  useNodePositionState: vi.fn(() => ({
    initialNodePositions: new Map(),
    setInitialNodePositions: vi.fn(),
    resetPositions: vi.fn(),
  })),
}));

describe("useCanvasState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("core state", () => {
    it("should initialize with empty nodes", () => {
      const { result } = renderHook(() => useCanvasState());

      expect(result.current.nodes).toEqual([]);
    });

    it("should initialize with empty edges", () => {
      const { result } = renderHook(() => useCanvasState());

      expect(result.current.edges).toEqual([]);
    });

    it("should initialize rfInstance as null", () => {
      const { result } = renderHook(() => useCanvasState());

      expect(result.current.rfInstance).toBeNull();
    });

    it("should initialize with empty custom node schemas", () => {
      const { result } = renderHook(() => useCanvasState());

      expect(result.current.customNodeSchemas).toEqual([]);
    });
  });

  describe("setters", () => {
    it("should update nodes", () => {
      const { result } = renderHook(() => useCanvasState());

      const newNodes: Node[] = [
        {
          id: "node1",
          type: "agent",
          position: { x: 0, y: 0 },
          data: {},
        },
      ];

      act(() => {
        result.current.setNodes(newNodes);
      });

      expect(result.current.nodes).toEqual(newNodes);
    });

    it("should update edges", () => {
      const { result } = renderHook(() => useCanvasState());

      const newEdges: Edge[] = [
        {
          id: "edge1",
          source: "node1",
          target: "node2",
        },
      ];

      act(() => {
        result.current.setEdges(newEdges);
      });

      expect(result.current.edges).toEqual(newEdges);
    });

    it("should update rfInstance", () => {
      const { result } = renderHook(() => useCanvasState());

      const mockInstance = {
        toObject: vi.fn(),
        fitView: vi.fn(),
      } as any;

      act(() => {
        result.current.setRfInstance(mockInstance);
      });

      expect(result.current.rfInstance).toBe(mockInstance);
    });

    it("should update customNodeSchemas", () => {
      const { result } = renderHook(() => useCanvasState());

      const newSchemas = [
        {
          unit_id: "test",
          name: "Test",
          type: "node" as const,
          ui: { inputs: [], outputs: [] },
        },
      ];

      act(() => {
        result.current.setCustomNodeSchemas(newSchemas);
      });

      expect(result.current.customNodeSchemas).toEqual(newSchemas);
    });
  });

  describe("dialog state", () => {
    it("should provide contextMenu state", () => {
      const { result } = renderHook(() => useCanvasState());

      expect(result.current.contextMenu).toBeDefined();
      expect(result.current.setContextMenu).toBeDefined();
    });

    it("should provide deleteConfirm state", () => {
      const { result } = renderHook(() => useCanvasState());

      expect(result.current.deleteConfirm).toBeDefined();
      expect(result.current.setDeleteConfirm).toBeDefined();
    });

    it("should provide groupDeleteConfirm state", () => {
      const { result } = renderHook(() => useCanvasState());

      expect(result.current.groupDeleteConfirm).toBeDefined();
      expect(result.current.setGroupDeleteConfirm).toBeDefined();
    });

    it("should provide teleportNamePrompt state", () => {
      const { result } = renderHook(() => useCanvasState());

      expect(result.current.teleportNamePrompt).toBeDefined();
      expect(result.current.setTeleportNamePrompt).toBeDefined();
    });

    it("should provide teleportNameInput state", () => {
      const { result } = renderHook(() => useCanvasState());

      expect(result.current.teleportNameInput).toBeDefined();
      expect(result.current.setTeleportNameInput).toBeDefined();
    });
  });

  describe("mouse and grid state", () => {
    it("should initialize mousePosition as null", () => {
      const { result } = renderHook(() => useCanvasState());

      expect(result.current.mousePosition).toBeNull();
    });

    it("should update mousePosition", () => {
      const { result } = renderHook(() => useCanvasState());

      const newPosition = { x: 100, y: 200 };

      act(() => {
        result.current.setMousePosition(newPosition);
      });

      expect(result.current.mousePosition).toEqual(newPosition);
    });

    it("should initialize snapToGrid as false", () => {
      const { result } = renderHook(() => useCanvasState());

      expect(result.current.snapToGrid).toBe(false);
    });

    it("should update snapToGrid", () => {
      const { result } = renderHook(() => useCanvasState());

      act(() => {
        result.current.setSnapToGrid(true);
      });

      expect(result.current.snapToGrid).toBe(true);
    });
  });

  describe("history refs", () => {
    it("should initialize undoStackRef as empty array", () => {
      const { result } = renderHook(() => useCanvasState());

      expect(result.current.undoStackRef.current).toEqual([]);
    });

    it("should initialize redoStackRef as empty array", () => {
      const { result } = renderHook(() => useCanvasState());

      expect(result.current.redoStackRef.current).toEqual([]);
    });

    it("should have maxHistorySize of 50", () => {
      const { result } = renderHook(() => useCanvasState());

      expect(result.current.maxHistorySize).toBe(50);
    });

    it("should initialize prevContentRef as empty string", () => {
      const { result } = renderHook(() => useCanvasState());

      expect(result.current.prevContentRef.current).toBe("");
    });

    it("should initialize duplicateErrorNodesRef as empty Map", () => {
      const { result } = renderHook(() => useCanvasState());

      expect(result.current.duplicateErrorNodesRef.current).toBeInstanceOf(Map);
      expect(result.current.duplicateErrorNodesRef.current.size).toBe(0);
    });
  });

  describe("position state", () => {
    it("should provide position state from helper", () => {
      const { result } = renderHook(() => useCanvasState());

      expect(result.current.initialNodePositions).toBeDefined();
      expect(result.current.setInitialNodePositions).toBeDefined();
      expect(result.current.resetPositions).toBeDefined();
    });
  });

  describe("ref stability", () => {
    it("should maintain same ref objects across re-renders", () => {
      const { result, rerender } = renderHook(() => useCanvasState());

      const firstUndoRef = result.current.undoStackRef;
      const firstRedoRef = result.current.redoStackRef;
      const firstPrevContentRef = result.current.prevContentRef;
      const firstDuplicateErrorRef = result.current.duplicateErrorNodesRef;

      rerender();

      expect(result.current.undoStackRef).toBe(firstUndoRef);
      expect(result.current.redoStackRef).toBe(firstRedoRef);
      expect(result.current.prevContentRef).toBe(firstPrevContentRef);
      expect(result.current.duplicateErrorNodesRef).toBe(
        firstDuplicateErrorRef,
      );
    });
  });

  describe("integration", () => {
    it("should provide all required state for canvas operations", () => {
      const { result } = renderHook(() => useCanvasState());

      // Core state
      expect(result.current.nodes).toBeDefined();
      expect(result.current.setNodes).toBeDefined();
      expect(result.current.edges).toBeDefined();
      expect(result.current.setEdges).toBeDefined();
      expect(result.current.rfInstance).toBeDefined();
      expect(result.current.setRfInstance).toBeDefined();

      // Dialog state
      expect(result.current.contextMenu).toBeDefined();
      expect(result.current.deleteConfirm).toBeDefined();
      expect(result.current.groupDeleteConfirm).toBeDefined();

      // Mouse and grid
      expect(result.current.mousePosition).toBeDefined();
      expect(result.current.snapToGrid).toBeDefined();

      // History
      expect(result.current.undoStackRef).toBeDefined();
      expect(result.current.redoStackRef).toBeDefined();
      expect(result.current.maxHistorySize).toBeDefined();
    });

    it("should allow nodes and edges to be modified independently", () => {
      const { result } = renderHook(() => useCanvasState());

      const newNode: Node = {
        id: "node1",
        type: "agent",
        position: { x: 0, y: 0 },
        data: {},
      };

      const newEdge: Edge = {
        id: "edge1",
        source: "node1",
        target: "node2",
      };

      act(() => {
        result.current.setNodes([newNode]);
      });

      expect(result.current.nodes).toHaveLength(1);
      expect(result.current.edges).toHaveLength(0);

      act(() => {
        result.current.setEdges([newEdge]);
      });

      expect(result.current.nodes).toHaveLength(1);
      expect(result.current.edges).toHaveLength(1);
    });
  });
});
