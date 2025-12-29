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

  // Pending focus node tracking
  const pendingFocusNodeIdRef = useRef<string | null>(null);
  const hasSyncedAllTabsRef = useRef(false);

  return {
    // Context values
    tabsContext,
    syncTeleportersForTab,
    updateTabName,
    themeId,
    toggleTheme,

    // Core workflow state
    workflowName,
    setWorkflowName,
    canvasRef,
    activeTabRef,
    loadedTabIdRef,
    tabFlowCacheRef,
    isSessionLoaded,
    setIsSessionLoaded,

    // Project state
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

    // Node creation dialog states
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

    // Clear canvas dialog
    isClearDialogOpen,
    setIsClearDialogOpen,

    // Canvas lock
    isCanvasLocked,
    setIsCanvasLocked,

    // File picker
    filePickerState,
    setFilePickerState,

    // Run panel
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

    // Topology
    topologyResult,
    setTopologyResult,
    isTopologySaveDialogOpen,
    setIsTopologySaveDialogOpen,

    // Validation save dialog
    isValidationSaveDialogOpen,
    setIsValidationSaveDialogOpen,

    // Tab delete
    isTabDeleteDialogOpen,
    setIsTabDeleteDialogOpen,
    pendingDeleteTabId,
    setPendingDeleteTabId,

    // Focus tracking
    pendingFocusNodeIdRef,
    hasSyncedAllTabsRef,
  };
}
