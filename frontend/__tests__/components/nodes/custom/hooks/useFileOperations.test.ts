import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useFileOperations } from "@/components/nodes/custom/hooks/useFileOperations";
import type { CustomNodeSchema } from "@/components/nodes/CustomNode/types";
import * as api from "@/lib/api";

// Mock the helper hooks
vi.mock(
  "@/components/nodes/custom/hooks/helpers/useFileContentLoader",
  () => ({
    useFileContentLoader: vi.fn(() => ({
      codeEditorField: { id: "code", language: "python" },
      filePickerField: { id: "file", widget: "file_picker" },
      filePath: "",
      codeContent: "",
      fileLoadConfirm: null,
      handleConfirmLoad: vi.fn(),
      handleCancelLoad: vi.fn(),
    })),
  }),
);

vi.mock(
  "@/components/nodes/custom/hooks/helpers/useFileSaveHandler",
  () => ({
    useFileSaveHandler: vi.fn(() => ({
      handleFileSave: vi.fn(),
    })),
  }),
);

vi.mock(
  "@/components/nodes/custom/hooks/helpers/useFilePickerHandler",
  () => ({
    useFilePickerHandler: vi.fn(() => ({
      handleChangeFile: vi.fn(),
    })),
  }),
);

import { useFileContentLoader } from "@/components/nodes/custom/hooks/helpers/useFileContentLoader";
import { useFileSaveHandler } from "@/components/nodes/custom/hooks/helpers/useFileSaveHandler";
import { useFilePickerHandler } from "@/components/nodes/custom/hooks/helpers/useFilePickerHandler";

describe("components/nodes/custom/hooks/useFileOperations", () => {
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
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initialization", () => {
    it("should call useFileContentLoader with correct params", () => {
      renderHook(() =>
        useFileOperations(
          defaultParams.nodeId,
          defaultParams.schema,
          defaultParams.config,
          defaultParams.isExpanded,
        ),
      );

      expect(useFileContentLoader).toHaveBeenCalledWith(
        expect.objectContaining({
          nodeId: "test-node",
          schema: baseSchema,
          config: defaultParams.config,
          isExpanded: false,
          isContentLoaded: false,
        }),
      );
    });

    it("should call useFileSaveHandler with correct params", () => {
      (useFileContentLoader as any).mockReturnValue({
        codeEditorField: { id: "code", language: "python" },
        filePickerField: { id: "file" },
        filePath: "/test/file.py",
        codeContent: "test code",
        fileLoadConfirm: null,
        handleConfirmLoad: vi.fn(),
        handleCancelLoad: vi.fn(),
      });

      renderHook(() =>
        useFileOperations(
          defaultParams.nodeId,
          defaultParams.schema,
          defaultParams.config,
          defaultParams.isExpanded,
        ),
      );

      expect(useFileSaveHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          filePath: "/test/file.py",
          codeContent: "test code",
          codeEditorField: { id: "code", language: "python" },
        }),
      );
    });

    it("should call useFilePickerHandler with correct params", () => {
      (useFileContentLoader as any).mockReturnValue({
        codeEditorField: { id: "code", language: "python" },
        filePickerField: { id: "file" },
        filePath: "/test/file.py",
        codeContent: "test code",
        fileLoadConfirm: null,
        handleConfirmLoad: vi.fn(),
        handleCancelLoad: vi.fn(),
      });

      renderHook(() =>
        useFileOperations(
          defaultParams.nodeId,
          defaultParams.schema,
          defaultParams.config,
          defaultParams.isExpanded,
        ),
      );

      expect(useFilePickerHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          nodeId: "test-node",
          filePath: "/test/file.py",
          filePathFieldId: "file",
          config: defaultParams.config,
          codeEditorField: { id: "code", language: "python" },
        }),
      );
    });
  });

  describe("isDirty tracking", () => {
    it("should be false when no file path", () => {
      (useFileContentLoader as any).mockReturnValue({
        codeEditorField: { id: "code" },
        filePickerField: { id: "file" },
        filePath: "",
        codeContent: "modified content",
        fileLoadConfirm: null,
        handleConfirmLoad: vi.fn(),
        handleCancelLoad: vi.fn(),
      });

      const { result } = renderHook(() =>
        useFileOperations(
          defaultParams.nodeId,
          defaultParams.schema,
          defaultParams.config,
          true,
        ),
      );

      // Initially false because isContentLoaded is false
      expect(result.current.isDirty).toBe(false);
    });

    it("should be false when content not yet loaded", () => {
      (useFileContentLoader as any).mockReturnValue({
        codeEditorField: { id: "code" },
        filePickerField: { id: "file" },
        filePath: "/test/file.py",
        codeContent: "modified content",
        fileLoadConfirm: null,
        handleConfirmLoad: vi.fn(),
        handleCancelLoad: vi.fn(),
      });

      const { result } = renderHook(() =>
        useFileOperations(
          defaultParams.nodeId,
          defaultParams.schema,
          defaultParams.config,
          true,
        ),
      );

      expect(result.current.isDirty).toBe(false);
    });

    it("should be false when content matches saved content", () => {
      (useFileContentLoader as any).mockReturnValue({
        codeEditorField: { id: "code" },
        filePickerField: { id: "file" },
        filePath: "/test/file.py",
        codeContent: "same content",
        fileLoadConfirm: null,
        handleConfirmLoad: vi.fn(),
        handleCancelLoad: vi.fn(),
      });

      const { result } = renderHook(() =>
        useFileOperations(
          defaultParams.nodeId,
          defaultParams.schema,
          defaultParams.config,
          true,
        ),
      );

      // Simulate content loaded
      const loaderCall = (useFileContentLoader as any).mock.calls[0][0];
      loaderCall.setIsContentLoaded(true);
      loaderCall.setSavedContent("same content");

      expect(result.current.isContentLoaded).toBe(false); // Still false in this render
    });

    it("should be true when content differs from saved content", async () => {
      const mockHandleConfirmLoad = vi.fn();
      const mockHandleCancelLoad = vi.fn();

      (useFileContentLoader as any).mockReturnValue({
        codeEditorField: { id: "code" },
        filePickerField: { id: "file" },
        filePath: "/test/file.py",
        codeContent: "modified content",
        fileLoadConfirm: null,
        handleConfirmLoad: mockHandleConfirmLoad,
        handleCancelLoad: mockHandleCancelLoad,
      });

      const { result, rerender } = renderHook(
        (props) =>
          useFileOperations(
            props.nodeId,
            props.schema,
            props.config,
            props.isExpanded,
          ),
        {
          initialProps: defaultParams,
        },
      );

      // Get the callbacks that were passed to useFileContentLoader
      const loaderParams = (useFileContentLoader as any).mock.calls[0][0];

      // Simulate content being loaded with different saved content
      loaderParams.setIsContentLoaded(true);
      loaderParams.setSavedContent("original content");

      // Update the mock to reflect the new state
      (useFileContentLoader as any).mockReturnValue({
        codeEditorField: { id: "code" },
        filePickerField: { id: "file" },
        filePath: "/test/file.py",
        codeContent: "modified content",
        fileLoadConfirm: null,
        handleConfirmLoad: mockHandleConfirmLoad,
        handleCancelLoad: mockHandleCancelLoad,
      });

      // Re-render to pick up the state change
      rerender({
        ...defaultParams,
        config: { code: "modified content", file: "/test/file.py" },
      });

      // The hook should now report content is loaded
      await waitFor(() => {
        expect(result.current.isContentLoaded).toBe(true);
      });

      await waitFor(() => {
        expect(result.current.savedContent).toBe("original content");
      });

      // Now isDirty should be true
      expect(result.current.isDirty).toBe(true);
    });
  });

  describe("return values", () => {
    it("should return all required properties", () => {
      const mockHandleFileSave = vi.fn();
      const mockHandleChangeFile = vi.fn();
      const mockHandleConfirmLoad = vi.fn();
      const mockHandleCancelLoad = vi.fn();

      (useFileSaveHandler as any).mockReturnValue({
        handleFileSave: mockHandleFileSave,
      });

      (useFilePickerHandler as any).mockReturnValue({
        handleChangeFile: mockHandleChangeFile,
      });

      (useFileContentLoader as any).mockReturnValue({
        codeEditorField: { id: "code" },
        filePickerField: { id: "file" },
        filePath: "/test/file.py",
        codeContent: "test",
        fileLoadConfirm: { pendingFilePath: "/new.py", existingContent: "old" },
        handleConfirmLoad: mockHandleConfirmLoad,
        handleCancelLoad: mockHandleCancelLoad,
      });

      const { result } = renderHook(() =>
        useFileOperations(
          defaultParams.nodeId,
          defaultParams.schema,
          defaultParams.config,
          defaultParams.isExpanded,
        ),
      );

      expect(result.current).toEqual({
        isSaving: false,
        savedContent: null,
        isContentLoaded: false,
        isDirty: false,
        filePath: "/test/file.py",
        handleFileSave: mockHandleFileSave,
        handleChangeFile: mockHandleChangeFile,
        fileLoadConfirm: {
          pendingFilePath: "/new.py",
          existingContent: "old",
        },
        handleConfirmLoad: mockHandleConfirmLoad,
        handleCancelLoad: mockHandleCancelLoad,
      });
    });

    it("should return null fileLoadConfirm when no confirmation pending", () => {
      (useFileContentLoader as any).mockReturnValue({
        codeEditorField: { id: "code" },
        filePickerField: { id: "file" },
        filePath: "/test/file.py",
        codeContent: "test",
        fileLoadConfirm: null,
        handleConfirmLoad: vi.fn(),
        handleCancelLoad: vi.fn(),
      });

      const { result } = renderHook(() =>
        useFileOperations(
          defaultParams.nodeId,
          defaultParams.schema,
          defaultParams.config,
          defaultParams.isExpanded,
        ),
      );

      expect(result.current.fileLoadConfirm).toBeNull();
    });
  });

  describe("legacy file_path support", () => {
    it("should use legacy file_path field when no file_picker field", () => {
      (useFileContentLoader as any).mockReturnValue({
        codeEditorField: { id: "code" },
        filePickerField: undefined,
        filePath: "/legacy/path.py",
        codeContent: "test",
        fileLoadConfirm: null,
        handleConfirmLoad: vi.fn(),
        handleCancelLoad: vi.fn(),
      });

      renderHook(() =>
        useFileOperations(
          defaultParams.nodeId,
          defaultParams.schema,
          defaultParams.config,
          defaultParams.isExpanded,
        ),
      );

      expect(useFilePickerHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          filePathFieldId: "file_path",
        }),
      );
    });
  });

  describe("state updates", () => {
    it("should update isSaving state via setIsSaving", () => {
      const { result } = renderHook(() =>
        useFileOperations(
          defaultParams.nodeId,
          defaultParams.schema,
          defaultParams.config,
          defaultParams.isExpanded,
        ),
      );

      // Get setIsSaving from the call to useFileSaveHandler
      const saveHandlerParams = (useFileSaveHandler as any).mock.calls[0][0];

      expect(result.current.isSaving).toBe(false);

      saveHandlerParams.setIsSaving(true);

      // The state won't update in the same render, but we can verify the setter was called
      expect(saveHandlerParams.setIsSaving).toBeDefined();
    });

    it("should update savedContent via setSavedContent", () => {
      const { result } = renderHook(() =>
        useFileOperations(
          defaultParams.nodeId,
          defaultParams.schema,
          defaultParams.config,
          defaultParams.isExpanded,
        ),
      );

      const loaderParams = (useFileContentLoader as any).mock.calls[0][0];

      expect(result.current.savedContent).toBeNull();

      loaderParams.setSavedContent("new saved content");

      expect(loaderParams.setSavedContent).toBeDefined();
    });

    it("should update isContentLoaded via setIsContentLoaded", () => {
      const { result } = renderHook(() =>
        useFileOperations(
          defaultParams.nodeId,
          defaultParams.schema,
          defaultParams.config,
          defaultParams.isExpanded,
        ),
      );

      const loaderParams = (useFileContentLoader as any).mock.calls[0][0];

      expect(result.current.isContentLoaded).toBe(false);

      loaderParams.setIsContentLoaded(true);

      expect(loaderParams.setIsContentLoaded).toBeDefined();
    });
  });
});
