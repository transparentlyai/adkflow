"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import PathPicker from "@/components/PathPicker";

interface ProjectDialogProps {
  isOpen: boolean;
  onCreateNew: (projectPath: string) => void;
  onLoadExisting: (projectPath: string) => void;
  onClose?: () => void;
  initialMode?: "create" | "load";
}

export default function ProjectDialog({
  isOpen,
  onCreateNew,
  onLoadExisting,
  onClose,
  initialMode = "create",
}: ProjectDialogProps) {
  const [mode, setMode] = useState<"create" | "load">(initialMode);
  const [projectPath, setProjectPath] = useState("");
  const [error, setError] = useState("");
  const [isPathPickerOpen, setIsPathPickerOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
    }
  }, [isOpen, initialMode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!projectPath.trim()) {
      setError("Please select a project path");
      return;
    }

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
    <>
      <Dialog
        open={isOpen && !isPathPickerOpen}
        onOpenChange={(open) => !open && onClose?.()}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl">Welcome to ADKFlow</DialogTitle>
            <DialogDescription>
              Create a new workflow or load an existing one
            </DialogDescription>
          </DialogHeader>

          {/* Mode Tabs */}
          <div className="flex border-b border-border -mx-6 px-6">
            <button
              type="button"
              onClick={() => handleModeChange("create")}
              className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                mode === "create"
                  ? "text-primary border-b-2 border-primary bg-accent"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              Create New Workflow
            </button>
            <button
              type="button"
              onClick={() => handleModeChange("load")}
              className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                mode === "load"
                  ? "text-primary border-b-2 border-primary bg-accent"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              Load Existing Workflow
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Project Path
              </label>
              <Button
                type="button"
                variant="outline"
                onClick={handleOpenPathPicker}
                className="w-full justify-start h-auto py-2 px-4"
              >
                {projectPath ? (
                  <span className="font-mono text-sm">{projectPath}</span>
                ) : (
                  <span className="text-muted-foreground text-sm">
                    Click to browse...
                  </span>
                )}
              </Button>
              <p className="mt-1 text-xs text-muted-foreground">
                {mode === "create"
                  ? "Directory where the new project will be created"
                  : "Directory containing the existing project"}
              </p>
            </div>

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <div className="p-4 bg-muted rounded-md">
              <h4 className="text-sm font-medium mb-2">
                {mode === "create" ? "What happens next:" : "What will happen:"}
              </h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                {mode === "create" ? (
                  <>
                    <li>• Start with a blank workflow canvas</li>
                    <li>• Create your workflow visually</li>
                    <li>• On save: project directory will be created</li>
                    <li>• Workflow saved as JSON</li>
                  </>
                ) : (
                  <>
                    <li>• Load project from the selected path</li>
                    <li>• Display workflow in the editor</li>
                    <li>• Edit and update as needed</li>
                    <li>• On save: project will be updated</li>
                  </>
                )}
              </ul>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button type="submit" className="flex-1">
                {mode === "create" ? "Create Project" : "Load Project"}
              </Button>
              {onClose && (
                <Button type="button" variant="ghost" onClick={onClose}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Path Picker Modal */}
      <PathPicker
        isOpen={isPathPickerOpen}
        initialPath="~"
        onSelect={handlePathSelected}
        onCancel={handlePathPickerCancel}
        title={
          mode === "create"
            ? "Select Directory for New Project"
            : "Select Existing Project Directory"
        }
        description={
          mode === "create"
            ? "Choose where to create your new workflow project"
            : "Choose the project directory to load"
        }
      />
    </>
  );
}
