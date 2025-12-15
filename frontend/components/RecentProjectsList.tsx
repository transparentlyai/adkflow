"use client";

import type { RecentProject } from "@/lib/recentProjects";
import { formatRelativeTime } from "@/lib/recentProjects";
import { FolderOpen, X, Clock, FolderX } from "lucide-react";

interface RecentProjectsListProps {
  projects: RecentProject[];
  onSelect: (project: RecentProject) => void;
  onRemove?: (projectPath: string) => void;
  emptyMessage?: string;
  maxDisplay?: number;
  compact?: boolean;
}

export default function RecentProjectsList({
  projects,
  onSelect,
  onRemove,
  emptyMessage = "No recent projects",
  maxDisplay,
  compact = false,
}: RecentProjectsListProps) {
  const displayProjects = maxDisplay ? projects.slice(0, maxDisplay) : projects;

  if (projects.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center text-center ${compact ? "py-6" : "py-12"}`}>
        <FolderX className={`text-muted-foreground mb-3 ${compact ? "h-8 w-8" : "h-12 w-12"}`} />
        <p className="text-muted-foreground text-sm">{emptyMessage}</p>
        <p className="text-muted-foreground text-xs mt-1">
          Create a new project to get started
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {displayProjects.map((project) => (
        <div
          key={project.path}
          onClick={() => onSelect(project)}
          className="flex items-center gap-3 p-3 hover:bg-accent cursor-pointer group transition-colors"
        >
          <FolderOpen className="h-5 w-5 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{project.name}</p>
            <p className="text-xs text-muted-foreground truncate" title={project.path}>
              {project.path}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground flex items-center gap-1 whitespace-nowrap">
              <Clock className="h-3 w-3" />
              {formatRelativeTime(project.lastOpened)}
            </span>
            {onRemove && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(project.path);
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/10 rounded"
                title="Remove from recent"
              >
                <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
