import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useContextMenuSelect } from "@/components/hooks/canvas/helpers/useContextMenuSelect";
import type { Node } from "@xyflow/react";
import type { CustomNodeSchema } from "@/components/nodes/CustomNode";
import {
  createContextMenuMocks,
  createDefaultParams,
  createContextMenuState,
} from "./useContextMenuSelect.fixtures";

describe("useContextMenuSelect", () => {
  let mocks: ReturnType<typeof createContextMenuMocks>;
  let defaultParams: ReturnType<typeof createDefaultParams>;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks = createContextMenuMocks();
    defaultParams = createDefaultParams(mocks);
  });

  describe("addNodeWithParent", () => {
    it("should add node without parent", () => {
      const { result } = renderHook(() => useContextMenuSelect(defaultParams));

      act(() => {
        result.current.addNodeWithParent(
          mocks.mockAddGroupNode,
          { x: 100, y: 200 },
          undefined,
        );
      });

      expect(mocks.mockAddGroupNode).toHaveBeenCalledWith({ x: 100, y: 200 });
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

      mocks.mockSetNodes.mockImplementation((updater) => {
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
          mocks.mockAddLabelNode,
          { x: 50, y: 50 },
          "group-1",
        );
      });

      expect(mocks.mockAddLabelNode).toHaveBeenCalledWith({ x: 50, y: 50 });
      expect(mocks.mockSetNodes).toHaveBeenCalled();
    });
  });

  describe("handleSelectCustomNode", () => {
    it("should add custom node when context menu is set", () => {
      const contextMenu = createContextMenuState();

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

      expect(mocks.mockAddCustomNode).toHaveBeenCalledWith(customSchema, {
        x: 50,
        y: 100,
      });
      expect(mocks.mockCloseContextMenu).toHaveBeenCalled();
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

      expect(mocks.mockAddCustomNode).not.toHaveBeenCalled();
      expect(mocks.mockCloseContextMenu).not.toHaveBeenCalled();
    });
  });
});
