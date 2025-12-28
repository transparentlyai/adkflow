import { useCallback } from "react";
import type { Node, Edge } from "@xyflow/react";
import type { ReactFlowCanvasRef } from "@/components/ReactFlowCanvas";
import type { TabState } from "@/lib/types";
import { useTabNavigation } from "./helpers/useTabNavigation";

interface UseTabHandlersProps {
  canvasRef: React.RefObject<ReactFlowCanvasRef | null>;
  loadedTabIdRef: React.MutableRefObject<string | null>;
  tabFlowCacheRef: React.MutableRefObject<
    Map<
      string,
      { nodes: Node[]; edges: Edge[]; viewport: { x: number; y: number; zoom: number } }
    >
  >;
  pendingFocusNodeIdRef: React.MutableRefObject<string | null>;
  currentProjectPath: string | null;
  tabs: TabState[];
  activeTabId: string | null;
  activeTab: TabState | null;
  pendingFocusNodeId: string | null;
  setActiveTabId: (id: string) => void;
  setPendingFocusNodeId: (id: string | null) => void;
  loadTabFlow: (
    projectPath: string,
    tabId: string
  ) => Promise<{
    nodes: Node[];
    edges: Edge[];
    viewport: { x: number; y: number; zoom: number };
  } | null>;
  saveTabFlow: (
    projectPath: string,
    tabId: string,
    flow: { nodes: Node[]; edges: Edge[]; viewport: { x: number; y: number; zoom: number } },
    projectName?: string
  ) => Promise<boolean>;
  createNewTab: (
    projectPath: string,
    name: string
  ) => Promise<{ id: string; name: string } | null>;
  deleteTabById: (projectPath: string, tabId: string) => Promise<boolean>;
  renameTabById: (projectPath: string, tabId: string, name: string) => Promise<boolean>;
  reorderTabsById: (projectPath: string, tabIds: string[]) => Promise<boolean>;
  duplicateTabById: (projectPath: string, tabId: string) => Promise<{ id: string; name: string } | null>;
  syncTeleportersForTab: (tabId: string, tabName: string, nodes: Node[]) => void;
  updateTabName: (tabId: string, name: string) => void;

  isTabDeleteDialogOpen: boolean;
  setIsTabDeleteDialogOpen: (open: boolean) => void;
  pendingDeleteTabId: string | null;
  setPendingDeleteTabId: (id: string | null) => void;
}

export function useTabHandlers({
  canvasRef,
  loadedTabIdRef,
  tabFlowCacheRef,
  pendingFocusNodeIdRef,
  currentProjectPath,
  tabs,
  activeTabId,
  activeTab,
  pendingFocusNodeId,
  setActiveTabId,
  setPendingFocusNodeId,
  loadTabFlow,
  saveTabFlow,
  createNewTab,
  deleteTabById,
  renameTabById,
  reorderTabsById,
  duplicateTabById,
  syncTeleportersForTab,
  updateTabName,
  setIsTabDeleteDialogOpen,
  pendingDeleteTabId,
  setPendingDeleteTabId,
}: UseTabHandlersProps) {
  const { handleTabClick } = useTabNavigation({
    canvasRef,
    loadedTabIdRef,
    tabFlowCacheRef,
    pendingFocusNodeIdRef,
    currentProjectPath,
    tabs,
    activeTabId,
    pendingFocusNodeId,
    setActiveTabId,
    setPendingFocusNodeId,
    loadTabFlow,
    syncTeleportersForTab,
  });

  const handleAddTab = useCallback(async () => {
    if (!currentProjectPath) return;

    if (activeTab?.hasUnsavedChanges && canvasRef.current && activeTabId) {
      const flow = canvasRef.current.saveFlow();
      if (flow) {
        await saveTabFlow(currentProjectPath, activeTabId, flow);
      }
    }

    const tab = await createNewTab(currentProjectPath, `Flow ${tabs.length + 1}`);
    if (tab && canvasRef.current) {
      canvasRef.current.clearCanvas();
    }
  }, [
    currentProjectPath,
    tabs.length,
    activeTab,
    activeTabId,
    canvasRef,
    saveTabFlow,
    createNewTab,
  ]);

  const handleTabDelete = useCallback(
    (tabId: string) => {
      if (!currentProjectPath || tabs.length <= 1) return;
      setPendingDeleteTabId(tabId);
      setIsTabDeleteDialogOpen(true);
    },
    [currentProjectPath, tabs.length, setPendingDeleteTabId, setIsTabDeleteDialogOpen]
  );

  const handleTabDeleteConfirm = useCallback(async () => {
    if (!currentProjectPath || !pendingDeleteTabId) return;
    await deleteTabById(currentProjectPath, pendingDeleteTabId);
    setIsTabDeleteDialogOpen(false);
    setPendingDeleteTabId(null);
  }, [
    currentProjectPath,
    pendingDeleteTabId,
    deleteTabById,
    setIsTabDeleteDialogOpen,
    setPendingDeleteTabId,
  ]);

  const handleTabDeleteCancel = useCallback(() => {
    setIsTabDeleteDialogOpen(false);
    setPendingDeleteTabId(null);
  }, [setIsTabDeleteDialogOpen, setPendingDeleteTabId]);

  const handleTabRename = useCallback(
    async (tabId: string, name: string) => {
      if (!currentProjectPath) return;
      await renameTabById(currentProjectPath, tabId, name);
      updateTabName(tabId, name);
    },
    [currentProjectPath, renameTabById, updateTabName]
  );

  const handleTabReorder = useCallback(
    async (tabIds: string[]) => {
      if (!currentProjectPath) return;
      await reorderTabsById(currentProjectPath, tabIds);
    },
    [currentProjectPath, reorderTabsById]
  );

  const handleDuplicateTab = useCallback(
    async (tabId: string) => {
      if (!currentProjectPath) return;
      await duplicateTabById(currentProjectPath, tabId);
    },
    [currentProjectPath, duplicateTabById]
  );

  return {
    handleTabClick,
    handleAddTab,
    handleTabDelete,
    handleTabDeleteConfirm,
    handleTabDeleteCancel,
    handleTabRename,
    handleTabReorder,
    handleDuplicateTab,
  };
}
