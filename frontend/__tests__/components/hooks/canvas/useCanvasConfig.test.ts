import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useCanvasConfig } from "@/components/hooks/canvas/useCanvasConfig";
import type { Node } from "@xyflow/react";
import type { CustomNodeSchema } from "@/components/nodes/CustomNode";
import type { HandleTypes } from "@/lib/types";
import { ThemeProvider } from "@/contexts/ThemeContext";
import type { ReactNode } from "react";

// Mock the ThemeContext
vi.mock("@/contexts/ThemeContext", async () => {
  const actual = await vi.importActual("@/contexts/ThemeContext");
  return {
    ...actual,
    useTheme: vi.fn(() => ({
      theme: {
        id: "dark",
        name: "Dark",
        colors: {
          edges: {
            default: "#888888",
            hover: "#aaaaaa",
            selected: "#4a9eff",
          },
        },
      },
    })),
  };
});

describe("useCanvasConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createNode = (
    id: string,
    type: string,
    handleTypes?: HandleTypes,
  ): Node => ({
    id,
    type,
    position: { x: 0, y: 0 },
    data: {
      name: id,
      handleTypes,
    },
  });

  const createCustomSchema = (unitId: string): CustomNodeSchema => ({
    unit_id: unitId,
    name: `Custom ${unitId}`,
    type: "node",
    ui: {
      inputs: [],
      outputs: [],
    },
  });

  describe("nodeTypes", () => {
    it("should return static node types", () => {
      const { result } = renderHook(() => useCanvasConfig([], []));

      expect(result.current.nodeTypes).toBeDefined();
      expect(result.current.nodeTypes.group).toBeDefined();
      expect(result.current.nodeTypes.label).toBeDefined();
      expect(result.current.nodeTypes.agent).toBeDefined();
      expect(result.current.nodeTypes.prompt).toBeDefined();
      expect(result.current.nodeTypes.context).toBeDefined();
    });

    it("should include all built-in node types", () => {
      const { result } = renderHook(() => useCanvasConfig([], []));

      const builtInTypes = [
        "group",
        "label",
        "agent",
        "prompt",
        "context",
        "context_aggregator",
        "inputProbe",
        "outputProbe",
        "logProbe",
        "outputFile",
        "tool",
        "agentTool",
        "variable",
        "process",
        "teleportOut",
        "teleportIn",
        "userInput",
        "start",
        "end",
      ];

      builtInTypes.forEach((type) => {
        expect(result.current.nodeTypes[type]).toBeDefined();
      });
    });

    it("should include custom node types with custom: prefix", () => {
      const customSchemas = [
        createCustomSchema("myCustomNode"),
        createCustomSchema("anotherNode"),
      ];

      const { result } = renderHook(() => useCanvasConfig([], customSchemas));

      expect(result.current.nodeTypes["custom:myCustomNode"]).toBeDefined();
      expect(result.current.nodeTypes["custom:anotherNode"]).toBeDefined();
    });

    it("should update nodeTypes when custom schemas change", () => {
      const { result, rerender } = renderHook(
        ({ schemas }) => useCanvasConfig([], schemas),
        { initialProps: { schemas: [] as CustomNodeSchema[] } },
      );

      expect(result.current.nodeTypes["custom:newNode"]).toBeUndefined();

      const newSchemas = [createCustomSchema("newNode")];
      rerender({ schemas: newSchemas });

      expect(result.current.nodeTypes["custom:newNode"]).toBeDefined();
    });
  });

  describe("defaultEdgeOptions", () => {
    it("should return default edge options with theme colors", () => {
      const { result } = renderHook(() => useCanvasConfig([], []));

      expect(result.current.defaultEdgeOptions).toEqual({
        style: { strokeWidth: 1.5, stroke: "#888888" },
        animated: false,
        selectable: true,
        zIndex: 0,
      });
    });

    it("should update when theme changes", async () => {
      const { useTheme } = await import("@/contexts/ThemeContext");
      const mockUseTheme = vi.mocked(useTheme);

      mockUseTheme.mockReturnValueOnce({
        theme: {
          id: "light",
          name: "Light",
          colors: {
            edges: {
              default: "#000000",
              hover: "#333333",
              selected: "#0066cc",
            },
          },
        },
      } as any);

      const { result } = renderHook(() => useCanvasConfig([], []));

      expect(result.current.defaultEdgeOptions.style.stroke).toBe("#000000");
    });
  });

  describe("snapGridValue", () => {
    it("should return snap grid value as tuple", () => {
      const { result } = renderHook(() => useCanvasConfig([], []));

      expect(result.current.snapGridValue).toEqual([16, 16]);
    });

    it("should be memoized", () => {
      const { result, rerender } = renderHook(() => useCanvasConfig([], []));

      const firstValue = result.current.snapGridValue;
      rerender();
      const secondValue = result.current.snapGridValue;

      expect(firstValue).toBe(secondValue);
    });
  });

  describe("handleTypeRegistry", () => {
    it("should return empty registry when no nodes have handleTypes", () => {
      const nodes = [
        createNode("node1", "agent"),
        createNode("node2", "prompt"),
      ];

      const { result } = renderHook(() => useCanvasConfig(nodes, []));

      expect(result.current.handleTypeRegistry).toEqual({});
    });

    it("should build registry from node handleTypes", () => {
      const handleTypes: HandleTypes = {
        "output-1": {
          outputSource: "agent",
          outputType: "str",
        },
        "input-1": {
          acceptedSources: ["agent"],
          acceptedTypes: ["str"],
        },
      };

      const nodes = [createNode("node1", "agent", handleTypes)];

      const { result } = renderHook(() => useCanvasConfig(nodes, []));

      expect(result.current.handleTypeRegistry).toEqual({
        "node1:output-1": {
          outputSource: "agent",
          outputType: "str",
        },
        "node1:input-1": {
          acceptedSources: ["agent"],
          acceptedTypes: ["str"],
        },
      });
    });

    it("should combine handleTypes from multiple nodes", () => {
      const handleTypes1: HandleTypes = {
        output: { outputSource: "agent", outputType: "str" },
      };
      const handleTypes2: HandleTypes = {
        input: { acceptedSources: ["agent"], acceptedTypes: ["str"] },
      };

      const nodes = [
        createNode("node1", "agent", handleTypes1),
        createNode("node2", "prompt", handleTypes2),
      ];

      const { result } = renderHook(() => useCanvasConfig(nodes, []));

      expect(result.current.handleTypeRegistry).toEqual({
        "node1:output": { outputSource: "agent", outputType: "str" },
        "node2:input": { acceptedSources: ["agent"], acceptedTypes: ["str"] },
      });
    });

    it("should update registry when nodes change", () => {
      const handleTypes: HandleTypes = {
        output: { outputSource: "agent", outputType: "str" },
      };

      const { result, rerender } = renderHook(
        ({ nodes }) => useCanvasConfig(nodes, []),
        { initialProps: { nodes: [] as Node[] } },
      );

      expect(result.current.handleTypeRegistry).toEqual({});

      const newNodes = [createNode("node1", "agent", handleTypes)];
      rerender({ nodes: newNodes });

      expect(result.current.handleTypeRegistry).toEqual({
        "node1:output": { outputSource: "agent", outputType: "str" },
      });
    });

    it("should handle nodes without data gracefully", () => {
      const nodes = [
        {
          id: "node1",
          type: "agent",
          position: { x: 0, y: 0 },
          data: {},
        },
      ] as Node[];

      const { result } = renderHook(() => useCanvasConfig(nodes, []));

      expect(result.current.handleTypeRegistry).toEqual({});
    });
  });

  describe("theme", () => {
    it("should return theme from context", () => {
      const { result } = renderHook(() => useCanvasConfig([], []));

      expect(result.current.theme).toBeDefined();
      expect(result.current.theme.id).toBe("dark");
      expect(result.current.theme.colors.edges.default).toBe("#888888");
    });
  });

  describe("memoization", () => {
    it("should not recompute nodeTypes if custom schemas unchanged", () => {
      const schemas = [createCustomSchema("test")];
      const { result, rerender } = renderHook(
        ({ schemas }) => useCanvasConfig([], schemas),
        { initialProps: { schemas } },
      );

      const firstNodeTypes = result.current.nodeTypes;
      rerender({ schemas });
      const secondNodeTypes = result.current.nodeTypes;

      expect(firstNodeTypes).toBe(secondNodeTypes);
    });

    it("should not recompute handleTypeRegistry if nodes unchanged", () => {
      const handleTypes: HandleTypes = {
        output: { outputSource: "agent", outputType: "str" },
      };
      const nodes = [createNode("node1", "agent", handleTypes)];

      const { result, rerender } = renderHook(
        ({ nodes }) => useCanvasConfig(nodes, []),
        { initialProps: { nodes } },
      );

      const firstRegistry = result.current.handleTypeRegistry;
      rerender({ nodes });
      const secondRegistry = result.current.handleTypeRegistry;

      expect(firstRegistry).toBe(secondRegistry);
    });
  });
});
