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

describe("useFileContentLoader - confirmation", () => {
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
});
