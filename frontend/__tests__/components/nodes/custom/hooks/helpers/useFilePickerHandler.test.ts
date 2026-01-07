import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFilePickerHandler } from "@/components/nodes/custom/hooks/helpers/useFilePickerHandler";

vi.mock("@/contexts/ProjectContext", () => ({
  useProject: vi.fn(() => ({
    onRequestFilePicker: vi.fn(),
  })),
}));

import { useProject } from "@/contexts/ProjectContext";
import { useReactFlow } from "@xyflow/react";

describe("components/nodes/custom/hooks/helpers/useFilePickerHandler", () => {
  const mockSetNodes = vi.fn();
  const mockOnRequestFilePicker = vi.fn();

  const defaultParams = {
    nodeId: "test-node",
    filePath: "/current/file.py",
    filePathFieldId: "file",
    config: { code: "test code", file: "/current/file.py" },
    codeEditorField: { id: "code", language: "python" },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useReactFlow as any).mockReturnValue({
      setNodes: mockSetNodes,
    });
    (useProject as any).mockReturnValue({
      onRequestFilePicker: mockOnRequestFilePicker,
    });
  });

  describe("handleChangeFile", () => {
    it("should call onRequestFilePicker with correct extensions for python", () => {
      const { result } = renderHook(() =>
        useFilePickerHandler(defaultParams),
      );

      act(() => {
        result.current.handleChangeFile();
      });

      expect(mockOnRequestFilePicker).toHaveBeenCalledWith(
        "/current/file.py",
        expect.any(Function),
        {
          extensions: [".py"],
          filterLabel: "Python files",
        },
      );
    });

    it("should call onRequestFilePicker with correct extensions for markdown", () => {
      const params = {
        ...defaultParams,
        codeEditorField: { id: "code", language: "markdown" },
      };

      const { result } = renderHook(() => useFilePickerHandler(params));

      act(() => {
        result.current.handleChangeFile();
      });

      expect(mockOnRequestFilePicker).toHaveBeenCalledWith(
        "/current/file.py",
        expect.any(Function),
        {
          extensions: [".md", ".txt"],
          filterLabel: "Markdown files",
        },
      );
    });

    it("should call onRequestFilePicker with correct extensions for json", () => {
      const params = {
        ...defaultParams,
        codeEditorField: { id: "code", language: "json" },
      };

      const { result } = renderHook(() => useFilePickerHandler(params));

      act(() => {
        result.current.handleChangeFile();
      });

      expect(mockOnRequestFilePicker).toHaveBeenCalledWith(
        "/current/file.py",
        expect.any(Function),
        {
          extensions: [".json"],
          filterLabel: "JSON files",
        },
      );
    });

    it("should call onRequestFilePicker with correct extensions for yaml", () => {
      const params = {
        ...defaultParams,
        codeEditorField: { id: "code", language: "yaml" },
      };

      const { result } = renderHook(() => useFilePickerHandler(params));

      act(() => {
        result.current.handleChangeFile();
      });

      expect(mockOnRequestFilePicker).toHaveBeenCalledWith(
        "/current/file.py",
        expect.any(Function),
        {
          extensions: [".yaml", ".yml"],
          filterLabel: "YAML files",
        },
      );
    });

    it("should call onRequestFilePicker with correct extensions for javascript", () => {
      const params = {
        ...defaultParams,
        codeEditorField: { id: "code", language: "javascript" },
      };

      const { result } = renderHook(() => useFilePickerHandler(params));

      act(() => {
        result.current.handleChangeFile();
      });

      expect(mockOnRequestFilePicker).toHaveBeenCalledWith(
        "/current/file.py",
        expect.any(Function),
        {
          extensions: [".js", ".jsx"],
          filterLabel: "JavaScript files",
        },
      );
    });

    it("should call onRequestFilePicker with correct extensions for typescript", () => {
      const params = {
        ...defaultParams,
        codeEditorField: { id: "code", language: "typescript" },
      };

      const { result } = renderHook(() => useFilePickerHandler(params));

      act(() => {
        result.current.handleChangeFile();
      });

      expect(mockOnRequestFilePicker).toHaveBeenCalledWith(
        "/current/file.py",
        expect.any(Function),
        {
          extensions: [".ts", ".tsx"],
          filterLabel: "TypeScript files",
        },
      );
    });

    it("should use default extensions for unknown language", () => {
      const params = {
        ...defaultParams,
        codeEditorField: { id: "code", language: "unknown" },
      };

      const { result } = renderHook(() => useFilePickerHandler(params));

      act(() => {
        result.current.handleChangeFile();
      });

      expect(mockOnRequestFilePicker).toHaveBeenCalledWith(
        "/current/file.py",
        expect.any(Function),
        {
          extensions: [".*"],
          filterLabel: "All files",
        },
      );
    });

    it("should default to python when no language specified", () => {
      const params = {
        ...defaultParams,
        codeEditorField: { id: "code" },
      };

      const { result } = renderHook(() => useFilePickerHandler(params));

      act(() => {
        result.current.handleChangeFile();
      });

      expect(mockOnRequestFilePicker).toHaveBeenCalledWith(
        "/current/file.py",
        expect.any(Function),
        {
          extensions: [".py"],
          filterLabel: "Python files",
        },
      );
    });

    it("should default to python when no codeEditorField", () => {
      const params = {
        ...defaultParams,
        codeEditorField: undefined,
      };

      const { result } = renderHook(() => useFilePickerHandler(params));

      act(() => {
        result.current.handleChangeFile();
      });

      expect(mockOnRequestFilePicker).toHaveBeenCalledWith(
        "/current/file.py",
        expect.any(Function),
        {
          extensions: [".py"],
          filterLabel: "Python files",
        },
      );
    });

    it("should update node config when file is selected", () => {
      const { result } = renderHook(() =>
        useFilePickerHandler(defaultParams),
      );

      act(() => {
        result.current.handleChangeFile();
      });

      // Get the callback that was passed to onRequestFilePicker
      const onSelectCallback = mockOnRequestFilePicker.mock.calls[0][1];

      // Simulate file selection
      act(() => {
        onSelectCallback("/new/file.py");
      });

      expect(mockSetNodes).toHaveBeenCalledWith(expect.any(Function));

      // Verify the setNodes callback updates the correct node
      const setNodesCallback = mockSetNodes.mock.calls[0][0];
      const nodes = [
        {
          id: "test-node",
          data: {
            config: { code: "test code", file: "/current/file.py" },
          },
        },
        {
          id: "other-node",
          data: { config: { code: "other" } },
        },
      ];

      const updatedNodes = setNodesCallback(nodes);

      expect(updatedNodes[0].data.config.file).toBe("/new/file.py");
      expect(updatedNodes[1].data.config.code).toBe("other");
    });

    it("should preserve other config values when updating file path", () => {
      const params = {
        ...defaultParams,
        config: {
          code: "test code",
          file: "/current/file.py",
          otherField: "value",
        },
      };

      const { result } = renderHook(() => useFilePickerHandler(params));

      act(() => {
        result.current.handleChangeFile();
      });

      const onSelectCallback = mockOnRequestFilePicker.mock.calls[0][1];

      act(() => {
        onSelectCallback("/new/file.py");
      });

      const setNodesCallback = mockSetNodes.mock.calls[0][0];
      const nodes = [
        {
          id: "test-node",
          data: {
            config: {
              code: "test code",
              file: "/current/file.py",
              otherField: "value",
            },
          },
        },
      ];

      const updatedNodes = setNodesCallback(nodes);

      expect(updatedNodes[0].data.config).toEqual({
        code: "test code",
        file: "/new/file.py",
        otherField: "value",
      });
    });

    it("should do nothing when onRequestFilePicker is not available", () => {
      (useProject as any).mockReturnValue({
        onRequestFilePicker: undefined,
      });

      const { result } = renderHook(() =>
        useFilePickerHandler(defaultParams),
      );

      act(() => {
        result.current.handleChangeFile();
      });

      expect(mockSetNodes).not.toHaveBeenCalled();
    });

    it("should pass current file path to onRequestFilePicker", () => {
      const params = {
        ...defaultParams,
        filePath: "/different/path.py",
      };

      const { result } = renderHook(() => useFilePickerHandler(params));

      act(() => {
        result.current.handleChangeFile();
      });

      expect(mockOnRequestFilePicker).toHaveBeenCalledWith(
        "/different/path.py",
        expect.any(Function),
        expect.any(Object),
      );
    });

    it("should use correct filePathFieldId when updating config", () => {
      const params = {
        ...defaultParams,
        filePathFieldId: "custom_file_path",
      };

      const { result } = renderHook(() => useFilePickerHandler(params));

      act(() => {
        result.current.handleChangeFile();
      });

      const onSelectCallback = mockOnRequestFilePicker.mock.calls[0][1];

      act(() => {
        onSelectCallback("/new/file.py");
      });

      const setNodesCallback = mockSetNodes.mock.calls[0][0];
      const nodes = [
        {
          id: "test-node",
          data: {
            config: { code: "test", custom_file_path: "/old.py" },
          },
        },
      ];

      const updatedNodes = setNodesCallback(nodes);

      expect(updatedNodes[0].data.config.custom_file_path).toBe(
        "/new/file.py",
      );
    });
  });

  describe("return value", () => {
    it("should return handleChangeFile function", () => {
      const { result } = renderHook(() =>
        useFilePickerHandler(defaultParams),
      );

      expect(typeof result.current.handleChangeFile).toBe("function");
    });
  });
});
