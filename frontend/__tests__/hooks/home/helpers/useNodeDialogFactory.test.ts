import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  useNodeDialogFactory,
  sanitizeForDash,
  sanitizeForUnderscore,
  extractPromptName,
  extractContextName,
  extractPyName,
  extractGenericName,
} from "@/hooks/home/helpers/useNodeDialogFactory";

describe("useNodeDialogFactory", () => {
  describe("sanitizeForDash", () => {
    it("should convert to lowercase", () => {
      expect(sanitizeForDash("Hello World")).toBe("hello-world");
    });

    it("should replace spaces with dashes", () => {
      expect(sanitizeForDash("my test name")).toBe("my-test-name");
    });

    it("should remove special characters", () => {
      expect(sanitizeForDash("hello@world!")).toBe("helloworld");
    });

    it("should handle multiple spaces", () => {
      expect(sanitizeForDash("hello   world")).toBe("hello-world");
    });

    it("should preserve existing dashes", () => {
      expect(sanitizeForDash("hello-world")).toBe("hello-world");
    });

    it("should handle underscores", () => {
      expect(sanitizeForDash("hello_world")).toBe("hello_world");
    });

    it("should handle empty string", () => {
      expect(sanitizeForDash("")).toBe("");
    });

    it("should handle numbers", () => {
      expect(sanitizeForDash("test 123")).toBe("test-123");
    });
  });

  describe("sanitizeForUnderscore", () => {
    it("should convert to lowercase", () => {
      expect(sanitizeForUnderscore("Hello World")).toBe("hello_world");
    });

    it("should replace spaces with underscores", () => {
      expect(sanitizeForUnderscore("my test name")).toBe("my_test_name");
    });

    it("should remove special characters", () => {
      expect(sanitizeForUnderscore("hello@world!")).toBe("helloworld");
    });

    it("should handle multiple spaces", () => {
      expect(sanitizeForUnderscore("hello   world")).toBe("hello_world");
    });

    it("should preserve existing underscores", () => {
      expect(sanitizeForUnderscore("hello_world")).toBe("hello_world");
    });

    it("should handle dashes", () => {
      expect(sanitizeForUnderscore("hello-world")).toBe("hello-world");
    });

    it("should handle empty string", () => {
      expect(sanitizeForUnderscore("")).toBe("");
    });
  });

  describe("extractPromptName", () => {
    it("should extract name from prompt file path", () => {
      expect(extractPromptName("prompts/my-prompt.prompt.md")).toBe(
        "my-prompt",
      );
    });

    it("should handle nested paths", () => {
      expect(extractPromptName("folder/subfolder/test.prompt.md")).toBe("test");
    });

    it("should handle .md extension without .prompt", () => {
      expect(extractPromptName("prompts/simple.md")).toBe("simple");
    });

    it("should handle file name only", () => {
      expect(extractPromptName("my-file.prompt.md")).toBe("my-file");
    });

    it("should return file name if no path separator", () => {
      expect(extractPromptName("name.prompt.md")).toBe("name");
    });
  });

  describe("extractContextName", () => {
    it("should extract name from context file path", () => {
      expect(extractContextName("static/my-context.context.md")).toBe(
        "my-context",
      );
    });

    it("should handle nested paths", () => {
      expect(extractContextName("folder/subfolder/test.context.md")).toBe(
        "test",
      );
    });

    it("should handle .md extension without .context", () => {
      expect(extractContextName("static/simple.md")).toBe("simple");
    });

    it("should handle file name only", () => {
      expect(extractContextName("my-file.context.md")).toBe("my-file");
    });
  });

  describe("extractPyName", () => {
    it("should extract name from Python file path", () => {
      expect(extractPyName("tools/my_tool.py")).toBe("my_tool");
    });

    it("should handle nested paths", () => {
      expect(extractPyName("folder/subfolder/helper.py")).toBe("helper");
    });

    it("should handle file name only", () => {
      expect(extractPyName("script.py")).toBe("script");
    });

    it("should handle underscored names", () => {
      expect(extractPyName("tools/my_custom_tool.py")).toBe("my_custom_tool");
    });
  });

  describe("extractGenericName", () => {
    it("should extract name from file with any extension", () => {
      expect(extractGenericName("outputs/result.txt")).toBe("result");
    });

    it("should handle nested paths", () => {
      expect(extractGenericName("folder/subfolder/data.json")).toBe("data");
    });

    it("should handle file name only", () => {
      expect(extractGenericName("output.csv")).toBe("output");
    });

    it("should handle multiple dots in name", () => {
      expect(extractGenericName("file.name.ext")).toBe("file.name");
    });

    it("should handle no extension", () => {
      expect(extractGenericName("noextension")).toBe("noextension");
    });
  });

  describe("useNodeDialogFactory hook", () => {
    const mockCanvasRef = { current: { addBuiltinSchemaNode: vi.fn() } };
    const mockSetDialogState = vi.fn();
    const mockMarkTabDirty = vi.fn();

    const defaultProps = {
      canvasRef: mockCanvasRef as any,
      activeTabId: "tab-1",
      markTabDirty: mockMarkTabDirty,
      dialogState: { isOpen: false, position: { x: 100, y: 100 } },
      setDialogState: mockSetDialogState,
      config: {
        nodeType: "prompt",
        fileExtension: ".prompt.md",
        folder: "prompts",
        sanitizeForPath: sanitizeForDash,
        extractNameFromPath: extractPromptName,
      },
    };

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should handle request by setting dialog open with position", () => {
      const { result } = renderHook(() => useNodeDialogFactory(defaultProps));

      act(() => {
        result.current.handleRequest({ x: 200, y: 300 });
      });

      expect(mockSetDialogState).toHaveBeenCalledWith({
        isOpen: true,
        position: { x: 200, y: 300 },
      });
    });

    it("should handle cancel by closing dialog", () => {
      const { result } = renderHook(() => useNodeDialogFactory(defaultProps));

      act(() => {
        result.current.handleCancel();
      });

      expect(mockSetDialogState).toHaveBeenCalledWith({ isOpen: false });
    });

    it("should handle create by adding node and closing dialog", () => {
      const propsWithPosition = {
        ...defaultProps,
        dialogState: { isOpen: true, position: { x: 100, y: 100 } },
      };

      const { result } = renderHook(() =>
        useNodeDialogFactory(propsWithPosition),
      );

      act(() => {
        result.current.handleCreate("My Prompt");
      });

      expect(mockCanvasRef.current.addBuiltinSchemaNode).toHaveBeenCalledWith(
        "prompt",
        { x: 100, y: 100 },
        {
          name: "My Prompt",
          file_path: "prompts/my-prompt.prompt.md",
        },
      );
      expect(mockSetDialogState).toHaveBeenCalledWith({ isOpen: false });
      expect(mockMarkTabDirty).toHaveBeenCalledWith("tab-1");
    });

    it("should handle selectExisting by adding node with extracted name", () => {
      const propsWithPosition = {
        ...defaultProps,
        dialogState: { isOpen: true, position: { x: 150, y: 200 } },
      };

      const { result } = renderHook(() =>
        useNodeDialogFactory(propsWithPosition),
      );

      act(() => {
        result.current.handleSelectExisting(
          "prompts/existing-prompt.prompt.md",
        );
      });

      expect(mockCanvasRef.current.addBuiltinSchemaNode).toHaveBeenCalledWith(
        "prompt",
        { x: 150, y: 200 },
        {
          name: "existing-prompt",
          file_path: "prompts/existing-prompt.prompt.md",
        },
      );
      expect(mockSetDialogState).toHaveBeenCalledWith({ isOpen: false });
      expect(mockMarkTabDirty).toHaveBeenCalledWith("tab-1");
    });

    it("should not mark tab dirty if no activeTabId", () => {
      const propsWithoutTab = {
        ...defaultProps,
        activeTabId: null,
        dialogState: { isOpen: true, position: { x: 100, y: 100 } },
      };

      const { result } = renderHook(() =>
        useNodeDialogFactory(propsWithoutTab),
      );

      act(() => {
        result.current.handleCreate("Test");
      });

      expect(mockMarkTabDirty).not.toHaveBeenCalled();
    });

    it("should not add node if canvasRef.current is null", () => {
      const propsWithNullCanvas = {
        ...defaultProps,
        canvasRef: { current: null },
        dialogState: { isOpen: true, position: { x: 100, y: 100 } },
      };

      const { result } = renderHook(() =>
        useNodeDialogFactory(propsWithNullCanvas),
      );

      act(() => {
        result.current.handleCreate("Test");
      });

      // Should still close dialog
      expect(mockSetDialogState).toHaveBeenCalledWith({ isOpen: false });
    });
  });
});
