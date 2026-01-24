import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useStore } from "@xyflow/react";
import { useConnectedInputs } from "@/components/nodes/custom/hooks/useConnectedInputs";
import type {
  PortDefinition,
  DynamicInputConfig,
} from "@/components/nodes/CustomNode";
import {
  TEST_NODE_ID,
  createPortDefinition,
  createDynamicInput,
  createMockNode,
  createMockEdge,
  setupMockStore,
} from "./useConnectedInputs.fixtures";

vi.mock("@xyflow/react", () => ({
  useStore: vi.fn(),
}));

describe("useConnectedInputs - dynamic inputs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should track connections for dynamic inputs", () => {
    const inputs: PortDefinition[] = [];
    const dynamicInputs: DynamicInputConfig[] = [createDynamicInput()];

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
          targetHandle: "dynamic1",
        }),
      ],
    });

    const { result } = renderHook(() =>
      useConnectedInputs(TEST_NODE_ID, inputs, dynamicInputs),
    );

    expect(result.current).toEqual({
      dynamic1: ["Source Agent"],
    });
  });

  it("should handle both static and dynamic inputs", () => {
    const inputs: PortDefinition[] = [
      createPortDefinition({ id: "input1", label: "Static Input" }),
    ];
    const dynamicInputs: DynamicInputConfig[] = [
      createDynamicInput({ id: "dynamic1", name: "Dynamic Input" }),
    ];

    setupMockStore({
      nodes: [
        createMockNode({
          id: "source1",
          data: { config: { name: "Source 1" } },
        }),
        createMockNode({
          id: "source2",
          data: { config: { name: "Source 2" } },
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
          targetHandle: "dynamic1",
        }),
      ],
    });

    const { result } = renderHook(() =>
      useConnectedInputs(TEST_NODE_ID, inputs, dynamicInputs),
    );

    expect(result.current).toEqual({
      input1: ["Source 1"],
      dynamic1: ["Source 2"],
    });
  });

  it("should skip dynamic inputs when not provided", () => {
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
      useConnectedInputs(TEST_NODE_ID, inputs, undefined),
    );

    expect(result.current).toEqual({
      input1: ["Source Agent"],
    });
  });

  it("should handle multiple dynamic inputs", () => {
    const inputs: PortDefinition[] = [];
    const dynamicInputs: DynamicInputConfig[] = [
      createDynamicInput({ id: "dynamic1", name: "Dynamic 1" }),
      createDynamicInput({ id: "dynamic2", name: "Dynamic 2" }),
    ];

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
          targetHandle: "dynamic1",
        }),
        createMockEdge({
          id: "e2",
          source: "source2",
          target: TEST_NODE_ID,
          targetHandle: "dynamic2",
        }),
      ],
    });

    const { result } = renderHook(() =>
      useConnectedInputs(TEST_NODE_ID, inputs, dynamicInputs),
    );

    expect(result.current).toEqual({
      dynamic1: ["Agent 1"],
      dynamic2: ["Agent 2"],
    });
  });
});
