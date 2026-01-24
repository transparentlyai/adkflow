import { vi } from "vitest";
import { useStore } from "@xyflow/react";
import type { Node, Edge } from "@xyflow/react";
import type {
  PortDefinition,
  DynamicInputConfig,
} from "@/components/nodes/CustomNode";

export const TEST_NODE_ID = "test-node";

// Common port definitions
export const createPortDefinition = (
  overrides: Partial<PortDefinition> = {},
): PortDefinition => ({
  id: "input1",
  label: "Input 1",
  source_type: "agent",
  data_type: "str",
  ...overrides,
});

export const createDynamicInput = (
  overrides: Partial<DynamicInputConfig> = {},
): DynamicInputConfig => ({
  id: "dynamic1",
  type: "node",
  name: "Dynamic Input 1",
  ...overrides,
});

// Common node creators
export const createMockNode = (
  overrides: Partial<Node> & { id: string },
): Node => ({
  type: "agent",
  position: { x: 0, y: 0 },
  data: {},
  ...overrides,
});

export const createMockEdge = (
  overrides: Partial<Edge> & { id: string },
): Edge => ({
  source: "source-node",
  target: TEST_NODE_ID,
  ...overrides,
});

// Mock state setup helper
export interface MockState {
  nodes: Node[];
  edges: Edge[];
}

export const setupMockStore = (state: MockState): void => {
  vi.mocked(useStore).mockImplementation((selector: unknown) => {
    if (typeof selector === "function") {
      return (selector as (state: MockState) => unknown)(state);
    }
    return state;
  });
};

export const emptyMockState: MockState = {
  nodes: [],
  edges: [],
};
