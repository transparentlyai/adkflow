import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useHomeState } from "@/hooks/home/useHomeState";

// Mock the context hooks
const mockTabsContext = {
  tabs: [],
  activeTabId: "tab-1",
  activeTab: {
    id: "tab-1",
    name: "Flow 1",
    hasUnsavedChanges: false,
    isLoading: false,
    order: 0,
  },
  initializeTabs: vi.fn(),
  createNewTab: vi.fn(),
  loadTabFlow: vi.fn(),
  saveTabFlow: vi.fn(),
  deleteTabById: vi.fn(),
  renameTabById: vi.fn(),
  duplicateTabById: vi.fn(),
  reorderTabsById: vi.fn(),
  setActiveTabId: vi.fn(),
  markTabDirty: vi.fn(),
  markTabClean: vi.fn(),
  setTabLoading: vi.fn(),
  pendingFocusNodeId: null,
  setPendingFocusNodeId: vi.fn(),
  navigateToNode: vi.fn(),
  clearTabs: vi.fn(),
};

const mockSyncTeleportersForTab = vi.fn();
const mockUpdateTabName = vi.fn();
const mockToggleTheme = vi.fn();

vi.mock("@/contexts/TabsContext", () => ({
  useTabs: () => mockTabsContext,
}));

vi.mock("@/contexts/TeleporterContext", () => ({
  useTeleporter: () => ({
    syncTeleportersForTab: mockSyncTeleportersForTab,
    updateTabName: mockUpdateTabName,
    teleporters: [],
    registerTeleporter: vi.fn(),
    unregisterTeleporter: vi.fn(),
    updateTeleporterName: vi.fn(),
    getTeleportersByName: vi.fn(() => []),
    getInputTeleportersByName: vi.fn(() => []),
    getOutputTeleportersByName: vi.fn(() => []),
    getAllInputTeleporters: vi.fn(() => []),
    getAllOutputTeleporters: vi.fn(() => []),
    getColorForName: vi.fn(() => "#000"),
    clearTeleporters: vi.fn(),
    clearTeleportersForTab: vi.fn(),
  }),
}));

vi.mock("@/contexts/ThemeContext", () => ({
  useTheme: () => ({
    themeId: "dark",
    toggleTheme: mockToggleTheme,
    theme: { id: "dark", name: "Dark" },
    builtInThemes: [],
    customThemes: [],
    allThemes: [],
    setTheme: vi.fn(),
    addCustomTheme: vi.fn(),
    removeCustomTheme: vi.fn(),
    exportCurrentTheme: vi.fn(),
    importTheme: vi.fn(),
    isReady: true,
  }),
}));

describe("useHomeState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initialization", () => {
    it("should initialize with default state values", () => {
      const { result } = renderHook(() => useHomeState());

      // Check grouped workflow state
      expect(result.current.workflow.name).toBe("Untitled Workflow");
      expect(result.current.workflow.isSessionLoaded).toBe(false);

      // Check grouped project state
      expect(result.current.project.path).toBeNull();
      expect(result.current.project.isSaved).toBe(true);
      expect(result.current.project.isSwitcherOpen).toBe(false);
      expect(result.current.project.switcherMode).toBe("open");
      expect(result.current.project.isSaveConfirmOpen).toBe(false);
      expect(result.current.project.showHomeScreen).toBe(false);
      expect(result.current.project.recentProjects).toEqual([]);
      expect(result.current.project.isSaving).toBe(false);

      // Check grouped dialog state
      expect(result.current.dialogs.prompt.isOpen).toBe(false);
      expect(result.current.dialogs.context.isOpen).toBe(false);
      expect(result.current.dialogs.tool.isOpen).toBe(false);
      expect(result.current.dialogs.process.isOpen).toBe(false);
      expect(result.current.dialogs.outputFile.isOpen).toBe(false);
      expect(result.current.dialogs.isClearOpen).toBe(false);

      // Check grouped run state
      expect(result.current.run.isPanelOpen).toBe(false);
      expect(result.current.run.currentId).toBeNull();
      expect(result.current.run.isRunning).toBe(false);
      expect(result.current.run.events).toEqual([]);
      expect(result.current.run.isConfirmDialogOpen).toBe(false);
      expect(result.current.run.lastStatus).toBe("pending");

      // Check grouped canvas state
      expect(result.current.canvas.isLocked).toBe(false);

      // Check grouped theme state
      expect(result.current.theme.id).toBe("dark");
    });

    it("should return context values from useTabs", () => {
      const { result } = renderHook(() => useHomeState());

      expect(result.current.tabsContext).toBe(mockTabsContext);
      expect(result.current.tabs.context).toBe(mockTabsContext);
    });

    it("should return teleporter functions", () => {
      const { result } = renderHook(() => useHomeState());

      expect(result.current.syncTeleportersForTab).toBe(
        mockSyncTeleportersForTab,
      );
      expect(result.current.updateTabName).toBe(mockUpdateTabName);
    });

    it("should return theme context values", () => {
      const { result } = renderHook(() => useHomeState());

      expect(result.current.themeId).toBe("dark");
      expect(result.current.toggleTheme).toBe(mockToggleTheme);
    });
  });

  describe("workflow state setters", () => {
    it("should update workflow name", () => {
      const { result } = renderHook(() => useHomeState());

      act(() => {
        result.current.setWorkflowName("My Workflow");
      });

      expect(result.current.workflowName).toBe("My Workflow");
      expect(result.current.workflow.name).toBe("My Workflow");
    });

    it("should update session loaded state", () => {
      const { result } = renderHook(() => useHomeState());

      act(() => {
        result.current.setIsSessionLoaded(true);
      });

      expect(result.current.isSessionLoaded).toBe(true);
      expect(result.current.workflow.isSessionLoaded).toBe(true);
    });
  });

  describe("project state setters", () => {
    it("should update current project path", () => {
      const { result } = renderHook(() => useHomeState());

      act(() => {
        result.current.setCurrentProjectPath("/path/to/project");
      });

      expect(result.current.currentProjectPath).toBe("/path/to/project");
      expect(result.current.project.path).toBe("/path/to/project");
    });

    it("should update project saved state", () => {
      const { result } = renderHook(() => useHomeState());

      act(() => {
        result.current.setIsProjectSaved(false);
      });

      expect(result.current.isProjectSaved).toBe(false);
      expect(result.current.project.isSaved).toBe(false);
    });

    it("should update project switcher open state", () => {
      const { result } = renderHook(() => useHomeState());

      act(() => {
        result.current.setIsProjectSwitcherOpen(true);
      });

      expect(result.current.isProjectSwitcherOpen).toBe(true);
      expect(result.current.project.isSwitcherOpen).toBe(true);
    });

    it("should update project switcher mode", () => {
      const { result } = renderHook(() => useHomeState());

      act(() => {
        result.current.setProjectSwitcherMode("create");
      });

      expect(result.current.projectSwitcherMode).toBe("create");
      expect(result.current.project.switcherMode).toBe("create");
    });

    it("should update save confirm dialog state", () => {
      const { result } = renderHook(() => useHomeState());

      act(() => {
        result.current.setIsSaveConfirmOpen(true);
      });

      expect(result.current.isSaveConfirmOpen).toBe(true);
      expect(result.current.project.isSaveConfirmOpen).toBe(true);
    });

    it("should update show home screen state", () => {
      const { result } = renderHook(() => useHomeState());

      act(() => {
        result.current.setShowHomeScreen(true);
      });

      expect(result.current.showHomeScreen).toBe(true);
      expect(result.current.project.showHomeScreen).toBe(true);
    });

    it("should update recent projects", () => {
      const { result } = renderHook(() => useHomeState());
      const projects = [
        { path: "/test", name: "Test", lastOpened: Date.now() },
      ];

      act(() => {
        result.current.setRecentProjects(projects);
      });

      expect(result.current.recentProjects).toEqual(projects);
      expect(result.current.project.recentProjects).toEqual(projects);
    });

    it("should update saving state", () => {
      const { result } = renderHook(() => useHomeState());

      act(() => {
        result.current.setIsSaving(true);
      });

      expect(result.current.isSaving).toBe(true);
      expect(result.current.project.isSaving).toBe(true);
    });
  });

  describe("dialog state setters", () => {
    it("should update prompt dialog state", () => {
      const { result } = renderHook(() => useHomeState());

      act(() => {
        result.current.setPromptDialogState({
          isOpen: true,
          position: { x: 100, y: 200 },
        });
      });

      expect(result.current.promptDialogState).toEqual({
        isOpen: true,
        position: { x: 100, y: 200 },
      });
      expect(result.current.dialogs.prompt).toEqual({
        isOpen: true,
        position: { x: 100, y: 200 },
      });
    });

    it("should update context dialog state", () => {
      const { result } = renderHook(() => useHomeState());

      act(() => {
        result.current.setContextDialogState({
          isOpen: true,
          position: { x: 50, y: 100 },
        });
      });

      expect(result.current.contextDialogState).toEqual({
        isOpen: true,
        position: { x: 50, y: 100 },
      });
      expect(result.current.dialogs.context).toEqual({
        isOpen: true,
        position: { x: 50, y: 100 },
      });
    });

    it("should update tool dialog state", () => {
      const { result } = renderHook(() => useHomeState());

      act(() => {
        result.current.setToolDialogState({ isOpen: true });
      });

      expect(result.current.toolDialogState).toEqual({ isOpen: true });
      expect(result.current.dialogs.tool).toEqual({ isOpen: true });
    });

    it("should update process dialog state", () => {
      const { result } = renderHook(() => useHomeState());

      act(() => {
        result.current.setProcessDialogState({ isOpen: true });
      });

      expect(result.current.processDialogState).toEqual({ isOpen: true });
      expect(result.current.dialogs.process).toEqual({ isOpen: true });
    });

    it("should update output file dialog state", () => {
      const { result } = renderHook(() => useHomeState());

      act(() => {
        result.current.setOutputFileDialogState({ isOpen: true });
      });

      expect(result.current.outputFileDialogState).toEqual({ isOpen: true });
      expect(result.current.dialogs.outputFile).toEqual({ isOpen: true });
    });

    it("should update clear dialog open state", () => {
      const { result } = renderHook(() => useHomeState());

      act(() => {
        result.current.setIsClearDialogOpen(true);
      });

      expect(result.current.isClearDialogOpen).toBe(true);
      expect(result.current.dialogs.isClearOpen).toBe(true);
    });

    it("should update file picker state", () => {
      const { result } = renderHook(() => useHomeState());
      const callback = vi.fn();

      act(() => {
        result.current.setFilePickerState({
          isOpen: true,
          initialPath: "/test",
          callback,
        });
      });

      expect(result.current.filePickerState).toEqual({
        isOpen: true,
        initialPath: "/test",
        callback,
      });
    });
  });

  describe("run state setters", () => {
    it("should update run panel open state", () => {
      const { result } = renderHook(() => useHomeState());

      act(() => {
        result.current.setIsRunPanelOpen(true);
      });

      expect(result.current.isRunPanelOpen).toBe(true);
      expect(result.current.run.isPanelOpen).toBe(true);
    });

    it("should update current run id", () => {
      const { result } = renderHook(() => useHomeState());

      act(() => {
        result.current.setCurrentRunId("run-123");
      });

      expect(result.current.currentRunId).toBe("run-123");
      expect(result.current.run.currentId).toBe("run-123");
    });

    it("should update running state", () => {
      const { result } = renderHook(() => useHomeState());

      act(() => {
        result.current.setIsRunning(true);
      });

      expect(result.current.isRunning).toBe(true);
      expect(result.current.run.isRunning).toBe(true);
    });

    it("should update run events", () => {
      const { result } = renderHook(() => useHomeState());
      const events = [
        {
          id: "1",
          type: "message" as const,
          message: "test",
          timestamp: Date.now(),
        },
      ];

      act(() => {
        result.current.setRunEvents(events);
      });

      expect(result.current.runEvents).toEqual(events);
      expect(result.current.run.events).toEqual(events);
    });

    it("should update run confirm dialog state", () => {
      const { result } = renderHook(() => useHomeState());

      act(() => {
        result.current.setIsRunConfirmDialogOpen(true);
      });

      expect(result.current.isRunConfirmDialogOpen).toBe(true);
      expect(result.current.run.isConfirmDialogOpen).toBe(true);
    });

    it("should update last run status", () => {
      const { result } = renderHook(() => useHomeState());

      act(() => {
        result.current.setLastRunStatus("success");
      });

      expect(result.current.lastRunStatus).toBe("success");
      expect(result.current.run.lastStatus).toBe("success");
    });
  });

  describe("canvas state setters", () => {
    it("should update canvas locked state", () => {
      const { result } = renderHook(() => useHomeState());

      act(() => {
        result.current.setIsCanvasLocked(true);
      });

      expect(result.current.isCanvasLocked).toBe(true);
      expect(result.current.canvas.isLocked).toBe(true);
    });
  });

  describe("topology and validation dialogs", () => {
    it("should update topology result", () => {
      const { result } = renderHook(() => useHomeState());
      const topology = { agents: [], edges: [] };

      act(() => {
        result.current.setTopologyResult(topology as any);
      });

      expect(result.current.topologyResult).toEqual(topology);
      expect(result.current.dialogs.topologyResult).toEqual(topology);
    });

    it("should update topology save dialog state", () => {
      const { result } = renderHook(() => useHomeState());

      act(() => {
        result.current.setIsTopologySaveDialogOpen(true);
      });

      expect(result.current.isTopologySaveDialogOpen).toBe(true);
      expect(result.current.dialogs.isTopologySaveOpen).toBe(true);
    });

    it("should update validation save dialog state", () => {
      const { result } = renderHook(() => useHomeState());

      act(() => {
        result.current.setIsValidationSaveDialogOpen(true);
      });

      expect(result.current.isValidationSaveDialogOpen).toBe(true);
      expect(result.current.dialogs.isValidationSaveOpen).toBe(true);
    });
  });

  describe("tab delete dialog", () => {
    it("should update tab delete dialog state", () => {
      const { result } = renderHook(() => useHomeState());

      act(() => {
        result.current.setIsTabDeleteDialogOpen(true);
      });

      expect(result.current.isTabDeleteDialogOpen).toBe(true);
      expect(result.current.dialogs.isTabDeleteOpen).toBe(true);
    });

    it("should update pending delete tab id", () => {
      const { result } = renderHook(() => useHomeState());

      act(() => {
        result.current.setPendingDeleteTabId("tab-to-delete");
      });

      expect(result.current.pendingDeleteTabId).toBe("tab-to-delete");
      expect(result.current.dialogs.pendingDeleteTabId).toBe("tab-to-delete");
    });
  });

  describe("project settings", () => {
    it("should update project settings open state", () => {
      const { result } = renderHook(() => useHomeState());

      act(() => {
        result.current.setIsProjectSettingsOpen(true);
      });

      expect(result.current.isProjectSettingsOpen).toBe(true);
      expect(result.current.project.isSettingsOpen).toBe(true);
    });

    it("should update settings refresh key", () => {
      const { result } = renderHook(() => useHomeState());

      act(() => {
        result.current.setSettingsRefreshKey(1);
      });

      expect(result.current.settingsRefreshKey).toBe(1);
      expect(result.current.project.settingsRefreshKey).toBe(1);
    });
  });

  describe("refs", () => {
    it("should provide canvas ref", () => {
      const { result } = renderHook(() => useHomeState());

      expect(result.current.canvasRef).toBeDefined();
      expect(result.current.canvasRef.current).toBeNull();
      expect(result.current.workflow.canvasRef).toBeDefined();
    });

    it("should provide active tab ref that updates with context", () => {
      const { result } = renderHook(() => useHomeState());

      expect(result.current.activeTabRef).toBeDefined();
      expect(result.current.activeTabRef.current).toEqual(
        mockTabsContext.activeTab,
      );
    });

    it("should provide loaded tab id ref", () => {
      const { result } = renderHook(() => useHomeState());

      expect(result.current.loadedTabIdRef).toBeDefined();
      expect(result.current.loadedTabIdRef.current).toBeNull();
    });

    it("should provide restoring flow ref", () => {
      const { result } = renderHook(() => useHomeState());

      expect(result.current.isRestoringFlowRef).toBeDefined();
      expect(result.current.isRestoringFlowRef.current).toBe(false);
    });

    it("should provide tab flow cache ref", () => {
      const { result } = renderHook(() => useHomeState());

      expect(result.current.tabFlowCacheRef).toBeDefined();
      expect(result.current.tabFlowCacheRef.current).toBeInstanceOf(Map);
      expect(result.current.tabFlowCacheRef.current.size).toBe(0);
    });

    it("should provide pending focus node id ref", () => {
      const { result } = renderHook(() => useHomeState());

      expect(result.current.pendingFocusNodeIdRef).toBeDefined();
      expect(result.current.pendingFocusNodeIdRef.current).toBeNull();
    });

    it("should provide has synced all tabs ref", () => {
      const { result } = renderHook(() => useHomeState());

      expect(result.current.hasSyncedAllTabsRef).toBeDefined();
      expect(result.current.hasSyncedAllTabsRef.current).toBe(false);
    });
  });

  describe("hasUnsavedChanges derived state", () => {
    it("should return hasUnsavedChanges from active tab", () => {
      const { result } = renderHook(() => useHomeState());

      // Default mock has hasUnsavedChanges: false
      expect(result.current.hasUnsavedChanges).toBe(false);
      expect(result.current.project.hasUnsavedChanges).toBe(false);
    });
  });
});
