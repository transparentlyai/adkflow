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

import { useNodeDialogFactory } from "@/hooks/home/helpers/useNodeDialogFactory";
import { useCanvasDialogHandlers } from "@/hooks/home/helpers/useCanvasDialogHandlers";

describe("useDialogHandlers", () => {
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

  describe("initialization", () => {
    it("should call useNodeDialogFactory for each node type", () => {
      renderHook(() => useDialogHandlers(defaultProps));

      // Should be called 5 times: prompt, context, tool, process, outputFile
      expect(useNodeDialogFactory).toHaveBeenCalledTimes(5);
    });

    it("should call useCanvasDialogHandlers once", () => {
      renderHook(() => useDialogHandlers(defaultProps));

      expect(useCanvasDialogHandlers).toHaveBeenCalledTimes(1);
      expect(useCanvasDialogHandlers).toHaveBeenCalledWith({
        canvasRef: mockCanvasRef,
        currentProjectPath: "/path/to/project",
        isClearDialogOpen: false,
        setIsClearDialogOpen: defaultProps.setIsClearDialogOpen,
        filePickerState: defaultProps.filePickerState,
        setFilePickerState: defaultProps.setFilePickerState,
      });
    });

    it("should configure prompt dialog factory with correct options", () => {
      renderHook(() => useDialogHandlers(defaultProps));

      const calls = vi.mocked(useNodeDialogFactory).mock.calls;
      const promptCall = calls.find(
        (call) => call[0].config.nodeType === "prompt",
      );

      expect(promptCall).toBeDefined();
      expect(promptCall![0].config.fileExtension).toBe(".prompt.md");
      expect(promptCall![0].config.folder).toBe("prompts");
    });

    it("should configure context dialog factory with correct options", () => {
      renderHook(() => useDialogHandlers(defaultProps));

      const calls = vi.mocked(useNodeDialogFactory).mock.calls;
      const contextCall = calls.find(
        (call) => call[0].config.nodeType === "context",
      );

      expect(contextCall).toBeDefined();
      expect(contextCall![0].config.fileExtension).toBe(".context.md");
      expect(contextCall![0].config.folder).toBe("static");
    });

    it("should configure tool dialog factory with correct options", () => {
      renderHook(() => useDialogHandlers(defaultProps));

      const calls = vi.mocked(useNodeDialogFactory).mock.calls;
      const toolCall = calls.find((call) => call[0].config.nodeType === "tool");

      expect(toolCall).toBeDefined();
      expect(toolCall![0].config.fileExtension).toBe(".py");
      expect(toolCall![0].config.folder).toBe("tools");
    });

    it("should configure process dialog factory with correct options", () => {
      renderHook(() => useDialogHandlers(defaultProps));

      const calls = vi.mocked(useNodeDialogFactory).mock.calls;
      const processCall = calls.find(
        (call) => call[0].config.nodeType === "process",
      );

      expect(processCall).toBeDefined();
      expect(processCall![0].config.fileExtension).toBe(".py");
      expect(processCall![0].config.folder).toBe("tools");
    });

    it("should configure outputFile dialog factory with correct options", () => {
      renderHook(() => useDialogHandlers(defaultProps));

      const calls = vi.mocked(useNodeDialogFactory).mock.calls;
      const outputCall = calls.find(
        (call) => call[0].config.nodeType === "outputFile",
      );

      expect(outputCall).toBeDefined();
      expect(outputCall![0].config.fileExtension).toBe(".txt");
      expect(outputCall![0].config.folder).toBe("outputs");
    });
  });

  describe("canvas handlers spread", () => {
    it("should spread canvas dialog handlers into return value", () => {
      const { result } = renderHook(() => useDialogHandlers(defaultProps));

      // These come from useCanvasDialogHandlers
      expect(result.current.handleClearCanvasClick).toBeDefined();
      expect(result.current.handleClearCanvasConfirm).toBeDefined();
      expect(result.current.handleClearCanvasCancel).toBeDefined();
      expect(result.current.handleZoomIn).toBeDefined();
      expect(result.current.handleZoomOut).toBeDefined();
      expect(result.current.handleFitView).toBeDefined();
      expect(result.current.handleSaveFile).toBeDefined();
      expect(result.current.handleRequestFilePicker).toBeDefined();
      expect(result.current.handleFilePickerSelect).toBeDefined();
      expect(result.current.handleFilePickerCancel).toBeDefined();
    });

    it("should call handleClearCanvasClick from canvas handlers", () => {
      const { result } = renderHook(() => useDialogHandlers(defaultProps));

      act(() => {
        result.current.handleClearCanvasClick();
      });

      expect(
        mockCanvasDialogHandlers.handleClearCanvasClick,
      ).toHaveBeenCalled();
    });

    it("should call handleZoomIn from canvas handlers", () => {
      const { result } = renderHook(() => useDialogHandlers(defaultProps));

      act(() => {
        result.current.handleZoomIn();
      });

      expect(mockCanvasDialogHandlers.handleZoomIn).toHaveBeenCalled();
    });
  });

  describe("props passed to factories", () => {
    it("should pass canvasRef to node dialog factories", () => {
      renderHook(() => useDialogHandlers(defaultProps));

      const calls = vi.mocked(useNodeDialogFactory).mock.calls;
      calls.forEach((call) => {
        expect(call[0].canvasRef).toBe(mockCanvasRef);
      });
    });

    it("should pass activeTabId to node dialog factories", () => {
      renderHook(() => useDialogHandlers(defaultProps));

      const calls = vi.mocked(useNodeDialogFactory).mock.calls;
      calls.forEach((call) => {
        expect(call[0].activeTabId).toBe("tab-1");
      });
    });

    it("should pass markTabDirty to node dialog factories", () => {
      renderHook(() => useDialogHandlers(defaultProps));

      const calls = vi.mocked(useNodeDialogFactory).mock.calls;
      calls.forEach((call) => {
        expect(call[0].markTabDirty).toBe(mockMarkTabDirty);
      });
    });

    it("should pass correct dialog state to each factory", () => {
      renderHook(() => useDialogHandlers(defaultProps));

      const calls = vi.mocked(useNodeDialogFactory).mock.calls;

      const promptCall = calls.find(
        (call) => call[0].config.nodeType === "prompt",
      );
      expect(promptCall![0].dialogState).toBe(defaultProps.promptDialogState);
      expect(promptCall![0].setDialogState).toBe(
        defaultProps.setPromptDialogState,
      );

      const contextCall = calls.find(
        (call) => call[0].config.nodeType === "context",
      );
      expect(contextCall![0].dialogState).toBe(defaultProps.contextDialogState);
      expect(contextCall![0].setDialogState).toBe(
        defaultProps.setContextDialogState,
      );
    });
  });
});
