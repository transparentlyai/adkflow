import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getRecentProjects,
  addRecentProject,
  removeRecentProject,
  clearRecentProjects,
  getLastUsedDirectory,
  setLastUsedDirectory,
  formatRelativeTime,
  sanitizeProjectName,
} from "@/lib/recentProjects";

describe("recentProjects", () => {
  const mockLocalStorage: Record<string, string> = {};

  beforeEach(() => {
    // Clear mock storage
    Object.keys(mockLocalStorage).forEach(
      (key) => delete mockLocalStorage[key],
    );

    // Mock localStorage
    vi.stubGlobal("localStorage", {
      getItem: vi.fn((key: string) => mockLocalStorage[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        mockLocalStorage[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete mockLocalStorage[key];
      }),
    });

    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe("getRecentProjects", () => {
    it("should return empty array when no projects stored", () => {
      const result = getRecentProjects();
      expect(result).toEqual([]);
    });

    it("should return projects sorted by lastOpened", () => {
      const projects = [
        { path: "/project1", name: "Project 1", lastOpened: 1000 },
        { path: "/project2", name: "Project 2", lastOpened: 3000 },
        { path: "/project3", name: "Project 3", lastOpened: 2000 },
      ];
      mockLocalStorage["adkflow_recent_projects"] = JSON.stringify(projects);

      const result = getRecentProjects();

      expect(result[0].path).toBe("/project2");
      expect(result[1].path).toBe("/project3");
      expect(result[2].path).toBe("/project1");
    });

    it("should handle invalid JSON", () => {
      mockLocalStorage["adkflow_recent_projects"] = "invalid";

      const result = getRecentProjects();

      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe("addRecentProject", () => {
    it("should add a new project", () => {
      const project = { path: "/project", name: "Project", lastOpened: 1000 };

      addRecentProject(project);

      expect(localStorage.setItem).toHaveBeenCalled();
      const saved = JSON.parse(
        mockLocalStorage["adkflow_recent_projects"] || "[]",
      );
      expect(saved).toHaveLength(1);
      expect(saved[0].path).toBe("/project");
    });

    it("should update existing project and move to top", () => {
      const existing = [
        { path: "/project1", name: "Project 1", lastOpened: 1000 },
        { path: "/project2", name: "Project 2", lastOpened: 2000 },
      ];
      mockLocalStorage["adkflow_recent_projects"] = JSON.stringify(existing);

      addRecentProject({
        path: "/project1",
        name: "Project 1 Updated",
        lastOpened: 3000,
      });

      const saved = JSON.parse(mockLocalStorage["adkflow_recent_projects"]);
      expect(saved[0].path).toBe("/project1");
      expect(saved[0].lastOpened).toBe(3000);
      expect(saved).toHaveLength(2);
    });

    it("should limit to 10 projects", () => {
      const existing = Array.from({ length: 10 }, (_, i) => ({
        path: `/project${i}`,
        name: `Project ${i}`,
        lastOpened: i * 1000,
      }));
      mockLocalStorage["adkflow_recent_projects"] = JSON.stringify(existing);

      addRecentProject({ path: "/new", name: "New", lastOpened: 99999 });

      const saved = JSON.parse(mockLocalStorage["adkflow_recent_projects"]);
      expect(saved).toHaveLength(10);
      expect(saved[0].path).toBe("/new");
    });

    it("should update last used directory", () => {
      addRecentProject({
        path: "/home/user/projects/test",
        name: "Test",
        lastOpened: 1000,
      });

      expect(mockLocalStorage["adkflow_last_directory"]).toBe(
        "/home/user/projects",
      );
    });
  });

  describe("removeRecentProject", () => {
    it("should remove a project by path", () => {
      const existing = [
        { path: "/project1", name: "Project 1", lastOpened: 1000 },
        { path: "/project2", name: "Project 2", lastOpened: 2000 },
      ];
      mockLocalStorage["adkflow_recent_projects"] = JSON.stringify(existing);

      removeRecentProject("/project1");

      const saved = JSON.parse(mockLocalStorage["adkflow_recent_projects"]);
      expect(saved).toHaveLength(1);
      expect(saved[0].path).toBe("/project2");
    });

    it("should handle localStorage errors", () => {
      vi.stubGlobal("localStorage", {
        getItem: vi.fn(() => "[]"),
        setItem: vi.fn(() => {
          throw new Error("Storage error");
        }),
        removeItem: vi.fn(),
      });

      removeRecentProject("/project1");

      expect(console.error).toHaveBeenCalled();
    });
  });

  describe("clearRecentProjects", () => {
    it("should remove all recent projects", () => {
      mockLocalStorage["adkflow_recent_projects"] = JSON.stringify([]);

      clearRecentProjects();

      expect(localStorage.removeItem).toHaveBeenCalledWith(
        "adkflow_recent_projects",
      );
    });
  });

  describe("getLastUsedDirectory", () => {
    it("should return stored directory", () => {
      mockLocalStorage["adkflow_last_directory"] = "/home/user/projects";

      const result = getLastUsedDirectory();

      expect(result).toBe("/home/user/projects");
    });

    it("should return null when not set", () => {
      const result = getLastUsedDirectory();
      expect(result).toBeNull();
    });

    it("should handle localStorage errors", () => {
      vi.stubGlobal("localStorage", {
        getItem: vi.fn(() => {
          throw new Error("Storage error");
        }),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      });

      const result = getLastUsedDirectory();

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe("setLastUsedDirectory", () => {
    it("should set directory", () => {
      setLastUsedDirectory("/home/user");

      expect(mockLocalStorage["adkflow_last_directory"]).toBe("/home/user");
    });

    it("should handle localStorage errors", () => {
      vi.stubGlobal("localStorage", {
        getItem: vi.fn(),
        setItem: vi.fn(() => {
          throw new Error("Storage error");
        }),
        removeItem: vi.fn(),
      });

      setLastUsedDirectory("/home/user");

      expect(console.error).toHaveBeenCalled();
    });
  });

  describe("formatRelativeTime", () => {
    it("should format just now", () => {
      const result = formatRelativeTime(Date.now() - 30 * 1000); // 30 seconds ago
      expect(result).toBe("just now");
    });

    it("should format minutes", () => {
      const result = formatRelativeTime(Date.now() - 5 * 60 * 1000);
      expect(result).toBe("5 minutes ago");
    });

    it("should format 1 minute", () => {
      const result = formatRelativeTime(Date.now() - 1 * 60 * 1000);
      expect(result).toBe("1 minute ago");
    });

    it("should format hours", () => {
      const result = formatRelativeTime(Date.now() - 3 * 60 * 60 * 1000);
      expect(result).toBe("3 hours ago");
    });

    it("should format 1 hour", () => {
      const result = formatRelativeTime(Date.now() - 1 * 60 * 60 * 1000);
      expect(result).toBe("1 hour ago");
    });

    it("should format yesterday", () => {
      const result = formatRelativeTime(Date.now() - 24 * 60 * 60 * 1000);
      expect(result).toBe("yesterday");
    });

    it("should format days", () => {
      const result = formatRelativeTime(Date.now() - 5 * 24 * 60 * 60 * 1000);
      expect(result).toBe("5 days ago");
    });

    it("should format weeks", () => {
      const result = formatRelativeTime(Date.now() - 14 * 24 * 60 * 60 * 1000);
      expect(result).toBe("2 weeks ago");
    });

    it("should format 1 week", () => {
      const result = formatRelativeTime(Date.now() - 7 * 24 * 60 * 60 * 1000);
      expect(result).toBe("1 week ago");
    });

    it("should format months", () => {
      const result = formatRelativeTime(Date.now() - 60 * 24 * 60 * 60 * 1000);
      expect(result).toBe("2 months ago");
    });

    it("should format 1 month", () => {
      const result = formatRelativeTime(Date.now() - 35 * 24 * 60 * 60 * 1000);
      expect(result).toBe("1 month ago");
    });
  });

  describe("sanitizeProjectName", () => {
    it("should convert to lowercase kebab-case", () => {
      expect(sanitizeProjectName("My Project")).toBe("my-project");
    });

    it("should remove special characters", () => {
      expect(sanitizeProjectName("Test@Project#123")).toBe("testproject123");
    });

    it("should collapse multiple spaces/hyphens", () => {
      expect(sanitizeProjectName("my   project")).toBe("my-project");
      expect(sanitizeProjectName("my---project")).toBe("my-project");
    });

    it("should trim leading/trailing hyphens", () => {
      expect(sanitizeProjectName("-my-project-")).toBe("my-project");
    });

    it("should handle empty input", () => {
      expect(sanitizeProjectName("")).toBe("");
      expect(sanitizeProjectName("   ")).toBe("");
    });

    it("should preserve valid characters", () => {
      expect(sanitizeProjectName("project123")).toBe("project123");
      expect(sanitizeProjectName("my-project-name")).toBe("my-project-name");
    });
  });
});
