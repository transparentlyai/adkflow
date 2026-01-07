import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useContextMenu } from "@/components/hooks/canvas/useContextMenu";
import type { CustomNodeSchema } from "@/components/nodes/CustomNode";

// Mock the helper hooks
vi.mock("@/components/hooks/canvas/helpers/useContextMenuEvents", () => ({
  useContextMenuEvents: vi.fn(() => ({
    onPaneContextMenu: vi.fn(),
    onNodeContextMenu: vi.fn(),
    onSelectionContextMenu: vi.fn(),
    onMouseMove: vi.fn(),
    closeContextMenu: vi.fn(),
  })),
}));

vi.mock("@/components/hooks/canvas/helpers/useTeleportDialog", () => ({
  useTeleportDialog: vi.fn(() => ({
    handleTeleportNameSubmit: vi.fn(),
    handleTeleportNameCancel: vi.fn(),
    handleTeleportNameKeyDown: vi.fn(),
  })),
}));

vi.mock("@/components/hooks/canvas/helpers/useContextMenuSelect", () => ({
  useContextMenuSelect: vi.fn(() => ({
    addNodeWithParent: vi.fn(),
    onContextMenuSelect: vi.fn(),
    handleSelectCustomNode: vi.fn(),
  })),
}));

import { useContextMenuEvents } from "@/components/hooks/canvas/helpers/useContextMenuEvents";
import { useTeleportDialog } from "@/components/hooks/canvas/helpers/useTeleportDialog";
import { useContextMenuSelect } from "@/components/hooks/canvas/helpers/useContextMenuSelect";

describe("useContextMenu", () => {
  const mockSetNodes = vi.fn();
  const mockSetContextMenu = vi.fn();
  const mockSetTeleportNamePrompt = vi.fn();
  const mockSetTeleportNameInput = vi.fn();
  const mockSetMousePosition = vi.fn();
  const mockAddGroupNode = vi.fn();
  const mockAddLabelNode = vi.fn();
  const mockAddBuiltinSchemaNode = vi.fn();
  const mockAddCustomNode = vi.fn();
  const mockOnRequestPromptCreation = vi.fn();
  const mockOnRequestContextCreation = vi.fn();
  const mockOnRequestToolCreation = vi.fn();
  const mockOnRequestProcessCreation = vi.fn();
  const mockOnRequestOutputFileCreation = vi.fn();

  const defaultParams = {
    setNodes: mockSetNodes,
    contextMenu: null,
    setContextMenu: mockSetContextMenu,
    teleportNamePrompt: null,
    setTeleportNamePrompt: mockSetTeleportNamePrompt,
    teleportNameInput: "",
    setTeleportNameInput: mockSetTeleportNameInput,
    setMousePosition: mockSetMousePosition,
    isLocked: false,
    addGroupNode: mockAddGroupNode,
    addLabelNode: mockAddLabelNode,
    addBuiltinSchemaNode: mockAddBuiltinSchemaNode,
    addCustomNode: mockAddCustomNode,
    onRequestPromptCreation: mockOnRequestPromptCreation,
    onRequestContextCreation: mockOnRequestContextCreation,
    onRequestToolCreation: mockOnRequestToolCreation,
    onRequestProcessCreation: mockOnRequestProcessCreation,
    onRequestOutputFileCreation: mockOnRequestOutputFileCreation,
    defaultModel: undefined as string | undefined,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initialization", () => {
    it("should initialize with all helper hooks", () => {
      renderHook(() => useContextMenu(defaultParams));

      expect(useContextMenuEvents).toHaveBeenCalledWith({
        setContextMenu: mockSetContextMenu,
        setMousePosition: mockSetMousePosition,
        isLocked: false,
      });

      expect(useTeleportDialog).toHaveBeenCalledWith({
        teleportNamePrompt: null,
        teleportNameInput: "",
        setTeleportNamePrompt: mockSetTeleportNamePrompt,
        setTeleportNameInput: mockSetTeleportNameInput,
        addBuiltinSchemaNode: mockAddBuiltinSchemaNode,
      });

      expect(useContextMenuSelect).toHaveBeenCalledWith({
        setNodes: mockSetNodes,
        contextMenu: null,
        setContextMenu: mockSetContextMenu,
        setTeleportNamePrompt: mockSetTeleportNamePrompt,
        setTeleportNameInput: mockSetTeleportNameInput,
        addGroupNode: mockAddGroupNode,
        addLabelNode: mockAddLabelNode,
        addBuiltinSchemaNode: mockAddBuiltinSchemaNode,
        addCustomNode: mockAddCustomNode,
        closeContextMenu: expect.any(Function),
        onRequestPromptCreation: mockOnRequestPromptCreation,
        onRequestContextCreation: mockOnRequestContextCreation,
        onRequestToolCreation: mockOnRequestToolCreation,
        onRequestProcessCreation: mockOnRequestProcessCreation,
        onRequestOutputFileCreation: mockOnRequestOutputFileCreation,
        defaultModel: undefined,
      });
    });

    it("should pass defaultModel to useContextMenuSelect", () => {
      renderHook(() =>
        useContextMenu({ ...defaultParams, defaultModel: "gpt-4" }),
      );

      expect(useContextMenuSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          defaultModel: "gpt-4",
        }),
      );
    });

    it("should handle locked state", () => {
      renderHook(() => useContextMenu({ ...defaultParams, isLocked: true }));

      expect(useContextMenuEvents).toHaveBeenCalledWith({
        setContextMenu: mockSetContextMenu,
        setMousePosition: mockSetMousePosition,
        isLocked: true,
      });
    });
  });

  describe("return values", () => {
    it("should return all event handlers", () => {
      const mockEventHandlers = {
        onPaneContextMenu: vi.fn(),
        onNodeContextMenu: vi.fn(),
        onSelectionContextMenu: vi.fn(),
        onMouseMove: vi.fn(),
        closeContextMenu: vi.fn(),
      };

      vi.mocked(useContextMenuEvents).mockReturnValue(mockEventHandlers);

      const { result } = renderHook(() => useContextMenu(defaultParams));

      expect(result.current.onPaneContextMenu).toBe(
        mockEventHandlers.onPaneContextMenu,
      );
      expect(result.current.onNodeContextMenu).toBe(
        mockEventHandlers.onNodeContextMenu,
      );
      expect(result.current.onSelectionContextMenu).toBe(
        mockEventHandlers.onSelectionContextMenu,
      );
      expect(result.current.onMouseMove).toBe(mockEventHandlers.onMouseMove);
      expect(result.current.closeContextMenu).toBe(
        mockEventHandlers.closeContextMenu,
      );
    });

    it("should return all teleport dialog handlers", () => {
      const mockTeleportHandlers = {
        handleTeleportNameSubmit: vi.fn(),
        handleTeleportNameCancel: vi.fn(),
        handleTeleportNameKeyDown: vi.fn(),
      };

      vi.mocked(useTeleportDialog).mockReturnValue(mockTeleportHandlers);

      const { result } = renderHook(() => useContextMenu(defaultParams));

      expect(result.current.handleTeleportNameSubmit).toBe(
        mockTeleportHandlers.handleTeleportNameSubmit,
      );
      expect(result.current.handleTeleportNameCancel).toBe(
        mockTeleportHandlers.handleTeleportNameCancel,
      );
      expect(result.current.handleTeleportNameKeyDown).toBe(
        mockTeleportHandlers.handleTeleportNameKeyDown,
      );
    });

    it("should return all context menu select handlers", () => {
      const mockSelectHandlers = {
        addNodeWithParent: vi.fn(),
        onContextMenuSelect: vi.fn(),
        handleSelectCustomNode: vi.fn(),
      };

      vi.mocked(useContextMenuSelect).mockReturnValue(mockSelectHandlers);

      const { result } = renderHook(() => useContextMenu(defaultParams));

      expect(result.current.addNodeWithParent).toBe(
        mockSelectHandlers.addNodeWithParent,
      );
      expect(result.current.onContextMenuSelect).toBe(
        mockSelectHandlers.onContextMenuSelect,
      );
      expect(result.current.handleSelectCustomNode).toBe(
        mockSelectHandlers.handleSelectCustomNode,
      );
    });
  });

  describe("integration with defaultModel", () => {
    it("should pass undefined defaultModel when not provided", () => {
      renderHook(() => useContextMenu(defaultParams));

      expect(useContextMenuSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          defaultModel: undefined,
        }),
      );
    });

    it("should pass defaultModel string to useContextMenuSelect", () => {
      renderHook(() =>
        useContextMenu({ ...defaultParams, defaultModel: "claude-3-opus" }),
      );

      expect(useContextMenuSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          defaultModel: "claude-3-opus",
        }),
      );
    });

    it("should pass empty string defaultModel", () => {
      renderHook(() => useContextMenu({ ...defaultParams, defaultModel: "" }));

      expect(useContextMenuSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          defaultModel: "",
        }),
      );
    });
  });

  describe("callbacks integration", () => {
    it("should pass all node creation callbacks to useContextMenuSelect", () => {
      renderHook(() => useContextMenu(defaultParams));

      expect(useContextMenuSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          onRequestPromptCreation: mockOnRequestPromptCreation,
          onRequestContextCreation: mockOnRequestContextCreation,
          onRequestToolCreation: mockOnRequestToolCreation,
          onRequestProcessCreation: mockOnRequestProcessCreation,
          onRequestOutputFileCreation: mockOnRequestOutputFileCreation,
        }),
      );
    });

    it("should handle undefined callbacks", () => {
      renderHook(() =>
        useContextMenu({
          ...defaultParams,
          onRequestPromptCreation: undefined,
          onRequestContextCreation: undefined,
          onRequestToolCreation: undefined,
          onRequestProcessCreation: undefined,
          onRequestOutputFileCreation: undefined,
        }),
      );

      expect(useContextMenuSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          onRequestPromptCreation: undefined,
          onRequestContextCreation: undefined,
          onRequestToolCreation: undefined,
          onRequestProcessCreation: undefined,
          onRequestOutputFileCreation: undefined,
        }),
      );
    });
  });
});
