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

  const handleAddMasterAgent = () => {
    if (!hasProjectPath) return;
    canvasRef.current?.addMasterAgentNode();
  };

  const handleAddAgent = () => {
    if (!hasProjectPath) return;
    canvasRef.current?.addAgentNode();
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
    <aside className="w-48 bg-white border-r border-gray-200 p-3 overflow-y-auto">
      <div className="space-y-5">
        {/* Add Nodes Section */}
        <div>
          <h3 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
            Add Nodes
          </h3>
          <div className="space-y-1.5">
            <button
              onClick={handleAddMasterAgent}
              disabled={!hasProjectPath}
              className="w-full px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2 text-xs font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
              title={!hasProjectPath ? "Create or load a project first" : "Add Master Agent"}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2"/>
                <rect x="7" y="7" width="10" height="10" rx="1" strokeWidth="2"/>
              </svg>
              <span>Master Agent</span>
            </button>
            <button
              onClick={handleAddAgent}
              disabled={!hasProjectPath}
              className="w-full px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors flex items-center gap-2 text-xs font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
              title={!hasProjectPath ? "Create or load a project first" : "Add Agent"}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="4" y="4" width="16" height="16" rx="2" strokeWidth="2"/>
              </svg>
              <span>Agent</span>
            </button>
            <button
              onClick={handleAddPrompt}
              disabled={!hasProjectPath}
              className="w-full px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-2 text-xs font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
              title={!hasProjectPath ? "Create or load a project first" : "Add Prompt"}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              <span>Prompt</span>
            </button>
          </div>
        </div>

        {/* Project Operations */}
        <div>
          <h3 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
            Project
          </h3>
          <div className="space-y-1.5">
            {onLoadProject && (
              <button
                onClick={handleLoad}
                className="w-full px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-xs font-medium flex items-center gap-2"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
                </svg>
                <span>Load Project</span>
              </button>
            )}
            {hasProjectPath && onSaveProject && (
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed text-xs font-medium flex items-center gap-2"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/>
                </svg>
                <span>{isSaving ? "Saving..." : "Save Project"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Canvas Actions Section */}
        <div>
          <h3 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
            Canvas Actions
          </h3>
          <button
            onClick={handleClear}
            className="w-full px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-xs font-medium flex items-center gap-2"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
            <span>Clear Canvas</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
