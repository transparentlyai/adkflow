import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useContextMenuSelect } from "@/components/hooks/canvas/helpers/useContextMenuSelect";
import {
  createContextMenuMocks,
  createDefaultParams,
  createContextMenuState,
} from "./useContextMenuSelect.fixtures";

describe("useContextMenuSelect - onContextMenuSelect", () => {
  let mocks: ReturnType<typeof createContextMenuMocks>;
  let defaultParams: ReturnType<typeof createDefaultParams>;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks = createContextMenuMocks();
    defaultParams = createDefaultParams(mocks);
  });

  describe("layout nodes", () => {
    it("should add group node when group selected", () => {
      const contextMenu = createContextMenuState();

      const { result } = renderHook(() =>
        useContextMenuSelect({ ...defaultParams, contextMenu }),
      );

      act(() => {
        result.current.onContextMenuSelect("group");
      });

      expect(mocks.mockAddGroupNode).toHaveBeenCalledWith({ x: 50, y: 100 });
      expect(mocks.mockSetContextMenu).toHaveBeenCalledWith(null);
    });

    it("should add label node when label selected", () => {
      const contextMenu = createContextMenuState();

      const { result } = renderHook(() =>
        useContextMenuSelect({ ...defaultParams, contextMenu }),
      );

      act(() => {
        result.current.onContextMenuSelect("label");
      });

      expect(mocks.mockSetContextMenu).toHaveBeenCalledWith(null);
    });

    it("should not add group inside another group", () => {
      const contextMenu = createContextMenuState({ parentGroupId: "parent-group" });

      const { result } = renderHook(() =>
        useContextMenuSelect({ ...defaultParams, contextMenu }),
      );

      act(() => {
        result.current.onContextMenuSelect("group");
      });

      expect(mocks.mockAddGroupNode).not.toHaveBeenCalled();
      expect(mocks.mockSetContextMenu).toHaveBeenCalledWith(null);
    });
  });

  describe("teleport nodes", () => {
    it("should show teleport name prompt for teleportOut", () => {
      const contextMenu = createContextMenuState();

      const { result } = renderHook(() =>
        useContextMenuSelect({ ...defaultParams, contextMenu }),
      );

      act(() => {
        result.current.onContextMenuSelect("teleportOut");
      });

      expect(mocks.mockSetTeleportNamePrompt).toHaveBeenCalledWith({
        type: "teleportOut",
        position: { x: 50, y: 100 },
        parentGroupId: undefined,
      });
      expect(mocks.mockSetTeleportNameInput).toHaveBeenCalledWith("");
    });

    it("should show teleport name prompt for teleportIn", () => {
      const contextMenu = createContextMenuState();

      const { result } = renderHook(() =>
        useContextMenuSelect({ ...defaultParams, contextMenu }),
      );

      act(() => {
        result.current.onContextMenuSelect("teleportIn");
      });

      expect(mocks.mockSetTeleportNamePrompt).toHaveBeenCalledWith({
        type: "teleportIn",
        position: { x: 50, y: 100 },
        parentGroupId: undefined,
      });
      expect(mocks.mockSetTeleportNameInput).toHaveBeenCalledWith("");
    });
  });

  describe("file-based nodes", () => {
    it("should call onRequestPromptCreation when prompt selected", () => {
      const contextMenu = createContextMenuState();

      const { result } = renderHook(() =>
        useContextMenuSelect({ ...defaultParams, contextMenu }),
      );

      act(() => {
        result.current.onContextMenuSelect("prompt");
      });

      expect(mocks.mockOnRequestPromptCreation).toHaveBeenCalledWith({
        x: 50,
        y: 100,
      });
      expect(mocks.mockSetContextMenu).toHaveBeenCalledWith(null);
    });

    it("should call onRequestContextCreation when context selected", () => {
      const contextMenu = createContextMenuState();

      const { result } = renderHook(() =>
        useContextMenuSelect({ ...defaultParams, contextMenu }),
      );

      act(() => {
        result.current.onContextMenuSelect("context");
      });

      expect(mocks.mockOnRequestContextCreation).toHaveBeenCalledWith({
        x: 50,
        y: 100,
      });
      expect(mocks.mockSetContextMenu).toHaveBeenCalledWith(null);
    });

    it("should call onRequestToolCreation when tool selected", () => {
      const contextMenu = createContextMenuState();

      const { result } = renderHook(() =>
        useContextMenuSelect({ ...defaultParams, contextMenu }),
      );

      act(() => {
        result.current.onContextMenuSelect("tool");
      });

      expect(mocks.mockOnRequestToolCreation).toHaveBeenCalledWith({
        x: 50,
        y: 100,
      });
      expect(mocks.mockSetContextMenu).toHaveBeenCalledWith(null);
    });

    it("should call onRequestProcessCreation when process selected", () => {
      const contextMenu = createContextMenuState();

      const { result } = renderHook(() =>
        useContextMenuSelect({ ...defaultParams, contextMenu }),
      );

      act(() => {
        result.current.onContextMenuSelect("process");
      });

      expect(mocks.mockOnRequestProcessCreation).toHaveBeenCalledWith({
        x: 50,
        y: 100,
      });
      expect(mocks.mockSetContextMenu).toHaveBeenCalledWith(null);
    });

    it("should call onRequestOutputFileCreation when outputFile selected", () => {
      const contextMenu = createContextMenuState();

      const { result } = renderHook(() =>
        useContextMenuSelect({ ...defaultParams, contextMenu }),
      );

      act(() => {
        result.current.onContextMenuSelect("outputFile");
      });

      expect(mocks.mockOnRequestOutputFileCreation).toHaveBeenCalledWith({
        x: 50,
        y: 100,
      });
      expect(mocks.mockSetContextMenu).toHaveBeenCalledWith(null);
    });

    it("should fall back to addBuiltinSchemaNode when callback not provided", () => {
      const contextMenu = createContextMenuState();

      const { result } = renderHook(() =>
        useContextMenuSelect({
          ...defaultParams,
          contextMenu,
          onRequestPromptCreation: undefined,
        }),
      );

      act(() => {
        result.current.onContextMenuSelect("prompt");
      });

      expect(mocks.mockAddBuiltinSchemaNode).toHaveBeenCalledWith(
        "prompt",
        { x: 50, y: 100 },
        undefined,
        undefined,
      );
      expect(mocks.mockSetContextMenu).toHaveBeenCalledWith(null);
    });
  });

  describe("agent node with defaultModel", () => {
    it("should apply defaultModel when creating agent node", () => {
      const contextMenu = createContextMenuState();

      const { result } = renderHook(() =>
        useContextMenuSelect({
          ...defaultParams,
          contextMenu,
          defaultModel: "gpt-4",
        }),
      );

      act(() => {
        result.current.onContextMenuSelect("agent");
      });

      expect(mocks.mockAddBuiltinSchemaNode).toHaveBeenCalledWith(
        "agent",
        { x: 50, y: 100 },
        { model: "gpt-4" },
        undefined,
      );
      expect(mocks.mockSetContextMenu).toHaveBeenCalledWith(null);
    });

    it("should not apply configOverrides when defaultModel is undefined", () => {
      const contextMenu = createContextMenuState();

      const { result } = renderHook(() =>
        useContextMenuSelect({
          ...defaultParams,
          contextMenu,
          defaultModel: undefined,
        }),
      );

      act(() => {
        result.current.onContextMenuSelect("agent");
      });

      expect(mocks.mockAddBuiltinSchemaNode).toHaveBeenCalledWith(
        "agent",
        { x: 50, y: 100 },
        undefined,
        undefined,
      );
      expect(mocks.mockSetContextMenu).toHaveBeenCalledWith(null);
    });

    it("should apply defaultModel with parentGroupId", () => {
      const contextMenu = createContextMenuState({ parentGroupId: "group-1" });

      const { result } = renderHook(() =>
        useContextMenuSelect({
          ...defaultParams,
          contextMenu,
          defaultModel: "claude-3-opus",
        }),
      );

      act(() => {
        result.current.onContextMenuSelect("agent");
      });

      expect(mocks.mockAddBuiltinSchemaNode).toHaveBeenCalledWith(
        "agent",
        { x: 50, y: 100 },
        { model: "claude-3-opus" },
        "group-1",
      );
      expect(mocks.mockSetContextMenu).toHaveBeenCalledWith(null);
    });
  });

  describe("other builtin nodes", () => {
    it("should not apply defaultModel to non-agent nodes", () => {
      const contextMenu = createContextMenuState();

      const { result } = renderHook(() =>
        useContextMenuSelect({
          ...defaultParams,
          contextMenu,
          defaultModel: "gpt-4",
        }),
      );

      act(() => {
        result.current.onContextMenuSelect("variable");
      });

      expect(mocks.mockAddBuiltinSchemaNode).toHaveBeenCalledWith(
        "variable",
        { x: 50, y: 100 },
        undefined,
        undefined,
      );
      expect(mocks.mockSetContextMenu).toHaveBeenCalledWith(null);
    });
  });

  describe("edge cases", () => {
    it("should do nothing when contextMenu is null", () => {
      const { result } = renderHook(() =>
        useContextMenuSelect({
          ...defaultParams,
          contextMenu: null,
        }),
      );

      act(() => {
        result.current.onContextMenuSelect("agent");
      });

      expect(mocks.mockAddBuiltinSchemaNode).not.toHaveBeenCalled();
    });
  });
});
