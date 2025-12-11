"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { flushSync } from "react-dom";
import type { Node, Edge } from "@xyflow/react";
import { listTabs, createTab, loadTab, saveTab, deleteTab, renameTab, duplicateTab, reorderTabs } from "@/lib/api";
import type { TabMetadata, TabState } from "@/lib/types";

interface ReactFlowJSON {
  nodes: Node[];
  edges: Edge[];
  viewport: { x: number; y: number; zoom: number };
}

interface TabsContextValue {
  // Tab list
  tabs: TabState[];
  activeTabId: string | null;
  activeTab: TabState | null;

  // Initialization
  initializeTabs: (projectPath: string) => Promise<TabMetadata | null>;

  // Tab operations
  createNewTab: (projectPath: string, name?: string) => Promise<TabMetadata | null>;
  loadTabFlow: (projectPath: string, tabId: string) => Promise<ReactFlowJSON | null>;
  saveTabFlow: (projectPath: string, tabId: string, flow: ReactFlowJSON) => Promise<boolean>;
  deleteTabById: (projectPath: string, tabId: string) => Promise<boolean>;
  renameTabById: (projectPath: string, tabId: string, name: string) => Promise<boolean>;
  duplicateTabById: (projectPath: string, tabId: string) => Promise<TabMetadata | null>;
  reorderTabsById: (projectPath: string, tabIds: string[]) => Promise<boolean>;

  // Active tab management
  setActiveTabId: (tabId: string) => void;
  markTabDirty: (tabId: string) => void;
  markTabClean: (tabId: string) => void;
  setTabLoading: (tabId: string, loading: boolean) => void;

  // Utility
  clearTabs: () => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

export function TabsProvider({ children }: { children: ReactNode }) {
  const [tabs, setTabs] = useState<TabState[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  // Get active tab
  const activeTab = tabs.find((t) => t.id === activeTabId) || null;

  // Initialize tabs for a project
  const initializeTabs = useCallback(async (projectPath: string): Promise<TabMetadata | null> => {
    try {
      const response = await listTabs(projectPath);
      const tabStates: TabState[] = response.tabs.map((tab) => ({
        ...tab,
        hasUnsavedChanges: false,
        isLoading: false,
      }));
      setTabs(tabStates);

      // Set first tab as active
      if (tabStates.length > 0) {
        setActiveTabId(tabStates[0].id);
        return tabStates[0];
      }
      return null;
    } catch (error) {
      console.error("Failed to initialize tabs:", error);
      return null;
    }
  }, []);

  // Create new tab
  const createNewTab = useCallback(async (projectPath: string, name: string = "Untitled"): Promise<TabMetadata | null> => {
    try {
      const response = await createTab(projectPath, name);
      const newTabState: TabState = {
        ...response.tab,
        hasUnsavedChanges: false,
        isLoading: false,
      };
      // Use flushSync to ensure state updates are committed synchronously
      // This ensures the UI reflects the new active tab immediately
      flushSync(() => {
        setTabs((prev) => [...prev, newTabState]);
        setActiveTabId(newTabState.id);
      });
      return response.tab;
    } catch (error) {
      console.error("Failed to create tab:", error);
      return null;
    }
  }, []);

  // Load tab flow
  const loadTabFlow = useCallback(async (projectPath: string, tabId: string): Promise<ReactFlowJSON | null> => {
    setTabs((prev) => prev.map((t) => t.id === tabId ? { ...t, isLoading: true } : t));
    try {
      const response = await loadTab(projectPath, tabId);
      setTabs((prev) => prev.map((t) => t.id === tabId ? { ...t, isLoading: false } : t));
      return response.flow;
    } catch (error) {
      console.error("Failed to load tab:", error);
      setTabs((prev) => prev.map((t) => t.id === tabId ? { ...t, isLoading: false } : t));
      return null;
    }
  }, []);

  // Save tab flow
  const saveTabFlow = useCallback(async (projectPath: string, tabId: string, flow: ReactFlowJSON): Promise<boolean> => {
    try {
      await saveTab(projectPath, tabId, flow);
      setTabs((prev) => prev.map((t) => t.id === tabId ? { ...t, hasUnsavedChanges: false } : t));
      return true;
    } catch (error) {
      console.error("Failed to save tab:", error);
      return false;
    }
  }, []);

  // Delete tab
  const deleteTabById = useCallback(async (projectPath: string, tabId: string): Promise<boolean> => {
    if (tabs.length <= 1) return false; // Prevent deleting last tab

    try {
      await deleteTab(projectPath, tabId);
      setTabs((prev) => {
        const newTabs = prev.filter((t) => t.id !== tabId);
        // Update order for remaining tabs
        return newTabs.map((t, i) => ({ ...t, order: i }));
      });

      // If deleted tab was active, switch to another
      if (activeTabId === tabId) {
        const remaining = tabs.filter((t) => t.id !== tabId);
        if (remaining.length > 0) {
          setActiveTabId(remaining[0].id);
        }
      }
      return true;
    } catch (error) {
      console.error("Failed to delete tab:", error);
      return false;
    }
  }, [tabs, activeTabId]);

  // Rename tab
  const renameTabById = useCallback(async (projectPath: string, tabId: string, name: string): Promise<boolean> => {
    try {
      await renameTab(projectPath, tabId, name);
      setTabs((prev) => prev.map((t) => t.id === tabId ? { ...t, name } : t));
      return true;
    } catch (error) {
      console.error("Failed to rename tab:", error);
      return false;
    }
  }, []);

  // Duplicate tab
  const duplicateTabById = useCallback(async (projectPath: string, tabId: string): Promise<TabMetadata | null> => {
    try {
      const response = await duplicateTab(projectPath, tabId);
      const newTabState: TabState = {
        ...response.tab,
        hasUnsavedChanges: false,
        isLoading: false,
      };
      setTabs((prev) => [...prev, newTabState]);
      setActiveTabId(newTabState.id);
      return response.tab;
    } catch (error) {
      console.error("Failed to duplicate tab:", error);
      return null;
    }
  }, []);

  // Reorder tabs (optimistic update - UI updates immediately, API call in background)
  const reorderTabsById = useCallback(async (projectPath: string, tabIds: string[]): Promise<boolean> => {
    // Optimistic update - update UI immediately
    setTabs((prev) => {
      const reordered = tabIds.map((id, index) => {
        const tab = prev.find((t) => t.id === id);
        return tab ? { ...tab, order: index } : null;
      }).filter((t): t is TabState => t !== null);
      return reordered;
    });

    reorderTabs(projectPath, tabIds).catch((error) => {
      console.error("Failed to sync tab reorder to backend:", error);
    });

    return true;
  }, []);

  // Mark tab as having unsaved changes
  const markTabDirty = useCallback((tabId: string) => {
    setTabs((prev) => prev.map((t) => t.id === tabId ? { ...t, hasUnsavedChanges: true } : t));
  }, []);

  // Mark tab as saved
  const markTabClean = useCallback((tabId: string) => {
    setTabs((prev) => prev.map((t) => t.id === tabId ? { ...t, hasUnsavedChanges: false } : t));
  }, []);

  // Set tab loading state
  const setTabLoading = useCallback((tabId: string, loading: boolean) => {
    setTabs((prev) => prev.map((t) => t.id === tabId ? { ...t, isLoading: loading } : t));
  }, []);

  // Clear all tabs (on project close)
  const clearTabs = useCallback(() => {
    setTabs([]);
    setActiveTabId(null);
  }, []);

  return (
    <TabsContext.Provider
      value={{
        tabs,
        activeTabId,
        activeTab,
        initializeTabs,
        createNewTab,
        loadTabFlow,
        saveTabFlow,
        deleteTabById,
        renameTabById,
        duplicateTabById,
        reorderTabsById,
        setActiveTabId,
        markTabDirty,
        markTabClean,
        setTabLoading,
        clearTabs,
      }}
    >
      {children}
    </TabsContext.Provider>
  );
}

export function useTabs() {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error("useTabs must be used within TabsProvider");
  }
  return context;
}
