import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useFileContentLoader } from "@/components/nodes/custom/hooks/helpers/useFileContentLoader";
import type { CustomNodeSchema } from "@/components/nodes/CustomNode/types";

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

describe("useFileContentLoader - extraction", () => {
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
});
