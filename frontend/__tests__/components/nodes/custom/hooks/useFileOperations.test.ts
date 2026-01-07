import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useFileOperations } from "@/components/nodes/custom/hooks/useFileOperations";
import type { CustomNodeSchema } from "@/components/nodes/CustomNode/types";

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

describe("useFileOperations", () => {
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
});
