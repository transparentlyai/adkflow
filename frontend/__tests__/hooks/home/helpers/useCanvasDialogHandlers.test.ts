import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useCanvasDialogHandlers } from "@/hooks/home/helpers/useCanvasDialogHandlers";

// Mock the API
vi.mock("@/lib/api", () => ({
  readPrompt: vi.fn(),
  savePrompt: vi.fn(),
}));

import { readPrompt, savePrompt } from "@/lib/api";

describe("useCanvasDialogHandlers", () => {
  const mockCanvasRef = {
    current: {
      clearCanvas: vi.fn(),
      zoomIn: vi.fn(),
      zoomOut: vi.fn(),
      fitView: vi.fn(),
    },
  };
  const mockSetIsClearDialogOpen = vi.fn();
  const mockSetFilePickerState = vi.fn();
  const mockCallback = vi.fn();

  const defaultProps = {
    canvasRef: mockCanvasRef as any,
    currentProjectPath: "/path/to/project",
    isClearDialogOpen: false,
    setIsClearDialogOpen: mockSetIsClearDialogOpen,
    filePickerState: {
      isOpen: false,
      callback: null,
    },
    setFilePickerState: mockSetFilePickerState,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (readPrompt as any).mockResolvedValue({ content: "test content" });
    (savePrompt as any).mockResolvedValue(undefined);
  });

  describe("clear canvas handlers", () => {
    it("should open clear dialog on handleClearCanvasClick", () => {
      const { result } = renderHook(() =>
        useCanvasDialogHandlers(defaultProps),
      );

      act(() => {
        result.current.handleClearCanvasClick();
      });

      expect(mockSetIsClearDialogOpen).toHaveBeenCalledWith(true);
    });

    it("should clear canvas and close dialog on handleClearCanvasConfirm", () => {
      const { result } = renderHook(() =>
        useCanvasDialogHandlers(defaultProps),
      );

      act(() => {
        result.current.handleClearCanvasConfirm();
      });

      expect(mockCanvasRef.current.clearCanvas).toHaveBeenCalled();
      expect(mockSetIsClearDialogOpen).toHaveBeenCalledWith(false);
    });

    it("should close dialog on handleClearCanvasCancel", () => {
      const { result } = renderHook(() =>
        useCanvasDialogHandlers(defaultProps),
      );

      act(() => {
        result.current.handleClearCanvasCancel();
      });

      expect(mockSetIsClearDialogOpen).toHaveBeenCalledWith(false);
      expect(mockCanvasRef.current.clearCanvas).not.toHaveBeenCalled();
    });
  });

  describe("zoom handlers", () => {
    it("should call zoomIn on handleZoomIn", () => {
      const { result } = renderHook(() =>
        useCanvasDialogHandlers(defaultProps),
      );

      act(() => {
        result.current.handleZoomIn();
      });

      expect(mockCanvasRef.current.zoomIn).toHaveBeenCalled();
    });

    it("should call zoomOut on handleZoomOut", () => {
      const { result } = renderHook(() =>
        useCanvasDialogHandlers(defaultProps),
      );

      act(() => {
        result.current.handleZoomOut();
      });

      expect(mockCanvasRef.current.zoomOut).toHaveBeenCalled();
    });

    it("should call fitView on handleFitView", () => {
      const { result } = renderHook(() =>
        useCanvasDialogHandlers(defaultProps),
      );

      act(() => {
        result.current.handleFitView();
      });

      expect(mockCanvasRef.current.fitView).toHaveBeenCalled();
    });

    it("should handle null canvas ref for zoom operations", () => {
      const propsWithNullCanvas = {
        ...defaultProps,
        canvasRef: { current: null },
      };

      const { result } = renderHook(() =>
        useCanvasDialogHandlers(propsWithNullCanvas),
      );

      // Should not throw
      act(() => {
        result.current.handleZoomIn();
        result.current.handleZoomOut();
        result.current.handleFitView();
      });
    });
  });

  describe("file save handler", () => {
    it("should save file when project path exists", async () => {
      const { result } = renderHook(() =>
        useCanvasDialogHandlers(defaultProps),
      );

      await act(async () => {
        await result.current.handleSaveFile("prompts/test.md", "content");
      });

      expect(savePrompt).toHaveBeenCalledWith(
        "/path/to/project",
        "prompts/test.md",
        "content",
      );
    });

    it("should not save file when project path is null", async () => {
      const propsWithoutProject = {
        ...defaultProps,
        currentProjectPath: null,
      };

      const { result } = renderHook(() =>
        useCanvasDialogHandlers(propsWithoutProject),
      );

      await act(async () => {
        await result.current.handleSaveFile("prompts/test.md", "content");
      });

      expect(savePrompt).not.toHaveBeenCalled();
    });
  });

  describe("file picker handlers", () => {
    it("should open file picker with absolute path when file starts with /", () => {
      const { result } = renderHook(() =>
        useCanvasDialogHandlers(defaultProps),
      );

      act(() => {
        result.current.handleRequestFilePicker(
          "/absolute/path/file.md",
          mockCallback,
        );
      });

      expect(mockSetFilePickerState).toHaveBeenCalledWith({
        isOpen: true,
        initialPath: "/absolute/path/file.md",
        callback: mockCallback,
        options: undefined,
      });
    });

    it("should open file picker with combined path for relative paths", () => {
      const { result } = renderHook(() =>
        useCanvasDialogHandlers(defaultProps),
      );

      act(() => {
        result.current.handleRequestFilePicker("prompts/test.md", mockCallback);
      });

      expect(mockSetFilePickerState).toHaveBeenCalledWith({
        isOpen: true,
        initialPath: "/path/to/project/prompts/test.md",
        callback: mockCallback,
        options: undefined,
      });
    });

    it("should pass options to file picker", () => {
      const { result } = renderHook(() =>
        useCanvasDialogHandlers(defaultProps),
      );

      const options = { filter: "*.md" };
      act(() => {
        result.current.handleRequestFilePicker(
          "test.md",
          mockCallback,
          options as any,
        );
      });

      expect(mockSetFilePickerState).toHaveBeenCalledWith(
        expect.objectContaining({ options }),
      );
    });

    it("should handle file selection and call callback", async () => {
      const propsWithCallback = {
        ...defaultProps,
        filePickerState: {
          isOpen: true,
          callback: mockCallback,
        },
      };

      const { result } = renderHook(() =>
        useCanvasDialogHandlers(propsWithCallback),
      );

      await act(async () => {
        await result.current.handleFilePickerSelect("new/path.md");
      });

      expect(readPrompt).toHaveBeenCalledWith(
        "/path/to/project",
        "new/path.md",
      );
      expect(mockCallback).toHaveBeenCalledWith("new/path.md");
      expect(mockSetFilePickerState).toHaveBeenCalledWith({
        isOpen: false,
        callback: null,
      });
    });

    it("should still call callback on read error", async () => {
      (readPrompt as any).mockRejectedValue(new Error("Read error"));

      const propsWithCallback = {
        ...defaultProps,
        filePickerState: {
          isOpen: true,
          callback: mockCallback,
        },
      };

      const { result } = renderHook(() =>
        useCanvasDialogHandlers(propsWithCallback),
      );

      await act(async () => {
        await result.current.handleFilePickerSelect("new/path.md");
      });

      expect(mockCallback).toHaveBeenCalledWith("new/path.md");
      expect(mockSetFilePickerState).toHaveBeenCalledWith({
        isOpen: false,
        callback: null,
      });
    });

    it("should cancel file picker", () => {
      const { result } = renderHook(() =>
        useCanvasDialogHandlers(defaultProps),
      );

      act(() => {
        result.current.handleFilePickerCancel();
      });

      expect(mockSetFilePickerState).toHaveBeenCalledWith({
        isOpen: false,
        callback: null,
      });
    });
  });
});
