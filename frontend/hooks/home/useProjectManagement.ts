import { useCallback } from "react";
import type { Node, Edge } from "@xyflow/react";
import type { ReactFlowCanvasRef } from "@/components/ReactFlowCanvas";
import type { RecentProject } from "@/lib/recentProjects";
import { getRecentProjects, removeRecentProject } from "@/lib/recentProjects";
import { useProjectCreate } from "./helpers/useProjectCreate";
import { useProjectLoad } from "./helpers/useProjectLoad";

interface UseProjectManagementProps {
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
  currentProjectPath: string | null;
  workflowName: string;
  activeTabId: string | null;
  hasUnsavedChanges: boolean;
  setCurrentProjectPath: (path: string | null) => void;
  setWorkflowName: (name: string) => void;
  setIsProjectSwitcherOpen: (open: boolean) => void;
  setShowHomeScreen: (show: boolean) => void;
  setIsProjectSaved: (saved: boolean) => void;
  setRecentProjects: (projects: RecentProject[]) => void;
  setIsSaving: (saving: boolean) => void;
  setIsSaveConfirmOpen: (open: boolean) => void;
  setProjectSwitcherMode: (mode: "create" | "open") => void;
  initializeTabs: (projectPath: string) => Promise<{
    projectName: string;
    firstTab: { id: string; name: string } | null;
  } | null>;
  createNewTab: (
    projectPath: string,
    name: string,
  ) => Promise<{ id: string; name: string } | null>;
  loadTabFlow: (
    projectPath: string,
    tabId: string,
  ) => Promise<{
    nodes: Node[];
    edges: Edge[];
    viewport: { x: number; y: number; zoom: number };
  } | null>;
  saveTabFlow: (
    projectPath: string,
    tabId: string,
    flow: {
      nodes: Node[];
      edges: Edge[];
      viewport: { x: number; y: number; zoom: number };
    },
    projectName?: string,
  ) => Promise<boolean>;
  syncTeleportersForTab: (
    tabId: string,
    tabName: string,
    nodes: Node[],
  ) => void;
}

export function useProjectManagement({
  canvasRef,
  loadedTabIdRef,
  tabFlowCacheRef,
  currentProjectPath,
  workflowName,
  activeTabId,
  hasUnsavedChanges,
  setCurrentProjectPath,
  setWorkflowName,
  setIsProjectSwitcherOpen,
  setShowHomeScreen,
  setIsProjectSaved,
  setRecentProjects,
  setIsSaving,
  setIsSaveConfirmOpen,
  setProjectSwitcherMode,
  initializeTabs,
  createNewTab,
  loadTabFlow,
  saveTabFlow,
  syncTeleportersForTab,
}: UseProjectManagementProps) {
  const { handleCreateNewProject } = useProjectCreate({
    canvasRef,
    loadedTabIdRef,
    setCurrentProjectPath,
    setWorkflowName,
    setIsProjectSwitcherOpen,
    setShowHomeScreen,
    setRecentProjects,
    initializeTabs,
    createNewTab,
    loadTabFlow,
    syncTeleportersForTab,
  });

  const { handleLoadExistingProject } = useProjectLoad({
    canvasRef,
    loadedTabIdRef,
    setCurrentProjectPath,
    setWorkflowName,
    setIsProjectSwitcherOpen,
    setShowHomeScreen,
    setIsProjectSaved,
    setRecentProjects,
    initializeTabs,
    createNewTab,
    loadTabFlow,
    syncTeleportersForTab,
  });

  const handleSaveCurrentProject = useCallback(async () => {
    if (!currentProjectPath || !activeTabId) {
      alert("No project or tab loaded. Please create or load a project first.");
      return;
    }

    setIsSaving(true);
    try {
      const flow = canvasRef.current?.saveFlow();
      if (!flow) {
        alert("No flow data to save.");
        return;
      }

      const success = await saveTabFlow(
        currentProjectPath,
        activeTabId,
        flow,
        workflowName,
      );
      if (success) {
        setIsProjectSaved(true);
        tabFlowCacheRef.current.delete(activeTabId);
      } else {
        alert("Failed to save tab.");
      }
    } catch (error) {
      console.error("Error saving project:", error);
      alert("Failed to save project: " + (error as Error).message);
    } finally {
      setIsSaving(false);
    }
  }, [
    currentProjectPath,
    activeTabId,
    workflowName,
    canvasRef,
    tabFlowCacheRef,
    setIsSaving,
    setIsProjectSaved,
    saveTabFlow,
  ]);

  const handleNewProject = useCallback(() => {
    setProjectSwitcherMode("create");
    if (hasUnsavedChanges) {
      setIsSaveConfirmOpen(true);
    } else {
      setIsProjectSwitcherOpen(true);
    }
  }, [
    hasUnsavedChanges,
    setProjectSwitcherMode,
    setIsSaveConfirmOpen,
    setIsProjectSwitcherOpen,
  ]);

  const handleLoadProject = useCallback(() => {
    setProjectSwitcherMode("open");
    if (hasUnsavedChanges) {
      setIsSaveConfirmOpen(true);
    } else {
      setIsProjectSwitcherOpen(true);
    }
  }, [
    hasUnsavedChanges,
    setProjectSwitcherMode,
    setIsSaveConfirmOpen,
    setIsProjectSwitcherOpen,
  ]);

  const handleSaveAndContinue = useCallback(async () => {
    await handleSaveCurrentProject();
    setIsSaveConfirmOpen(false);
    setIsProjectSwitcherOpen(true);
  }, [
    handleSaveCurrentProject,
    setIsSaveConfirmOpen,
    setIsProjectSwitcherOpen,
  ]);

  const handleDontSave = useCallback(() => {
    setIsSaveConfirmOpen(false);
    setIsProjectSwitcherOpen(true);
  }, [setIsSaveConfirmOpen, setIsProjectSwitcherOpen]);

  const handleRemoveRecentProject = useCallback(
    (path: string) => {
      removeRecentProject(path);
      setRecentProjects(getRecentProjects());
    },
    [setRecentProjects],
  );

  const handleCancelNewProject = useCallback(() => {
    setIsSaveConfirmOpen(false);
  }, [setIsSaveConfirmOpen]);

  return {
    handleCreateNewProject,
    handleLoadExistingProject,
    handleSaveCurrentProject,
    handleNewProject,
    handleLoadProject,
    handleSaveAndContinue,
    handleDontSave,
    handleRemoveRecentProject,
    handleCancelNewProject,
  };
}
