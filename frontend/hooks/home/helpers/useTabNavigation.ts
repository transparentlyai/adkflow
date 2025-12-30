import { useCallback, useEffect } from "react";
import type { Node, Edge } from "@xyflow/react";
import type { ReactFlowCanvasRef } from "@/components/ReactFlowCanvas";
import type { TabState } from "@/lib/types";

interface UseTabNavigationProps {
  canvasRef: React.RefObject<ReactFlowCanvasRef | null>;
  loadedTabIdRef: React.MutableRefObject<string | null>;
  tabFlowCacheRef: React.MutableRefObject<
    Map<
      string,
      {
        nodes: Node[];
        edges: Edge[];
        viewport: { x: number; y: number; zoom: number };
      }
    >
  >;
  pendingFocusNodeIdRef: React.MutableRefObject<string | null>;
  currentProjectPath: string | null;
  tabs: TabState[];
  activeTabId: string | null;
  pendingFocusNodeId: string | null;
  setActiveTabId: (id: string) => void;
  setPendingFocusNodeId: (id: string | null) => void;
  loadTabFlow: (
    projectPath: string,
    tabId: string,
  ) => Promise<{
    nodes: Node[];
    edges: Edge[];
    viewport: { x: number; y: number; zoom: number };
  } | null>;
  syncTeleportersForTab: (
    tabId: string,
    tabName: string,
    nodes: Node[],
  ) => void;
}

export function useTabNavigation({
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
}: UseTabNavigationProps) {
  const handleTabClick = useCallback(
    async (tabId: string) => {
      if (!currentProjectPath) return;
      if (tabId === loadedTabIdRef.current) return;

      // 1. Save current tab's flow to cache before switching
      if (canvasRef.current && loadedTabIdRef.current) {
        const currentFlow = canvasRef.current.saveFlow();
        if (currentFlow) {
          tabFlowCacheRef.current.set(loadedTabIdRef.current, currentFlow);
        }
      }

      // 2. Update loadedTabIdRef FIRST to prevent race conditions
      // This ensures any workflow change events use the correct tab
      loadedTabIdRef.current = tabId;

      // 3. Restore target tab's flow
      const cachedFlow = tabFlowCacheRef.current.get(tabId);
      if (cachedFlow && canvasRef.current) {
        canvasRef.current.restoreFlow(cachedFlow);
        const tab = tabs.find((t) => t.id === tabId);
        if (tab) {
          syncTeleportersForTab(tabId, tab.name, cachedFlow.nodes);
        }
      } else {
        const flow = await loadTabFlow(currentProjectPath, tabId);
        if (flow && canvasRef.current) {
          canvasRef.current.restoreFlow(flow);
          const tab = tabs.find((t) => t.id === tabId);
          if (tab) {
            syncTeleportersForTab(tabId, tab.name, flow.nodes);
          }
        }
      }

      // 4. Update React state LAST, after canvas is ready
      // This prevents state mismatches during the switch
      setActiveTabId(tabId);
    },
    [
      currentProjectPath,
      canvasRef,
      loadedTabIdRef,
      tabFlowCacheRef,
      tabs,
      setActiveTabId,
      loadTabFlow,
      syncTeleportersForTab,
    ],
  );

  useEffect(() => {
    if (!pendingFocusNodeId || !currentProjectPath || !activeTabId) return;
    if (pendingFocusNodeIdRef.current === pendingFocusNodeId) return;
    pendingFocusNodeIdRef.current = pendingFocusNodeId;

    const handlePendingFocus = async () => {
      const targetTabId = activeTabId;
      const sourceTabId = loadedTabIdRef.current;
      const nodeIdToFocus = pendingFocusNodeId;

      if (targetTabId !== sourceTabId) {
        if (sourceTabId && canvasRef.current) {
          const currentFlow = canvasRef.current.saveFlow();
          if (currentFlow) {
            tabFlowCacheRef.current.set(sourceTabId, currentFlow);
          }
        }

        const cachedFlow = tabFlowCacheRef.current.get(targetTabId);
        if (cachedFlow && canvasRef.current) {
          canvasRef.current.restoreFlow(cachedFlow);
          loadedTabIdRef.current = targetTabId;
          setTimeout(() => {
            canvasRef.current?.focusNode(nodeIdToFocus);
          }, 150);
        } else {
          const flow = await loadTabFlow(currentProjectPath, targetTabId);
          if (flow && canvasRef.current) {
            canvasRef.current.restoreFlow(flow);
            loadedTabIdRef.current = targetTabId;
            setTimeout(() => {
              canvasRef.current?.focusNode(nodeIdToFocus);
            }, 150);
          }
        }
      } else {
        canvasRef.current?.focusNode(nodeIdToFocus);
      }

      setPendingFocusNodeId(null);
      pendingFocusNodeIdRef.current = null;
    };

    handlePendingFocus();
  }, [
    pendingFocusNodeId,
    currentProjectPath,
    activeTabId,
    canvasRef,
    loadedTabIdRef,
    tabFlowCacheRef,
    pendingFocusNodeIdRef,
    loadTabFlow,
    setPendingFocusNodeId,
  ]);

  return { handleTabClick };
}
