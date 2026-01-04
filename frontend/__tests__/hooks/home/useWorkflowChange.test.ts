import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useWorkflowChange } from "@/hooks/home/useWorkflowChange";
import type { TabState } from "@/lib/types";

describe("useWorkflowChange", () => {
  const mockMarkTabDirty = vi.fn();
  const mockLoadTabFlow = vi.fn();
  const mockSyncTeleportersForTab = vi.fn();

  const mockActiveTab: TabState = {
    id: "tab-1",
    name: "Flow 1",
    order: 0,
    hasUnsavedChanges: false,
    isLoading: false,
  };

  const mockTabs: TabState[] = [
    mockActiveTab,
    {
      id: "tab-2",
      name: "Flow 2",
      order: 1,
      hasUnsavedChanges: false,
      isLoading: false,
    },
    {
      id: "tab-3",
      name: "Flow 3",
      order: 2,
      hasUnsavedChanges: false,
      isLoading: false,
    },
  ];

  const mockActiveTabRef = { current: mockActiveTab };
  const mockIsRestoringFlowRef = { current: false };
  const mockHasSyncedAllTabsRef = { current: false };

  const defaultProps = {
    activeTabRef: mockActiveTabRef as any,
    isRestoringFlowRef: mockIsRestoringFlowRef as any,
    hasSyncedAllTabsRef: mockHasSyncedAllTabsRef as any,
    tabs: mockTabs,
    activeTabId: "tab-1",
    currentProjectPath: "/path/to/project",
    markTabDirty: mockMarkTabDirty,
    loadTabFlow: mockLoadTabFlow,
    syncTeleportersForTab: mockSyncTeleportersForTab,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockActiveTabRef.current = mockActiveTab;
    mockIsRestoringFlowRef.current = false;
    mockHasSyncedAllTabsRef.current = false;
    mockLoadTabFlow.mockResolvedValue({
      nodes: [{ id: "node-1", type: "agent" }],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    });
  });

  describe("handleWorkflowChange", () => {
    it("should mark tab as dirty when workflow changes", () => {
      const { result } = renderHook(() => useWorkflowChange(defaultProps));

      act(() => {
        result.current.handleWorkflowChange({
          nodes: [{ id: "node-1", type: "agent" } as any],
          edges: [],
        });
      });

      expect(mockMarkTabDirty).toHaveBeenCalledWith("tab-1");
    });

    it("should sync teleporters for current tab", () => {
      const { result } = renderHook(() => useWorkflowChange(defaultProps));
      const nodes = [{ id: "node-1", type: "agent" }] as any;

      act(() => {
        result.current.handleWorkflowChange({ nodes, edges: [] });
      });

      expect(mockSyncTeleportersForTab).toHaveBeenCalledWith(
        "tab-1",
        "Flow 1",
        nodes,
      );
    });

    it("should skip marking dirty during flow restore", () => {
      mockIsRestoringFlowRef.current = true;

      const { result } = renderHook(() => useWorkflowChange(defaultProps));

      act(() => {
        result.current.handleWorkflowChange({
          nodes: [{ id: "node-1", type: "agent" } as any],
          edges: [],
        });
      });

      expect(mockMarkTabDirty).not.toHaveBeenCalled();
      expect(mockSyncTeleportersForTab).not.toHaveBeenCalled();
    });

    it("should not mark dirty if no active tab", () => {
      mockActiveTabRef.current = null as any;

      const { result } = renderHook(() => useWorkflowChange(defaultProps));

      act(() => {
        result.current.handleWorkflowChange({
          nodes: [{ id: "node-1", type: "agent" } as any],
          edges: [],
        });
      });

      expect(mockMarkTabDirty).not.toHaveBeenCalled();
    });

    it("should use the tab name from active tab ref", () => {
      mockActiveTabRef.current = { ...mockActiveTab, name: "Updated Name" };

      const { result } = renderHook(() => useWorkflowChange(defaultProps));
      const nodes = [{ id: "node-1", type: "agent" }] as any;

      act(() => {
        result.current.handleWorkflowChange({ nodes, edges: [] });
      });

      expect(mockSyncTeleportersForTab).toHaveBeenCalledWith(
        "tab-1",
        "Updated Name",
        nodes,
      );
    });
  });

  describe("syncAllTabsTeleporters", () => {
    it("should sync teleporters for all provided tabs", async () => {
      // Prevent initial sync effect from running by setting hasSyncedAllTabsRef to true
      mockHasSyncedAllTabsRef.current = true;
      vi.clearAllMocks();

      const { result } = renderHook(() => useWorkflowChange(defaultProps));

      await act(async () => {
        await result.current.syncAllTabsTeleporters(
          "/path/to/project",
          mockTabs,
        );
      });

      expect(mockLoadTabFlow).toHaveBeenCalledTimes(3);
      expect(mockLoadTabFlow).toHaveBeenCalledWith("/path/to/project", "tab-1");
      expect(mockLoadTabFlow).toHaveBeenCalledWith("/path/to/project", "tab-2");
      expect(mockLoadTabFlow).toHaveBeenCalledWith("/path/to/project", "tab-3");
    });

    it("should sync teleporters for each tab with loaded flow", async () => {
      // Prevent initial sync effect from running by setting hasSyncedAllTabsRef to true
      mockHasSyncedAllTabsRef.current = true;
      vi.clearAllMocks();

      mockLoadTabFlow.mockImplementation((_, tabId) =>
        Promise.resolve({
          nodes: [{ id: `node-${tabId}`, type: "agent" }],
          edges: [],
          viewport: { x: 0, y: 0, zoom: 1 },
        }),
      );

      const { result } = renderHook(() => useWorkflowChange(defaultProps));

      await act(async () => {
        await result.current.syncAllTabsTeleporters(
          "/path/to/project",
          mockTabs,
        );
      });

      expect(mockSyncTeleportersForTab).toHaveBeenCalledTimes(3);
      expect(mockSyncTeleportersForTab).toHaveBeenCalledWith(
        "tab-1",
        "Flow 1",
        [{ id: "node-tab-1", type: "agent" }],
      );
      expect(mockSyncTeleportersForTab).toHaveBeenCalledWith(
        "tab-2",
        "Flow 2",
        [{ id: "node-tab-2", type: "agent" }],
      );
    });

    it("should skip syncing if loadTabFlow returns null", async () => {
      // Prevent initial sync effect from running by setting hasSyncedAllTabsRef to true
      mockHasSyncedAllTabsRef.current = true;
      vi.clearAllMocks();

      mockLoadTabFlow.mockResolvedValue(null);

      const { result } = renderHook(() => useWorkflowChange(defaultProps));

      await act(async () => {
        await result.current.syncAllTabsTeleporters(
          "/path/to/project",
          mockTabs,
        );
      });

      expect(mockLoadTabFlow).toHaveBeenCalledTimes(3);
      expect(mockSyncTeleportersForTab).not.toHaveBeenCalled();
    });
  });

  describe("initial sync effect", () => {
    it("should not sync if tabs array is empty", () => {
      const props = { ...defaultProps, tabs: [] };

      renderHook(() => useWorkflowChange(props));

      // The effect should not run loadTabFlow if tabs is empty
      expect(mockLoadTabFlow).not.toHaveBeenCalled();
    });

    it("should not sync if no project path", () => {
      const props = { ...defaultProps, currentProjectPath: null };

      renderHook(() => useWorkflowChange(props));

      expect(mockLoadTabFlow).not.toHaveBeenCalled();
    });

    it("should not sync if already synced", () => {
      // Set to true BEFORE rendering to prevent the effect from syncing
      mockHasSyncedAllTabsRef.current = true;

      renderHook(() => useWorkflowChange(defaultProps));

      // The initial sync effect should check hasSyncedAllTabsRef.current and skip
      // Note: the reset effect runs after and sets it to false, but by then the sync check already passed
      expect(mockLoadTabFlow).not.toHaveBeenCalled();
    });

    it("should call syncAllTabsTeleporters for non-active tabs when conditions met", async () => {
      // Start with hasSyncedAllTabsRef.current = false
      mockHasSyncedAllTabsRef.current = false;

      renderHook(() => useWorkflowChange(defaultProps));

      // Wait for async operations
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      // Should have attempted to sync tab-2 and tab-3 (excluding active tab-1)
      expect(mockLoadTabFlow).toHaveBeenCalledWith("/path/to/project", "tab-2");
      expect(mockLoadTabFlow).toHaveBeenCalledWith("/path/to/project", "tab-3");
      // Should NOT have synced active tab
      expect(mockLoadTabFlow).not.toHaveBeenCalledWith(
        "/path/to/project",
        "tab-1",
      );
    });
  });

  describe("project change effect", () => {
    it("should reset sync flag when project changes", () => {
      mockHasSyncedAllTabsRef.current = true;

      const { rerender } = renderHook((props) => useWorkflowChange(props), {
        initialProps: defaultProps,
      });

      // Change project path
      rerender({ ...defaultProps, currentProjectPath: "/new/project" });

      expect(mockHasSyncedAllTabsRef.current).toBe(false);
    });
  });

  describe("return values", () => {
    it("should return handleWorkflowChange function", () => {
      const { result } = renderHook(() => useWorkflowChange(defaultProps));

      expect(result.current.handleWorkflowChange).toBeDefined();
      expect(typeof result.current.handleWorkflowChange).toBe("function");
    });

    it("should return syncAllTabsTeleporters function", () => {
      const { result } = renderHook(() => useWorkflowChange(defaultProps));

      expect(result.current.syncAllTabsTeleporters).toBeDefined();
      expect(typeof result.current.syncAllTabsTeleporters).toBe("function");
    });
  });

  describe("callback stability", () => {
    it("should return stable handleWorkflowChange reference", () => {
      const { result, rerender } = renderHook(() =>
        useWorkflowChange(defaultProps),
      );

      const firstRef = result.current.handleWorkflowChange;

      rerender();

      expect(result.current.handleWorkflowChange).toBe(firstRef);
    });

    it("should return stable syncAllTabsTeleporters reference", () => {
      const { result, rerender } = renderHook(() =>
        useWorkflowChange(defaultProps),
      );

      const firstRef = result.current.syncAllTabsTeleporters;

      rerender();

      expect(result.current.syncAllTabsTeleporters).toBe(firstRef);
    });
  });
});
