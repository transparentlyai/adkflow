import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useStore } from "@xyflow/react";
import { useConnectedInputs } from "@/components/nodes/custom/hooks/useConnectedInputs";
import type { PortDefinition } from "@/components/nodes/CustomNode";
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

describe("useConnectedInputs - static inputs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("target handles", () => {
    it("should return empty record when no connections", () => {
      const inputs: PortDefinition[] = [createPortDefinition()];
      setupMockStore(emptyMockState);

      const { result } = renderHook(() =>
        useConnectedInputs(TEST_NODE_ID, inputs),
      );

      expect(result.current).toEqual({});
    });

    it("should track incoming connections for target handles", () => {
      const inputs: PortDefinition[] = [createPortDefinition()];

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
    });

    it("should handle multiple connections to same input", () => {
      const inputs: PortDefinition[] = [createPortDefinition()];

      setupMockStore({
        nodes: [
          createMockNode({
            id: "source1",
            data: { config: { name: "Agent 1" } },
          }),
          createMockNode({
            id: "source2",
            data: { config: { name: "Agent 2" } },
          }),
        ],
        edges: [
          createMockEdge({
            id: "e1",
            source: "source1",
            target: TEST_NODE_ID,
            targetHandle: "input1",
          }),
          createMockEdge({
            id: "e2",
            source: "source2",
            target: TEST_NODE_ID,
            targetHandle: "input1",
          }),
        ],
      });

      const { result } = renderHook(() =>
        useConnectedInputs(TEST_NODE_ID, inputs),
      );

      expect(result.current).toEqual({
        input1: ["Agent 1", "Agent 2"],
      });
    });

    it("should fallback to 'input' targetHandle for backward compatibility", () => {
      const inputs: PortDefinition[] = [createPortDefinition()];

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
            targetHandle: "input",
          }),
        ],
      });

      const { result } = renderHook(() =>
        useConnectedInputs(TEST_NODE_ID, inputs),
      );

      expect(result.current).toEqual({
        input1: ["Source Agent"],
      });
    });
  });

  describe("source handles", () => {
    it("should track outgoing connections for source handles", () => {
      const inputs: PortDefinition[] = [
        createPortDefinition({
          id: "output1",
          label: "Output 1",
          handleType: "source",
        }),
      ];

      setupMockStore({
        nodes: [
          createMockNode({
            id: "target-node",
            data: { config: { name: "Target Agent" } },
          }),
        ],
        edges: [
          createMockEdge({
            id: "e1",
            source: TEST_NODE_ID,
            sourceHandle: "output1",
            target: "target-node",
          }),
        ],
      });

      const { result } = renderHook(() =>
        useConnectedInputs(TEST_NODE_ID, inputs),
      );

      expect(result.current).toEqual({
        output1: ["Target Agent"],
      });
    });

    it("should handle multiple outgoing connections from source handle", () => {
      const inputs: PortDefinition[] = [
        createPortDefinition({
          id: "output1",
          label: "Output 1",
          source_type: "callback",
          data_type: "callable",
          handleType: "source",
        }),
      ];

      setupMockStore({
        nodes: [
          createMockNode({
            id: "target1",
            type: "callback",
            data: { config: { name: "Callback 1" } },
          }),
          createMockNode({
            id: "target2",
            type: "callback",
            data: { config: { name: "Callback 2" } },
          }),
        ],
        edges: [
          createMockEdge({
            id: "e1",
            source: TEST_NODE_ID,
            sourceHandle: "output1",
            target: "target1",
          }),
          createMockEdge({
            id: "e2",
            source: TEST_NODE_ID,
            sourceHandle: "output1",
            target: "target2",
          }),
        ],
      });

      const { result } = renderHook(() =>
        useConnectedInputs(TEST_NODE_ID, inputs),
      );

      expect(result.current).toEqual({
        output1: ["Callback 1", "Callback 2"],
      });
    });
  });
});
