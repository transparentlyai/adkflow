/**
 * Recent Projects Storage Service
 * Manages LocalStorage persistence for recently opened projects
 */

export interface RecentProject {
  path: string;
  name: string;
  lastOpened: number; // Unix timestamp
}

const RECENT_PROJECTS_KEY = "adkflow_recent_projects";
const LAST_DIRECTORY_KEY = "adkflow_last_directory";
const MAX_RECENT_PROJECTS = 10;

/**
 * Get all recent projects, sorted by lastOpened (most recent first)
 */
export function getRecentProjects(): RecentProject[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(RECENT_PROJECTS_KEY);
    if (!stored) return [];

    const projects: RecentProject[] = JSON.parse(stored);
    return projects.sort((a, b) => b.lastOpened - a.lastOpened);
  } catch (error) {
    console.error("Failed to load recent projects:", error);
    return [];
  }
}

/**
 * Add or update a project in the recent list
 * If project already exists, updates its lastOpened time
 */
export function addRecentProject(project: RecentProject): void {
  if (typeof window === "undefined") return;

  try {
    const projects = getRecentProjects();

    // Remove existing entry for this path (if any)
    const filtered = projects.filter(p => p.path !== project.path);

    // Add new entry at the beginning
    const updated = [project, ...filtered].slice(0, MAX_RECENT_PROJECTS);

    localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(updated));

    // Also update last used directory
    const parentDir = getParentDirectory(project.path);
    if (parentDir) {
      setLastUsedDirectory(parentDir);
    }
  } catch (error) {
    console.error("Failed to save recent project:", error);
  }
}

/**
 * Remove a project from the recent list
 */
export function removeRecentProject(path: string): void {
  if (typeof window === "undefined") return;

  try {
    const projects = getRecentProjects();
    const filtered = projects.filter(p => p.path !== path);
    localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Failed to remove recent project:", error);
  }
}

/**
 * Clear all recent projects
 */
export function clearRecentProjects(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(RECENT_PROJECTS_KEY);
}

/**
 * Get the last used directory for creating new projects
 */
export function getLastUsedDirectory(): string | null {
  if (typeof window === "undefined") return null;

  try {
    return localStorage.getItem(LAST_DIRECTORY_KEY);
  } catch (error) {
    console.error("Failed to get last directory:", error);
    return null;
  }
}

/**
 * Set the last used directory
 */
export function setLastUsedDirectory(path: string): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(LAST_DIRECTORY_KEY, path);
  } catch (error) {
    console.error("Failed to save last directory:", error);
  }
}

/**
 * Get parent directory from a path
 */
function getParentDirectory(path: string): string | null {
  const parts = path.split("/");
  if (parts.length <= 1) return null;
  parts.pop();
  return parts.join("/") || "/";
}

/**
 * Format a timestamp as relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (months > 0) {
    return months === 1 ? "1 month ago" : `${months} months ago`;
  }
  if (weeks > 0) {
    return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
  }
  if (days > 0) {
    return days === 1 ? "yesterday" : `${days} days ago`;
  }
  if (hours > 0) {
    return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  }
  if (minutes > 0) {
    return minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`;
  }
  return "just now";
}

/**
 * Convert a project name to a valid folder name (kebab-case)
 */
export function sanitizeProjectName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // Remove special chars
    .replace(/\s+/g, "-") // Spaces to hyphens
    .replace(/-+/g, "-") // Collapse multiple hyphens
    .replace(/^-|-$/g, ""); // Trim leading/trailing hyphens
}
