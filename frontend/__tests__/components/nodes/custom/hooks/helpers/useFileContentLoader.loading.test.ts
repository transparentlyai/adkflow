import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useFileContentLoader } from "@/components/nodes/custom/hooks/helpers/useFileContentLoader";
import type { CustomNodeSchema } from "@/components/nodes/CustomNode/types";
import * as api from "@/lib/api";

// Mock dependencies
vi.mock("@/lib/api", () => ({
  readPrompt: vi.fn(),
}));

vi.mock("@/contexts/ProjectContext", () => ({
  useProject: vi.fn(() => ({
    projectPath: "/test/project",
  })),
}));

import { useProject } from "@/contexts/ProjectContext";
import { useReactFlow } from "@xyflow/react";

describe("useFileContentLoader - loading", () => {
  const mockSetNodes = vi.fn();
  const mockSetIsContentLoaded = vi.fn();
  const mockSetSavedContent = vi.fn();

  const baseSchema = {
    id: "test-schema",
    label: "Test Schema",
    ui: {
      fields: [
        { id: "code", widget: "code_editor", language: "python" },
        { id: "file", widget: "file_picker" },
      ],
    },
  } as unknown as CustomNodeSchema;

  const defaultParams = {
    nodeId: "test-node",
    schema: baseSchema,
    config: { code: "", file: "" },
    isExpanded: false,
    isContentLoaded: false,
    setIsContentLoaded: mockSetIsContentLoaded,
    setSavedContent: mockSetSavedContent,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useReactFlow as any).mockReturnValue({
      setNodes: mockSetNodes,
      getNodes: vi.fn(() => []),
    });
    (useProject as any).mockReturnValue({
      projectPath: "/test/project",
    });
  });

  describe("file loading", () => {
    it("should load file content when expanded with file path", async () => {
      const mockContent = "file content from disk";
      (api.readPrompt as any).mockResolvedValue({ content: mockContent });

      const config = { code: "", file: "/path/to/file.py" };

      renderHook(() =>
        useFileContentLoader({
          ...defaultParams,
          config,
          isExpanded: true,
        }),
      );

      await waitFor(() => {
        expect(api.readPrompt).toHaveBeenCalledWith(
          "/test/project",
          "/path/to/file.py",
        );
      });

      await waitFor(() => {
        expect(mockSetNodes).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(mockSetSavedContent).toHaveBeenCalledWith(mockContent);
      });

      await waitFor(() => {
        expect(mockSetIsContentLoaded).toHaveBeenCalledWith(true);
      });
    });

    it("should not load when not expanded", () => {
      const config = { code: "", file: "/path/to/file.py" };

      renderHook(() =>
        useFileContentLoader({
          ...defaultParams,
          config,
          isExpanded: false,
        }),
      );

      expect(api.readPrompt).not.toHaveBeenCalled();
    });

    it("should not load when already loaded", () => {
      const config = { code: "", file: "/path/to/file.py" };

      renderHook(() =>
        useFileContentLoader({
          ...defaultParams,
          config,
          isExpanded: true,
          isContentLoaded: true,
        }),
      );

      expect(api.readPrompt).not.toHaveBeenCalled();
    });

    it("should handle file not found error", async () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      (api.readPrompt as any).mockRejectedValue(
        new Error("File not found: /path/to/file.py"),
      );

      const config = { code: "existing code", file: "/path/to/file.py" };

      renderHook(() =>
        useFileContentLoader({
          ...defaultParams,
          config,
          isExpanded: true,
        }),
      );

      await waitFor(() => {
        expect(mockSetSavedContent).toHaveBeenCalledWith("existing code");
      });

      await waitFor(() => {
        expect(mockSetIsContentLoaded).toHaveBeenCalledWith(true);
      });

      consoleErrorSpy.mockRestore();
    });

    it("should handle other errors", async () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      (api.readPrompt as any).mockRejectedValue(new Error("Network error"));

      const config = { code: "existing code", file: "/path/to/file.py" };

      renderHook(() =>
        useFileContentLoader({
          ...defaultParams,
          config,
          isExpanded: true,
        }),
      );

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "Failed to load file content:",
          expect.any(Error),
        );
      });

      await waitFor(() => {
        expect(mockSetIsContentLoaded).toHaveBeenCalledWith(true);
      });

      consoleErrorSpy.mockRestore();
    });

    it("should handle null projectPath", async () => {
      (useProject as any).mockReturnValue({ projectPath: null });

      const config = { code: "", file: "/path/to/file.py" };

      renderHook(() =>
        useFileContentLoader({
          ...defaultParams,
          config,
          isExpanded: true,
        }),
      );

      await waitFor(
        () => {
          expect(api.readPrompt).not.toHaveBeenCalled();
        },
        { timeout: 100 },
      );
    });
  });

  describe("file path change handling", () => {
    it("should reset content loaded state when file path changes", () => {
      const { rerender } = renderHook((props) => useFileContentLoader(props), {
        initialProps: {
          ...defaultParams,
          config: { code: "", file: "/old/file.py" },
        },
      });

      vi.clearAllMocks();

      rerender({
        ...defaultParams,
        config: { code: "", file: "/new/file.py" },
      });

      expect(mockSetIsContentLoaded).toHaveBeenCalledWith(false);
      expect(mockSetSavedContent).toHaveBeenCalledWith(null);
    });

    it("should not reset when file path is empty", () => {
      const { rerender } = renderHook((props) => useFileContentLoader(props), {
        initialProps: {
          ...defaultParams,
          config: { code: "", file: "" },
        },
      });

      vi.clearAllMocks();

      rerender({
        ...defaultParams,
        config: { code: "new code", file: "" },
      });

      expect(mockSetIsContentLoaded).not.toHaveBeenCalled();
    });
  });

  describe("nodes without code editor", () => {
    it("should mark as loaded when no code editor field", async () => {
      const schema = {
        id: "test",
        label: "Test",
        ui: { fields: [] },
      } as unknown as CustomNodeSchema;

      renderHook(() =>
        useFileContentLoader({
          ...defaultParams,
          schema,
          isExpanded: true,
        }),
      );

      await waitFor(() => {
        expect(mockSetSavedContent).toHaveBeenCalledWith("");
      });

      await waitFor(() => {
        expect(mockSetIsContentLoaded).toHaveBeenCalledWith(true);
      });
    });
  });

  describe("nodes without file path", () => {
    it("should track dirty against current content when no file path", async () => {
      const config = { code: "inline content", file: "" };

      renderHook(() =>
        useFileContentLoader({
          ...defaultParams,
          config,
          isExpanded: true,
        }),
      );

      await waitFor(() => {
        expect(mockSetSavedContent).toHaveBeenCalledWith("inline content");
      });

      await waitFor(() => {
        expect(mockSetIsContentLoaded).toHaveBeenCalledWith(true);
      });
    });
  });
});
