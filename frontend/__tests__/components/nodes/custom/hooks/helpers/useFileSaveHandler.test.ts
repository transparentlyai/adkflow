import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFileSaveHandler } from "@/components/nodes/custom/hooks/helpers/useFileSaveHandler";

vi.mock("@/contexts/ProjectContext", () => ({
  useProject: vi.fn(() => ({
    onSaveFile: vi.fn(),
  })),
}));

import { useProject } from "@/contexts/ProjectContext";

describe("components/nodes/custom/hooks/helpers/useFileSaveHandler", () => {
  const mockOnSaveFile = vi.fn();
  const mockSetIsSaving = vi.fn();
  const mockSetSavedContent = vi.fn();

  const defaultParams = {
    filePath: "/path/to/file.py",
    codeContent: "print('hello')",
    codeEditorField: { id: "code" },
    setIsSaving: mockSetIsSaving,
    setSavedContent: mockSetSavedContent,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useProject as any).mockReturnValue({
      onSaveFile: mockOnSaveFile,
    });
  });

  describe("handleFileSave", () => {
    it("should save file successfully", async () => {
      mockOnSaveFile.mockResolvedValue(undefined);

      const { result } = renderHook(() => useFileSaveHandler(defaultParams));

      await act(async () => {
        await result.current.handleFileSave();
      });

      expect(mockOnSaveFile).toHaveBeenCalledWith(
        "/path/to/file.py",
        "print('hello')",
      );
      expect(mockSetIsSaving).toHaveBeenCalledWith(true);
      expect(mockSetSavedContent).toHaveBeenCalledWith("print('hello')");
      expect(mockSetIsSaving).toHaveBeenCalledWith(false);
    });

    it("should set isSaving to true before saving", async () => {
      mockOnSaveFile.mockResolvedValue(undefined);

      const { result } = renderHook(() => useFileSaveHandler(defaultParams));

      const savePromise = act(async () => {
        await result.current.handleFileSave();
      });

      // Verify setIsSaving(true) was called
      expect(mockSetIsSaving).toHaveBeenCalledWith(true);

      await savePromise;
    });

    it("should set isSaving to false after saving", async () => {
      mockOnSaveFile.mockResolvedValue(undefined);

      const { result } = renderHook(() => useFileSaveHandler(defaultParams));

      await act(async () => {
        await result.current.handleFileSave();
      });

      // Verify setIsSaving(false) was called
      const calls = mockSetIsSaving.mock.calls;
      expect(calls[calls.length - 1][0]).toBe(false);
    });

    it("should update saved content after successful save", async () => {
      mockOnSaveFile.mockResolvedValue(undefined);

      const { result } = renderHook(() => useFileSaveHandler(defaultParams));

      await act(async () => {
        await result.current.handleFileSave();
      });

      expect(mockSetSavedContent).toHaveBeenCalledWith("print('hello')");
    });

    it("should handle save errors gracefully", async () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      mockOnSaveFile.mockRejectedValue(new Error("Save failed"));

      const { result } = renderHook(() => useFileSaveHandler(defaultParams));

      await act(async () => {
        await result.current.handleFileSave();
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to save:",
        expect.any(Error),
      );
      expect(mockSetIsSaving).toHaveBeenCalledWith(false);

      consoleErrorSpy.mockRestore();
    });

    it("should not update saved content on error", async () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      mockOnSaveFile.mockRejectedValue(new Error("Save failed"));

      const { result } = renderHook(() => useFileSaveHandler(defaultParams));

      await act(async () => {
        await result.current.handleFileSave();
      });

      expect(mockSetSavedContent).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it("should set isSaving to false even on error", async () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      mockOnSaveFile.mockRejectedValue(new Error("Save failed"));

      const { result } = renderHook(() => useFileSaveHandler(defaultParams));

      await act(async () => {
        await result.current.handleFileSave();
      });

      const calls = mockSetIsSaving.mock.calls;
      expect(calls[calls.length - 1][0]).toBe(false);

      consoleErrorSpy.mockRestore();
    });

    it("should do nothing when onSaveFile is not available", async () => {
      (useProject as any).mockReturnValue({
        onSaveFile: undefined,
      });

      const { result } = renderHook(() => useFileSaveHandler(defaultParams));

      await act(async () => {
        await result.current.handleFileSave();
      });

      expect(mockSetIsSaving).not.toHaveBeenCalled();
      expect(mockSetSavedContent).not.toHaveBeenCalled();
    });

    it("should do nothing when no file path", async () => {
      const params = {
        ...defaultParams,
        filePath: "",
      };

      const { result } = renderHook(() => useFileSaveHandler(params));

      await act(async () => {
        await result.current.handleFileSave();
      });

      expect(mockOnSaveFile).not.toHaveBeenCalled();
      expect(mockSetIsSaving).not.toHaveBeenCalled();
    });

    it("should do nothing when no code editor field", async () => {
      const params = {
        ...defaultParams,
        codeEditorField: undefined,
      };

      const { result } = renderHook(() => useFileSaveHandler(params));

      await act(async () => {
        await result.current.handleFileSave();
      });

      expect(mockOnSaveFile).not.toHaveBeenCalled();
      expect(mockSetIsSaving).not.toHaveBeenCalled();
    });

    it("should save current code content", async () => {
      mockOnSaveFile.mockResolvedValue(undefined);

      const params = {
        ...defaultParams,
        codeContent: "new code content",
      };

      const { result } = renderHook(() => useFileSaveHandler(params));

      await act(async () => {
        await result.current.handleFileSave();
      });

      expect(mockOnSaveFile).toHaveBeenCalledWith(
        "/path/to/file.py",
        "new code content",
      );
      expect(mockSetSavedContent).toHaveBeenCalledWith("new code content");
    });

    it("should save to correct file path", async () => {
      mockOnSaveFile.mockResolvedValue(undefined);

      const params = {
        ...defaultParams,
        filePath: "/different/path.py",
      };

      const { result } = renderHook(() => useFileSaveHandler(params));

      await act(async () => {
        await result.current.handleFileSave();
      });

      expect(mockOnSaveFile).toHaveBeenCalledWith(
        "/different/path.py",
        "print('hello')",
      );
    });
  });

  describe("return value", () => {
    it("should return handleFileSave function", () => {
      const { result } = renderHook(() => useFileSaveHandler(defaultParams));

      expect(typeof result.current.handleFileSave).toBe("function");
    });
  });

  describe("callback stability", () => {
    it("should recreate callback when dependencies change", () => {
      const { result, rerender } = renderHook(
        (props) => useFileSaveHandler(props),
        {
          initialProps: defaultParams,
        },
      );

      const firstCallback = result.current.handleFileSave;

      rerender({
        ...defaultParams,
        codeContent: "different content",
      });

      const secondCallback = result.current.handleFileSave;

      expect(firstCallback).not.toBe(secondCallback);
    });

    it("should maintain same callback when no dependencies change", () => {
      const { result, rerender } = renderHook(
        (props) => useFileSaveHandler(props),
        {
          initialProps: defaultParams,
        },
      );

      const firstCallback = result.current.handleFileSave;

      rerender(defaultParams);

      const secondCallback = result.current.handleFileSave;

      expect(firstCallback).toBe(secondCallback);
    });
  });
});
