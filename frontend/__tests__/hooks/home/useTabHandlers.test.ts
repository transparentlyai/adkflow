import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useTabHandlers } from "@/hooks/home/useTabHandlers";
import type { TabState } from "@/lib/types";

// Mock the useTabNavigation helper
const mockHandleTabClick = vi.fn();

vi.mock("@/hooks/home/helpers/useTabNavigation", () => ({
  useTabNavigation: () => ({
    handleTabClick: mockHandleTabClick,
  }),
}));

describe("useTabHandlers", () => {
  const mockCanvasRef = {
    current: {
      saveFlow: vi.fn(() => ({
        nodes: [],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      })),
      clearCanvas: vi.fn(),
      restoreFlow: vi.fn(),
    },
  };

  const mockLoadedTabIdRef = { current: "tab-1" };
  const mockIsRestoringFlowRef = { current: false };
  const mockTabFlowCacheRef = { current: new Map() };
  const mockPendingFocusNodeIdRef = { current: null as string | null };

  const mockTabs: TabState[] = [
    {
      id: "tab-1",
      name: "Flow 1",
      order: 0,
      hasUnsavedChanges: false,
      isLoading: false,
    },
    {
      id: "tab-2",
      name: "Flow 2",
      order: 1,
      hasUnsavedChanges: false,
      isLoading: false,
    },
  ];

  const mockCreateNewTab = vi.fn();
  const mockDeleteTabById = vi.fn();
  const mockRenameTabById = vi.fn();
  const mockReorderTabsById = vi.fn();
  const mockDuplicateTabById = vi.fn();
  const mockSaveTabFlow = vi.fn();
  const mockSetIsTabDeleteDialogOpen = vi.fn();
  const mockSetPendingDeleteTabId = vi.fn();
  const mockUpdateTabName = vi.fn();

  const defaultProps = {
    canvasRef: mockCanvasRef as any,
    loadedTabIdRef: mockLoadedTabIdRef as any,
    isRestoringFlowRef: mockIsRestoringFlowRef as any,
    tabFlowCacheRef: mockTabFlowCacheRef as any,
    pendingFocusNodeIdRef: mockPendingFocusNodeIdRef as any,
    currentProjectPath: "/path/to/project",
    tabs: mockTabs,
    activeTabId: "tab-1",
    activeTab: mockTabs[0],
    pendingFocusNodeId: null,
    setActiveTabId: vi.fn(),
    setPendingFocusNodeId: vi.fn(),
    loadTabFlow: vi.fn(),
    saveTabFlow: mockSaveTabFlow,
    createNewTab: mockCreateNewTab,
    deleteTabById: mockDeleteTabById,
    renameTabById: mockRenameTabById,
    reorderTabsById: mockReorderTabsById,
    duplicateTabById: mockDuplicateTabById,
    syncTeleportersForTab: vi.fn(),
    updateTabName: mockUpdateTabName,
    isTabDeleteDialogOpen: false,
    setIsTabDeleteDialogOpen: mockSetIsTabDeleteDialogOpen,
    pendingDeleteTabId: null,
    setPendingDeleteTabId: mockSetPendingDeleteTabId,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockTabFlowCacheRef.current = new Map();
    mockLoadedTabIdRef.current = "tab-1";
    mockCreateNewTab.mockResolvedValue({ id: "new-tab", name: "Flow 3" });
    mockDeleteTabById.mockResolvedValue(true);
    mockRenameTabById.mockResolvedValue(true);
    mockReorderTabsById.mockResolvedValue(true);
    mockDuplicateTabById.mockResolvedValue({
      id: "dup-tab",
      name: "Flow 1 Copy",
    });
    mockSaveTabFlow.mockResolvedValue(true);
  });

  describe("handleTabClick", () => {
    it("should return handleTabClick from useTabNavigation", () => {
      const { result } = renderHook(() => useTabHandlers(defaultProps));

      expect(result.current.handleTabClick).toBe(mockHandleTabClick);
    });
  });

  describe("handleAddTab", () => {
    it("should do nothing if no project path", async () => {
      const props = { ...defaultProps, currentProjectPath: null };
      const { result } = renderHook(() => useTabHandlers(props));

      await act(async () => {
        await result.current.handleAddTab();
      });

      expect(mockCreateNewTab).not.toHaveBeenCalled();
    });

    it("should save current flow to cache before creating new tab", async () => {
      const flow = { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } };
      mockCanvasRef.current.saveFlow.mockReturnValue(flow);

      const { result } = renderHook(() => useTabHandlers(defaultProps));

      await act(async () => {
        await result.current.handleAddTab();
      });

      expect(mockCanvasRef.current.saveFlow).toHaveBeenCalled();
      expect(mockTabFlowCacheRef.current.get("tab-1")).toEqual(flow);
    });

    it("should save to backend if active tab has unsaved changes", async () => {
      const activeTab = { ...mockTabs[0], hasUnsavedChanges: true };
      const props = { ...defaultProps, activeTab };
      const flow = { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } };
      mockCanvasRef.current.saveFlow.mockReturnValue(flow);

      const { result } = renderHook(() => useTabHandlers(props));

      await act(async () => {
        await result.current.handleAddTab();
      });

      expect(mockSaveTabFlow).toHaveBeenCalledWith(
        "/path/to/project",
        "tab-1",
        flow,
      );
    });

    it("should create new tab with incremented name", async () => {
      const { result } = renderHook(() => useTabHandlers(defaultProps));

      await act(async () => {
        await result.current.handleAddTab();
      });

      expect(mockCreateNewTab).toHaveBeenCalledWith(
        "/path/to/project",
        "Flow 3",
      );
    });

    it("should update loadedTabIdRef on success", async () => {
      const { result } = renderHook(() => useTabHandlers(defaultProps));

      await act(async () => {
        await result.current.handleAddTab();
      });

      expect(mockLoadedTabIdRef.current).toBe("new-tab");
    });

    it("should clear canvas on success", async () => {
      const { result } = renderHook(() => useTabHandlers(defaultProps));

      await act(async () => {
        await result.current.handleAddTab();
      });

      expect(mockCanvasRef.current.clearCanvas).toHaveBeenCalled();
    });

    it("should not clear canvas if createNewTab returns null", async () => {
      mockCreateNewTab.mockResolvedValue(null);

      const { result } = renderHook(() => useTabHandlers(defaultProps));

      await act(async () => {
        await result.current.handleAddTab();
      });

      expect(mockCanvasRef.current.clearCanvas).not.toHaveBeenCalled();
    });
  });

  describe("handleTabDelete", () => {
    it("should do nothing if no project path", () => {
      const props = { ...defaultProps, currentProjectPath: null };
      const { result } = renderHook(() => useTabHandlers(props));

      act(() => {
        result.current.handleTabDelete("tab-2");
      });

      expect(mockSetPendingDeleteTabId).not.toHaveBeenCalled();
    });

    it("should do nothing if only one tab", () => {
      const props = { ...defaultProps, tabs: [mockTabs[0]] };
      const { result } = renderHook(() => useTabHandlers(props));

      act(() => {
        result.current.handleTabDelete("tab-1");
      });

      expect(mockSetPendingDeleteTabId).not.toHaveBeenCalled();
    });

    it("should set pending delete tab and open dialog", () => {
      const { result } = renderHook(() => useTabHandlers(defaultProps));

      act(() => {
        result.current.handleTabDelete("tab-2");
      });

      expect(mockSetPendingDeleteTabId).toHaveBeenCalledWith("tab-2");
      expect(mockSetIsTabDeleteDialogOpen).toHaveBeenCalledWith(true);
    });
  });

  describe("handleTabDeleteConfirm", () => {
    it("should do nothing if no project path", async () => {
      const props = {
        ...defaultProps,
        currentProjectPath: null,
        pendingDeleteTabId: "tab-2",
      };
      const { result } = renderHook(() => useTabHandlers(props));

      await act(async () => {
        await result.current.handleTabDeleteConfirm();
      });

      expect(mockDeleteTabById).not.toHaveBeenCalled();
    });

    it("should do nothing if no pending delete tab id", async () => {
      const props = { ...defaultProps, pendingDeleteTabId: null };
      const { result } = renderHook(() => useTabHandlers(props));

      await act(async () => {
        await result.current.handleTabDeleteConfirm();
      });

      expect(mockDeleteTabById).not.toHaveBeenCalled();
    });

    it("should delete tab and close dialog", async () => {
      const props = { ...defaultProps, pendingDeleteTabId: "tab-2" };
      const { result } = renderHook(() => useTabHandlers(props));

      await act(async () => {
        await result.current.handleTabDeleteConfirm();
      });

      expect(mockDeleteTabById).toHaveBeenCalledWith(
        "/path/to/project",
        "tab-2",
      );
      expect(mockSetIsTabDeleteDialogOpen).toHaveBeenCalledWith(false);
      expect(mockSetPendingDeleteTabId).toHaveBeenCalledWith(null);
    });
  });

  describe("handleTabDeleteCancel", () => {
    it("should close dialog and clear pending tab id", () => {
      const { result } = renderHook(() => useTabHandlers(defaultProps));

      act(() => {
        result.current.handleTabDeleteCancel();
      });

      expect(mockSetIsTabDeleteDialogOpen).toHaveBeenCalledWith(false);
      expect(mockSetPendingDeleteTabId).toHaveBeenCalledWith(null);
    });
  });

  describe("handleTabRename", () => {
    it("should do nothing if no project path", async () => {
      const props = { ...defaultProps, currentProjectPath: null };
      const { result } = renderHook(() => useTabHandlers(props));

      await act(async () => {
        await result.current.handleTabRename("tab-1", "New Name");
      });

      expect(mockRenameTabById).not.toHaveBeenCalled();
    });

    it("should rename tab and update tab name", async () => {
      const { result } = renderHook(() => useTabHandlers(defaultProps));

      await act(async () => {
        await result.current.handleTabRename("tab-1", "New Name");
      });

      expect(mockRenameTabById).toHaveBeenCalledWith(
        "/path/to/project",
        "tab-1",
        "New Name",
      );
      expect(mockUpdateTabName).toHaveBeenCalledWith("tab-1", "New Name");
    });
  });

  describe("handleTabReorder", () => {
    it("should do nothing if no project path", async () => {
      const props = { ...defaultProps, currentProjectPath: null };
      const { result } = renderHook(() => useTabHandlers(props));

      await act(async () => {
        await result.current.handleTabReorder(["tab-2", "tab-1"]);
      });

      expect(mockReorderTabsById).not.toHaveBeenCalled();
    });

    it("should reorder tabs", async () => {
      const { result } = renderHook(() => useTabHandlers(defaultProps));

      await act(async () => {
        await result.current.handleTabReorder(["tab-2", "tab-1"]);
      });

      expect(mockReorderTabsById).toHaveBeenCalledWith("/path/to/project", [
        "tab-2",
        "tab-1",
      ]);
    });
  });

  describe("handleDuplicateTab", () => {
    it("should do nothing if no project path", async () => {
      const props = { ...defaultProps, currentProjectPath: null };
      const { result } = renderHook(() => useTabHandlers(props));

      await act(async () => {
        await result.current.handleDuplicateTab("tab-1");
      });

      expect(mockDuplicateTabById).not.toHaveBeenCalled();
    });

    it("should save current flow to cache before duplicating", async () => {
      const flow = { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } };
      mockCanvasRef.current.saveFlow.mockReturnValue(flow);

      const { result } = renderHook(() => useTabHandlers(defaultProps));

      await act(async () => {
        await result.current.handleDuplicateTab("tab-1");
      });

      expect(mockCanvasRef.current.saveFlow).toHaveBeenCalled();
      expect(mockTabFlowCacheRef.current.get("tab-1")).toEqual(flow);
    });

    it("should duplicate tab", async () => {
      const { result } = renderHook(() => useTabHandlers(defaultProps));

      await act(async () => {
        await result.current.handleDuplicateTab("tab-1");
      });

      expect(mockDuplicateTabById).toHaveBeenCalledWith(
        "/path/to/project",
        "tab-1",
      );
    });

    it("should update loadedTabIdRef on success", async () => {
      const { result } = renderHook(() => useTabHandlers(defaultProps));

      await act(async () => {
        await result.current.handleDuplicateTab("tab-1");
      });

      expect(mockLoadedTabIdRef.current).toBe("dup-tab");
    });

    it("should not update loadedTabIdRef if duplicate fails", async () => {
      mockDuplicateTabById.mockResolvedValue(null);

      const { result } = renderHook(() => useTabHandlers(defaultProps));

      await act(async () => {
        await result.current.handleDuplicateTab("tab-1");
      });

      expect(mockLoadedTabIdRef.current).toBe("tab-1");
    });
  });

  describe("return values", () => {
    it("should return all expected handlers", () => {
      const { result } = renderHook(() => useTabHandlers(defaultProps));

      expect(result.current).toHaveProperty("handleTabClick");
      expect(result.current).toHaveProperty("handleAddTab");
      expect(result.current).toHaveProperty("handleTabDelete");
      expect(result.current).toHaveProperty("handleTabDeleteConfirm");
      expect(result.current).toHaveProperty("handleTabDeleteCancel");
      expect(result.current).toHaveProperty("handleTabRename");
      expect(result.current).toHaveProperty("handleTabReorder");
      expect(result.current).toHaveProperty("handleDuplicateTab");
    });
  });
});
