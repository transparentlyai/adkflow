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
import { Input } from "@/components/ui/input";
import InlinePathPicker from "@/components/InlinePathPicker";
import RecentProjectsList from "@/components/RecentProjectsList";
import type { RecentProject } from "@/lib/recentProjects";
import {
  getLastUsedDirectory,
  sanitizeProjectName,
} from "@/lib/recentProjects";
import { FolderPlus, FolderOpen, ChevronDown, ChevronUp } from "lucide-react";

interface ProjectSwitcherProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: (projectPath: string, projectName: string) => void;
  onLoadProject: (projectPath: string) => void;
  recentProjects: RecentProject[];
  onRemoveRecent?: (projectPath: string) => void;
  currentProjectPath?: string | null;
  mode?: "create" | "open";
}

export default function ProjectSwitcher({
  isOpen,
  onClose,
  onCreateProject,
  onLoadProject,
  recentProjects,
  onRemoveRecent,
  currentProjectPath,
  mode: initialMode = "open",
}: ProjectSwitcherProps) {
  const [mode, setMode] = useState<"recent" | "create" | "browse">("recent");
  const [projectName, setProjectName] = useState("my-workflow");
  const [projectLocation, setProjectLocation] = useState<string>("~");
  const [showPathPicker, setShowPathPicker] = useState(false);
  const [error, setError] = useState("");

  // Set initial mode based on prop
  useEffect(() => {
    if (isOpen) {
      if (initialMode === "create") {
        setMode("create");
      } else {
        setMode("recent");
      }
      setError("");
      setShowPathPicker(false);
    }
  }, [isOpen, initialMode]);

  // Load last used directory
  useEffect(() => {
    const lastDir = getLastUsedDirectory();
    if (lastDir) {
      setProjectLocation(lastDir);
    }
  }, []);

  const handleSelectRecent = (project: RecentProject) => {
    onLoadProject(project.path);
    onClose();
  };

  const handleCreateProject = () => {
    const sanitizedName = sanitizeProjectName(projectName);
    if (!sanitizedName) {
      setError("Please enter a valid project name");
      return;
    }

    const fullPath =
      projectLocation === "/"
        ? `/${sanitizedName}`
        : `${projectLocation}/${sanitizedName}`;

    onCreateProject(fullPath, projectName.trim());
    onClose();
  };

  const handleBrowseSelect = (path: string) => {
    onLoadProject(path);
    onClose();
  };

  const sanitizedName = sanitizeProjectName(projectName);
  const fullPath =
    projectLocation === "/"
      ? `/${sanitizedName}`
      : sanitizedName
        ? `${projectLocation}/${sanitizedName}`
        : projectLocation;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {mode === "create"
              ? "Create New Project"
              : mode === "browse"
                ? "Browse for Project"
                : "Open Project"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Start a new workflow from scratch"
              : mode === "browse"
                ? "Navigate to an existing project directory"
                : "Select a recent project or create a new one"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Mode: Recent Projects */}
          {mode === "recent" && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto border border-border rounded-lg -mx-1">
                <RecentProjectsList
                  projects={recentProjects}
                  onSelect={handleSelectRecent}
                  onRemove={onRemoveRecent}
                  emptyMessage="No recent projects"
                  compact
                />
              </div>

              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  onClick={() => setMode("create")}
                  className="flex-1"
                >
                  <FolderPlus className="h-4 w-4 mr-2" />
                  Create New
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setMode("browse")}
                  className="flex-1"
                >
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Browse...
                </Button>
              </div>
            </div>
          )}

          {/* Mode: Create Project */}
          {mode === "create" && (
            <div className="space-y-4">
              {/* Project Name */}
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Project Name
                </label>
                <Input
                  value={projectName}
                  onChange={(e) => {
                    setProjectName(e.target.value);
                    setError("");
                  }}
                  placeholder="my-workflow"
                  className="text-sm"
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Location
                </label>
                {!showPathPicker ? (
                  <div className="flex items-center gap-2">
                    <div
                      className="flex-1 px-3 py-2 bg-muted rounded-md text-sm font-mono truncate"
                      title={fullPath}
                    >
                      {fullPath}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPathPicker(true)}
                    >
                      Change
                    </Button>
                  </div>
                ) : (
                  <InlinePathPicker
                    currentPath={projectLocation}
                    onPathChange={setProjectLocation}
                    onSelect={(path) => {
                      setProjectLocation(path);
                      setShowPathPicker(false);
                    }}
                    onCancel={() => setShowPathPicker(false)}
                    height="180px"
                  />
                )}
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="flex gap-2">
                <Button onClick={handleCreateProject} className="flex-1">
                  Create Project
                </Button>
                <Button variant="ghost" onClick={() => setMode("recent")}>
                  Back
                </Button>
              </div>
            </div>
          )}

          {/* Mode: Browse */}
          {mode === "browse" && (
            <div className="space-y-4">
              <InlinePathPicker
                currentPath="~"
                onPathChange={() => {}}
                onSelect={handleBrowseSelect}
                onCancel={() => setMode("recent")}
                height="280px"
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
