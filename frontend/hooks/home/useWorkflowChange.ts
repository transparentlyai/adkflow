import { useCallback, useEffect, useRef } from "react";
import type { Node, Edge } from "@xyflow/react";
import type { TabState } from "@/lib/types";

interface UseWorkflowChangeProps {
  activeTabRef: React.MutableRefObject<TabState | null>;
  isRestoringFlowRef: React.MutableRefObject<boolean>;
  hasSyncedAllTabsRef: React.MutableRefObject<boolean>;
  tabs: TabState[];
  activeTabId: string | null;
  currentProjectPath: string | null;
  markTabDirty: (tabId: string) => void;
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

export function useWorkflowChange({
  activeTabRef,
  isRestoringFlowRef,
  hasSyncedAllTabsRef,
  tabs,
  activeTabId,
  currentProjectPath,
  markTabDirty,
  loadTabFlow,
  syncTeleportersForTab,
}: UseWorkflowChangeProps) {
  const handleWorkflowChange = useCallback(
    (data: { nodes: Node[]; edges: Edge[] }) => {
      // Skip marking dirty during flow restore (tab switching)
      if (isRestoringFlowRef.current) {
        return;
      }

      const tab = activeTabRef.current;
      const tabId = tab?.id;
      if (tabId && tab) {
        markTabDirty(tabId);
        syncTeleportersForTab(tabId, tab.name, data.nodes);
      }
    },
    [activeTabRef, isRestoringFlowRef, markTabDirty, syncTeleportersForTab],
  );

  const syncAllTabsTeleporters = useCallback(
    async (projectPath: string, allTabs: TabState[]) => {
      for (const tab of allTabs) {
        const flow = await loadTabFlow(projectPath, tab.id);
        if (flow) {
          syncTeleportersForTab(tab.id, tab.name, flow.nodes);
        }
      }
    },
    [loadTabFlow, syncTeleportersForTab],
  );

  // Sync all tabs' teleporters on initial load
  useEffect(() => {
    if (tabs.length > 0 && currentProjectPath && !hasSyncedAllTabsRef.current) {
      hasSyncedAllTabsRef.current = true;
      syncAllTabsTeleporters(
        currentProjectPath,
        tabs.filter((t) => t.id !== activeTabId),
      );
    }
  }, [
    tabs,
    currentProjectPath,
    activeTabId,
    hasSyncedAllTabsRef,
    syncAllTabsTeleporters,
  ]);

  // Reset sync flag when project changes
  useEffect(() => {
    hasSyncedAllTabsRef.current = false;
  }, [currentProjectPath, hasSyncedAllTabsRef]);

  return {
    handleWorkflowChange,
    syncAllTabsTeleporters,
  };
}
