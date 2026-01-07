import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
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

describe("components/nodes/custom/hooks/helpers/useFileContentLoader", () => {
  const mockSetNodes = vi.fn();
  const mockSetIsContentLoaded = vi.fn();
  const mockSetSavedContent = vi.fn();

  const baseSchema: CustomNodeSchema = {
    id: "test-schema",
    label: "Test Schema",
    ui: {
      fields: [
        { id: "code", widget: "code_editor", language: "python" },
        { id: "file", widget: "file_picker" },
      ],
    },
  };

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

  describe("field detection", () => {
    it("should find code_editor field in schema", () => {
      const { result } = renderHook(() => useFileContentLoader(defaultParams));

      expect(result.current.codeEditorField).toEqual({
        id: "code",
        widget: "code_editor",
        language: "python",
      });
    });

    it("should find monaco_editor field in schema", () => {
      const schema: CustomNodeSchema = {
        id: "test",
        label: "Test",
        ui: {
          fields: [{ id: "code", widget: "monaco_editor", language: "python" }],
        },
      };

      const { result } = renderHook(() =>
        useFileContentLoader({ ...defaultParams, schema }),
      );

      expect(result.current.codeEditorField).toEqual({
        id: "code",
        widget: "monaco_editor",
        language: "python",
      });
    });

    it("should find file_picker field in schema", () => {
      const { result } = renderHook(() => useFileContentLoader(defaultParams));

      expect(result.current.filePickerField).toEqual({
        id: "file",
        widget: "file_picker",
      });
    });

    it("should handle schema without code_editor field", () => {
      const schema: CustomNodeSchema = {
        id: "test",
        label: "Test",
        ui: { fields: [] },
      };

      const { result } = renderHook(() =>
        useFileContentLoader({ ...defaultParams, schema }),
      );

      expect(result.current.codeEditorField).toBeUndefined();
    });

    it("should handle schema without file_picker field", () => {
      const schema: CustomNodeSchema = {
        id: "test",
        label: "Test",
        ui: {
          fields: [{ id: "code", widget: "code_editor", language: "python" }],
        },
      };

      const { result } = renderHook(() =>
        useFileContentLoader({ ...defaultParams, schema }),
      );

      expect(result.current.filePickerField).toBeUndefined();
    });
  });

  describe("file path extraction", () => {
    it("should get file path from file_picker field", () => {
      const config = { code: "test code", file: "/path/to/file.py" };

      const { result } = renderHook(() =>
        useFileContentLoader({ ...defaultParams, config }),
      );

      expect(result.current.filePath).toBe("/path/to/file.py");
    });

    it("should fall back to legacy file_path field", () => {
      const schema: CustomNodeSchema = {
        id: "test",
        label: "Test",
        ui: {
          fields: [{ id: "code", widget: "code_editor", language: "python" }],
        },
      };
      const config = { code: "test code", file_path: "/legacy/path.py" };

      const { result } = renderHook(() =>
        useFileContentLoader({ ...defaultParams, schema, config }),
      );

      expect(result.current.filePath).toBe("/legacy/path.py");
    });

    it("should return empty string when no file path exists", () => {
      const config = { code: "test code" };

      const { result } = renderHook(() =>
        useFileContentLoader({ ...defaultParams, config }),
      );

      expect(result.current.filePath).toBe("");
    });
  });

  describe("code content extraction", () => {
    it("should get code content from code_editor field", () => {
      const config = { code: "print('hello')", file: "" };

      const { result } = renderHook(() =>
        useFileContentLoader({ ...defaultParams, config }),
      );

      expect(result.current.codeContent).toBe("print('hello')");
    });

    it("should return empty string when no code content exists", () => {
      const config = { file: "" };

      const { result } = renderHook(() =>
        useFileContentLoader({ ...defaultParams, config }),
      );

      expect(result.current.codeContent).toBe("");
    });

    it("should return empty string when no code_editor field", () => {
      const schema: CustomNodeSchema = {
        id: "test",
        label: "Test",
        ui: { fields: [] },
      };
      const config = { code: "test" };

      const { result } = renderHook(() =>
        useFileContentLoader({ ...defaultParams, schema, config }),
      );

      expect(result.current.codeContent).toBe("");
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
      (api.readPrompt as any).mockRejectedValue(
        new Error("Network error"),
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

  describe("confirmation dialog", () => {
    it("should show confirmation when loading would replace existing content", async () => {
      const config = { code: "existing content", file: "" };

      const { result, rerender } = renderHook(
        (props) => useFileContentLoader(props),
        {
          initialProps: {
            ...defaultParams,
            config,
            isExpanded: true,
          },
        },
      );

      // Wait for initial load to complete
      await waitFor(() => {
        expect(result.current.fileLoadConfirm).toBeNull();
      });

      // Now change the file path (simulating user selecting a file)
      const newConfig = { code: "existing content", file: "/new/file.py" };
      rerender({
        ...defaultParams,
        config: newConfig,
        isExpanded: true,
        isContentLoaded: false,
      });

      await waitFor(() => {
        expect(result.current.fileLoadConfirm).toEqual({
          pendingFilePath: "/new/file.py",
          existingContent: "existing content",
        });
      });

      expect(api.readPrompt).not.toHaveBeenCalled();
    });

    it("should not show confirmation on initial load", async () => {
      (api.readPrompt as any).mockResolvedValue({ content: "file content" });

      const config = { code: "existing content", file: "/path/to/file.py" };

      const { result } = renderHook(() =>
        useFileContentLoader({
          ...defaultParams,
          config,
          isExpanded: true,
        }),
      );

      await waitFor(() => {
        expect(api.readPrompt).toHaveBeenCalled();
      });

      expect(result.current.fileLoadConfirm).toBeNull();
    });

    it("should not show confirmation when no existing content", async () => {
      (api.readPrompt as any).mockResolvedValue({ content: "file content" });

      const config = { code: "", file: "" };

      const { result, rerender } = renderHook(
        (props) => useFileContentLoader(props),
        {
          initialProps: {
            ...defaultParams,
            config,
            isExpanded: true,
          },
        },
      );

      // Wait for initial load
      await waitFor(() => {
        expect(mockSetIsContentLoaded).toHaveBeenCalled();
      });

      // Change file path with no existing content
      const newConfig = { code: "", file: "/new/file.py" };
      rerender({
        ...defaultParams,
        config: newConfig,
        isExpanded: true,
        isContentLoaded: false,
      });

      await waitFor(() => {
        expect(api.readPrompt).toHaveBeenCalled();
      });

      expect(result.current.fileLoadConfirm).toBeNull();
    });
  });

  describe("handleConfirmLoad", () => {
    it("should load file when confirmed in real scenario", async () => {
      const mockContent = "new file content";
      (api.readPrompt as any).mockResolvedValue({ content: mockContent });

      const config = { code: "existing content", file: "" };

      const { result, rerender } = renderHook(
        (props) => useFileContentLoader(props),
        {
          initialProps: {
            ...defaultParams,
            config,
            isExpanded: true,
          },
        },
      );

      // Wait for initial load to complete
      await waitFor(() => {
        expect(mockSetIsContentLoaded).toHaveBeenCalledWith(true);
      });

      vi.clearAllMocks();

      // Now change the file path (simulating user selecting a file)
      const newConfig = { code: "existing content", file: "/path/to/file.py" };
      rerender({
        ...defaultParams,
        config: newConfig,
        isExpanded: true,
        isContentLoaded: false,
      });

      // Should show confirmation dialog
      await waitFor(() => {
        expect(result.current.fileLoadConfirm).not.toBeNull();
      });

      // Confirm the load
      await act(async () => {
        await result.current.handleConfirmLoad();
      });

      // Should load the file
      await waitFor(() => {
        expect(api.readPrompt).toHaveBeenCalledWith(
          "/test/project",
          "/path/to/file.py",
        );
      });
    });

    it("should do nothing when no confirmation pending", async () => {
      const { result } = renderHook(() => useFileContentLoader(defaultParams));

      await act(async () => {
        await result.current.handleConfirmLoad();
      });

      expect(api.readPrompt).not.toHaveBeenCalled();
    });
  });

  describe("handleCancelLoad", () => {
    it("should clear file path and keep existing content in real scenario", async () => {
      const config = { code: "existing content", file: "" };

      const { result, rerender } = renderHook(
        (props) => useFileContentLoader(props),
        {
          initialProps: {
            ...defaultParams,
            config,
            isExpanded: true,
          },
        },
      );

      // Wait for initial load to complete
      await waitFor(() => {
        expect(mockSetIsContentLoaded).toHaveBeenCalledWith(true);
      });

      vi.clearAllMocks();

      // Now change the file path (simulating user selecting a file)
      const newConfig = { code: "existing content", file: "/path/to/file.py" };
      rerender({
        ...defaultParams,
        config: newConfig,
        isExpanded: true,
        isContentLoaded: false,
      });

      // Should show confirmation dialog
      await waitFor(() => {
        expect(result.current.fileLoadConfirm).not.toBeNull();
      });

      // Cancel the load
      await act(async () => {
        await result.current.handleCancelLoad();
      });

      // Should clear the file path
      await waitFor(() => {
        expect(mockSetNodes).toHaveBeenCalledWith(expect.any(Function));
      });

      // Should keep existing content
      await waitFor(() => {
        expect(mockSetSavedContent).toHaveBeenCalledWith("existing content");
      });

      // Verify that setNodes was called with a function that clears the file path
      const setNodesCallback = mockSetNodes.mock.calls[0][0];
      const nodes = [
        {
          id: "test-node",
          data: { config: { code: "test", file: "/path/to/file.py" } },
        },
      ];
      const updatedNodes = setNodesCallback(nodes);

      expect(updatedNodes[0].data.config.file).toBe("");
    });

    it("should do nothing when no confirmation pending", async () => {
      const { result } = renderHook(() => useFileContentLoader(defaultParams));

      await act(async () => {
        await result.current.handleCancelLoad();
      });

      expect(mockSetNodes).not.toHaveBeenCalled();
    });
  });

  describe("file path change handling", () => {
    it("should reset content loaded state when file path changes", () => {
      const { rerender } = renderHook(
        (props) => useFileContentLoader(props),
        {
          initialProps: {
            ...defaultParams,
            config: { code: "", file: "/old/file.py" },
          },
        },
      );

      vi.clearAllMocks();

      rerender({
        ...defaultParams,
        config: { code: "", file: "/new/file.py" },
      });

      expect(mockSetIsContentLoaded).toHaveBeenCalledWith(false);
      expect(mockSetSavedContent).toHaveBeenCalledWith(null);
    });

    it("should not reset when file path is empty", () => {
      const { rerender } = renderHook(
        (props) => useFileContentLoader(props),
        {
          initialProps: {
            ...defaultParams,
            config: { code: "", file: "" },
          },
        },
      );

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
      const schema: CustomNodeSchema = {
        id: "test",
        label: "Test",
        ui: { fields: [] },
      };

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
