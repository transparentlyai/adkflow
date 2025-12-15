"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import InlinePathPicker from "@/components/InlinePathPicker";
import RecentProjectsList from "@/components/RecentProjectsList";
import type { RecentProject } from "@/lib/recentProjects";
import { getLastUsedDirectory, sanitizeProjectName } from "@/lib/recentProjects";
import { FolderPlus, FolderOpen, ChevronDown, ChevronUp } from "lucide-react";

interface HomeScreenProps {
  recentProjects: RecentProject[];
  onCreateProject: (projectPath: string, projectName: string) => void;
  onLoadProject: (projectPath: string) => void;
  onRemoveRecent?: (projectPath: string) => void;
}

export default function HomeScreen({
  recentProjects,
  onCreateProject,
  onLoadProject,
  onRemoveRecent,
}: HomeScreenProps) {
  const [projectName, setProjectName] = useState("my-workflow");
  const [projectLocation, setProjectLocation] = useState<string>("~");
  const [showPathPicker, setShowPathPicker] = useState(false);
  const [showBrowse, setShowBrowse] = useState(false);
  const [error, setError] = useState("");

  // Load last used directory on mount
  useEffect(() => {
    const lastDir = getLastUsedDirectory();
    if (lastDir) {
      setProjectLocation(lastDir);
    }
  }, []);

  const handleCreateProject = () => {
    const sanitizedName = sanitizeProjectName(projectName);
    if (!sanitizedName) {
      setError("Please enter a valid project name");
      return;
    }

    const fullPath = projectLocation === "/"
      ? `/${sanitizedName}`
      : `${projectLocation}/${sanitizedName}`;

    onCreateProject(fullPath, projectName.trim());
  };

  const handleSelectRecent = (project: RecentProject) => {
    onLoadProject(project.path);
  };

  const handleBrowseSelect = (path: string) => {
    onLoadProject(path);
    setShowBrowse(false);
  };

  const sanitizedName = sanitizeProjectName(projectName);
  const fullPath = projectLocation === "/"
    ? `/${sanitizedName}`
    : sanitizedName ? `${projectLocation}/${sanitizedName}` : projectLocation;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
      {/* Logo/Branding */}
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold text-primary mb-2">ADKFlow</h1>
        <p className="text-muted-foreground">Visual Agent Workflow Designer</p>
      </div>

      {/* Main Content */}
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Create New Project Card */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderPlus className="h-5 w-5" />
              Create New Project
            </CardTitle>
            <CardDescription>
              Start a new workflow from scratch
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
                  <div className="flex-1 px-3 py-2 bg-muted rounded-md text-sm font-mono truncate" title={fullPath}>
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
                <div className="space-y-2">
                  <InlinePathPicker
                    currentPath={projectLocation}
                    onPathChange={setProjectLocation}
                    onSelect={(path) => {
                      setProjectLocation(path);
                      setShowPathPicker(false);
                    }}
                    onCancel={() => setShowPathPicker(false)}
                    height="200px"
                  />
                </div>
              )}
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button onClick={handleCreateProject} className="w-full">
              Create Project
            </Button>
          </CardContent>
        </Card>

        {/* Recent Projects Card */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Recent Projects
            </CardTitle>
            <CardDescription>
              Continue where you left off
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[300px] overflow-y-auto">
              <RecentProjectsList
                projects={recentProjects}
                onSelect={handleSelectRecent}
                onRemove={onRemoveRecent}
                emptyMessage="No recent projects yet"
                maxDisplay={5}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Browse for existing project */}
      <div className="mt-8 w-full max-w-4xl">
        <button
          onClick={() => setShowBrowse(!showBrowse)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mx-auto"
        >
          {showBrowse ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
          Or browse for an existing project...
        </button>

        {showBrowse && (
          <div className="mt-4">
            <InlinePathPicker
              currentPath="~"
              onPathChange={() => {}}
              onSelect={handleBrowseSelect}
              onCancel={() => setShowBrowse(false)}
              height="250px"
            />
          </div>
        )}
      </div>
    </div>
  );
}
