"use client";

import { useState, RefObject } from "react";
import type { ReactFlowCanvasRef } from "@/components/ReactFlowCanvas";

interface ToolbarProps {
  canvasRef: RefObject<ReactFlowCanvasRef>;
  onSaveProject?: () => void;
  onLoadProject?: () => void;
  onAddPrompt?: () => void;
  onAddContext?: () => void;
  hasProjectPath?: boolean;
}

export default function Toolbar({
  canvasRef,
  onSaveProject,
  onLoadProject,
  onAddPrompt,
  onAddContext,
  hasProjectPath = false,
}: ToolbarProps) {
  const [isSaving, setIsSaving] = useState(false);

  const handleAddGroup = () => {
    if (!hasProjectPath) return;
    canvasRef.current?.addGroupNode();
  };

  const handleAddAgent = () => {
    if (!hasProjectPath) return;
    canvasRef.current?.addAgentNode();
  };

  const handleAddPrompt = () => {
    if (!hasProjectPath || !onAddPrompt) return;
    onAddPrompt(); // Show the prompt name dialog
  };

  const handleAddContext = () => {
    if (!hasProjectPath || !onAddContext) return;
    onAddContext(); // Show the context name dialog
  };

  const handleAddInputProbe = () => {
    if (!hasProjectPath) return;
    canvasRef.current?.addInputProbeNode();
  };

  const handleAddOutputProbe = () => {
    if (!hasProjectPath) return;
    canvasRef.current?.addOutputProbeNode();
  };

  const handleAddTool = () => {
    if (!hasProjectPath) return;
    canvasRef.current?.addToolNode();
  };

  const handleAddAgentTool = () => {
    if (!hasProjectPath) return;
    canvasRef.current?.addAgentToolNode();
  };

  const handleAddVariable = () => {
    if (!hasProjectPath) return;
    canvasRef.current?.addVariableNode();
  };

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
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
              onClick={handleAddVariable}
              onDragStart={(e) => onDragStart(e, 'variable')}
              draggable={hasProjectPath}
              disabled={!hasProjectPath}
              className="w-full px-3 py-2 bg-violet-600 text-white rounded-md hover:bg-violet-700 transition-colors flex items-center gap-2 text-xs font-medium disabled:bg-gray-300 disabled:cursor-not-allowed cursor-grab active:cursor-grabbing"
              title={!hasProjectPath ? "Create or load a project first" : "Drag to canvas or click to add Variable"}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
              </svg>
              <span>Variable</span>
            </button>
            <button
              onClick={handleAddGroup}
              onDragStart={(e) => onDragStart(e, 'group')}
              draggable={hasProjectPath}
              disabled={!hasProjectPath}
              className="w-full px-3 py-2 bg-gray-400 text-white rounded-md hover:bg-gray-500 transition-colors flex items-center gap-2 text-xs font-medium disabled:bg-gray-300 disabled:cursor-not-allowed cursor-grab active:cursor-grabbing"
              title={!hasProjectPath ? "Create or load a project first" : "Drag to canvas or click to add Group"}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2" strokeDasharray="4 2"/>
              </svg>
              <span>Group</span>
            </button>
            <button
              onClick={handleAddAgent}
              onDragStart={(e) => onDragStart(e, 'agent')}
              draggable={hasProjectPath}
              disabled={!hasProjectPath}
              className="w-full px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors flex items-center gap-2 text-xs font-medium disabled:bg-gray-300 disabled:cursor-not-allowed cursor-grab active:cursor-grabbing"
              title={!hasProjectPath ? "Create or load a project first" : "Drag to canvas or click to add Agent"}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="4" y="4" width="16" height="16" rx="2" strokeWidth="2"/>
              </svg>
              <span>Agent</span>
            </button>
            <button
              onClick={handleAddPrompt}
              onDragStart={(e) => onDragStart(e, 'prompt')}
              draggable={hasProjectPath}
              disabled={!hasProjectPath}
              className="w-full px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-2 text-xs font-medium disabled:bg-gray-300 disabled:cursor-not-allowed cursor-grab active:cursor-grabbing"
              title={!hasProjectPath ? "Create or load a project first" : "Drag to canvas or click to add Prompt"}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              <span>Prompt</span>
            </button>
            <button
              onClick={handleAddContext}
              onDragStart={(e) => onDragStart(e, 'context')}
              draggable={hasProjectPath}
              disabled={!hasProjectPath}
              className="w-full px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2 text-xs font-medium disabled:bg-gray-300 disabled:cursor-not-allowed cursor-grab active:cursor-grabbing"
              title={!hasProjectPath ? "Create or load a project first" : "Drag to canvas or click to add Context"}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              <span>Context</span>
            </button>
            <button
              onClick={handleAddInputProbe}
              onDragStart={(e) => onDragStart(e, 'inputProbe')}
              draggable={hasProjectPath}
              disabled={!hasProjectPath}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-800 transition-colors flex items-center gap-2 text-xs font-medium disabled:bg-gray-300 disabled:cursor-not-allowed cursor-grab active:cursor-grabbing"
              title={!hasProjectPath ? "Create or load a project first" : "Drag to canvas or click to add Input Probe"}
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" />
              </svg>
              <span>Input Probe</span>
            </button>
            <button
              onClick={handleAddOutputProbe}
              onDragStart={(e) => onDragStart(e, 'outputProbe')}
              draggable={hasProjectPath}
              disabled={!hasProjectPath}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-800 transition-colors flex items-center gap-2 text-xs font-medium disabled:bg-gray-300 disabled:cursor-not-allowed cursor-grab active:cursor-grabbing"
              title={!hasProjectPath ? "Create or load a project first" : "Drag to canvas or click to add Output Probe"}
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" />
              </svg>
              <span>Output Probe</span>
            </button>
            <button
              onClick={handleAddTool}
              onDragStart={(e) => onDragStart(e, 'tool')}
              draggable={hasProjectPath}
              disabled={!hasProjectPath}
              className="w-full px-3 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors flex items-center gap-2 text-xs font-medium disabled:bg-gray-300 disabled:cursor-not-allowed cursor-grab active:cursor-grabbing"
              title={!hasProjectPath ? "Create or load a project first" : "Drag to canvas or click to add Tool"}
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" />
              </svg>
              <span>Tool</span>
            </button>
            <button
              onClick={handleAddAgentTool}
              onDragStart={(e) => onDragStart(e, 'agentTool')}
              draggable={hasProjectPath}
              disabled={!hasProjectPath}
              className="w-full px-3 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors flex items-center gap-2 text-xs font-medium disabled:bg-gray-300 disabled:cursor-not-allowed cursor-grab active:cursor-grabbing"
              title={!hasProjectPath ? "Create or load a project first" : "Drag to canvas or click to add Agent Tool"}
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <rect x="4" y="4" width="16" height="16" rx="2" />
              </svg>
              <span>Agent Tool</span>
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
