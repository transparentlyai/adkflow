"use client";

import { useState, useRef, useCallback } from "react";
import Toolbar from "@/components/Toolbar";
import ReactFlowCanvas, { ReactFlowCanvasRef } from "@/components/ReactFlowCanvas";
import PromptEditorModal, { PromptData } from "@/components/PromptEditorModal";
import ProjectDialog from "@/components/ProjectDialog";
import SaveConfirmDialog from "@/components/SaveConfirmDialog";
import PromptNameDialog from "@/components/PromptNameDialog";
import { loadProject, saveProject, createPrompt } from "@/lib/api";
import { reactFlowToWorkflow } from "@/lib/workflowHelpers";
import type { Workflow } from "@/lib/types";
import type { Node, Edge } from "@xyflow/react";

export default function Home() {
  const [workflowName, setWorkflowName] = useState("Untitled Workflow");
  const [currentWorkflow, setCurrentWorkflow] = useState<{ nodes: Node[]; edges: Edge[] } | null>(null);
  const canvasRef = useRef<ReactFlowCanvasRef>(null);

  // Project state
  const [currentProjectPath, setCurrentProjectPath] = useState<string | null>(null);
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(true);
  const [isSaveConfirmOpen, setIsSaveConfirmOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Prompt editor state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState<PromptData | null>(null);

  // Prompt name dialog state
  const [isPromptNameDialogOpen, setIsPromptNameDialogOpen] = useState(false);

  const handleWorkflowChange = useCallback((data: { nodes: Node[]; edges: Edge[] }) => {
    setCurrentWorkflow(data);
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
        alert(`No workflow found at ${projectPath}. Would you like to create a new project there instead?`);
        return;
      }

      if (response.workflow) {
        // Load workflow into canvas
        setCurrentProjectPath(projectPath);
        setWorkflowName(response.workflow.name || "Untitled Workflow");
        setIsProjectDialogOpen(false);
        setHasUnsavedChanges(false);

        if (canvasRef.current && response.workflow) {
          canvasRef.current.importFromWorkflow(response.workflow);
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
      // Get current workflow from canvas
      const reactFlowData = canvasRef.current?.getDrawflowData();
      if (!reactFlowData) {
        alert("No workflow data to save.");
        return;
      }

      // Convert React Flow data to workflow format
      const workflow = reactFlowToWorkflow(
        reactFlowData.nodes,
        reactFlowData.edges,
        workflowName
      );

      const response = await saveProject(currentProjectPath, workflow);

      if (response.success) {
        setHasUnsavedChanges(false);
      }
    } catch (error) {
      console.error("Error saving project:", error);
      alert("Failed to save project: " + (error as Error).message);
    }
  };

  const handleNewProject = () => {
    if (hasUnsavedChanges) {
      setIsSaveConfirmOpen(true);
    } else {
      setIsProjectDialogOpen(true);
    }
  };

  const handleLoadProject = () => {
    if (hasUnsavedChanges) {
      // TODO: Show save confirmation before loading new project
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

      // Add prompt node to canvas with file path
      if (canvasRef.current) {
        // TODO: Update addPromptNode to accept prompt data
        canvasRef.current.addPromptNode();
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

  const handleOpenPromptEditor = (promptData: PromptData) => {
    setCurrentPrompt(promptData);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentPrompt(null);
  };

  const handleSavePrompt = (updatedPrompt: PromptData) => {
    // With file-based prompts, the content is saved to files
    // React Flow will automatically re-render when node data changes
    setHasUnsavedChanges(true);
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
          hasProjectPath={!!currentProjectPath}
        />

        {/* Canvas Area */}
        <main className="flex-1 relative">
          <div className="absolute inset-0">
            <ReactFlowCanvas
              ref={canvasRef}
              onWorkflowChange={handleWorkflowChange}
              onOpenPromptEditor={(promptId: string) => {
                // TODO: Load prompt file content and open editor
              }}
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

      {/* Project Dialog */}
      <ProjectDialog
        isOpen={isProjectDialogOpen}
        onCreateNew={handleCreateNewProject}
        onLoadExisting={handleLoadExistingProject}
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
    </div>
  );
}
