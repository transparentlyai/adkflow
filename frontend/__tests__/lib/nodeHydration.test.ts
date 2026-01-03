import { describe, it, expect, vi } from "vitest";
import type { Node } from "@xyflow/react";
import {
  stripTransientFields,
  stripTransientFieldsFromNodes,
  hydrateNodeWithSchema,
  hydrateNodesWithSchemas,
} from "@/lib/nodeHydration";

// Mock dependencies
vi.mock("@/components/nodes/CustomNode", () => ({
  getDefaultCustomNodeData: vi.fn((schema) => ({
    schema,
    config: { name: "default" },
    handleTypes: { input: "any", output: "any" },
    tabId: "",
  })),
}));

vi.mock("@/lib/builtinNodeHelpers", () => ({
  builtinTypeToSchema: {
    agent: {
      type: "agent",
      label: "Agent",
      category: "agents",
      inputs: [],
      outputs: [],
    },
    prompt: {
      type: "prompt",
      label: "Prompt",
      category: "inputs",
      inputs: [],
      outputs: [],
    },
  },
}));

describe("stripTransientFields", () => {
  it("should remove schema field", () => {
    const node: Node = {
      id: "node-1",
      type: "agent",
      position: { x: 0, y: 0 },
      data: {
        schema: { type: "agent" },
        config: { name: "test" },
      },
    };

    const stripped = stripTransientFields(node);
    expect(stripped.data.schema).toBeUndefined();
    expect(stripped.data.config).toEqual({ name: "test" });
  });

  it("should remove handleTypes field", () => {
    const node: Node = {
      id: "node-1",
      type: "agent",
      position: { x: 0, y: 0 },
      data: {
        handleTypes: { input: "string", output: "string" },
        config: { name: "test" },
      },
    };

    const stripped = stripTransientFields(node);
    expect(stripped.data.handleTypes).toBeUndefined();
  });

  it("should remove executionState field", () => {
    const node: Node = {
      id: "node-1",
      type: "agent",
      position: { x: 0, y: 0 },
      data: {
        executionState: { status: "running" },
        config: { name: "test" },
      },
    };

    const stripped = stripTransientFields(node);
    expect(stripped.data.executionState).toBeUndefined();
  });

  it("should remove validationErrors field", () => {
    const node: Node = {
      id: "node-1",
      type: "agent",
      position: { x: 0, y: 0 },
      data: {
        validationErrors: ["error 1"],
        config: { name: "test" },
      },
    };

    const stripped = stripTransientFields(node);
    expect(stripped.data.validationErrors).toBeUndefined();
  });

  it("should remove validationWarnings field", () => {
    const node: Node = {
      id: "node-1",
      type: "agent",
      position: { x: 0, y: 0 },
      data: {
        validationWarnings: ["warning 1"],
        config: { name: "test" },
      },
    };

    const stripped = stripTransientFields(node);
    expect(stripped.data.validationWarnings).toBeUndefined();
  });

  it("should remove duplicateNameError field", () => {
    const node: Node = {
      id: "node-1",
      type: "agent",
      position: { x: 0, y: 0 },
      data: {
        duplicateNameError: true,
        config: { name: "test" },
      },
    };

    const stripped = stripTransientFields(node);
    expect(stripped.data.duplicateNameError).toBeUndefined();
  });

  it("should preserve non-transient fields", () => {
    const node: Node = {
      id: "node-1",
      type: "agent",
      position: { x: 100, y: 200 },
      data: {
        config: { name: "MyAgent", description: "Test" },
        tabId: "tab-1",
        schema: { type: "agent" },
      },
    };

    const stripped = stripTransientFields(node);
    expect(stripped.id).toBe("node-1");
    expect(stripped.type).toBe("agent");
    expect(stripped.position).toEqual({ x: 100, y: 200 });
    expect(stripped.data.config).toEqual({
      name: "MyAgent",
      description: "Test",
    });
    expect(stripped.data.tabId).toBe("tab-1");
  });

  it("should not mutate original node", () => {
    const node: Node = {
      id: "node-1",
      type: "agent",
      position: { x: 0, y: 0 },
      data: {
        schema: { type: "agent" },
        config: { name: "test" },
      },
    };

    stripTransientFields(node);
    expect(node.data.schema).toBeDefined();
  });
});

describe("stripTransientFieldsFromNodes", () => {
  it("should strip fields from all nodes", () => {
    const nodes: Node[] = [
      {
        id: "node-1",
        type: "agent",
        position: { x: 0, y: 0 },
        data: { schema: { type: "agent" }, config: { name: "agent1" } },
      },
      {
        id: "node-2",
        type: "prompt",
        position: { x: 100, y: 0 },
        data: { schema: { type: "prompt" }, config: { name: "prompt1" } },
      },
    ];

    const stripped = stripTransientFieldsFromNodes(nodes);
    expect(stripped.length).toBe(2);
    expect(stripped[0].data.schema).toBeUndefined();
    expect(stripped[1].data.schema).toBeUndefined();
    expect((stripped[0].data as { config: { name: string } }).config.name).toBe(
      "agent1",
    );
    expect((stripped[1].data as { config: { name: string } }).config.name).toBe(
      "prompt1",
    );
  });

  it("should handle empty array", () => {
    const stripped = stripTransientFieldsFromNodes([]);
    expect(stripped).toEqual([]);
  });

  it("should handle single node", () => {
    const nodes: Node[] = [
      {
        id: "node-1",
        type: "agent",
        position: { x: 0, y: 0 },
        data: { schema: { type: "agent" } },
      },
    ];

    const stripped = stripTransientFieldsFromNodes(nodes);
    expect(stripped.length).toBe(1);
    expect(stripped[0].data.schema).toBeUndefined();
  });
});

describe("hydrateNodeWithSchema", () => {
  it("should hydrate node with builtin schema", () => {
    const node: Node = {
      id: "node-1",
      type: "agent",
      position: { x: 0, y: 0 },
      data: { config: { name: "MyAgent" } },
    };

    const hydrated = hydrateNodeWithSchema(node);
    expect(hydrated.data.schema).toBeDefined();
    expect(hydrated.data.handleTypes).toBeDefined();
  });

  it("should preserve user config values", () => {
    const node: Node = {
      id: "node-1",
      type: "agent",
      position: { x: 0, y: 0 },
      data: { config: { name: "CustomName", description: "Custom desc" } },
    };

    const hydrated = hydrateNodeWithSchema(node);
    const config = (
      hydrated.data as { config: { name: string; description: string } }
    ).config;
    expect(config.name).toBe("CustomName");
    expect(config.description).toBe("Custom desc");
  });

  it("should return node as-is for unknown type", () => {
    const consoleWarnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => {});

    const node: Node = {
      id: "node-1",
      type: "unknown-type",
      position: { x: 0, y: 0 },
      data: { config: { name: "test" } },
    };

    const hydrated = hydrateNodeWithSchema(node);
    expect(hydrated).toBe(node);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Unknown node type"),
    );

    consoleWarnSpy.mockRestore();
  });

  it("should set dragHandle for group nodes", () => {
    // Add group to mock
    vi.doMock("@/lib/builtinNodeHelpers", () => ({
      builtinTypeToSchema: {
        group: {
          type: "group",
          label: "Group",
          category: "structure",
          inputs: [],
          outputs: [],
        },
      },
    }));

    const node: Node = {
      id: "node-1",
      type: "group",
      position: { x: 0, y: 0 },
      data: {},
    };

    const hydrated = hydrateNodeWithSchema(node);
    expect(hydrated.dragHandle).toBe(".group-drag-handle");
  });

  it("should hydrate custom extension nodes", () => {
    const customSchemas = [
      {
        unit_id: "custom_unit",
        type: "custom:custom_unit",
        label: "Custom Unit",
        category: "custom",
        inputs: [],
        outputs: [],
      },
    ] as unknown as Parameters<typeof hydrateNodeWithSchema>[1];

    const node: Node = {
      id: "node-1",
      type: "custom:custom_unit",
      position: { x: 0, y: 0 },
      data: { config: {} },
    };

    const hydrated = hydrateNodeWithSchema(node, customSchemas);
    expect(hydrated.data.schema).toBeDefined();
  });
});

describe("hydrateNodesWithSchemas", () => {
  it("should hydrate all nodes", () => {
    const nodes: Node[] = [
      {
        id: "node-1",
        type: "agent",
        position: { x: 0, y: 0 },
        data: { config: { name: "agent1" } },
      },
      {
        id: "node-2",
        type: "prompt",
        position: { x: 100, y: 0 },
        data: { config: { name: "prompt1" } },
      },
    ];

    const hydrated = hydrateNodesWithSchemas(nodes);
    expect(hydrated.length).toBe(2);
    expect(hydrated[0].data.schema).toBeDefined();
    expect(hydrated[1].data.schema).toBeDefined();
  });

  it("should handle empty array", () => {
    const hydrated = hydrateNodesWithSchemas([]);
    expect(hydrated).toEqual([]);
  });

  it("should pass custom schemas to each node", () => {
    const customSchemas = [
      {
        unit_id: "my_unit",
        type: "custom:my_unit",
        label: "My Unit",
        category: "custom",
        inputs: [],
        outputs: [],
      },
    ] as unknown as Parameters<typeof hydrateNodesWithSchemas>[1];

    const nodes: Node[] = [
      {
        id: "node-1",
        type: "custom:my_unit",
        position: { x: 0, y: 0 },
        data: {},
      },
    ];

    const hydrated = hydrateNodesWithSchemas(nodes, customSchemas);
    expect(hydrated.length).toBe(1);
  });

  it("should preserve node order", () => {
    const nodes: Node[] = [
      { id: "a", type: "agent", position: { x: 0, y: 0 }, data: {} },
      { id: "b", type: "prompt", position: { x: 0, y: 0 }, data: {} },
      { id: "c", type: "agent", position: { x: 0, y: 0 }, data: {} },
    ];

    const hydrated = hydrateNodesWithSchemas(nodes);
    expect(hydrated.map((n) => n.id)).toEqual(["a", "b", "c"]);
  });
});
