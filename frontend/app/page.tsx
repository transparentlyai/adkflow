"use client";

import { useState, useRef, useEffect } from "react";
import Toolbar from "@/components/Toolbar";
import DrawflowCanvas, { DrawflowCanvasRef } from "@/components/DrawflowCanvas";
import PromptEditorModal, { PromptData } from "@/components/PromptEditorModal";
import ProjectDialog from "@/components/ProjectDialog";
import SaveConfirmDialog from "@/components/SaveConfirmDialog";
import { loadProject, saveProject } from "@/lib/api";
import { workflowToDrawflow } from "@/lib/workflowHelpers";
import type { Workflow } from "@/lib/types";

export default function Home() {
  const [workflowName, setWorkflowName] = useState("Untitled Workflow");
  const [currentWorkflow, setCurrentWorkflow] = useState<any>(null);
  const canvasRef = useRef<DrawflowCanvasRef>(null);

  // Project state
  const [currentProjectPath, setCurrentProjectPath] = useState<string | null>(null);
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(true);
  const [isSaveConfirmOpen, setIsSaveConfirmOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Prompt editor state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState<PromptData | null>(null);

  const handleWorkflowChange = (workflow: any) => {
    setCurrentWorkflow(workflow);
    setHasUnsavedChanges(true);
  };

  const handleWorkflowLoaded = (workflow: Workflow) => {
    setWorkflowName(workflow.name);
  };

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

        // Convert workflow to drawflow format and load into canvas
        // const drawflowData = workflowToDrawflow(response.workflow);
        // if (canvasRef.current) {
        //   canvasRef.current.importFromWorkflow(drawflowData);
        // }

        console.log("Loaded workflow:", response.workflow);
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
      const drawflowData = canvasRef.current?.getDrawflowData();
      if (!drawflowData) {
        alert("No workflow data to save.");
        return;
      }

      // Convert drawflow data to workflow format
      // For now, we'll use a simplified workflow structure
      const workflow: Workflow = {
        name: workflowName,
        description: "Workflow created with ADKFlow",
        agents: [],
        prompts: [],
        connections: [],
        metadata: { drawflow: drawflowData },
      };

      const response = await saveProject(currentProjectPath, workflow);

      if (response.success) {
        setHasUnsavedChanges(false);
        console.log("Project saved successfully:", response.message);
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

  const handleOpenPromptEditor = (promptData: PromptData) => {
    setCurrentPrompt(promptData);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentPrompt(null);
  };

  const handleSavePrompt = (updatedPrompt: PromptData) => {
    // Update the prompt in the Drawflow canvas
    if (!canvasRef.current) return;

    const drawflowData = canvasRef.current.getDrawflowData();
    if (!drawflowData || !drawflowData.drawflow || !drawflowData.drawflow.Home) return;

    const nodes = drawflowData.drawflow.Home.data;

    // Find and update the prompt node
    for (const nodeId in nodes) {
      const node = nodes[nodeId];
      if (node.data && node.data.id === updatedPrompt.id && node.data.type === 'prompt') {
        // Update the node data
        node.data.text = updatedPrompt.content;
        node.data.variables = updatedPrompt.variables;

        // Regenerate the HTML for the node
        const { getPromptNodeHTML } = require("@/components/nodes/PromptNode");
        node.html = getPromptNodeHTML({
          id: node.data.id,
          text: updatedPrompt.content,
          description: node.data.description,
        });

        console.log("Prompt updated:", updatedPrompt);
        break;
      }
    }

    // Trigger workflow change notification
    handleWorkflowChange(drawflowData);
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
          hasProjectPath={!!currentProjectPath}
        />

        {/* Canvas Area */}
        <main className="flex-1 relative">
          <div className="absolute inset-0">
            <DrawflowCanvas
              ref={canvasRef}
              onWorkflowChange={handleWorkflowChange}
              onOpenPromptEditor={handleOpenPromptEditor}
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
    </div>
  );
}
