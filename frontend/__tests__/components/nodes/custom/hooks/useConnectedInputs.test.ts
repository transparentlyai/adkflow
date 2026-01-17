import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useStore } from "@xyflow/react";
import { useConnectedInputs } from "@/components/nodes/custom/hooks/useConnectedInputs";
import type {
  PortDefinition,
  DynamicInputConfig,
} from "@/components/nodes/CustomNode";
import type { Node, Edge } from "@xyflow/react";

// Mock @xyflow/react
vi.mock("@xyflow/react", () => ({
  useStore: vi.fn(),
}));

describe("useConnectedInputs", () => {
  const nodeId = "test-node";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("static inputs - target handles", () => {
    it("should return empty record when no connections", () => {
      const inputs: PortDefinition[] = [
        {
          id: "input1",
          label: "Input 1",
          source_type: "agent",
          data_type: "str",
        },
      ];

      const mockState = {
        nodes: [],
        edges: [],
      };

      vi.mocked(useStore).mockImplementation((selector: unknown) => {
        if (typeof selector === "function") {
          return (selector as (state: typeof mockState) => unknown)(mockState);
        }
        return mockState;
      });

      const { result } = renderHook(() => useConnectedInputs(nodeId, inputs));

      expect(result.current).toEqual({});
    });

    it("should track incoming connections for target handles", () => {
      const inputs: PortDefinition[] = [
        {
          id: "input1",
          label: "Input 1",
          source_type: "agent",
          data_type: "str",
        },
      ];

      const mockNodes: Node[] = [
        {
          id: "source-node",
          type: "agent",
          position: { x: 0, y: 0 },
          data: {
            config: { name: "Source Agent" },
          },
        },
      ];

      const mockEdges: Edge[] = [
        {
          id: "e1",
          source: "source-node",
          target: nodeId,
          targetHandle: "input1",
        },
      ];

      const mockState = {
        nodes: mockNodes,
        edges: mockEdges,
      };

      vi.mocked(useStore).mockImplementation((selector: unknown) => {
        if (typeof selector === "function") {
          return (selector as (state: typeof mockState) => unknown)(mockState);
        }
        return mockState;
      });

      const { result } = renderHook(() => useConnectedInputs(nodeId, inputs));

      expect(result.current).toEqual({
        input1: ["Source Agent"],
      });
    });

    it("should handle multiple connections to same input", () => {
      const inputs: PortDefinition[] = [
        {
          id: "input1",
          label: "Input 1",
          source_type: "agent",
          data_type: "str",
        },
      ];

      const mockNodes: Node[] = [
        {
          id: "source1",
          type: "agent",
          position: { x: 0, y: 0 },
          data: { config: { name: "Agent 1" } },
        },
        {
          id: "source2",
          type: "agent",
          position: { x: 0, y: 0 },
          data: { config: { name: "Agent 2" } },
        },
      ];

      const mockEdges: Edge[] = [
        {
          id: "e1",
          source: "source1",
          target: nodeId,
          targetHandle: "input1",
        },
        {
          id: "e2",
          source: "source2",
          target: nodeId,
          targetHandle: "input1",
        },
      ];

      const mockState = {
        nodes: mockNodes,
        edges: mockEdges,
      };

      vi.mocked(useStore).mockImplementation((selector: unknown) => {
        if (typeof selector === "function") {
          return (selector as (state: typeof mockState) => unknown)(mockState);
        }
        return mockState;
      });

      const { result } = renderHook(() => useConnectedInputs(nodeId, inputs));

      expect(result.current).toEqual({
        input1: ["Agent 1", "Agent 2"],
      });
    });

    it("should fallback to 'input' targetHandle for backward compatibility", () => {
      const inputs: PortDefinition[] = [
        {
          id: "input1",
          label: "Input 1",
          source_type: "agent",
          data_type: "str",
        },
      ];

      const mockNodes: Node[] = [
        {
          id: "source-node",
          type: "agent",
          position: { x: 0, y: 0 },
          data: { config: { name: "Source Agent" } },
        },
      ];

      const mockEdges: Edge[] = [
        {
          id: "e1",
          source: "source-node",
          target: nodeId,
          targetHandle: "input",
        },
      ];

      const mockState = {
        nodes: mockNodes,
        edges: mockEdges,
      };

      vi.mocked(useStore).mockImplementation((selector: unknown) => {
        if (typeof selector === "function") {
          return (selector as (state: typeof mockState) => unknown)(mockState);
        }
        return mockState;
      });

      const { result } = renderHook(() => useConnectedInputs(nodeId, inputs));

      expect(result.current).toEqual({
        input1: ["Source Agent"],
      });
    });
  });

  describe("static inputs - source handles", () => {
    it("should track outgoing connections for source handles", () => {
      const inputs: PortDefinition[] = [
        {
          id: "output1",
          label: "Output 1",
          source_type: "agent",
          data_type: "str",
          handleType: "source",
        },
      ];

      const mockNodes: Node[] = [
        {
          id: "target-node",
          type: "agent",
          position: { x: 0, y: 0 },
          data: { config: { name: "Target Agent" } },
        },
      ];

      const mockEdges: Edge[] = [
        {
          id: "e1",
          source: nodeId,
          sourceHandle: "output1",
          target: "target-node",
        },
      ];

      const mockState = {
        nodes: mockNodes,
        edges: mockEdges,
      };

      vi.mocked(useStore).mockImplementation((selector: unknown) => {
        if (typeof selector === "function") {
          return (selector as (state: typeof mockState) => unknown)(mockState);
        }
        return mockState;
      });

      const { result } = renderHook(() => useConnectedInputs(nodeId, inputs));

      expect(result.current).toEqual({
        output1: ["Target Agent"],
      });
    });

    it("should handle multiple outgoing connections from source handle", () => {
      const inputs: PortDefinition[] = [
        {
          id: "output1",
          label: "Output 1",
          source_type: "callback",
          data_type: "callable",
          handleType: "source",
        },
      ];

      const mockNodes: Node[] = [
        {
          id: "target1",
          type: "callback",
          position: { x: 0, y: 0 },
          data: { config: { name: "Callback 1" } },
        },
        {
          id: "target2",
          type: "callback",
          position: { x: 0, y: 0 },
          data: { config: { name: "Callback 2" } },
        },
      ];

      const mockEdges: Edge[] = [
        {
          id: "e1",
          source: nodeId,
          sourceHandle: "output1",
          target: "target1",
        },
        {
          id: "e2",
          source: nodeId,
          sourceHandle: "output1",
          target: "target2",
        },
      ];

      const mockState = {
        nodes: mockNodes,
        edges: mockEdges,
      };

      vi.mocked(useStore).mockImplementation((selector: unknown) => {
        if (typeof selector === "function") {
          return (selector as (state: typeof mockState) => unknown)(mockState);
        }
        return mockState;
      });

      const { result } = renderHook(() => useConnectedInputs(nodeId, inputs));

      expect(result.current).toEqual({
        output1: ["Callback 1", "Callback 2"],
      });
    });
  });

  describe("dynamic inputs", () => {
    it("should track connections for dynamic inputs", () => {
      const inputs: PortDefinition[] = [];
      const dynamicInputs: DynamicInputConfig[] = [
        {
          id: "dynamic1",
          type: "node",
          name: "Dynamic Input 1",
        },
      ];

      const mockNodes: Node[] = [
        {
          id: "source-node",
          type: "agent",
          position: { x: 0, y: 0 },
          data: { config: { name: "Source Agent" } },
        },
      ];

      const mockEdges: Edge[] = [
        {
          id: "e1",
          source: "source-node",
          target: nodeId,
          targetHandle: "dynamic1",
        },
      ];

      const mockState = {
        nodes: mockNodes,
        edges: mockEdges,
      };

      vi.mocked(useStore).mockImplementation((selector: unknown) => {
        if (typeof selector === "function") {
          return (selector as (state: typeof mockState) => unknown)(mockState);
        }
        return mockState;
      });

      const { result } = renderHook(() =>
        useConnectedInputs(nodeId, inputs, dynamicInputs),
      );

      expect(result.current).toEqual({
        dynamic1: ["Source Agent"],
      });
    });

    it("should handle both static and dynamic inputs", () => {
      const inputs: PortDefinition[] = [
        {
          id: "input1",
          label: "Static Input",
          source_type: "agent",
          data_type: "str",
        },
      ];
      const dynamicInputs: DynamicInputConfig[] = [
        {
          id: "dynamic1",
          type: "node",
          name: "Dynamic Input",
        },
      ];

      const mockNodes: Node[] = [
        {
          id: "source1",
          type: "agent",
          position: { x: 0, y: 0 },
          data: { config: { name: "Source 1" } },
        },
        {
          id: "source2",
          type: "agent",
          position: { x: 0, y: 0 },
          data: { config: { name: "Source 2" } },
        },
      ];

      const mockEdges: Edge[] = [
        {
          id: "e1",
          source: "source1",
          target: nodeId,
          targetHandle: "input1",
        },
        {
          id: "e2",
          source: "source2",
          target: nodeId,
          targetHandle: "dynamic1",
        },
      ];

      const mockState = {
        nodes: mockNodes,
        edges: mockEdges,
      };

      vi.mocked(useStore).mockImplementation((selector: unknown) => {
        if (typeof selector === "function") {
          return (selector as (state: typeof mockState) => unknown)(mockState);
        }
        return mockState;
      });

      const { result } = renderHook(() =>
        useConnectedInputs(nodeId, inputs, dynamicInputs),
      );

      expect(result.current).toEqual({
        input1: ["Source 1"],
        dynamic1: ["Source 2"],
      });
    });

    it("should skip dynamic inputs when not provided", () => {
      const inputs: PortDefinition[] = [
        {
          id: "input1",
          label: "Input 1",
          source_type: "agent",
          data_type: "str",
        },
      ];

      const mockNodes: Node[] = [
        {
          id: "source-node",
          type: "agent",
          position: { x: 0, y: 0 },
          data: { config: { name: "Source Agent" } },
        },
      ];

      const mockEdges: Edge[] = [
        {
          id: "e1",
          source: "source-node",
          target: nodeId,
          targetHandle: "input1",
        },
      ];

      const mockState = {
        nodes: mockNodes,
        edges: mockEdges,
      };

      vi.mocked(useStore).mockImplementation((selector: unknown) => {
        if (typeof selector === "function") {
          return (selector as (state: typeof mockState) => unknown)(mockState);
        }
        return mockState;
      });

      const { result } = renderHook(() =>
        useConnectedInputs(nodeId, inputs, undefined),
      );

      expect(result.current).toEqual({
        input1: ["Source Agent"],
      });
    });
  });

  describe("node name resolution", () => {
    it("should use config.name when available", () => {
      const inputs: PortDefinition[] = [
        {
          id: "input1",
          label: "Input 1",
          source_type: "agent",
          data_type: "str",
        },
      ];

      const mockNodes: Node[] = [
        {
          id: "source-node",
          type: "agent",
          position: { x: 0, y: 0 },
          data: {
            config: { name: "My Agent" },
          },
        },
      ];

      const mockEdges: Edge[] = [
        {
          id: "e1",
          source: "source-node",
          target: nodeId,
          targetHandle: "input1",
        },
      ];

      const mockState = {
        nodes: mockNodes,
        edges: mockEdges,
      };

      vi.mocked(useStore).mockImplementation((selector: unknown) => {
        if (typeof selector === "function") {
          return (selector as (state: typeof mockState) => unknown)(mockState);
        }
        return mockState;
      });

      const { result } = renderHook(() => useConnectedInputs(nodeId, inputs));

      expect(result.current).toEqual({
        input1: ["My Agent"],
      });
    });

    it("should fallback to schema.label when config.name not available", () => {
      const inputs: PortDefinition[] = [
        {
          id: "input1",
          label: "Input 1",
          source_type: "agent",
          data_type: "str",
        },
      ];

      const mockNodes: Node[] = [
        {
          id: "source-node",
          type: "agent",
          position: { x: 0, y: 0 },
          data: {
            schema: { label: "Agent Schema" },
          },
        },
      ];

      const mockEdges: Edge[] = [
        {
          id: "e1",
          source: "source-node",
          target: nodeId,
          targetHandle: "input1",
        },
      ];

      const mockState = {
        nodes: mockNodes,
        edges: mockEdges,
      };

      vi.mocked(useStore).mockImplementation((selector: unknown) => {
        if (typeof selector === "function") {
          return (selector as (state: typeof mockState) => unknown)(mockState);
        }
        return mockState;
      });

      const { result } = renderHook(() => useConnectedInputs(nodeId, inputs));

      expect(result.current).toEqual({
        input1: ["Agent Schema"],
      });
    });

    it("should fallback to node.type when no name or label", () => {
      const inputs: PortDefinition[] = [
        {
          id: "input1",
          label: "Input 1",
          source_type: "agent",
          data_type: "str",
        },
      ];

      const mockNodes: Node[] = [
        {
          id: "source-node",
          type: "custom_type",
          position: { x: 0, y: 0 },
          data: {},
        },
      ];

      const mockEdges: Edge[] = [
        {
          id: "e1",
          source: "source-node",
          target: nodeId,
          targetHandle: "input1",
        },
      ];

      const mockState = {
        nodes: mockNodes,
        edges: mockEdges,
      };

      vi.mocked(useStore).mockImplementation((selector: unknown) => {
        if (typeof selector === "function") {
          return (selector as (state: typeof mockState) => unknown)(mockState);
        }
        return mockState;
      });

      const { result } = renderHook(() => useConnectedInputs(nodeId, inputs));

      expect(result.current).toEqual({
        input1: ["custom_type"],
      });
    });

    it("should fallback to 'Connected' when node not found", () => {
      const inputs: PortDefinition[] = [
        {
          id: "input1",
          label: "Input 1",
          source_type: "agent",
          data_type: "str",
        },
      ];

      const mockNodes: Node[] = [];

      const mockEdges: Edge[] = [
        {
          id: "e1",
          source: "missing-node",
          target: nodeId,
          targetHandle: "input1",
        },
      ];

      const mockState = {
        nodes: mockNodes,
        edges: mockEdges,
      };

      vi.mocked(useStore).mockImplementation((selector: unknown) => {
        if (typeof selector === "function") {
          return (selector as (state: typeof mockState) => unknown)(mockState);
        }
        return mockState;
      });

      const { result } = renderHook(() => useConnectedInputs(nodeId, inputs));

      expect(result.current).toEqual({
        input1: ["Connected"],
      });
    });

    it("should fallback to 'Connected' when node has no type", () => {
      const inputs: PortDefinition[] = [
        {
          id: "input1",
          label: "Input 1",
          source_type: "agent",
          data_type: "str",
        },
      ];

      const mockNodes: Node[] = [
        {
          id: "source-node",
          type: undefined as unknown as string,
          position: { x: 0, y: 0 },
          data: {},
        },
      ];

      const mockEdges: Edge[] = [
        {
          id: "e1",
          source: "source-node",
          target: nodeId,
          targetHandle: "input1",
        },
      ];

      const mockState = {
        nodes: mockNodes,
        edges: mockEdges,
      };

      vi.mocked(useStore).mockImplementation((selector: unknown) => {
        if (typeof selector === "function") {
          return (selector as (state: typeof mockState) => unknown)(mockState);
        }
        return mockState;
      });

      const { result } = renderHook(() => useConnectedInputs(nodeId, inputs));

      expect(result.current).toEqual({
        input1: ["Connected"],
      });
    });
  });

  describe("edge cases", () => {
    it("should handle empty inputs array", () => {
      const inputs: PortDefinition[] = [];

      const mockState = {
        nodes: [],
        edges: [],
      };

      vi.mocked(useStore).mockImplementation((selector: unknown) => {
        if (typeof selector === "function") {
          return (selector as (state: typeof mockState) => unknown)(mockState);
        }
        return mockState;
      });

      const { result } = renderHook(() => useConnectedInputs(nodeId, inputs));

      expect(result.current).toEqual({});
    });

    it("should handle empty edges array", () => {
      const inputs: PortDefinition[] = [
        {
          id: "input1",
          label: "Input 1",
          source_type: "agent",
          data_type: "str",
        },
      ];

      const mockState = {
        nodes: [],
        edges: [],
      };

      vi.mocked(useStore).mockImplementation((selector: unknown) => {
        if (typeof selector === "function") {
          return (selector as (state: typeof mockState) => unknown)(mockState);
        }
        return mockState;
      });

      const { result } = renderHook(() => useConnectedInputs(nodeId, inputs));

      expect(result.current).toEqual({});
    });

    it("should only return inputs with connections", () => {
      const inputs: PortDefinition[] = [
        {
          id: "input1",
          label: "Input 1",
          source_type: "agent",
          data_type: "str",
        },
        {
          id: "input2",
          label: "Input 2",
          source_type: "agent",
          data_type: "str",
        },
      ];

      const mockNodes: Node[] = [
        {
          id: "source-node",
          type: "agent",
          position: { x: 0, y: 0 },
          data: { config: { name: "Source Agent" } },
        },
      ];

      const mockEdges: Edge[] = [
        {
          id: "e1",
          source: "source-node",
          target: nodeId,
          targetHandle: "input1",
        },
      ];

      const mockState = {
        nodes: mockNodes,
        edges: mockEdges,
      };

      vi.mocked(useStore).mockImplementation((selector: unknown) => {
        if (typeof selector === "function") {
          return (selector as (state: typeof mockState) => unknown)(mockState);
        }
        return mockState;
      });

      const { result } = renderHook(() => useConnectedInputs(nodeId, inputs));

      expect(result.current).toEqual({
        input1: ["Source Agent"],
      });
      expect(result.current).not.toHaveProperty("input2");
    });

    it("should ignore edges not connected to this node", () => {
      const inputs: PortDefinition[] = [
        {
          id: "input1",
          label: "Input 1",
          source_type: "agent",
          data_type: "str",
        },
      ];

      const mockNodes: Node[] = [
        {
          id: "source-node",
          type: "agent",
          position: { x: 0, y: 0 },
          data: { config: { name: "Source Agent" } },
        },
        {
          id: "other-node",
          type: "agent",
          position: { x: 0, y: 0 },
          data: { config: { name: "Other Agent" } },
        },
      ];

      const mockEdges: Edge[] = [
        {
          id: "e1",
          source: "source-node",
          target: "other-node",
          targetHandle: "input1",
        },
      ];

      const mockState = {
        nodes: mockNodes,
        edges: mockEdges,
      };

      vi.mocked(useStore).mockImplementation((selector: unknown) => {
        if (typeof selector === "function") {
          return (selector as (state: typeof mockState) => unknown)(mockState);
        }
        return mockState;
      });

      const { result } = renderHook(() => useConnectedInputs(nodeId, inputs));

      expect(result.current).toEqual({});
    });
  });
});
