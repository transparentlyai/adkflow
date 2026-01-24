import { vi } from "vitest";
import type { TabState } from "@/lib/types";

// Mock the useTabNavigation helper
export const mockHandleTabClick = vi.fn();

export const createMockCanvasRef = () => ({
  current: {
    saveFlow: vi.fn(() => ({
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    })),
    clearCanvas: vi.fn(),
    restoreFlow: vi.fn(),
  },
});

export const createMockRefs = () => ({
  loadedTabIdRef: { current: "tab-1" },
  isRestoringFlowRef: { current: false },
  tabFlowCacheRef: { current: new Map() },
  pendingFocusNodeIdRef: { current: null as string | null },
});

export const mockTabs: TabState[] = [
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

export const createMockFunctions = () => ({
  createNewTab: vi.fn(),
  deleteTabById: vi.fn(),
  renameTabById: vi.fn(),
  reorderTabsById: vi.fn(),
  duplicateTabById: vi.fn(),
  saveTabFlow: vi.fn(),
  setIsTabDeleteDialogOpen: vi.fn(),
  setPendingDeleteTabId: vi.fn(),
  updateTabName: vi.fn(),
  setActiveTabId: vi.fn(),
  setPendingFocusNodeId: vi.fn(),
  loadTabFlow: vi.fn(),
  syncTeleportersForTab: vi.fn(),
});

export type MockFunctions = ReturnType<typeof createMockFunctions>;

export const createDefaultProps = (
  canvasRef: ReturnType<typeof createMockCanvasRef>,
  refs: ReturnType<typeof createMockRefs>,
  mocks: MockFunctions,
) => ({
  canvasRef: canvasRef as any,
  loadedTabIdRef: refs.loadedTabIdRef as any,
  isRestoringFlowRef: refs.isRestoringFlowRef as any,
  tabFlowCacheRef: refs.tabFlowCacheRef as any,
  pendingFocusNodeIdRef: refs.pendingFocusNodeIdRef as any,
  currentProjectPath: "/path/to/project",
  tabs: mockTabs,
  activeTabId: "tab-1",
  activeTab: mockTabs[0],
  pendingFocusNodeId: null,
  setActiveTabId: mocks.setActiveTabId,
  setPendingFocusNodeId: mocks.setPendingFocusNodeId,
  loadTabFlow: mocks.loadTabFlow,
  saveTabFlow: mocks.saveTabFlow,
  createNewTab: mocks.createNewTab,
  deleteTabById: mocks.deleteTabById,
  renameTabById: mocks.renameTabById,
  reorderTabsById: mocks.reorderTabsById,
  duplicateTabById: mocks.duplicateTabById,
  syncTeleportersForTab: mocks.syncTeleportersForTab,
  updateTabName: mocks.updateTabName,
  isTabDeleteDialogOpen: false,
  setIsTabDeleteDialogOpen: mocks.setIsTabDeleteDialogOpen,
  pendingDeleteTabId: null,
  setPendingDeleteTabId: mocks.setPendingDeleteTabId,
});

export const setupDefaultMockResolvers = (mocks: MockFunctions) => {
  mocks.createNewTab.mockResolvedValue({ id: "new-tab", name: "Flow 3" });
  mocks.deleteTabById.mockResolvedValue(true);
  mocks.renameTabById.mockResolvedValue(true);
  mocks.reorderTabsById.mockResolvedValue(true);
  mocks.duplicateTabById.mockResolvedValue({
    id: "dup-tab",
    name: "Flow 1 Copy",
  });
  mocks.saveTabFlow.mockResolvedValue(true);
};
