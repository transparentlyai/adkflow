import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useClipboardOperations } from "@/components/hooks/canvas/useClipboardOperations";
import type { Node, Edge } from "@xyflow/react";

// Mock the ClipboardContext
vi.mock("@/contexts/ClipboardContext", () => ({
  useClipboard: vi.fn(() => ({
    copy: vi.fn(),
    clipboard: null,
    clear: vi.fn(),
    hasClipboard: false,
  })),
}));

// Mock the helper hooks
vi.mock("@/components/hooks/canvas/helpers/useCutHandler", () => ({
  useCutHandler: vi.fn(() => ({
    handleCut: vi.fn(),
  })),
}));

vi.mock("@/components/hooks/canvas/helpers/usePasteHandler", () => ({
  usePasteHandler: vi.fn(() => ({
    handlePaste: vi.fn(),
  })),
}));

describe("useClipboardOperations", () => {
  const mockSetNodes = vi.fn();
  const mockSetEdges = vi.fn();
  const mockSaveSnapshot = vi.fn();

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

  describe("handleCopy", () => {
    it("should do nothing if no activeTabId", async () => {
      const { useClipboard } = await import("@/contexts/ClipboardContext");
      const mockCopy = vi.fn();
      vi.mocked(useClipboard).mockReturnValue({
        copy: mockCopy,
        clipboard: null,
        clear: vi.fn(),
        hasClipboard: false,
      });

      const nodes = [createNode("node1", true)];
      const edges: Edge[] = [];

      const { result } = renderHook(() =>
        useClipboardOperations({
          nodes,
          edges,
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
          activeTabId: undefined,
          mousePosition: null,
          saveSnapshot: mockSaveSnapshot,
        }),
      );

      act(() => {
        result.current.handleCopy();
      });

      expect(mockCopy).not.toHaveBeenCalled();
    });

    it("should copy nodes and edges when activeTabId is provided", async () => {
      const { useClipboard } = await import("@/contexts/ClipboardContext");
      const mockCopy = vi.fn();
      vi.mocked(useClipboard).mockReturnValue({
        copy: mockCopy,
        clipboard: null,
        clear: vi.fn(),
        hasClipboard: false,
      });

      const nodes = [createNode("node1", true)];
      const edges = [createEdge("edge1", "node1", "node2")];

      const { result } = renderHook(() =>
        useClipboardOperations({
          nodes,
          edges,
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
          activeTabId: "tab1",
          mousePosition: null,
          saveSnapshot: mockSaveSnapshot,
        }),
      );

      act(() => {
        result.current.handleCopy();
      });

      expect(mockCopy).toHaveBeenCalledWith(nodes, edges, "tab1");
    });

    it("should copy all nodes and edges regardless of selection", async () => {
      const { useClipboard } = await import("@/contexts/ClipboardContext");
      const mockCopy = vi.fn();
      vi.mocked(useClipboard).mockReturnValue({
        copy: mockCopy,
        clipboard: null,
        clear: vi.fn(),
        hasClipboard: false,
      });

      const nodes = [createNode("node1", true), createNode("node2", false)];
      const edges = [createEdge("edge1", "node1", "node2")];

      const { result } = renderHook(() =>
        useClipboardOperations({
          nodes,
          edges,
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
          activeTabId: "tab1",
          mousePosition: null,
          saveSnapshot: mockSaveSnapshot,
        }),
      );

      act(() => {
        result.current.handleCopy();
      });

      expect(mockCopy).toHaveBeenCalledWith(nodes, edges, "tab1");
    });
  });

  describe("handleCut", () => {
    it("should use useCutHandler hook", async () => {
      const { useCutHandler } =
        await import("@/components/hooks/canvas/helpers/useCutHandler");
      const mockHandleCut = vi.fn();
      vi.mocked(useCutHandler).mockReturnValue({
        handleCut: mockHandleCut,
      });

      const { result } = renderHook(() =>
        useClipboardOperations({
          nodes: [],
          edges: [],
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
          activeTabId: "tab1",
          mousePosition: null,
          saveSnapshot: mockSaveSnapshot,
        }),
      );

      expect(result.current.handleCut).toBe(mockHandleCut);
    });

    it("should pass correct params to useCutHandler", async () => {
      const { useCutHandler } =
        await import("@/components/hooks/canvas/helpers/useCutHandler");

      const nodes = [createNode("node1")];
      const edges = [createEdge("edge1", "node1", "node2")];

      renderHook(() =>
        useClipboardOperations({
          nodes,
          edges,
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
          activeTabId: "tab1",
          isLocked: true,
          mousePosition: null,
          saveSnapshot: mockSaveSnapshot,
        }),
      );

      expect(useCutHandler).toHaveBeenCalledWith({
        nodes,
        edges,
        setNodes: mockSetNodes,
        setEdges: mockSetEdges,
        activeTabId: "tab1",
        isLocked: true,
        saveSnapshot: mockSaveSnapshot,
      });
    });
  });

  describe("handlePaste", () => {
    it("should use usePasteHandler hook", async () => {
      const { usePasteHandler } =
        await import("@/components/hooks/canvas/helpers/usePasteHandler");
      const mockHandlePaste = vi.fn();
      vi.mocked(usePasteHandler).mockReturnValue({
        handlePaste: mockHandlePaste,
      });

      const { result } = renderHook(() =>
        useClipboardOperations({
          nodes: [],
          edges: [],
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
          activeTabId: "tab1",
          mousePosition: null,
          saveSnapshot: mockSaveSnapshot,
        }),
      );

      expect(result.current.handlePaste).toBe(mockHandlePaste);
    });

    it("should pass correct params to usePasteHandler", async () => {
      const { usePasteHandler } =
        await import("@/components/hooks/canvas/helpers/usePasteHandler");

      const mousePosition = { x: 100, y: 200 };

      renderHook(() =>
        useClipboardOperations({
          nodes: [],
          edges: [],
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
          activeTabId: "tab1",
          isLocked: true,
          mousePosition,
          saveSnapshot: mockSaveSnapshot,
        }),
      );

      expect(usePasteHandler).toHaveBeenCalledWith({
        setNodes: mockSetNodes,
        setEdges: mockSetEdges,
        isLocked: true,
        mousePosition,
        saveSnapshot: mockSaveSnapshot,
      });
    });
  });

  describe("hasClipboard", () => {
    it("should return hasClipboard from context", async () => {
      const { useClipboard } = await import("@/contexts/ClipboardContext");
      vi.mocked(useClipboard).mockReturnValue({
        copy: vi.fn(),
        clipboard: {
          nodes: [createNode("node1")],
          edges: [],
          sourceTabId: "tab1",
          timestamp: Date.now(),
        },
        clear: vi.fn(),
        hasClipboard: true,
      });

      const { result } = renderHook(() =>
        useClipboardOperations({
          nodes: [],
          edges: [],
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
          activeTabId: "tab1",
          mousePosition: null,
          saveSnapshot: mockSaveSnapshot,
        }),
      );

      expect(result.current.hasClipboard).toBe(true);
    });

    it("should return false when no clipboard data", async () => {
      const { useClipboard } = await import("@/contexts/ClipboardContext");
      vi.mocked(useClipboard).mockReturnValue({
        copy: vi.fn(),
        clipboard: null,
        clear: vi.fn(),
        hasClipboard: false,
      });

      const { result } = renderHook(() =>
        useClipboardOperations({
          nodes: [],
          edges: [],
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
          activeTabId: "tab1",
          mousePosition: null,
          saveSnapshot: mockSaveSnapshot,
        }),
      );

      expect(result.current.hasClipboard).toBe(false);
    });
  });

  describe("integration", () => {
    it("should provide all clipboard operations", () => {
      const { result } = renderHook(() =>
        useClipboardOperations({
          nodes: [],
          edges: [],
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
          activeTabId: "tab1",
          mousePosition: null,
          saveSnapshot: mockSaveSnapshot,
        }),
      );

      expect(result.current.handleCopy).toBeDefined();
      expect(result.current.handleCut).toBeDefined();
      expect(result.current.handlePaste).toBeDefined();
      expect(result.current.hasClipboard).toBeDefined();
    });

    it("should update operations when dependencies change", async () => {
      const { useCutHandler } =
        await import("@/components/hooks/canvas/helpers/useCutHandler");

      const { rerender } = renderHook(
        ({ nodes, activeTabId }) =>
          useClipboardOperations({
            nodes,
            edges: [],
            setNodes: mockSetNodes,
            setEdges: mockSetEdges,
            activeTabId,
            mousePosition: null,
            saveSnapshot: mockSaveSnapshot,
          }),
        { initialProps: { nodes: [] as Node[], activeTabId: "tab1" } },
      );

      const firstCallCount = vi.mocked(useCutHandler).mock.calls.length;

      rerender({ nodes: [createNode("node1")], activeTabId: "tab2" });

      expect(vi.mocked(useCutHandler).mock.calls.length).toBeGreaterThan(
        firstCallCount,
      );
    });
  });

  describe("memoization", () => {
    it("should memoize handleCopy based on dependencies", async () => {
      const { useClipboard } = await import("@/contexts/ClipboardContext");
      const mockCopy = vi.fn();
      vi.mocked(useClipboard).mockReturnValue({
        copy: mockCopy,
        clipboard: null,
        clear: vi.fn(),
        hasClipboard: false,
      });

      const nodes = [createNode("node1")];
      const edges: Edge[] = [];

      const { result, rerender } = renderHook(
        ({ nodes, edges, activeTabId }) =>
          useClipboardOperations({
            nodes,
            edges,
            setNodes: mockSetNodes,
            setEdges: mockSetEdges,
            activeTabId,
            mousePosition: null,
            saveSnapshot: mockSaveSnapshot,
          }),
        { initialProps: { nodes, edges, activeTabId: "tab1" } },
      );

      const firstHandleCopy = result.current.handleCopy;

      // Rerender with same props
      rerender({ nodes, edges, activeTabId: "tab1" });

      // Should be same reference due to memoization
      expect(result.current.handleCopy).toBe(firstHandleCopy);
    });
  });
});
