import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useStore } from "@xyflow/react";
import { useConnectedInputs } from "@/components/nodes/custom/hooks/useConnectedInputs";
import type { PortDefinition } from "@/components/nodes/CustomNode";
import type { Node } from "@xyflow/react";
import {
  TEST_NODE_ID,
  createPortDefinition,
  createMockNode,
  createMockEdge,
  setupMockStore,
  emptyMockState,
} from "./useConnectedInputs.fixtures";

vi.mock("@xyflow/react", () => ({
  useStore: vi.fn(),
}));

describe("useConnectedInputs - node name resolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("name resolution priority", () => {
    it("should use config.name when available", () => {
      const inputs: PortDefinition[] = [createPortDefinition()];

      setupMockStore({
        nodes: [
          createMockNode({
            id: "source-node",
            data: { config: { name: "My Agent" } },
          }),
        ],
        edges: [
          createMockEdge({
            id: "e1",
            source: "source-node",
            target: TEST_NODE_ID,
            targetHandle: "input1",
          }),
        ],
      });

      const { result } = renderHook(() =>
        useConnectedInputs(TEST_NODE_ID, inputs),
      );

      expect(result.current).toEqual({
        input1: ["My Agent"],
      });
    });

    it("should fallback to schema.label when config.name not available", () => {
      const inputs: PortDefinition[] = [createPortDefinition()];

      setupMockStore({
        nodes: [
          createMockNode({
            id: "source-node",
            data: { schema: { label: "Agent Schema" } },
          }),
        ],
        edges: [
          createMockEdge({
            id: "e1",
            source: "source-node",
            target: TEST_NODE_ID,
            targetHandle: "input1",
          }),
        ],
      });

      const { result } = renderHook(() =>
        useConnectedInputs(TEST_NODE_ID, inputs),
      );

      expect(result.current).toEqual({
        input1: ["Agent Schema"],
      });
    });

    it("should fallback to node.type when no name or label", () => {
      const inputs: PortDefinition[] = [createPortDefinition()];

      setupMockStore({
        nodes: [
          createMockNode({
            id: "source-node",
            type: "custom_type",
            data: {},
          }),
        ],
        edges: [
          createMockEdge({
            id: "e1",
            source: "source-node",
            target: TEST_NODE_ID,
            targetHandle: "input1",
          }),
        ],
      });

      const { result } = renderHook(() =>
        useConnectedInputs(TEST_NODE_ID, inputs),
      );

      expect(result.current).toEqual({
        input1: ["custom_type"],
      });
    });

    it("should fallback to 'Connected' when node not found", () => {
      const inputs: PortDefinition[] = [createPortDefinition()];

      setupMockStore({
        nodes: [],
        edges: [
          createMockEdge({
            id: "e1",
            source: "missing-node",
            target: TEST_NODE_ID,
            targetHandle: "input1",
          }),
        ],
      });

      const { result } = renderHook(() =>
        useConnectedInputs(TEST_NODE_ID, inputs),
      );

      expect(result.current).toEqual({
        input1: ["Connected"],
      });
    });

    it("should fallback to 'Connected' when node has no type", () => {
      const inputs: PortDefinition[] = [createPortDefinition()];

      const nodeWithNoType: Node = {
        id: "source-node",
        type: undefined as unknown as string,
        position: { x: 0, y: 0 },
        data: {},
      };

      setupMockStore({
        nodes: [nodeWithNoType],
        edges: [
          createMockEdge({
            id: "e1",
            source: "source-node",
            target: TEST_NODE_ID,
            targetHandle: "input1",
          }),
        ],
      });

      const { result } = renderHook(() =>
        useConnectedInputs(TEST_NODE_ID, inputs),
      );

      expect(result.current).toEqual({
        input1: ["Connected"],
      });
    });
  });

  describe("edge cases", () => {
    it("should handle empty inputs array", () => {
      const inputs: PortDefinition[] = [];
      setupMockStore(emptyMockState);

      const { result } = renderHook(() =>
        useConnectedInputs(TEST_NODE_ID, inputs),
      );

      expect(result.current).toEqual({});
    });

    it("should handle empty edges array", () => {
      const inputs: PortDefinition[] = [createPortDefinition()];
      setupMockStore({ nodes: [], edges: [] });

      const { result } = renderHook(() =>
        useConnectedInputs(TEST_NODE_ID, inputs),
      );

      expect(result.current).toEqual({});
    });

    it("should only return inputs with connections", () => {
      const inputs: PortDefinition[] = [
        createPortDefinition({ id: "input1", label: "Input 1" }),
        createPortDefinition({ id: "input2", label: "Input 2" }),
      ];

      setupMockStore({
        nodes: [
          createMockNode({
            id: "source-node",
            data: { config: { name: "Source Agent" } },
          }),
        ],
        edges: [
          createMockEdge({
            id: "e1",
            source: "source-node",
            target: TEST_NODE_ID,
            targetHandle: "input1",
          }),
        ],
      });

      const { result } = renderHook(() =>
        useConnectedInputs(TEST_NODE_ID, inputs),
      );

      expect(result.current).toEqual({
        input1: ["Source Agent"],
      });
      expect(result.current).not.toHaveProperty("input2");
    });

    it("should ignore edges not connected to this node", () => {
      const inputs: PortDefinition[] = [createPortDefinition()];

      setupMockStore({
        nodes: [
          createMockNode({
            id: "source-node",
            data: { config: { name: "Source Agent" } },
          }),
          createMockNode({
            id: "other-node",
            data: { config: { name: "Other Agent" } },
          }),
        ],
        edges: [
          createMockEdge({
            id: "e1",
            source: "source-node",
            target: "other-node",
            targetHandle: "input1",
          }),
        ],
      });

      const { result } = renderHook(() =>
        useConnectedInputs(TEST_NODE_ID, inputs),
      );

      expect(result.current).toEqual({});
    });
  });
});
