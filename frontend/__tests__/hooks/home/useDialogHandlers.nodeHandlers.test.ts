import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDialogHandlers } from "@/hooks/home/useDialogHandlers";

// Mock the helper hooks
const mockNodeDialogHandlers = {
  handleRequest: vi.fn(),
  handleCreate: vi.fn(),
  handleCancel: vi.fn(),
  handleSelectExisting: vi.fn(),
};

const mockCanvasDialogHandlers = {
  handleClearCanvasClick: vi.fn(),
  handleClearCanvasConfirm: vi.fn(),
  handleClearCanvasCancel: vi.fn(),
  handleZoomIn: vi.fn(),
  handleZoomOut: vi.fn(),
  handleFitView: vi.fn(),
  handleSaveFile: vi.fn(),
  handleRequestFilePicker: vi.fn(),
  handleFilePickerSelect: vi.fn(),
  handleFilePickerCancel: vi.fn(),
};

vi.mock("@/hooks/home/helpers/useNodeDialogFactory", () => ({
  useNodeDialogFactory: vi.fn(() => mockNodeDialogHandlers),
  sanitizeForDash: vi.fn((s) => s.toLowerCase().replace(/\s+/g, "-")),
  sanitizeForUnderscore: vi.fn((s) => s.toLowerCase().replace(/\s+/g, "_")),
  extractPromptName: vi.fn((p) =>
    p.split("/").pop()?.replace(".prompt.md", ""),
  ),
  extractContextName: vi.fn((p) =>
    p.split("/").pop()?.replace(".context.md", ""),
  ),
  extractPyName: vi.fn((p) => p.split("/").pop()?.replace(".py", "")),
  extractGenericName: vi.fn((p) => p.split("/").pop()?.split(".")[0]),
}));

vi.mock("@/hooks/home/helpers/useCanvasDialogHandlers", () => ({
  useCanvasDialogHandlers: vi.fn(() => mockCanvasDialogHandlers),
}));

describe("useDialogHandlers - node handlers", () => {
  const mockCanvasRef = { current: { addBuiltinSchemaNode: vi.fn() } };
  const mockMarkTabDirty = vi.fn();

  const defaultProps = {
    canvasRef: mockCanvasRef as any,
    currentProjectPath: "/path/to/project",
    activeTabId: "tab-1",
    markTabDirty: mockMarkTabDirty,
    promptDialogState: { isOpen: false },
    setPromptDialogState: vi.fn(),
    contextDialogState: { isOpen: false },
    setContextDialogState: vi.fn(),
    toolDialogState: { isOpen: false },
    setToolDialogState: vi.fn(),
    processDialogState: { isOpen: false },
    setProcessDialogState: vi.fn(),
    outputFileDialogState: { isOpen: false },
    setOutputFileDialogState: vi.fn(),
    isClearDialogOpen: false,
    setIsClearDialogOpen: vi.fn(),
    filePickerState: { isOpen: false, callback: null },
    setFilePickerState: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("prompt handlers", () => {
    it("should return handleRequestPromptCreation", () => {
      const { result } = renderHook(() => useDialogHandlers(defaultProps));

      expect(result.current.handleRequestPromptCreation).toBeDefined();
      expect(typeof result.current.handleRequestPromptCreation).toBe(
        "function",
      );

      act(() => {
        result.current.handleRequestPromptCreation({ x: 100, y: 200 });
      });

      expect(mockNodeDialogHandlers.handleRequest).toHaveBeenCalledWith({
        x: 100,
        y: 200,
      });
    });

    it("should return handleCreatePrompt", () => {
      const { result } = renderHook(() => useDialogHandlers(defaultProps));

      expect(result.current.handleCreatePrompt).toBeDefined();

      act(() => {
        result.current.handleCreatePrompt("My Prompt");
      });

      expect(mockNodeDialogHandlers.handleCreate).toHaveBeenCalledWith(
        "My Prompt",
      );
    });

    it("should return handleCancelPromptCreation", () => {
      const { result } = renderHook(() => useDialogHandlers(defaultProps));

      expect(result.current.handleCancelPromptCreation).toBeDefined();

      act(() => {
        result.current.handleCancelPromptCreation();
      });

      expect(mockNodeDialogHandlers.handleCancel).toHaveBeenCalled();
    });

    it("should return handleSelectExistingPrompt", () => {
      const { result } = renderHook(() => useDialogHandlers(defaultProps));

      expect(result.current.handleSelectExistingPrompt).toBeDefined();

      act(() => {
        result.current.handleSelectExistingPrompt("prompts/existing.prompt.md");
      });

      expect(mockNodeDialogHandlers.handleSelectExisting).toHaveBeenCalledWith(
        "prompts/existing.prompt.md",
      );
    });
  });

  describe("context handlers", () => {
    it("should return handleRequestContextCreation", () => {
      const { result } = renderHook(() => useDialogHandlers(defaultProps));

      expect(result.current.handleRequestContextCreation).toBeDefined();
    });

    it("should return handleCreateContext", () => {
      const { result } = renderHook(() => useDialogHandlers(defaultProps));

      expect(result.current.handleCreateContext).toBeDefined();
    });

    it("should return handleCancelContextCreation", () => {
      const { result } = renderHook(() => useDialogHandlers(defaultProps));

      expect(result.current.handleCancelContextCreation).toBeDefined();
    });

    it("should return handleSelectExistingContext", () => {
      const { result } = renderHook(() => useDialogHandlers(defaultProps));

      expect(result.current.handleSelectExistingContext).toBeDefined();
    });
  });

  describe("tool handlers", () => {
    it("should return handleRequestToolCreation", () => {
      const { result } = renderHook(() => useDialogHandlers(defaultProps));

      expect(result.current.handleRequestToolCreation).toBeDefined();
    });

    it("should return handleCreateTool", () => {
      const { result } = renderHook(() => useDialogHandlers(defaultProps));

      expect(result.current.handleCreateTool).toBeDefined();
    });

    it("should return handleCancelToolCreation", () => {
      const { result } = renderHook(() => useDialogHandlers(defaultProps));

      expect(result.current.handleCancelToolCreation).toBeDefined();
    });

    it("should return handleSelectExistingTool", () => {
      const { result } = renderHook(() => useDialogHandlers(defaultProps));

      expect(result.current.handleSelectExistingTool).toBeDefined();
    });
  });

  describe("process handlers", () => {
    it("should return handleRequestProcessCreation", () => {
      const { result } = renderHook(() => useDialogHandlers(defaultProps));

      expect(result.current.handleRequestProcessCreation).toBeDefined();
    });

    it("should return handleCreateProcess", () => {
      const { result } = renderHook(() => useDialogHandlers(defaultProps));

      expect(result.current.handleCreateProcess).toBeDefined();
    });

    it("should return handleCancelProcessCreation", () => {
      const { result } = renderHook(() => useDialogHandlers(defaultProps));

      expect(result.current.handleCancelProcessCreation).toBeDefined();
    });

    it("should return handleSelectExistingProcess", () => {
      const { result } = renderHook(() => useDialogHandlers(defaultProps));

      expect(result.current.handleSelectExistingProcess).toBeDefined();
    });
  });

  describe("output file handlers", () => {
    it("should return handleRequestOutputFileCreation", () => {
      const { result } = renderHook(() => useDialogHandlers(defaultProps));

      expect(result.current.handleRequestOutputFileCreation).toBeDefined();
    });

    it("should return handleCreateOutputFile", () => {
      const { result } = renderHook(() => useDialogHandlers(defaultProps));

      expect(result.current.handleCreateOutputFile).toBeDefined();
    });

    it("should return handleCancelOutputFileCreation", () => {
      const { result } = renderHook(() => useDialogHandlers(defaultProps));

      expect(result.current.handleCancelOutputFileCreation).toBeDefined();
    });

    it("should return handleSelectExistingOutputFile", () => {
      const { result } = renderHook(() => useDialogHandlers(defaultProps));

      expect(result.current.handleSelectExistingOutputFile).toBeDefined();
    });
  });
});
