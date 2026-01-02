import { useState, useRef } from "react";
import type { Node, Edge } from "@xyflow/react";
import type { ReactFlowCanvasRef } from "@/components/ReactFlowCanvas";
import type { RecentProject } from "@/lib/recentProjects";
import type { DisplayEvent } from "@/components/RunPanel";
import type { RunStatus, TopologyResponse } from "@/lib/types";
import type { FilePickerOptions } from "@/contexts/ProjectContext";
import { useTabs } from "@/contexts/TabsContext";
import { useTeleporter } from "@/contexts/TeleporterContext";
import { useTheme } from "@/contexts/ThemeContext";

export interface FilePickerState {
  isOpen: boolean;
  initialPath?: string;
  callback: ((newPath: string) => void) | null;
  options?: FilePickerOptions;
}

export interface NodeCreationDialogState {
  isOpen: boolean;
  position?: { x: number; y: number };
}

export function useHomeState() {
  // Context hooks
  const tabsContext = useTabs();
  const { syncTeleportersForTab, updateTabName } = useTeleporter();
  const { themeId, toggleTheme } = useTheme();

  // Core workflow state
  const [workflowName, setWorkflowName] = useState("Untitled Workflow");
  const canvasRef = useRef<ReactFlowCanvasRef>(null);

  // Refs to avoid dependency loops in handleWorkflowChange
  const activeTabRef = useRef(tabsContext.activeTab);
  activeTabRef.current = tabsContext.activeTab;

  // Track which tab's flow is currently loaded on the canvas
  const loadedTabIdRef = useRef<string | null>(null);

  // Flag to suppress dirty marking during flow restore operations
  const isRestoringFlowRef = useRef(false);

  // In-memory cache for unsaved tab flows
  const tabFlowCacheRef = useRef<
    Map<
      string,
      {
        nodes: Node[];
        edges: Edge[];
        viewport: { x: number; y: number; zoom: number };
      }
    >
  >(new Map());

  const [isSessionLoaded, setIsSessionLoaded] = useState(false);

  // Project state
  const [currentProjectPath, setCurrentProjectPath] = useState<string | null>(
    null,
  );
  const [isProjectSaved, setIsProjectSaved] = useState(true);
  const [isProjectSwitcherOpen, setIsProjectSwitcherOpen] = useState(false);
  const [projectSwitcherMode, setProjectSwitcherMode] = useState<
    "create" | "open"
  >("open");
  const [isSaveConfirmOpen, setIsSaveConfirmOpen] = useState(false);
  const [showHomeScreen, setShowHomeScreen] = useState(false);
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Get unsaved changes from active tab
  const hasUnsavedChanges = tabsContext.activeTab?.hasUnsavedChanges ?? false;

  // Node creation dialog states
  const [promptDialogState, setPromptDialogState] =
    useState<NodeCreationDialogState>({
      isOpen: false,
    });
  const [contextDialogState, setContextDialogState] =
    useState<NodeCreationDialogState>({
      isOpen: false,
    });
  const [toolDialogState, setToolDialogState] =
    useState<NodeCreationDialogState>({
      isOpen: false,
    });
  const [processDialogState, setProcessDialogState] =
    useState<NodeCreationDialogState>({
      isOpen: false,
    });
  const [outputFileDialogState, setOutputFileDialogState] =
    useState<NodeCreationDialogState>({
      isOpen: false,
    });

  // Clear canvas dialog state
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);

  // Canvas lock state
  const [isCanvasLocked, setIsCanvasLocked] = useState(false);

  // File picker dialog state
  const [filePickerState, setFilePickerState] = useState<FilePickerState>({
    isOpen: false,
    callback: null,
  });

  // Run panel state
  const [isRunPanelOpen, setIsRunPanelOpen] = useState(false);
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [runEvents, setRunEvents] = useState<DisplayEvent[]>([]);
  const [isRunConfirmDialogOpen, setIsRunConfirmDialogOpen] = useState(false);
  const [lastRunStatus, setLastRunStatus] = useState<RunStatus>("pending");

  // Topology dialog state
  const [topologyResult, setTopologyResult] = useState<TopologyResponse | null>(
    null,
  );
  const [isTopologySaveDialogOpen, setIsTopologySaveDialogOpen] =
    useState(false);

  // Validation save dialog state
  const [isValidationSaveDialogOpen, setIsValidationSaveDialogOpen] =
    useState(false);

  // Tab delete confirmation state
  const [isTabDeleteDialogOpen, setIsTabDeleteDialogOpen] = useState(false);
  const [pendingDeleteTabId, setPendingDeleteTabId] = useState<string | null>(
    null,
  );

  // Project settings dialog state
  const [isProjectSettingsOpen, setIsProjectSettingsOpen] = useState(false);
  const [settingsRefreshKey, setSettingsRefreshKey] = useState(0);

  // Pending focus node tracking
  const pendingFocusNodeIdRef = useRef<string | null>(null);
  const hasSyncedAllTabsRef = useRef(false);

  // Grouped state objects for cleaner destructuring
  const workflow = {
    name: workflowName,
    setName: setWorkflowName,
    canvasRef,
    activeTabRef,
    loadedTabIdRef,
    isRestoringFlowRef,
    tabFlowCacheRef,
    isSessionLoaded,
    setIsSessionLoaded,
  };

  const project = {
    path: currentProjectPath,
    setPath: setCurrentProjectPath,
    isSaved: isProjectSaved,
    setIsSaved: setIsProjectSaved,
    isSwitcherOpen: isProjectSwitcherOpen,
    setIsSwitcherOpen: setIsProjectSwitcherOpen,
    switcherMode: projectSwitcherMode,
    setSwitcherMode: setProjectSwitcherMode,
    isSaveConfirmOpen,
    setIsSaveConfirmOpen,
    showHomeScreen,
    setShowHomeScreen,
    recentProjects,
    setRecentProjects,
    isSaving,
    setIsSaving,
    hasUnsavedChanges,
    isSettingsOpen: isProjectSettingsOpen,
    setIsSettingsOpen: setIsProjectSettingsOpen,
    settingsRefreshKey,
    setSettingsRefreshKey,
  };

  const dialogs = {
    prompt: promptDialogState,
    setPrompt: setPromptDialogState,
    context: contextDialogState,
    setContext: setContextDialogState,
    tool: toolDialogState,
    setTool: setToolDialogState,
    process: processDialogState,
    setProcess: setProcessDialogState,
    outputFile: outputFileDialogState,
    setOutputFile: setOutputFileDialogState,
    isClearOpen: isClearDialogOpen,
    setIsClearOpen: setIsClearDialogOpen,
    filePicker: filePickerState,
    setFilePicker: setFilePickerState,
    isTopologySaveOpen: isTopologySaveDialogOpen,
    setIsTopologySaveOpen: setIsTopologySaveDialogOpen,
    isValidationSaveOpen: isValidationSaveDialogOpen,
    setIsValidationSaveOpen: setIsValidationSaveDialogOpen,
    isTabDeleteOpen: isTabDeleteDialogOpen,
    setIsTabDeleteOpen: setIsTabDeleteDialogOpen,
    pendingDeleteTabId,
    setPendingDeleteTabId,
    topologyResult,
    setTopologyResult,
  };

  const run = {
    isPanelOpen: isRunPanelOpen,
    setIsPanelOpen: setIsRunPanelOpen,
    currentId: currentRunId,
    setCurrentId: setCurrentRunId,
    isRunning,
    setIsRunning,
    events: runEvents,
    setEvents: setRunEvents,
    isConfirmDialogOpen: isRunConfirmDialogOpen,
    setIsConfirmDialogOpen: setIsRunConfirmDialogOpen,
    lastStatus: lastRunStatus,
    setLastStatus: setLastRunStatus,
  };

  const canvas = {
    isLocked: isCanvasLocked,
    setIsLocked: setIsCanvasLocked,
  };

  const tabs = {
    context: tabsContext,
    syncTeleportersForTab,
    updateTabName,
    pendingFocusNodeIdRef,
    hasSyncedAllTabsRef,
  };

  const theme = {
    id: themeId,
    toggle: toggleTheme,
  };

  return {
    // Grouped state objects
    workflow,
    project,
    dialogs,
    run,
    canvas,
    tabs,
    theme,

    // Legacy flat exports for backwards compatibility during migration
    // TODO: Remove after all consumers are migrated to grouped accessors
    tabsContext,
    syncTeleportersForTab,
    updateTabName,
    themeId,
    toggleTheme,
    workflowName,
    setWorkflowName,
    canvasRef,
    activeTabRef,
    loadedTabIdRef,
    isRestoringFlowRef,
    tabFlowCacheRef,
    isSessionLoaded,
    setIsSessionLoaded,
    currentProjectPath,
    setCurrentProjectPath,
    isProjectSaved,
    setIsProjectSaved,
    isProjectSwitcherOpen,
    setIsProjectSwitcherOpen,
    projectSwitcherMode,
    setProjectSwitcherMode,
    isSaveConfirmOpen,
    setIsSaveConfirmOpen,
    showHomeScreen,
    setShowHomeScreen,
    recentProjects,
    setRecentProjects,
    isSaving,
    setIsSaving,
    hasUnsavedChanges,
    promptDialogState,
    setPromptDialogState,
    contextDialogState,
    setContextDialogState,
    toolDialogState,
    setToolDialogState,
    processDialogState,
    setProcessDialogState,
    outputFileDialogState,
    setOutputFileDialogState,
    isClearDialogOpen,
    setIsClearDialogOpen,
    isCanvasLocked,
    setIsCanvasLocked,
    filePickerState,
    setFilePickerState,
    isRunPanelOpen,
    setIsRunPanelOpen,
    currentRunId,
    setCurrentRunId,
    isRunning,
    setIsRunning,
    runEvents,
    setRunEvents,
    isRunConfirmDialogOpen,
    setIsRunConfirmDialogOpen,
    lastRunStatus,
    setLastRunStatus,
    topologyResult,
    setTopologyResult,
    isTopologySaveDialogOpen,
    setIsTopologySaveDialogOpen,
    isValidationSaveDialogOpen,
    setIsValidationSaveDialogOpen,
    isTabDeleteDialogOpen,
    setIsTabDeleteDialogOpen,
    pendingDeleteTabId,
    setPendingDeleteTabId,
    isProjectSettingsOpen,
    setIsProjectSettingsOpen,
    settingsRefreshKey,
    setSettingsRefreshKey,
    pendingFocusNodeIdRef,
    hasSyncedAllTabsRef,
  };
}
