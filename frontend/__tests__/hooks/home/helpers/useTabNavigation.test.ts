import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useTabNavigation } from "@/hooks/home/helpers/useTabNavigation";

describe("useTabNavigation", () => {
  const mockCanvasRef = {
    current: {
      saveFlow: vi.fn(),
      restoreFlow: vi.fn(),
      focusNode: vi.fn(),
    },
  };

  const mockLoadedTabIdRef = { current: "tab1" as string | null };
  const mockIsRestoringFlowRef = { current: false };
  const mockTabFlowCacheRef = {
    current: new Map<string, any>(),
  };
  const mockPendingFocusNodeIdRef = { current: null as string | null };

  const mockSetActiveTabId = vi.fn();
  const mockSetPendingFocusNodeId = vi.fn();
  const mockLoadTabFlow = vi.fn();
  const mockSyncTeleportersForTab = vi.fn();

  const defaultTabs = [
    { id: "tab1", name: "Tab 1" },
    { id: "tab2", name: "Tab 2" },
  ];

  const defaultProps = {
    canvasRef: mockCanvasRef as any,
    loadedTabIdRef: mockLoadedTabIdRef,
    isRestoringFlowRef: mockIsRestoringFlowRef,
    tabFlowCacheRef: mockTabFlowCacheRef,
    pendingFocusNodeIdRef: mockPendingFocusNodeIdRef,
    currentProjectPath: "/path/to/project",
    tabs: defaultTabs,
    activeTabId: "tab1",
    pendingFocusNodeId: null,
    setActiveTabId: mockSetActiveTabId,
    setPendingFocusNodeId: mockSetPendingFocusNodeId,
    loadTabFlow: mockLoadTabFlow,
    syncTeleportersForTab: mockSyncTeleportersForTab,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadedTabIdRef.current = "tab1";
    mockIsRestoringFlowRef.current = false;
    mockTabFlowCacheRef.current = new Map();
    mockPendingFocusNodeIdRef.current = null;

    mockCanvasRef.current.saveFlow.mockReturnValue({
      nodes: [{ id: "node1" }],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    });
    mockLoadTabFlow.mockResolvedValue({
      nodes: [{ id: "loaded-node" }],
      edges: [],
      viewport: { x: 100, y: 100, zoom: 1.5 },
    });
  });

  describe("handleTabClick", () => {
    it("should not switch if clicking same tab", async () => {
      mockLoadedTabIdRef.current = "tab1";

      const { result } = renderHook(() => useTabNavigation(defaultProps));

      await act(async () => {
        await result.current.handleTabClick("tab1");
      });

      expect(mockLoadTabFlow).not.toHaveBeenCalled();
      expect(mockSetActiveTabId).not.toHaveBeenCalled();
    });

    it("should not switch if project path is null", async () => {
      const propsWithNullPath = {
        ...defaultProps,
        currentProjectPath: null,
      };

      const { result } = renderHook(() => useTabNavigation(propsWithNullPath));

      await act(async () => {
        await result.current.handleTabClick("tab2");
      });

      expect(mockLoadTabFlow).not.toHaveBeenCalled();
    });

    it("should save current flow to cache before switching", async () => {
      const currentFlow = {
        nodes: [{ id: "current-node" }],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      };
      mockCanvasRef.current.saveFlow.mockReturnValue(currentFlow);

      const { result } = renderHook(() => useTabNavigation(defaultProps));

      await act(async () => {
        await result.current.handleTabClick("tab2");
      });

      expect(mockCanvasRef.current.saveFlow).toHaveBeenCalled();
      expect(mockTabFlowCacheRef.current.get("tab1")).toEqual(currentFlow);
    });

    it("should update refs and state before loading", async () => {
      const { result } = renderHook(() => useTabNavigation(defaultProps));

      await act(async () => {
        await result.current.handleTabClick("tab2");
      });

      expect(mockLoadedTabIdRef.current).toBe("tab2");
      expect(mockSetActiveTabId).toHaveBeenCalledWith("tab2");
    });

    it("should load flow from cache if available", async () => {
      const cachedFlow = {
        nodes: [{ id: "cached-node" }],
        edges: [],
        viewport: { x: 50, y: 50, zoom: 1.2 },
      };
      mockTabFlowCacheRef.current.set("tab2", cachedFlow);

      const { result } = renderHook(() => useTabNavigation(defaultProps));

      await act(async () => {
        await result.current.handleTabClick("tab2");
      });

      expect(mockCanvasRef.current.restoreFlow).toHaveBeenCalledWith(
        cachedFlow,
      );
      expect(mockLoadTabFlow).not.toHaveBeenCalled();
    });

    it("should load flow from API if not cached", async () => {
      const { result } = renderHook(() => useTabNavigation(defaultProps));

      await act(async () => {
        await result.current.handleTabClick("tab2");
      });

      expect(mockLoadTabFlow).toHaveBeenCalledWith("/path/to/project", "tab2");
      expect(mockCanvasRef.current.restoreFlow).toHaveBeenCalled();
    });

    it("should sync teleporters after restoring flow", async () => {
      const loadedFlow = {
        nodes: [{ id: "loaded-node" }],
        edges: [],
        viewport: { x: 100, y: 100, zoom: 1.5 },
      };
      mockLoadTabFlow.mockResolvedValue(loadedFlow);

      const { result } = renderHook(() => useTabNavigation(defaultProps));

      await act(async () => {
        await result.current.handleTabClick("tab2");
      });

      expect(mockSyncTeleportersForTab).toHaveBeenCalledWith(
        "tab2",
        "Tab 2",
        loadedFlow.nodes,
      );
    });

    it("should set isRestoringFlowRef during restore", async () => {
      const { result } = renderHook(() => useTabNavigation(defaultProps));

      await act(async () => {
        await result.current.handleTabClick("tab2");
      });

      // The flag should be reset after restore
      await waitFor(() => {
        expect(mockIsRestoringFlowRef.current).toBe(false);
      });
    });

    it("should handle null canvas ref for save", async () => {
      const propsWithNullCanvas = {
        ...defaultProps,
        canvasRef: { current: null },
      };

      const { result } = renderHook(() =>
        useTabNavigation(propsWithNullCanvas),
      );

      // Should not throw
      await act(async () => {
        await result.current.handleTabClick("tab2");
      });

      expect(mockSetActiveTabId).toHaveBeenCalledWith("tab2");
    });
  });

  describe("return value", () => {
    it("should return handleTabClick function", () => {
      const { result } = renderHook(() => useTabNavigation(defaultProps));

      expect(typeof result.current.handleTabClick).toBe("function");
    });
  });
});
