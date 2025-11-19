"use client";

import { useState } from "react";
import PathPicker from "@/components/PathPicker";

interface ProjectDialogProps {
  isOpen: boolean;
  onCreateNew: (projectPath: string) => void;
  onLoadExisting: (projectPath: string) => void;
  onClose?: () => void;
}

export default function ProjectDialog({
  isOpen,
  onCreateNew,
  onLoadExisting,
  onClose,
}: ProjectDialogProps) {
  const [mode, setMode] = useState<"create" | "load">("create");
  const [projectPath, setProjectPath] = useState("");
  const [error, setError] = useState("");
  const [isPathPickerOpen, setIsPathPickerOpen] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate path
    if (!projectPath.trim()) {
      setError("Please select a project path");
      return;
    }

    // Call appropriate handler
    if (mode === "create") {
      onCreateNew(projectPath.trim());
    } else {
      onLoadExisting(projectPath.trim());
    }
  };

  const handleModeChange = (newMode: "create" | "load") => {
    setMode(newMode);
    setError("");
  };

  const handleOpenPathPicker = () => {
    setIsPathPickerOpen(true);
  };

  const handlePathSelected = (path: string) => {
    setProjectPath(path);
    setIsPathPickerOpen(false);
  };

  const handlePathPickerCancel = () => {
    setIsPathPickerOpen(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            Welcome to ADKFlow
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Create a new workflow or load an existing one
          </p>
        </div>

        {/* Mode Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            type="button"
            onClick={() => handleModeChange("create")}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              mode === "create"
                ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            Create New Workflow
          </button>
          <button
            type="button"
            onClick={() => handleModeChange("load")}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              mode === "load"
                ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            Load Existing Workflow
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-4">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project Path
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleOpenPathPicker}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-left"
              >
                {projectPath ? (
                  <span className="font-mono text-sm text-gray-900">{projectPath}</span>
                ) : (
                  <span className="text-gray-400 text-sm">Click to browse...</span>
                )}
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {mode === "create"
                ? "Directory where the new project will be created"
                : "Directory containing the existing project"}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="mb-4 p-4 bg-gray-50 rounded-md">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              {mode === "create" ? "What happens next:" : "What will happen:"}
            </h4>
            <ul className="text-xs text-gray-600 space-y-1">
              {mode === "create" ? (
                <>
                  <li>• Start with a blank workflow canvas</li>
                  <li>• Create your workflow visually</li>
                  <li>• On save: directory will be created</li>
                  <li>• Workflow saved as workflow.yaml</li>
                </>
              ) : (
                <>
                  <li>• Load workflow.yaml from the path</li>
                  <li>• Display workflow in the editor</li>
                  <li>• Edit and update as needed</li>
                  <li>• On save: workflow.yaml will be updated</li>
                </>
              )}
            </ul>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              {mode === "create" ? "Create Project" : "Load Project"}
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Path Picker Modal */}
      <PathPicker
        isOpen={isPathPickerOpen}
        initialPath="~"
        onSelect={handlePathSelected}
        onCancel={handlePathPickerCancel}
        title={mode === "create" ? "Select Directory for New Project" : "Select Existing Project Directory"}
        description={mode === "create" ? "Choose where to create your new workflow project" : "Choose the directory containing workflow.yaml"}
      />
    </div>
  );
}
