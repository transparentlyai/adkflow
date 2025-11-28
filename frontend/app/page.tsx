"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import ReactFlowCanvas, { ReactFlowCanvasRef } from "@/components/ReactFlowCanvas";
import TopMenubar from "@/components/TopMenubar";
import ConfirmDialog from "@/components/ConfirmDialog";
import ProjectDialog from "@/components/ProjectDialog";
import SaveConfirmDialog from "@/components/SaveConfirmDialog";
import PromptNameDialog from "@/components/PromptNameDialog";
import { loadProject, saveProject, createPrompt, createContext } from "@/lib/api";
import { loadSession, saveSession } from "@/lib/sessionStorage";
import type { Node, Edge } from "@xyflow/react";

export default function Home() {
  const [workflowName, setWorkflowName] = useState("Untitled Workflow");
  const [currentWorkflow, setCurrentWorkflow] = useState<{ nodes: Node[]; edges: Edge[]; viewport: { x: number; y: number; zoom: number } } | null>(null);
  const canvasRef = useRef<ReactFlowCanvasRef>(null);
  const [isSessionLoaded, setIsSessionLoaded] = useState(false);

  // Project state
  const [currentProjectPath, setCurrentProjectPath] = useState<string | null>(null);
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
  const [projectDialogMode, setProjectDialogMode] = useState<"create" | "load">("create");
  const [isSaveConfirmOpen, setIsSaveConfirmOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Prompt name dialog state
  const [isPromptNameDialogOpen, setIsPromptNameDialogOpen] = useState(false);
  const [pendingPromptPosition, setPendingPromptPosition] = useState<{ x: number; y: number } | undefined>(undefined);

  // Context name dialog state
  const [isContextNameDialogOpen, setIsContextNameDialogOpen] = useState(false);
  const [pendingContextPosition, setPendingContextPosition] = useState<{ x: number; y: number } | undefined>(undefined);

  // Clear canvas dialog state
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);

  // Load session on mount
  useEffect(() => {
    const session = loadSession();
    if (session && session.currentProjectPath) {
      setCurrentProjectPath(session.currentProjectPath);
      setWorkflowName(session.workflowName || "Untitled Workflow");
      setHasUnsavedChanges(session.hasUnsavedChanges || false);

      // Restore flow to canvas
      if (session.workflow) {
        // We need to wait for the canvas to be ready
        setTimeout(() => {
          if (canvasRef.current && session.workflow) {
            canvasRef.current.restoreFlow(session.workflow);
            setCurrentWorkflow(session.workflow);
          }
        }, 50);
      }
      setIsSessionLoaded(true);
    } else {
      // No session, show project dialog
      setIsProjectDialogOpen(true);
      setIsSessionLoaded(true);
    }
  }, []);

  // Save session whenever relevant state changes
  useEffect(() => {
    if (isSessionLoaded && currentProjectPath) {
      saveSession({
        currentProjectPath,
        workflowName,
        workflow: currentWorkflow,
        hasUnsavedChanges,
      });
    }
  }, [isSessionLoaded, currentProjectPath, workflowName, currentWorkflow, hasUnsavedChanges]);

  const handleWorkflowChange = useCallback((data: { nodes: Node[]; edges: Edge[] }) => {
    // Add default viewport
    const flowData = { ...data, viewport: { x: 0, y: 0, zoom: 1 } };
    setCurrentWorkflow(flowData);
    setHasUnsavedChanges(true);
  }, []);

  // Project Management Handlers
  const handleCreateNewProject = async (projectPath: string) => {
    try {
      setCurrentProjectPath(projectPath);
      setWorkflowName("Untitled Workflow");
      setIsProjectDialogOpen(false);
      setHasUnsavedChanges(false);

      // Clear canvas
      if (canvasRef.current) {
        canvasRef.current.clearCanvas();
      }
    } catch (error) {
      console.error("Error creating project:", error);
      alert("Failed to create project: " + (error as Error).message);
    }
  };

  const handleLoadExistingProject = async (projectPath: string) => {
    try {
      const response = await loadProject(projectPath);

      if (!response.exists) {
        alert(`No flow found at ${projectPath}. Would you like to create a new project there instead?`);
        return;
      }

      if (response.flow) {
        // Load flow into canvas
        setCurrentProjectPath(projectPath);
        setWorkflowName("Untitled Workflow");
        setIsProjectDialogOpen(false);
        setHasUnsavedChanges(false);

        if (canvasRef.current) {
          canvasRef.current.restoreFlow(response.flow);
        }
      }
    } catch (error) {
      console.error("Error loading project:", error);
      alert("Failed to load project: " + (error as Error).message);
    }
  };

  const handleSaveCurrentProject = async () => {
    if (!currentProjectPath) {
      alert("No project loaded. Please create or load a project first.");
      return;
    }

    try {
      // Get current flow from canvas using React Flow's native toObject
      const flow = canvasRef.current?.saveFlow();
      if (!flow) {
        alert("No flow data to save.");
        return;
      }

      const response = await saveProject(currentProjectPath, flow);

      if (response.success) {
        setHasUnsavedChanges(false);
      }
    } catch (error) {
      console.error("Error saving project:", error);
      alert("Failed to save project: " + (error as Error).message);
    }
  };

  const handleNewProject = () => {
    setProjectDialogMode("create");
    if (hasUnsavedChanges) {
      setIsSaveConfirmOpen(true);
    } else {
      setIsProjectDialogOpen(true);
    }
  };

  const handleLoadProject = () => {
    setProjectDialogMode("load");
    if (hasUnsavedChanges) {
      setIsSaveConfirmOpen(true);
    } else {
      setIsProjectDialogOpen(true);
    }
  };

  const handleSaveAndContinue = async () => {
    await handleSaveCurrentProject();
    setIsSaveConfirmOpen(false);
    setIsProjectDialogOpen(true);
  };

  const handleDontSave = () => {
    setIsSaveConfirmOpen(false);
    setIsProjectDialogOpen(true);
  };

  const handleCancelNewProject = () => {
    setIsSaveConfirmOpen(false);
  };

  const handleRequestPromptCreation = useCallback((position: { x: number; y: number }) => {
    setPendingPromptPosition(position);
    setIsPromptNameDialogOpen(true);
  }, []);

  const handleCreatePrompt = async (promptName: string) => {
    if (!currentProjectPath) {
      alert("No project loaded");
      return;
    }

    try {
      // Call backend to create the prompt file
      const response = await createPrompt(currentProjectPath, promptName);

      // Add prompt node to canvas with the file path and name
      if (canvasRef.current) {
        canvasRef.current.addPromptNode({
          name: promptName,
          file_path: response.file_path,
        }, pendingPromptPosition);
      }

      setIsPromptNameDialogOpen(false);
      setPendingPromptPosition(undefined);
      setHasUnsavedChanges(true);

    } catch (error) {
      console.error("Failed to create prompt:", error);
      alert("Failed to create prompt: " + (error as Error).message);
    }
  };

  const handleCancelPromptCreation = () => {
    setIsPromptNameDialogOpen(false);
    setPendingPromptPosition(undefined);
  };

  const handleRequestContextCreation = useCallback((position: { x: number; y: number }) => {
    setPendingContextPosition(position);
    setIsContextNameDialogOpen(true);
  }, []);

  const handleCreateContext = async (contextName: string) => {
    if (!currentProjectPath) {
      alert("No project loaded");
      return;
    }

    try {
      // Call backend to create the context file
      const response = await createContext(currentProjectPath, contextName);

      // Add context node to canvas with the file path and name
      if (canvasRef.current) {
        canvasRef.current.addContextNode({
          name: contextName,
          file_path: response.file_path,
        }, pendingContextPosition);
      }

      setIsContextNameDialogOpen(false);
      setPendingContextPosition(undefined);
      setHasUnsavedChanges(true);

    } catch (error) {
      console.error("Failed to create context:", error);
      alert("Failed to create context: " + (error as Error).message);
    }
  };

  const handleCancelContextCreation = () => {
    setIsContextNameDialogOpen(false);
    setPendingContextPosition(undefined);
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
            />
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
              <span className="text-xs text-orange-500 font-medium">Unsaved</span>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Canvas Area */}
        <main className="flex-1 relative">
          <div className="absolute inset-0">
            <ReactFlowCanvas
              ref={canvasRef}
              onWorkflowChange={handleWorkflowChange}
              onRequestPromptCreation={handleRequestPromptCreation}
              onRequestContextCreation={handleRequestContextCreation}
            />
          </div>
        </main>
      </div>

      {/* Project Dialog */}
      <ProjectDialog
        isOpen={isProjectDialogOpen}
        onCreateNew={handleCreateNewProject}
        onLoadExisting={handleLoadExistingProject}
        initialMode={projectDialogMode}
      />

      {/* Save Confirm Dialog */}
      <SaveConfirmDialog
        isOpen={isSaveConfirmOpen}
        projectPath={currentProjectPath || ""}
        onSaveAndContinue={handleSaveAndContinue}
        onDontSave={handleDontSave}
        onCancel={handleCancelNewProject}
      />

      {/* Prompt Name Dialog */}
      <PromptNameDialog
        isOpen={isPromptNameDialogOpen}
        onSubmit={handleCreatePrompt}
        onCancel={handleCancelPromptCreation}
      />

      {/* Context Name Dialog */}
      <PromptNameDialog
        isOpen={isContextNameDialogOpen}
        onSubmit={handleCreateContext}
        onCancel={handleCancelContextCreation}
        type="context"
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
    </div>
  );
}
