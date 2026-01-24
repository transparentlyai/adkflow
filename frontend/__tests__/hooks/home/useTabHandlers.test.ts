import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTabHandlers } from "@/hooks/home/useTabHandlers";
import {
  mockHandleTabClick,
  createMockCanvasRef,
  createMockRefs,
  createMockFunctions,
  createDefaultProps,
  setupDefaultMockResolvers,
  mockTabs,
} from "./useTabHandlers.fixtures";

vi.mock("@/hooks/home/helpers/useTabNavigation", () => ({
  useTabNavigation: () => ({
    handleTabClick: mockHandleTabClick,
  }),
}));

describe("useTabHandlers", () => {
  const mockCanvasRef = createMockCanvasRef();
  const mockRefs = createMockRefs();
  const mocks = createMockFunctions();
  const defaultProps = createDefaultProps(mockCanvasRef, mockRefs, mocks);

  beforeEach(() => {
    vi.clearAllMocks();
    mockRefs.tabFlowCacheRef.current = new Map();
    mockRefs.loadedTabIdRef.current = "tab-1";
    setupDefaultMockResolvers(mocks);
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

      expect(mocks.createNewTab).not.toHaveBeenCalled();
    });

    it("should save current flow to cache before creating new tab", async () => {
      const flow = { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } };
      mockCanvasRef.current.saveFlow.mockReturnValue(flow);

      const { result } = renderHook(() => useTabHandlers(defaultProps));

      await act(async () => {
        await result.current.handleAddTab();
      });

      expect(mockCanvasRef.current.saveFlow).toHaveBeenCalled();
      expect(mockRefs.tabFlowCacheRef.current.get("tab-1")).toEqual(flow);
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

      expect(mocks.saveTabFlow).toHaveBeenCalledWith(
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

      expect(mocks.createNewTab).toHaveBeenCalledWith(
        "/path/to/project",
        "Flow 3",
      );
    });

    it("should update loadedTabIdRef on success", async () => {
      const { result } = renderHook(() => useTabHandlers(defaultProps));

      await act(async () => {
        await result.current.handleAddTab();
      });

      expect(mockRefs.loadedTabIdRef.current).toBe("new-tab");
    });

    it("should clear canvas on success", async () => {
      const { result } = renderHook(() => useTabHandlers(defaultProps));

      await act(async () => {
        await result.current.handleAddTab();
      });

      expect(mockCanvasRef.current.clearCanvas).toHaveBeenCalled();
    });

    it("should not clear canvas if createNewTab returns null", async () => {
      mocks.createNewTab.mockResolvedValue(null);

      const { result } = renderHook(() => useTabHandlers(defaultProps));

      await act(async () => {
        await result.current.handleAddTab();
      });

      expect(mockCanvasRef.current.clearCanvas).not.toHaveBeenCalled();
    });
  });

  describe("handleTabRename", () => {
    it("should do nothing if no project path", async () => {
      const props = { ...defaultProps, currentProjectPath: null };
      const { result } = renderHook(() => useTabHandlers(props));

      await act(async () => {
        await result.current.handleTabRename("tab-1", "New Name");
      });

      expect(mocks.renameTabById).not.toHaveBeenCalled();
    });

    it("should rename tab and update tab name", async () => {
      const { result } = renderHook(() => useTabHandlers(defaultProps));

      await act(async () => {
        await result.current.handleTabRename("tab-1", "New Name");
      });

      expect(mocks.renameTabById).toHaveBeenCalledWith(
        "/path/to/project",
        "tab-1",
        "New Name",
      );
      expect(mocks.updateTabName).toHaveBeenCalledWith("tab-1", "New Name");
    });
  });

  describe("handleTabReorder", () => {
    it("should do nothing if no project path", async () => {
      const props = { ...defaultProps, currentProjectPath: null };
      const { result } = renderHook(() => useTabHandlers(props));

      await act(async () => {
        await result.current.handleTabReorder(["tab-2", "tab-1"]);
      });

      expect(mocks.reorderTabsById).not.toHaveBeenCalled();
    });

    it("should reorder tabs", async () => {
      const { result } = renderHook(() => useTabHandlers(defaultProps));

      await act(async () => {
        await result.current.handleTabReorder(["tab-2", "tab-1"]);
      });

      expect(mocks.reorderTabsById).toHaveBeenCalledWith("/path/to/project", [
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

      expect(mocks.duplicateTabById).not.toHaveBeenCalled();
    });

    it("should save current flow to cache before duplicating", async () => {
      const flow = { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } };
      mockCanvasRef.current.saveFlow.mockReturnValue(flow);

      const { result } = renderHook(() => useTabHandlers(defaultProps));

      await act(async () => {
        await result.current.handleDuplicateTab("tab-1");
      });

      expect(mockCanvasRef.current.saveFlow).toHaveBeenCalled();
      expect(mockRefs.tabFlowCacheRef.current.get("tab-1")).toEqual(flow);
    });

    it("should duplicate tab", async () => {
      const { result } = renderHook(() => useTabHandlers(defaultProps));

      await act(async () => {
        await result.current.handleDuplicateTab("tab-1");
      });

      expect(mocks.duplicateTabById).toHaveBeenCalledWith(
        "/path/to/project",
        "tab-1",
      );
    });

    it("should update loadedTabIdRef on success", async () => {
      const { result } = renderHook(() => useTabHandlers(defaultProps));

      await act(async () => {
        await result.current.handleDuplicateTab("tab-1");
      });

      expect(mockRefs.loadedTabIdRef.current).toBe("dup-tab");
    });

    it("should not update loadedTabIdRef if duplicate fails", async () => {
      mocks.duplicateTabById.mockResolvedValue(null);

      const { result } = renderHook(() => useTabHandlers(defaultProps));

      await act(async () => {
        await result.current.handleDuplicateTab("tab-1");
      });

      expect(mockRefs.loadedTabIdRef.current).toBe("tab-1");
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
