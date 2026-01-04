import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { saveSession, loadSession, clearSession } from "@/lib/sessionStorage";

describe("sessionStorage", () => {
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

  describe("saveSession", () => {
    it("should save session to localStorage", () => {
      const state = {
        currentProjectPath: "/project",
        workflowName: "Test Workflow",
        workflow: {
          nodes: [],
          edges: [],
          viewport: { x: 0, y: 0, zoom: 1 },
        },
        hasUnsavedChanges: false,
      };

      saveSession(state);

      expect(localStorage.setItem).toHaveBeenCalledWith(
        "adkflow_session",
        JSON.stringify(state),
      );
    });

    it("should handle localStorage errors", () => {
      vi.mocked(localStorage.setItem).mockImplementation(() => {
        throw new Error("Storage full");
      });

      const state = {
        currentProjectPath: null,
        workflowName: "Test",
        workflow: null,
        hasUnsavedChanges: false,
      };

      // Should not throw
      expect(() => saveSession(state)).not.toThrow();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe("loadSession", () => {
    it("should load session from localStorage", () => {
      const state = {
        currentProjectPath: "/project",
        workflowName: "Test",
        workflow: {
          nodes: [],
          edges: [],
          viewport: { x: 10, y: 20, zoom: 1.5 },
        },
        hasUnsavedChanges: true,
      };

      mockLocalStorage["adkflow_session"] = JSON.stringify(state);

      const result = loadSession();

      expect(result).toEqual(state);
    });

    it("should return null when no session exists", () => {
      const result = loadSession();

      expect(result).toBeNull();
    });

    it("should add default viewport for backward compatibility", () => {
      const legacyState = {
        currentProjectPath: "/project",
        workflowName: "Test",
        workflow: {
          nodes: [],
          edges: [],
          // No viewport property
        },
        hasUnsavedChanges: false,
      };

      mockLocalStorage["adkflow_session"] = JSON.stringify(legacyState);

      const result = loadSession();

      expect(result?.workflow?.viewport).toEqual({ x: 0, y: 0, zoom: 1 });
    });

    it("should handle invalid JSON", () => {
      mockLocalStorage["adkflow_session"] = "invalid-json";

      const result = loadSession();

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe("clearSession", () => {
    it("should remove session from localStorage", () => {
      mockLocalStorage["adkflow_session"] = JSON.stringify({});

      clearSession();

      expect(localStorage.removeItem).toHaveBeenCalledWith("adkflow_session");
    });

    it("should handle localStorage errors", () => {
      vi.mocked(localStorage.removeItem).mockImplementation(() => {
        throw new Error("Storage error");
      });

      // Should not throw
      expect(() => clearSession()).not.toThrow();
      expect(console.error).toHaveBeenCalled();
    });
  });
});
