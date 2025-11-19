"use client";

import { useState, RefObject } from "react";
import type { ReactFlowCanvasRef } from "@/components/ReactFlowCanvas";

interface ToolbarProps {
  canvasRef: RefObject<ReactFlowCanvasRef>;
  workflowName: string;
  onSaveProject?: () => void;
  onLoadProject?: () => void;
  onAddPrompt?: () => void;  // New: Handler to show prompt name dialog
  hasProjectPath?: boolean;
}

export default function Toolbar({
  canvasRef,
  workflowName,
  onSaveProject,
  onLoadProject,
  onAddPrompt,
  hasProjectPath = false,
}: ToolbarProps) {
  const [isSaving, setIsSaving] = useState(false);

  const handleAddAgent = () => {
    if (!hasProjectPath) return;
    canvasRef.current?.addAgentNode();
  };

  const handleAddSubagent = () => {
    if (!hasProjectPath) return;
    canvasRef.current?.addSubagentNode();
  };

  const handleAddPrompt = () => {
    if (!hasProjectPath || !onAddPrompt) return;
    onAddPrompt(); // Show the prompt name dialog
  };

  const handleClear = () => {
    if (confirm("Are you sure you want to clear the canvas? This cannot be undone.")) {
      canvasRef.current?.clearCanvas();
    }
  };

  const handleSave = async () => {
    if (!onSaveProject) return;
    setIsSaving(true);
    try {
      await onSaveProject();
      alert("Project saved successfully!");
    } catch (error) {
      console.error("Save failed:", error);
      alert("Failed to save project");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoad = () => {
    if (onLoadProject) {
      onLoadProject();
    }
  };

  return (
    <aside className="w-64 bg-white border-r border-gray-200 p-4 overflow-y-auto">
      <div className="space-y-6">
        {/* Add Nodes Section */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
            Add Nodes
          </h3>
          <div className="space-y-2">
            <button
              onClick={handleAddAgent}
              disabled={!hasProjectPath}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
              title={!hasProjectPath ? "Create or load a project first" : ""}
            >
              <span className="text-xl">+</span>
              <span>Agent</span>
            </button>
            <button
              onClick={handleAddSubagent}
              disabled={!hasProjectPath}
              className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
              title={!hasProjectPath ? "Create or load a project first" : ""}
            >
              <span className="text-xl">+</span>
              <span>Subagent</span>
            </button>
            <button
              onClick={handleAddPrompt}
              disabled={!hasProjectPath}
              className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
              title={!hasProjectPath ? "Create or load a project first" : ""}
            >
              <span className="text-xl">+</span>
              <span>Prompt</span>
            </button>
          </div>
        </div>

        {/* Project Operations */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
            Project
          </h3>
          <div className="space-y-2">
            {onLoadProject && (
              <button
                onClick={handleLoad}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
              >
                Load Project
              </button>
            )}
            {hasProjectPath && onSaveProject && (
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed font-medium"
              >
                {isSaving ? "Saving..." : "Save Project"}
              </button>
            )}
          </div>
        </div>

        {/* Canvas Actions Section */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
            Canvas Actions
          </h3>
          <button
            onClick={handleClear}
            className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            Clear Canvas
          </button>
        </div>

        {/* Node Legend */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
            Node Types
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-600 rounded"></div>
              <span className="text-gray-600">Agent - Main workflow component</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-purple-600 rounded"></div>
              <span className="text-gray-600">Subagent - Nested agent</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-600 rounded"></div>
              <span className="text-gray-600">Prompt - Input text</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
