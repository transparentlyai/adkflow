"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Toolbar from "@/components/Toolbar";
import ReactFlowCanvas, { ReactFlowCanvasRef } from "@/components/ReactFlowCanvas";
import PromptEditorModal, { PromptData } from "@/components/PromptEditorModal";
import ProjectDialog from "@/components/ProjectDialog";
import SaveConfirmDialog from "@/components/SaveConfirmDialog";
import PromptNameDialog from "@/components/PromptNameDialog";
import { loadProject, saveProject, createPrompt, createContext, readPrompt, savePrompt } from "@/lib/api";
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

  // Prompt editor state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState<PromptData | null>(null);

  // Prompt name dialog state
  const [isPromptNameDialogOpen, setIsPromptNameDialogOpen] = useState(false);

  // Context editor state
  const [isContextModalOpen, setIsContextModalOpen] = useState(false);
  const [currentContext, setCurrentContext] = useState<PromptData | null>(null);

  // Context name dialog state
  const [isContextNameDialogOpen, setIsContextNameDialogOpen] = useState(false);

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

  const handleShowPromptNameDialog = () => {
    setIsPromptNameDialogOpen(true);
  };

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
        });
      }

      setIsPromptNameDialogOpen(false);
      setHasUnsavedChanges(true);

    } catch (error) {
      console.error("Failed to create prompt:", error);
      alert("Failed to create prompt: " + (error as Error).message);
    }
  };

  const handleCancelPromptCreation = () => {
    setIsPromptNameDialogOpen(false);
  };

  const handleOpenPromptEditor = async (promptId: string, promptName: string, filePath: string) => {
    if (!currentProjectPath) {
      alert("No project loaded");
      return;
    }

    try {
      // Load prompt content from file
      const response = await readPrompt(currentProjectPath, filePath);

      const promptData: PromptData = {
        id: promptId,
        name: promptName,
        content: response.content,
        filePath: filePath,
      };

      setCurrentPrompt(promptData);
      setIsModalOpen(true);
    } catch (error) {
      console.error("Failed to load prompt:", error);
      alert("Failed to load prompt: " + (error as Error).message);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentPrompt(null);
  };

  const handleSavePrompt = async (updatedPrompt: PromptData) => {
    if (!currentProjectPath) {
      alert("No project loaded");
      return;
    }

    try {
      // Save prompt content to file
      await savePrompt(currentProjectPath, updatedPrompt.filePath, updatedPrompt.content);

      // Update the prompt node in the canvas with new name and content
      if (canvasRef.current) {
        canvasRef.current.updatePromptNode(
          updatedPrompt.id,
          updatedPrompt.name,
          updatedPrompt.content,
          updatedPrompt.filePath
        );
      }

      setHasUnsavedChanges(true);
    } catch (error) {
      console.error("Failed to save prompt:", error);
      alert("Failed to save prompt: " + (error as Error).message);
    }
  };

  // Context Handlers
  const handleShowContextNameDialog = () => {
    setIsContextNameDialogOpen(true);
  };

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
        });
      }

      setIsContextNameDialogOpen(false);
      setHasUnsavedChanges(true);

    } catch (error) {
      console.error("Failed to create context:", error);
      alert("Failed to create context: " + (error as Error).message);
    }
  };

  const handleCancelContextCreation = () => {
    setIsContextNameDialogOpen(false);
  };

  const handleOpenContextEditor = async (contextId: string, contextName: string, filePath: string) => {
    if (!currentProjectPath) {
      alert("No project loaded");
      return;
    }

    try {
      // Load context content from file (using readPrompt since it's the same format)
      const response = await readPrompt(currentProjectPath, filePath);

      const contextData: PromptData = {
        id: contextId,
        name: contextName,
        content: response.content,
        filePath: filePath,
      };

      setCurrentContext(contextData);
      setIsContextModalOpen(true);
    } catch (error) {
      console.error("Failed to load context:", error);
      alert("Failed to load context: " + (error as Error).message);
    }
  };

  const handleCloseContextModal = () => {
    setIsContextModalOpen(false);
    setCurrentContext(null);
  };

  const handleSaveContext = async (updatedContext: PromptData) => {
    if (!currentProjectPath) {
      alert("No project loaded");
      return;
    }

    try {
      // Save context content to file (using savePrompt since it's the same format)
      await savePrompt(currentProjectPath, updatedContext.filePath, updatedContext.content);

      // Update the context node in the canvas with new name and content
      if (canvasRef.current) {
        canvasRef.current.updateContextNode(
          updatedContext.id,
          updatedContext.name,
          updatedContext.content,
          updatedContext.filePath
        );
      }

      setHasUnsavedChanges(true);
    } catch (error) {
      console.error("Failed to save context:", error);
      alert("Failed to save context: " + (error as Error).message);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-blue-600">ADKFlow</h1>
            <input
              type="text"
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              className="text-lg font-semibold border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 text-gray-900 placeholder:text-gray-400"
              placeholder="Workflow Name"
            />
            {currentProjectPath && (
              <span className="text-xs text-gray-400 font-mono">
                {currentProjectPath}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleNewProject}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-md transition-colors text-sm"
            >
              New Project
            </button>
            <div className="text-sm text-gray-500">
              Visual Workflow Editor for Google ADK
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Toolbar */}
        <Toolbar
          canvasRef={canvasRef}
          workflowName={workflowName}
          onSaveProject={handleSaveCurrentProject}
          onLoadProject={handleLoadProject}
          onAddPrompt={handleShowPromptNameDialog}
          onAddContext={handleShowContextNameDialog}
          hasProjectPath={!!currentProjectPath}
        />

        {/* Canvas Area */}
        <main className="flex-1 relative">
          <div className="absolute inset-0">
            <ReactFlowCanvas
              ref={canvasRef}
              onWorkflowChange={handleWorkflowChange}
              onOpenPromptEditor={handleOpenPromptEditor}
              onOpenContextEditor={handleOpenContextEditor}
            />
          </div>
        </main>
      </div>

      {/* Prompt Editor Modal */}
      <PromptEditorModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        promptData={currentPrompt}
        onSave={handleSavePrompt}
      />

      {/* Context Editor Modal */}
      <PromptEditorModal
        isOpen={isContextModalOpen}
        onClose={handleCloseContextModal}
        promptData={currentContext}
        onSave={handleSaveContext}
        type="context"
      />

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
    </div>
  );
}
