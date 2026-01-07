import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useContextMenuSelect } from "@/components/hooks/canvas/helpers/useContextMenuSelect";
import type { Node } from "@xyflow/react";
import type { CustomNodeSchema } from "@/components/nodes/CustomNode";
import type { ContextMenuState } from "@/components/hooks/canvas/helpers/useDialogState";

describe("useContextMenuSelect", () => {
  const mockSetNodes = vi.fn();
  const mockSetContextMenu = vi.fn();
  const mockSetTeleportNamePrompt = vi.fn();
  const mockSetTeleportNameInput = vi.fn();
  const mockAddGroupNode = vi.fn();
  const mockAddLabelNode = vi.fn();
  const mockAddBuiltinSchemaNode = vi.fn();
  const mockAddCustomNode = vi.fn();
  const mockCloseContextMenu = vi.fn();
  const mockOnRequestPromptCreation = vi.fn();
  const mockOnRequestContextCreation = vi.fn();
  const mockOnRequestToolCreation = vi.fn();
  const mockOnRequestProcessCreation = vi.fn();
  const mockOnRequestOutputFileCreation = vi.fn();

  const defaultParams = {
    setNodes: mockSetNodes,
    contextMenu: null as ContextMenuState | null,
    setContextMenu: mockSetContextMenu,
    setTeleportNamePrompt: mockSetTeleportNamePrompt,
    setTeleportNameInput: mockSetTeleportNameInput,
    addGroupNode: mockAddGroupNode,
    addLabelNode: mockAddLabelNode,
    addBuiltinSchemaNode: mockAddBuiltinSchemaNode,
    addCustomNode: mockAddCustomNode,
    closeContextMenu: mockCloseContextMenu,
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

  describe("addNodeWithParent", () => {
    it("should add node without parent", () => {
      const { result } = renderHook(() => useContextMenuSelect(defaultParams));

      act(() => {
        result.current.addNodeWithParent(
          mockAddGroupNode,
          { x: 100, y: 200 },
          undefined,
        );
      });

      expect(mockAddGroupNode).toHaveBeenCalledWith({ x: 100, y: 200 });
    });

    it("should add node and set parent when parentGroupId provided", () => {
      const mockNodes: Node[] = [
        {
          id: "group-1",
          type: "group",
          position: { x: 0, y: 0 },
          data: {},
        },
      ];

      mockSetNodes.mockImplementation((updater) => {
        if (typeof updater === "function") {
          const newNodes = [
            ...mockNodes,
            {
              id: "node-1",
              type: "agent",
              position: { x: 50, y: 50 },
              data: {},
            },
          ];
          updater(newNodes);
        }
      });

      const { result } = renderHook(() => useContextMenuSelect(defaultParams));

      act(() => {
        result.current.addNodeWithParent(
          mockAddLabelNode,
          { x: 50, y: 50 },
          "group-1",
        );
      });

      expect(mockAddLabelNode).toHaveBeenCalledWith({ x: 50, y: 50 });
      expect(mockSetNodes).toHaveBeenCalled();
    });
  });

  describe("onContextMenuSelect", () => {
    describe("layout nodes", () => {
      it("should add group node when group selected", () => {
        const contextMenu: ContextMenuState = {
          x: 100,
          y: 200,
          flowPosition: { x: 50, y: 100 },
        };

        const { result } = renderHook(() =>
          useContextMenuSelect({ ...defaultParams, contextMenu }),
        );

        act(() => {
          result.current.onContextMenuSelect("group");
        });

        expect(mockAddGroupNode).toHaveBeenCalledWith({ x: 50, y: 100 });
        expect(mockSetContextMenu).toHaveBeenCalledWith(null);
      });

      it("should add label node when label selected", () => {
        const contextMenu: ContextMenuState = {
          x: 100,
          y: 200,
          flowPosition: { x: 50, y: 100 },
        };

        const { result } = renderHook(() =>
          useContextMenuSelect({ ...defaultParams, contextMenu }),
        );

        act(() => {
          result.current.onContextMenuSelect("label");
        });

        expect(mockSetContextMenu).toHaveBeenCalledWith(null);
      });

      it("should not add group inside another group", () => {
        const contextMenu: ContextMenuState = {
          x: 100,
          y: 200,
          flowPosition: { x: 50, y: 100 },
          parentGroupId: "parent-group",
        };

        const { result } = renderHook(() =>
          useContextMenuSelect({ ...defaultParams, contextMenu }),
        );

        act(() => {
          result.current.onContextMenuSelect("group");
        });

        expect(mockAddGroupNode).not.toHaveBeenCalled();
        expect(mockSetContextMenu).toHaveBeenCalledWith(null);
      });
    });

    describe("teleport nodes", () => {
      it("should show teleport name prompt for teleportOut", () => {
        const contextMenu: ContextMenuState = {
          x: 100,
          y: 200,
          flowPosition: { x: 50, y: 100 },
        };

        const { result } = renderHook(() =>
          useContextMenuSelect({ ...defaultParams, contextMenu }),
        );

        act(() => {
          result.current.onContextMenuSelect("teleportOut");
        });

        expect(mockSetTeleportNamePrompt).toHaveBeenCalledWith({
          type: "teleportOut",
          position: { x: 50, y: 100 },
          parentGroupId: undefined,
        });
        expect(mockSetTeleportNameInput).toHaveBeenCalledWith("");
      });

      it("should show teleport name prompt for teleportIn", () => {
        const contextMenu: ContextMenuState = {
          x: 100,
          y: 200,
          flowPosition: { x: 50, y: 100 },
        };

        const { result } = renderHook(() =>
          useContextMenuSelect({ ...defaultParams, contextMenu }),
        );

        act(() => {
          result.current.onContextMenuSelect("teleportIn");
        });

        expect(mockSetTeleportNamePrompt).toHaveBeenCalledWith({
          type: "teleportIn",
          position: { x: 50, y: 100 },
          parentGroupId: undefined,
        });
        expect(mockSetTeleportNameInput).toHaveBeenCalledWith("");
      });
    });

    describe("file-based nodes", () => {
      it("should call onRequestPromptCreation when prompt selected", () => {
        const contextMenu: ContextMenuState = {
          x: 100,
          y: 200,
          flowPosition: { x: 50, y: 100 },
        };

        const { result } = renderHook(() =>
          useContextMenuSelect({ ...defaultParams, contextMenu }),
        );

        act(() => {
          result.current.onContextMenuSelect("prompt");
        });

        expect(mockOnRequestPromptCreation).toHaveBeenCalledWith({
          x: 50,
          y: 100,
        });
        expect(mockSetContextMenu).toHaveBeenCalledWith(null);
      });

      it("should call onRequestContextCreation when context selected", () => {
        const contextMenu: ContextMenuState = {
          x: 100,
          y: 200,
          flowPosition: { x: 50, y: 100 },
        };

        const { result } = renderHook(() =>
          useContextMenuSelect({ ...defaultParams, contextMenu }),
        );

        act(() => {
          result.current.onContextMenuSelect("context");
        });

        expect(mockOnRequestContextCreation).toHaveBeenCalledWith({
          x: 50,
          y: 100,
        });
        expect(mockSetContextMenu).toHaveBeenCalledWith(null);
      });

      it("should call onRequestToolCreation when tool selected", () => {
        const contextMenu: ContextMenuState = {
          x: 100,
          y: 200,
          flowPosition: { x: 50, y: 100 },
        };

        const { result } = renderHook(() =>
          useContextMenuSelect({ ...defaultParams, contextMenu }),
        );

        act(() => {
          result.current.onContextMenuSelect("tool");
        });

        expect(mockOnRequestToolCreation).toHaveBeenCalledWith({
          x: 50,
          y: 100,
        });
        expect(mockSetContextMenu).toHaveBeenCalledWith(null);
      });

      it("should call onRequestProcessCreation when process selected", () => {
        const contextMenu: ContextMenuState = {
          x: 100,
          y: 200,
          flowPosition: { x: 50, y: 100 },
        };

        const { result } = renderHook(() =>
          useContextMenuSelect({ ...defaultParams, contextMenu }),
        );

        act(() => {
          result.current.onContextMenuSelect("process");
        });

        expect(mockOnRequestProcessCreation).toHaveBeenCalledWith({
          x: 50,
          y: 100,
        });
        expect(mockSetContextMenu).toHaveBeenCalledWith(null);
      });

      it("should call onRequestOutputFileCreation when outputFile selected", () => {
        const contextMenu: ContextMenuState = {
          x: 100,
          y: 200,
          flowPosition: { x: 50, y: 100 },
        };

        const { result } = renderHook(() =>
          useContextMenuSelect({ ...defaultParams, contextMenu }),
        );

        act(() => {
          result.current.onContextMenuSelect("outputFile");
        });

        expect(mockOnRequestOutputFileCreation).toHaveBeenCalledWith({
          x: 50,
          y: 100,
        });
        expect(mockSetContextMenu).toHaveBeenCalledWith(null);
      });

      it("should fall back to addBuiltinSchemaNode when callback not provided", () => {
        const contextMenu: ContextMenuState = {
          x: 100,
          y: 200,
          flowPosition: { x: 50, y: 100 },
        };

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

        expect(mockAddBuiltinSchemaNode).toHaveBeenCalledWith(
          "prompt",
          { x: 50, y: 100 },
          undefined,
          undefined,
        );
        expect(mockSetContextMenu).toHaveBeenCalledWith(null);
      });
    });

    describe("agent node with defaultModel", () => {
      it("should apply defaultModel when creating agent node", () => {
        const contextMenu: ContextMenuState = {
          x: 100,
          y: 200,
          flowPosition: { x: 50, y: 100 },
        };

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

        expect(mockAddBuiltinSchemaNode).toHaveBeenCalledWith(
          "agent",
          { x: 50, y: 100 },
          { model: "gpt-4" },
          undefined,
        );
        expect(mockSetContextMenu).toHaveBeenCalledWith(null);
      });

      it("should not apply configOverrides when defaultModel is undefined", () => {
        const contextMenu: ContextMenuState = {
          x: 100,
          y: 200,
          flowPosition: { x: 50, y: 100 },
        };

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

        expect(mockAddBuiltinSchemaNode).toHaveBeenCalledWith(
          "agent",
          { x: 50, y: 100 },
          undefined,
          undefined,
        );
        expect(mockSetContextMenu).toHaveBeenCalledWith(null);
      });

      it("should apply defaultModel with parentGroupId", () => {
        const contextMenu: ContextMenuState = {
          x: 100,
          y: 200,
          flowPosition: { x: 50, y: 100 },
          parentGroupId: "group-1",
        };

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

        expect(mockAddBuiltinSchemaNode).toHaveBeenCalledWith(
          "agent",
          { x: 50, y: 100 },
          { model: "claude-3-opus" },
          "group-1",
        );
        expect(mockSetContextMenu).toHaveBeenCalledWith(null);
      });
    });

    describe("other builtin nodes", () => {
      it("should not apply defaultModel to non-agent nodes", () => {
        const contextMenu: ContextMenuState = {
          x: 100,
          y: 200,
          flowPosition: { x: 50, y: 100 },
        };

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

        expect(mockAddBuiltinSchemaNode).toHaveBeenCalledWith(
          "variable",
          { x: 50, y: 100 },
          undefined,
          undefined,
        );
        expect(mockSetContextMenu).toHaveBeenCalledWith(null);
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

        expect(mockAddBuiltinSchemaNode).not.toHaveBeenCalled();
      });
    });
  });

  describe("handleSelectCustomNode", () => {
    it("should add custom node when context menu is set", () => {
      const contextMenu: ContextMenuState = {
        x: 100,
        y: 200,
        flowPosition: { x: 50, y: 100 },
      };

      const customSchema = {
        unit_id: "test.custom-test",
        label: "Custom Test",
        menu_location: "Test",
        description: "Test",
        version: "1.0.0",
        ui: {
          inputs: [],
          outputs: [],
          fields: [],
          color: "#000000",
          expandable: true,
          default_width: 200,
          default_height: 150,
        },
      } as CustomNodeSchema;

      const { result } = renderHook(() =>
        useContextMenuSelect({ ...defaultParams, contextMenu }),
      );

      act(() => {
        result.current.handleSelectCustomNode(customSchema);
      });

      expect(mockAddCustomNode).toHaveBeenCalledWith(customSchema, {
        x: 50,
        y: 100,
      });
      expect(mockCloseContextMenu).toHaveBeenCalled();
    });

    it("should do nothing when contextMenu is null", () => {
      const customSchema = {
        unit_id: "test.custom-test",
        label: "Custom Test",
        menu_location: "Test",
        description: "Test",
        version: "1.0.0",
        ui: {
          inputs: [],
          outputs: [],
          fields: [],
          color: "#000000",
          expandable: true,
          default_width: 200,
          default_height: 150,
        },
      } as CustomNodeSchema;

      const { result } = renderHook(() =>
        useContextMenuSelect({ ...defaultParams, contextMenu: null }),
      );

      act(() => {
        result.current.handleSelectCustomNode(customSchema);
      });

      expect(mockAddCustomNode).not.toHaveBeenCalled();
      expect(mockCloseContextMenu).not.toHaveBeenCalled();
    });
  });
});
