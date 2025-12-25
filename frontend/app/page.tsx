"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import ReactFlowCanvas, { ReactFlowCanvasRef } from "@/components/ReactFlowCanvas";
import TopMenubar from "@/components/TopMenubar";
import GlobalSearch from "@/components/GlobalSearch";
import ConfirmDialog from "@/components/ConfirmDialog";
import SaveConfirmDialog from "@/components/SaveConfirmDialog";
import RunConfirmDialog from "@/components/RunConfirmDialog";
import PromptNameDialog from "@/components/PromptNameDialog";
import TopologyDialog from "@/components/TopologyDialog";
import HomeScreen from "@/components/HomeScreen";
import ProjectSwitcher from "@/components/ProjectSwitcher";
import { savePrompt, readPrompt, startRun, validateWorkflow, getTopology } from "@/lib/api";
import RunPanel, { type DisplayEvent } from "@/components/RunPanel";
import type { RunStatus, NodeExecutionState, TopologyResponse } from "@/lib/types";
import FilePicker from "@/components/FilePicker";
import { loadSession, saveSession } from "@/lib/sessionStorage";
import { ProjectProvider, type FilePickerOptions } from "@/contexts/ProjectContext";
import { ClipboardProvider } from "@/contexts/ClipboardContext";
import { RunWorkflowProvider } from "@/contexts/RunWorkflowContext";
import { TabsProvider, useTabs } from "@/contexts/TabsContext";
import { TeleporterProvider, useTeleporter } from "@/contexts/TeleporterContext";
import TabBar from "@/components/TabBar";
import type { Node, Edge } from "@xyflow/react";
import { Lock, Save } from "lucide-react";
import {
  getRecentProjects,
  addRecentProject,
  removeRecentProject,
  type RecentProject,
} from "@/lib/recentProjects";

// Main component that uses contexts
function HomeContent() {
  const {
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
    clearTabs,
    pendingFocusNodeId,
    setPendingFocusNodeId,
    navigateToNode,
  } = useTabs();

  const { syncTeleportersForTab, updateTabName } = useTeleporter();

  const [workflowName, setWorkflowName] = useState("Untitled Workflow");
  const canvasRef = useRef<ReactFlowCanvasRef>(null);

  // Refs to avoid dependency loops in handleWorkflowChange
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;
  const [isSessionLoaded, setIsSessionLoaded] = useState(false);

  // Project state
  const [currentProjectPath, setCurrentProjectPath] = useState<string | null>(null);
  const [isProjectSaved, setIsProjectSaved] = useState(true); // Track if project has been saved to disk
  const [isProjectSwitcherOpen, setIsProjectSwitcherOpen] = useState(false);
  const [projectSwitcherMode, setProjectSwitcherMode] = useState<"create" | "open">("open");
  const [isSaveConfirmOpen, setIsSaveConfirmOpen] = useState(false);
  const [showHomeScreen, setShowHomeScreen] = useState(false);
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Get unsaved changes from active tab
  const hasUnsavedChanges = activeTab?.hasUnsavedChanges ?? false;

  // Prompt name dialog state
  const [isPromptNameDialogOpen, setIsPromptNameDialogOpen] = useState(false);
  const [pendingPromptPosition, setPendingPromptPosition] = useState<{ x: number; y: number } | undefined>(undefined);

  // Context name dialog state
  const [isContextNameDialogOpen, setIsContextNameDialogOpen] = useState(false);
  const [pendingContextPosition, setPendingContextPosition] = useState<{ x: number; y: number } | undefined>(undefined);

  // Tool name dialog state
  const [isToolNameDialogOpen, setIsToolNameDialogOpen] = useState(false);
  const [pendingToolPosition, setPendingToolPosition] = useState<{ x: number; y: number } | undefined>(undefined);

  // Process name dialog state
  const [isProcessNameDialogOpen, setIsProcessNameDialogOpen] = useState(false);
  const [pendingProcessPosition, setPendingProcessPosition] = useState<{ x: number; y: number } | undefined>(undefined);

  // Output file name dialog state
  const [isOutputFileNameDialogOpen, setIsOutputFileNameDialogOpen] = useState(false);
  const [pendingOutputFilePosition, setPendingOutputFilePosition] = useState<{ x: number; y: number } | undefined>(undefined);

  // Clear canvas dialog state
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);

  // Canvas lock state
  const [isCanvasLocked, setIsCanvasLocked] = useState(false);

  // File picker dialog state
  const [isFilePickerOpen, setIsFilePickerOpen] = useState(false);
  const [filePickerInitialPath, setFilePickerInitialPath] = useState<string | undefined>(undefined);
  const [filePickerCallback, setFilePickerCallback] = useState<((newPath: string) => void) | null>(null);
  const [filePickerOptions, setFilePickerOptions] = useState<FilePickerOptions | undefined>(undefined);

  // Run panel state
  const [isRunPanelOpen, setIsRunPanelOpen] = useState(false);
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [runEvents, setRunEvents] = useState<DisplayEvent[]>([]);
  const [isRunConfirmDialogOpen, setIsRunConfirmDialogOpen] = useState(false);
  const [lastRunStatus, setLastRunStatus] = useState<RunStatus>("pending");

  // Topology dialog state
  const [topologyResult, setTopologyResult] = useState<TopologyResponse | null>(null);
  const [isTopologySaveDialogOpen, setIsTopologySaveDialogOpen] = useState(false);

  // Load session and recent projects on mount
  useEffect(() => {
    // Load recent projects from localStorage
    setRecentProjects(getRecentProjects());

    const session = loadSession();
    if (session && session.currentProjectPath) {
      const projectPath = session.currentProjectPath;
      setCurrentProjectPath(projectPath);
      setIsProjectSaved(true); // Session restored from existing project

      // Initialize tabs and load first tab
      (async () => {
        const result = await initializeTabs(projectPath);
        if (result) {
          setWorkflowName(result.projectName);
          if (result.firstTab && canvasRef.current) {
            const flow = await loadTabFlow(projectPath, result.firstTab.id);
            if (flow) {
              canvasRef.current.restoreFlow(flow);
              syncTeleportersForTab(result.firstTab.id, result.firstTab.name, flow.nodes);
            }
          }
          addRecentProject({
            path: projectPath,
            name: result.projectName,
            lastOpened: Date.now(),
          });
          setRecentProjects(getRecentProjects());
        }
      })();

      setIsSessionLoaded(true);
    } else {
      // No session, show home screen
      setShowHomeScreen(true);
      setIsSessionLoaded(true);
    }
  }, [initializeTabs, loadTabFlow, syncTeleportersForTab]);

  // Save session whenever relevant state changes
  useEffect(() => {
    if (isSessionLoaded && currentProjectPath) {
      saveSession({
        currentProjectPath,
        workflowName,
        workflow: null, // Deprecated - using tabs now
        hasUnsavedChanges,
      });
    }
  }, [isSessionLoaded, currentProjectPath, workflowName, hasUnsavedChanges]);

  const handleWorkflowChange = useCallback((data: { nodes: Node[]; edges: Edge[] }) => {
    const tab = activeTabRef.current;
    if (activeTabId && tab) {
      markTabDirty(activeTabId);
      syncTeleportersForTab(activeTabId, tab.name, data.nodes);
    }
  }, [activeTabId, markTabDirty, syncTeleportersForTab]);

  const syncAllTabsTeleporters = useCallback(async (projectPath: string, allTabs: typeof tabs) => {
    for (const tab of allTabs) {
      const flow = await loadTabFlow(projectPath, tab.id);
      if (flow) {
        syncTeleportersForTab(tab.id, tab.name, flow.nodes);
      }
    }
  }, [loadTabFlow, syncTeleportersForTab]);

  const hasSyncedAllTabsRef = useRef(false);
  useEffect(() => {
    if (tabs.length > 0 && currentProjectPath && !hasSyncedAllTabsRef.current) {
      hasSyncedAllTabsRef.current = true;
      syncAllTabsTeleporters(currentProjectPath, tabs.filter(t => t.id !== activeTabId));
    }
  }, [tabs, currentProjectPath, activeTabId, syncAllTabsTeleporters]);

  useEffect(() => {
    hasSyncedAllTabsRef.current = false;
  }, [currentProjectPath]);

  // Project Management Handlers
  const handleCreateNewProject = async (projectPath: string, projectName?: string) => {
    try {
      const name = projectName || "Untitled Workflow";
      setCurrentProjectPath(projectPath);
      setWorkflowName(name);
      setIsProjectSwitcherOpen(false);
      setShowHomeScreen(false);

      // Initialize tabs and create first tab
      const result = await initializeTabs(projectPath);
      let tabToLoad: { id: string; name: string } | null = null;

      if (!result || !result.firstTab) {
        // No tabs exist, create the first one
        const newTab = await createNewTab(projectPath, "Flow 1");
        if (newTab) {
          tabToLoad = newTab;
        }
      } else {
        tabToLoad = result.firstTab;
      }

      // Load the tab's default flow (which includes Start node)
      if (tabToLoad && canvasRef.current) {
        const flow = await loadTabFlow(projectPath, tabToLoad.id);
        if (flow) {
          canvasRef.current.restoreFlow(flow);
          syncTeleportersForTab(tabToLoad.id, tabToLoad.name, flow.nodes);
        }
      }

      // Add to recent projects
      addRecentProject({
        path: projectPath,
        name: name,
        lastOpened: Date.now(),
      });
      setRecentProjects(getRecentProjects());
    } catch (error) {
      console.error("Error creating project:", error);
      alert("Failed to create project: " + (error as Error).message);
    }
  };

  const handleLoadExistingProject = async (projectPath: string) => {
    try {
      const result = await initializeTabs(projectPath);
      let projectName = "Untitled Workflow";

      if (!result || !result.firstTab) {
        alert(`No tabs found at ${projectPath}. Creating a new project instead.`);
        await createNewTab(projectPath, "Flow 1");
      } else {
        const flow = await loadTabFlow(projectPath, result.firstTab.id);
        if (flow && canvasRef.current) {
          canvasRef.current.restoreFlow(flow);
          syncTeleportersForTab(result.firstTab.id, result.firstTab.name, flow.nodes);
        }
        projectName = result.projectName;
      }

      setWorkflowName(projectName);
      setCurrentProjectPath(projectPath);
      setIsProjectSaved(true); // Existing project already saved to disk
      setIsProjectSwitcherOpen(false);
      setShowHomeScreen(false);

      addRecentProject({
        path: projectPath,
        name: projectName,
        lastOpened: Date.now(),
      });
      setRecentProjects(getRecentProjects());
    } catch (error) {
      console.error("Error loading project:", error);
      alert("Failed to load project: " + (error as Error).message);
    }
  };

  const handleSaveCurrentProject = async () => {
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

      const success = await saveTabFlow(currentProjectPath, activeTabId, flow, workflowName);
      if (success) {
        setIsProjectSaved(true); // Project now saved to disk
      } else {
        alert("Failed to save tab.");
      }
    } catch (error) {
      console.error("Error saving project:", error);
      alert("Failed to save project: " + (error as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleNewProject = () => {
    setProjectSwitcherMode("create");
    if (hasUnsavedChanges) {
      setIsSaveConfirmOpen(true);
    } else {
      setIsProjectSwitcherOpen(true);
    }
  };

  const handleLoadProject = () => {
    setProjectSwitcherMode("open");
    if (hasUnsavedChanges) {
      setIsSaveConfirmOpen(true);
    } else {
      setIsProjectSwitcherOpen(true);
    }
  };

  const handleSaveAndContinue = async () => {
    await handleSaveCurrentProject();
    setIsSaveConfirmOpen(false);
    setIsProjectSwitcherOpen(true);
  };

  const handleDontSave = () => {
    setIsSaveConfirmOpen(false);
    setIsProjectSwitcherOpen(true);
  };

  const handleRemoveRecentProject = (path: string) => {
    removeRecentProject(path);
    setRecentProjects(getRecentProjects());
  };

  const handleCancelNewProject = () => {
    setIsSaveConfirmOpen(false);
  };

  const handleRequestPromptCreation = useCallback((position: { x: number; y: number }) => {
    setPendingPromptPosition(position);
    setIsPromptNameDialogOpen(true);
  }, []);

  const handleCreatePrompt = (promptName: string) => {
    // Compute file path locally - file will be created when content is saved
    const sanitizedName = promptName.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");
    const filePath = `prompts/${sanitizedName}.prompt.md`;

    if (canvasRef.current) {
      canvasRef.current.addPromptNode({
        name: promptName,
        file_path: filePath,
      }, pendingPromptPosition);
    }

    setIsPromptNameDialogOpen(false);
    setPendingPromptPosition(undefined);
    if (activeTabId) {
      markTabDirty(activeTabId);
    }
  };

  const handleCancelPromptCreation = () => {
    setIsPromptNameDialogOpen(false);
    setPendingPromptPosition(undefined);
  };

  const handleSelectExistingPrompt = (filePath: string) => {
    // Extract name from file path (e.g., "prompts/greeting.prompt.md" -> "greeting")
    const fileName = filePath.split("/").pop() || filePath;
    const name = fileName.replace(/\.prompt\.md$/, "").replace(/\.md$/, "");

    if (canvasRef.current) {
      canvasRef.current.addPromptNode({
        name: name,
        file_path: filePath,
      }, pendingPromptPosition);
    }

    setIsPromptNameDialogOpen(false);
    setPendingPromptPosition(undefined);
    if (activeTabId) {
      markTabDirty(activeTabId);
    }
  };

  const handleRequestContextCreation = useCallback((position: { x: number; y: number }) => {
    setPendingContextPosition(position);
    setIsContextNameDialogOpen(true);
  }, []);

  const handleCreateContext = (contextName: string) => {
    // Compute file path locally - file will be created when content is saved
    const sanitizedName = contextName.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");
    const filePath = `static/${sanitizedName}.context.md`;

    if (canvasRef.current) {
      canvasRef.current.addContextNode({
        name: contextName,
        file_path: filePath,
      }, pendingContextPosition);
    }

    setIsContextNameDialogOpen(false);
    setPendingContextPosition(undefined);
    if (activeTabId) {
      markTabDirty(activeTabId);
    }
  };

  const handleCancelContextCreation = () => {
    setIsContextNameDialogOpen(false);
    setPendingContextPosition(undefined);
  };

  const handleSelectExistingContext = (filePath: string) => {
    const fileName = filePath.split("/").pop() || filePath;
    const name = fileName.replace(/\.context\.md$/, "").replace(/\.md$/, "");

    if (canvasRef.current) {
      canvasRef.current.addContextNode({
        name: name,
        file_path: filePath,
      }, pendingContextPosition);
    }

    setIsContextNameDialogOpen(false);
    setPendingContextPosition(undefined);
    if (activeTabId) {
      markTabDirty(activeTabId);
    }
  };

  const handleRequestToolCreation = useCallback((position: { x: number; y: number }) => {
    setPendingToolPosition(position);
    setIsToolNameDialogOpen(true);
  }, []);

  const handleCreateTool = (toolName: string) => {
    // Compute file path locally - file will be created when content is saved
    const sanitizedName = toolName.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "_");
    const filePath = `tools/${sanitizedName}.py`;

    if (canvasRef.current) {
      canvasRef.current.addToolNode({
        name: toolName,
        file_path: filePath,
      }, pendingToolPosition);
    }

    setIsToolNameDialogOpen(false);
    setPendingToolPosition(undefined);
    if (activeTabId) {
      markTabDirty(activeTabId);
    }
  };

  const handleCancelToolCreation = () => {
    setIsToolNameDialogOpen(false);
    setPendingToolPosition(undefined);
  };

  const handleSelectExistingTool = (filePath: string) => {
    const fileName = filePath.split("/").pop() || filePath;
    const name = fileName.replace(/\.py$/, "");

    if (canvasRef.current) {
      canvasRef.current.addToolNode({
        name: name,
        file_path: filePath,
      }, pendingToolPosition);
    }

    setIsToolNameDialogOpen(false);
    setPendingToolPosition(undefined);
    if (activeTabId) {
      markTabDirty(activeTabId);
    }
  };

  const handleRequestProcessCreation = useCallback((position: { x: number; y: number }) => {
    setPendingProcessPosition(position);
    setIsProcessNameDialogOpen(true);
  }, []);

  const handleCreateProcess = (processName: string) => {
    // Compute file path locally - file will be created when content is saved
    const sanitizedName = processName.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "_");
    const filePath = `tools/${sanitizedName}.py`;

    if (canvasRef.current) {
      canvasRef.current.addProcessNode({
        name: processName,
        file_path: filePath,
      }, pendingProcessPosition);
    }

    setIsProcessNameDialogOpen(false);
    setPendingProcessPosition(undefined);
    if (activeTabId) {
      markTabDirty(activeTabId);
    }
  };

  const handleCancelProcessCreation = () => {
    setIsProcessNameDialogOpen(false);
    setPendingProcessPosition(undefined);
  };

  const handleSelectExistingProcess = (filePath: string) => {
    const fileName = filePath.split("/").pop() || filePath;
    const name = fileName.replace(/\.py$/, "");

    if (canvasRef.current) {
      canvasRef.current.addProcessNode({
        name: name,
        file_path: filePath,
      }, pendingProcessPosition);
    }

    setIsProcessNameDialogOpen(false);
    setPendingProcessPosition(undefined);
    if (activeTabId) {
      markTabDirty(activeTabId);
    }
  };

  const handleRequestOutputFileCreation = useCallback((position: { x: number; y: number }) => {
    setPendingOutputFilePosition(position);
    setIsOutputFileNameDialogOpen(true);
  }, []);

  const handleCreateOutputFile = (outputFileName: string) => {
    // Sanitize the name for file path
    const sanitizedName = outputFileName.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");
    const filePath = `outputs/${sanitizedName}.txt`;

    if (canvasRef.current) {
      canvasRef.current.addOutputFileNode({
        name: outputFileName,
        file_path: filePath,
      }, pendingOutputFilePosition);
    }

    setIsOutputFileNameDialogOpen(false);
    setPendingOutputFilePosition(undefined);
    if (activeTabId) {
      markTabDirty(activeTabId);
    }
  };

  const handleCancelOutputFileCreation = () => {
    setIsOutputFileNameDialogOpen(false);
    setPendingOutputFilePosition(undefined);
  };

  const handleSelectExistingOutputFile = (filePath: string) => {
    const fileName = filePath.split("/").pop() || filePath;
    // Remove extension for display name
    const name = fileName.replace(/\.[^/.]+$/, "");

    if (canvasRef.current) {
      canvasRef.current.addOutputFileNode({
        name: name,
        file_path: filePath,
      }, pendingOutputFilePosition);
    }

    setIsOutputFileNameDialogOpen(false);
    setPendingOutputFilePosition(undefined);
    if (activeTabId) {
      markTabDirty(activeTabId);
    }
  };

  // Clear canvas handlers
  const handleClearCanvasClick = () => {
    setIsClearDialogOpen(true);
  };

  const handleClearCanvasConfirm = () => {
    canvasRef.current?.clearCanvas();
    setIsClearDialogOpen(false);
  };

  const handleClearCanvasCancel = () => {
    setIsClearDialogOpen(false);
  };

  // Zoom handlers
  const handleZoomIn = () => {
    canvasRef.current?.zoomIn?.();
  };

  const handleZoomOut = () => {
    canvasRef.current?.zoomOut?.();
  };

  const handleFitView = () => {
    canvasRef.current?.fitView?.();
  };

  // File save handler for editor nodes
  const handleSaveFile = useCallback(async (filePath: string, content: string) => {
    if (!currentProjectPath) return;
    await savePrompt(currentProjectPath, filePath, content);
  }, [currentProjectPath]);

  // File picker handler
  const handleRequestFilePicker = useCallback((
    currentFilePath: string,
    onSelect: (newPath: string) => void,
    options?: FilePickerOptions
  ) => {
    // Resolve relative path to absolute path for proper file picker navigation
    const fullPath = currentFilePath && !currentFilePath.startsWith('/') && currentProjectPath
      ? `${currentProjectPath}/${currentFilePath}`
      : currentFilePath;
    setFilePickerInitialPath(fullPath);
    setFilePickerCallback(() => onSelect);
    setFilePickerOptions(options);
    setIsFilePickerOpen(true);
  }, [currentProjectPath]);

  const handleFilePickerSelect = useCallback(async (newPath: string) => {
    if (filePickerCallback && currentProjectPath) {
      // Load the content of the selected file
      try {
        const response = await readPrompt(currentProjectPath, newPath);
        // The callback will update the node's file_path
        // We pass both the path and content (content handled separately by the node)
        filePickerCallback(newPath);
      } catch (error) {
        console.error("Failed to read file:", error);
        // Still update the path even if we can't read the content
        filePickerCallback(newPath);
      }
    }
    setIsFilePickerOpen(false);
    setFilePickerCallback(null);
    setFilePickerInitialPath(undefined);
    setFilePickerOptions(undefined);
  }, [filePickerCallback, currentProjectPath]);

  const handleFilePickerCancel = useCallback(() => {
    setIsFilePickerOpen(false);
    setFilePickerCallback(null);
    setFilePickerInitialPath(undefined);
    setFilePickerOptions(undefined);
  }, []);

  // Run workflow handlers
  const executeRunWorkflow = useCallback(async () => {
    if (!currentProjectPath || isRunning) return;

    // Clear any previous error highlights
    canvasRef.current?.clearErrorHighlights();

    // Validate workflow using backend validator (same as Validate command)
    try {
      const validation = await validateWorkflow(currentProjectPath);

      // Highlight error nodes with their messages
      if (validation.node_errors && Object.keys(validation.node_errors).length > 0) {
        canvasRef.current?.highlightErrorNodes(validation.node_errors);
      }

      // Highlight warning nodes with their messages
      if (validation.node_warnings && Object.keys(validation.node_warnings).length > 0) {
        canvasRef.current?.highlightWarningNodes(validation.node_warnings);
      }

      // If validation failed, show all errors and warnings then abort
      if (!validation.valid) {
        const events: DisplayEvent[] = [];

        // Add errors
        validation.errors.forEach((error, i) => {
          events.push({
            id: `validation-error-${Date.now()}-${i}`,
            type: "run_error" as const,
            content: error,
            timestamp: Date.now(),
          });
        });

        // Add warnings
        validation.warnings.forEach((warning, i) => {
          events.push({
            id: `validation-warning-${Date.now()}-${i}`,
            type: "warning" as const,
            content: warning,
            timestamp: Date.now(),
          });
        });

        setRunEvents(events);
        setLastRunStatus("failed");
        setIsRunPanelOpen(true);
        return;
      }
    } catch (error) {
      console.error("Failed to validate:", error);
      const errorEvents: DisplayEvent[] = [{
        id: `validation-error-${Date.now()}`,
        type: "run_error" as const,
        content: `Validation failed: ${(error as Error).message}`,
        timestamp: Date.now(),
      }];
      setRunEvents(errorEvents);
      setLastRunStatus("failed");
      setIsRunPanelOpen(true);
      return;
    }

    try {
      setIsRunning(true);
      const response = await startRun({
        project_path: currentProjectPath,
        tab_id: activeTabId ?? undefined,
      });
      setCurrentRunId(response.run_id);
      setIsRunPanelOpen(true);
    } catch (error) {
      console.error("Failed to start run:", error);
      const errorEvents: DisplayEvent[] = [{
        id: `run-error-${Date.now()}`,
        type: "run_error" as const,
        content: `Failed to start workflow: ${(error as Error).message}`,
        timestamp: Date.now(),
      }];
      setRunEvents(errorEvents);
      setLastRunStatus("failed");
      setIsRunPanelOpen(true);
      setIsRunning(false);
    }
  }, [currentProjectPath, isRunning, activeTabId]);

  const handleRunWorkflow = useCallback(async () => {
    if (!currentProjectPath || isRunning) return;

    // Check if project needs to be saved (unsaved changes OR new project not yet saved to disk)
    if (activeTab?.hasUnsavedChanges || !isProjectSaved) {
      setIsRunConfirmDialogOpen(true);
      return;
    }

    await executeRunWorkflow();
  }, [currentProjectPath, isRunning, activeTab, isProjectSaved, executeRunWorkflow]);

  const handleRunConfirmSaveAndRun = useCallback(async () => {
    setIsRunConfirmDialogOpen(false);

    // Save current tab before running
    if (canvasRef.current && activeTabId && currentProjectPath) {
      const flow = canvasRef.current.saveFlow();
      if (flow) {
        const success = await saveTabFlow(currentProjectPath, activeTabId, flow, workflowName);
        if (success) {
          setIsProjectSaved(true); // Project now saved to disk
        }
      }
    }

    await executeRunWorkflow();
  }, [activeTabId, currentProjectPath, saveTabFlow, workflowName, executeRunWorkflow]);

  const handleRunConfirmCancel = useCallback(() => {
    setIsRunConfirmDialogOpen(false);
  }, []);

  // Helper to show errors in the run console
  const showErrorsInConsole = useCallback(
    (errors: string[], nodeErrors: Record<string, string[]> = {}) => {
      // Clear previous error highlights
      canvasRef.current?.clearErrorHighlights();

      // Highlight error nodes if any
      if (Object.keys(nodeErrors).length > 0) {
        canvasRef.current?.highlightErrorNodes(nodeErrors);
      }

      // Add errors as run_error events
      const errorEvents: DisplayEvent[] = errors.map((error, i) => ({
        id: `validation-error-${Date.now()}-${i}`,
        type: "run_error" as const,
        content: error,
        timestamp: Date.now(),
      }));

      setRunEvents(errorEvents);
      setLastRunStatus("failed");
      setIsRunPanelOpen(true);
    },
    []
  );

  const handleValidateWorkflow = useCallback(async () => {
    if (!currentProjectPath) return;

    // Clear any previous error highlights
    canvasRef.current?.clearErrorHighlights();

    try {
      const result = await validateWorkflow(currentProjectPath);

      // Highlight error nodes with their messages
      if (result.node_errors && Object.keys(result.node_errors).length > 0) {
        canvasRef.current?.highlightErrorNodes(result.node_errors);
      }

      // Highlight warning nodes with their messages
      if (result.node_warnings && Object.keys(result.node_warnings).length > 0) {
        canvasRef.current?.highlightWarningNodes(result.node_warnings);
      }

      // Build events list with all errors and warnings
      const events: DisplayEvent[] = [];

      // Add errors first
      result.errors.forEach((error, i) => {
        events.push({
          id: `validation-error-${Date.now()}-${i}`,
          type: "run_error" as const,
          content: error,
          timestamp: Date.now(),
        });
      });

      // Add warnings
      result.warnings.forEach((warning, i) => {
        events.push({
          id: `validation-warning-${Date.now()}-${i}`,
          type: "warning" as const,
          content: warning,
          timestamp: Date.now(),
        });
      });

      // Add summary
      if (result.valid) {
        events.unshift({
          id: `validation-success-${Date.now()}`,
          type: "info" as const,
          content: `Validation passed (${result.agent_count} agents, ${result.tab_count} tabs)`,
          timestamp: Date.now(),
        });
      }

      setRunEvents(events);
      setLastRunStatus(result.valid ? "completed" : "failed");
      setIsRunPanelOpen(true);
    } catch (error) {
      console.error("Failed to validate:", error);
      showErrorsInConsole([(error as Error).message]);
    }
  }, [currentProjectPath, showErrorsInConsole]);

  const executeShowTopology = useCallback(async () => {
    if (!currentProjectPath) return;

    try {
      const result = await getTopology(currentProjectPath);
      setTopologyResult(result);
    } catch (error) {
      console.error("Failed to get topology:", error);
      showErrorsInConsole([`Failed to generate topology: ${(error as Error).message}`]);
    }
  }, [currentProjectPath, showErrorsInConsole]);

  const handleShowTopology = useCallback(async () => {
    if (!currentProjectPath) return;

    // Check if project needs to be saved first
    if (activeTab?.hasUnsavedChanges || !isProjectSaved) {
      setIsTopologySaveDialogOpen(true);
      return;
    }

    await executeShowTopology();
  }, [currentProjectPath, activeTab, isProjectSaved, executeShowTopology]);

  const handleTopologySaveAndShow = useCallback(async () => {
    setIsTopologySaveDialogOpen(false);

    // Save current tab before showing topology
    if (canvasRef.current && activeTabId && currentProjectPath) {
      const flow = canvasRef.current.saveFlow();
      if (flow) {
        const success = await saveTabFlow(currentProjectPath, activeTabId, flow, workflowName);
        if (success) {
          setIsProjectSaved(true);
        }
      }
    }

    await executeShowTopology();
  }, [activeTabId, currentProjectPath, workflowName, saveTabFlow, executeShowTopology]);

  const handleTopologySaveCancel = useCallback(() => {
    setIsTopologySaveDialogOpen(false);
  }, []);

  const handleRunComplete = useCallback((status: RunStatus) => {
    setIsRunning(false);
  }, []);

  // Real-time node highlighting during execution
  const handleAgentStateChange = useCallback((agentName: string, state: NodeExecutionState) => {
    canvasRef.current?.updateNodeExecutionState(agentName, state);
  }, []);

  const handleUserInputStateChange = useCallback((nodeId: string, isWaiting: boolean) => {
    canvasRef.current?.updateUserInputWaitingState(nodeId, isWaiting);
  }, []);

  const handleClearExecutionState = useCallback(() => {
    canvasRef.current?.clearExecutionState();
  }, []);

  const handleCloseRunPanel = useCallback(() => {
    setIsRunPanelOpen(false);
    setCurrentRunId(null);
    setIsRunning(false);
    // Clear any remaining highlights when closing the panel
    canvasRef.current?.clearExecutionState();
    canvasRef.current?.clearErrorHighlights();
  }, []);

  // Tab handlers
  const handleTabClick = useCallback(async (tabId: string) => {
    if (!currentProjectPath) return;

    // Save current tab if dirty
    if (activeTab?.hasUnsavedChanges && canvasRef.current && activeTabId) {
      const flow = canvasRef.current.saveFlow();
      if (flow) {
        await saveTabFlow(currentProjectPath, activeTabId, flow);
      }
    }

    // Switch tab
    setActiveTabId(tabId);

    // Load new tab flow
    const flow = await loadTabFlow(currentProjectPath, tabId);
    if (flow && canvasRef.current) {
      canvasRef.current.restoreFlow(flow);
      // Sync teleporters for this tab
      const tab = tabs.find(t => t.id === tabId);
      if (tab) {
        syncTeleportersForTab(tabId, tab.name, flow.nodes);
      }
    }
  }, [currentProjectPath, activeTab, activeTabId, saveTabFlow, loadTabFlow, setActiveTabId, tabs, syncTeleportersForTab]);

  const pendingFocusNodeIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!pendingFocusNodeId || !currentProjectPath || !activeTabId) return;
    if (pendingFocusNodeIdRef.current === pendingFocusNodeId) return;
    pendingFocusNodeIdRef.current = pendingFocusNodeId;

    const handlePendingFocus = async () => {
      const flow = await loadTabFlow(currentProjectPath, activeTabId);
      if (flow && canvasRef.current) {
        canvasRef.current.restoreFlow(flow);
        const nodeIdToFocus = pendingFocusNodeId;
        setTimeout(() => {
          canvasRef.current?.focusNode(nodeIdToFocus);
        }, 150);
      }
      setPendingFocusNodeId(null);
      pendingFocusNodeIdRef.current = null;
    };

    handlePendingFocus();
  }, [pendingFocusNodeId, currentProjectPath, activeTabId, loadTabFlow, setPendingFocusNodeId]);

  const handleAddTab = useCallback(async () => {
    if (!currentProjectPath) return;

    // Save current tab if dirty before switching
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
  }, [currentProjectPath, tabs.length, createNewTab, activeTab, activeTabId, saveTabFlow]);

  // Tab delete with confirmation
  const [isTabDeleteDialogOpen, setIsTabDeleteDialogOpen] = useState(false);
  const [pendingDeleteTabId, setPendingDeleteTabId] = useState<string | null>(null);

  const handleTabDelete = useCallback((tabId: string) => {
    if (!currentProjectPath || tabs.length <= 1) return;

    // Find the tab name for the confirmation dialog
    setPendingDeleteTabId(tabId);
    setIsTabDeleteDialogOpen(true);
  }, [currentProjectPath, tabs.length]);

  const handleTabDeleteConfirm = useCallback(async () => {
    if (!currentProjectPath || !pendingDeleteTabId) return;

    await deleteTabById(currentProjectPath, pendingDeleteTabId);
    setIsTabDeleteDialogOpen(false);
    setPendingDeleteTabId(null);
  }, [currentProjectPath, pendingDeleteTabId, deleteTabById]);

  const handleTabDeleteCancel = useCallback(() => {
    setIsTabDeleteDialogOpen(false);
    setPendingDeleteTabId(null);
  }, []);

  const handleTabRename = useCallback(async (tabId: string, name: string) => {
    if (!currentProjectPath) return;

    await renameTabById(currentProjectPath, tabId, name);
    // Update teleporter tab names
    updateTabName(tabId, name);
  }, [currentProjectPath, renameTabById, updateTabName]);

  const handleTabReorder = useCallback(async (tabIds: string[]) => {
    if (!currentProjectPath) return;

    await reorderTabsById(currentProjectPath, tabIds);
  }, [currentProjectPath, reorderTabsById]);

  const handleDuplicateTab = useCallback(async (tabId: string) => {
    if (!currentProjectPath) return;

    await duplicateTabById(currentProjectPath, tabId);
  }, [currentProjectPath, duplicateTabById]);

  // Show HomeScreen for first-time users
  if (showHomeScreen && !currentProjectPath) {
    return (
      <HomeScreen
        recentProjects={recentProjects}
        onCreateProject={handleCreateNewProject}
        onLoadProject={handleLoadExistingProject}
        onRemoveRecent={handleRemoveRecentProject}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="bg-background border-b border-border px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-primary">ADKFlow</h1>
            <TopMenubar
              onNewProject={handleNewProject}
              onLoadProject={handleLoadProject}
              onSaveProject={handleSaveCurrentProject}
              onClearCanvas={handleClearCanvasClick}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onFitView={handleFitView}
              hasProjectPath={!!currentProjectPath}
              isLocked={isCanvasLocked}
              onToggleLock={() => setIsCanvasLocked(!isCanvasLocked)}
              onRunWorkflow={handleRunWorkflow}
              onValidateWorkflow={handleValidateWorkflow}
              onShowTopology={handleShowTopology}
              isRunning={isRunning}
              showRunConsole={isRunPanelOpen}
              onToggleRunConsole={() => setIsRunPanelOpen(!isRunPanelOpen)}
            />
            {/* Global Search */}
            {currentProjectPath && (
              <GlobalSearch
                projectPath={currentProjectPath}
                tabs={tabs}
                activeTabId={activeTabId}
                loadTabFlow={loadTabFlow}
                navigateToNode={navigateToNode}
                canvasRef={canvasRef}
              />
            )}
          </div>
          <div className="flex items-center gap-4">
            <input
              type="text"
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              className="text-sm font-medium border-none focus:outline-none focus:ring-2 focus:ring-ring rounded px-2 py-1 bg-transparent"
              placeholder="Workflow Name"
            />
            {currentProjectPath && (
              <span className="text-xs text-muted-foreground font-mono max-w-[300px] truncate">
                {currentProjectPath}
              </span>
            )}
            {hasUnsavedChanges && (
              <button
                onClick={handleSaveCurrentProject}
                disabled={isSaving}
                className="flex items-center gap-1 text-xs text-orange-500 font-medium hover:bg-accent rounded px-1.5 py-0.5 transition-colors disabled:opacity-50"
                title="Save changes (⌘S)"
              >
                <Save className={`w-3 h-3 ${isSaving ? 'animate-pulse' : ''}`} />
                <span>{isSaving ? "Saving..." : "Save"}</span>
              </button>
            )}
            {isCanvasLocked && (
              <span className="flex items-center gap-1 text-xs text-blue-500 font-medium">
                <Lock className="h-3 w-3" />
                Locked
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Tab Bar */}
      {currentProjectPath && tabs.length > 0 && (
        <TabBar
          tabs={tabs}
          activeTabId={activeTabId}
          onTabClick={handleTabClick}
          onTabDelete={handleTabDelete}
          onTabRename={handleTabRename}
          onTabReorder={handleTabReorder}
          onAddTab={handleAddTab}
          onDuplicateTab={handleDuplicateTab}
        />
      )}

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Canvas Area */}
        <main className="flex-1 relative">
          <div className="absolute inset-0">
            <ProjectProvider
              projectPath={currentProjectPath}
              onSaveFile={handleSaveFile}
              onRequestFilePicker={handleRequestFilePicker}
              isLocked={isCanvasLocked}
            >
              <RunWorkflowProvider
                runWorkflow={handleRunWorkflow}
                isRunning={isRunning}
                hasProjectPath={!!currentProjectPath}
              >
                <ReactFlowCanvas
                  ref={canvasRef}
                  onWorkflowChange={handleWorkflowChange}
                  onRequestPromptCreation={handleRequestPromptCreation}
                  onRequestContextCreation={handleRequestContextCreation}
                  onRequestToolCreation={handleRequestToolCreation}
                  onRequestProcessCreation={handleRequestProcessCreation}
                  onRequestOutputFileCreation={handleRequestOutputFileCreation}
                  isLocked={isCanvasLocked}
                  onToggleLock={() => setIsCanvasLocked(!isCanvasLocked)}
                  activeTabId={activeTabId ?? undefined}
                />
              </RunWorkflowProvider>
            </ProjectProvider>
          </div>
        </main>
      </div>

      {/* Project Switcher */}
      <ProjectSwitcher
        isOpen={isProjectSwitcherOpen}
        onClose={() => setIsProjectSwitcherOpen(false)}
        onCreateProject={handleCreateNewProject}
        onLoadProject={handleLoadExistingProject}
        recentProjects={recentProjects}
        onRemoveRecent={handleRemoveRecentProject}
        currentProjectPath={currentProjectPath}
        mode={projectSwitcherMode}
      />

      {/* Save Confirm Dialog */}
      <SaveConfirmDialog
        isOpen={isSaveConfirmOpen}
        projectPath={currentProjectPath || ""}
        onSaveAndContinue={handleSaveAndContinue}
        onDontSave={handleDontSave}
        onCancel={handleCancelNewProject}
      />

      {/* Run Confirm Dialog */}
      <RunConfirmDialog
        isOpen={isRunConfirmDialogOpen}
        onSaveAndRun={handleRunConfirmSaveAndRun}
        onCancel={handleRunConfirmCancel}
      />

      {/* Topology Save Dialog */}
      <ConfirmDialog
        isOpen={isTopologySaveDialogOpen}
        title="Save Before Viewing Topology?"
        description="You have unsaved changes. The workflow needs to be saved to generate an accurate topology."
        confirmLabel="Save & Show"
        onConfirm={handleTopologySaveAndShow}
        onCancel={handleTopologySaveCancel}
      />

      {/* Prompt Name Dialog */}
      <PromptNameDialog
        isOpen={isPromptNameDialogOpen}
        onSubmit={handleCreatePrompt}
        onSelectExisting={handleSelectExistingPrompt}
        onCancel={handleCancelPromptCreation}
        projectPath={currentProjectPath || undefined}
      />

      {/* Context Name Dialog */}
      <PromptNameDialog
        isOpen={isContextNameDialogOpen}
        onSubmit={handleCreateContext}
        onSelectExisting={handleSelectExistingContext}
        onCancel={handleCancelContextCreation}
        type="context"
        projectPath={currentProjectPath || undefined}
      />

      {/* Tool Name Dialog */}
      <PromptNameDialog
        isOpen={isToolNameDialogOpen}
        onSubmit={handleCreateTool}
        onSelectExisting={handleSelectExistingTool}
        onCancel={handleCancelToolCreation}
        type="tool"
        projectPath={currentProjectPath || undefined}
      />

      {/* Process Name Dialog */}
      <PromptNameDialog
        isOpen={isProcessNameDialogOpen}
        onSubmit={handleCreateProcess}
        onSelectExisting={handleSelectExistingProcess}
        onCancel={handleCancelProcessCreation}
        type="process"
        projectPath={currentProjectPath || undefined}
      />

      {/* Output File Name Dialog */}
      <PromptNameDialog
        isOpen={isOutputFileNameDialogOpen}
        onSubmit={handleCreateOutputFile}
        onSelectExisting={handleSelectExistingOutputFile}
        onCancel={handleCancelOutputFileCreation}
        type="outputFile"
        projectPath={currentProjectPath || undefined}
      />

      {/* Clear Canvas Confirm Dialog */}
      <ConfirmDialog
        isOpen={isClearDialogOpen}
        title="Clear Canvas"
        description="Are you sure you want to clear the canvas? This action cannot be undone."
        confirmLabel="Clear"
        variant="destructive"
        onConfirm={handleClearCanvasConfirm}
        onCancel={handleClearCanvasCancel}
      />

      {/* Tab Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={isTabDeleteDialogOpen}
        title="Delete Tab"
        description={`Are you sure you want to delete "${tabs.find(t => t.id === pendingDeleteTabId)?.name || 'this tab'}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleTabDeleteConfirm}
        onCancel={handleTabDeleteCancel}
      />

      {/* Topology Dialog */}
      <TopologyDialog
        isOpen={topologyResult !== null}
        result={topologyResult}
        onClose={() => setTopologyResult(null)}
      />

      {/* File Picker Dialog */}
      <FilePicker
        isOpen={isFilePickerOpen}
        projectPath={currentProjectPath || ""}
        initialPath={filePickerInitialPath}
        onSelect={handleFilePickerSelect}
        onCancel={handleFilePickerCancel}
        title="Select File"
        description="Choose a file to associate with this node"
        defaultExtensions={filePickerOptions?.extensions}
        filterLabel={filePickerOptions?.filterLabel}
        allowCreate={filePickerOptions?.allowCreate}
      />

      {/* Run Panel */}
      {isRunPanelOpen && (
        <RunPanel
          runId={currentRunId}
          projectPath={currentProjectPath || ""}
          onClose={handleCloseRunPanel}
          onRunComplete={handleRunComplete}
          onAgentStateChange={handleAgentStateChange}
          onUserInputStateChange={handleUserInputStateChange}
          onClearExecutionState={handleClearExecutionState}
          events={runEvents}
          onEventsChange={setRunEvents}
          lastRunStatus={lastRunStatus}
          onStatusChange={setLastRunStatus}
        />
      )}
    </div>
  );
}

// Wrapper with providers
export default function Home() {
  return (
    <ClipboardProvider>
      <TabsProvider>
        <TeleporterProvider>
          <HomeContent />
        </TeleporterProvider>
      </TabsProvider>
    </ClipboardProvider>
  );
}
