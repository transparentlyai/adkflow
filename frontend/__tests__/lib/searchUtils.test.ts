import { describe, it, expect } from "vitest";
import type { Node } from "@xyflow/react";
import {
  getNodeDisplayName,
  getNodeTypeLabel,
  getNodeTypeFromId,
  matchSearch,
  buildEntriesFromNodes,
  searchIndex,
  type SearchIndexEntry,
} from "@/lib/searchUtils";

describe("getNodeDisplayName", () => {
  it("should return config.name if available", () => {
    const node = {
      id: "agent_1",
      type: "agent",
      position: { x: 0, y: 0 },
      data: { config: { name: "MyAgent" } },
    } as Node;

    expect(getNodeDisplayName(node)).toBe("MyAgent");
  });

  it("should return data.label if no config.name", () => {
    const node = {
      id: "label_1",
      type: "label",
      position: { x: 0, y: 0 },
      data: { label: "Important Note" },
    } as Node;

    expect(getNodeDisplayName(node)).toBe("Important Note");
  });

  it('should return "Unnamed" if no name available', () => {
    const node = {
      id: "node_1",
      type: "custom",
      position: { x: 0, y: 0 },
      data: {},
    } as Node;

    expect(getNodeDisplayName(node)).toBe("Unnamed");
  });
});

describe("getNodeTypeLabel", () => {
  it("should return human-readable labels for known types", () => {
    expect(getNodeTypeLabel("agent")).toBe("Agent");
    expect(getNodeTypeLabel("prompt")).toBe("Prompt");
    expect(getNodeTypeLabel("tool")).toBe("Tool");
    expect(getNodeTypeLabel("teleportOut")).toBe("Teleport Out");
    expect(getNodeTypeLabel("teleportIn")).toBe("Teleport In");
  });

  it("should return the type itself for unknown types", () => {
    expect(getNodeTypeLabel("customType")).toBe("customType");
  });
});

describe("getNodeTypeFromId", () => {
  it("should extract node type from ID prefix", () => {
    expect(getNodeTypeFromId("agent_123")).toBe("agent");
    expect(getNodeTypeFromId("prompt_abc_def")).toBe("prompt");
    expect(getNodeTypeFromId("teleportOut_1")).toBe("teleportOut");
  });

  it("should return the full ID if no underscore", () => {
    expect(getNodeTypeFromId("custom")).toBe("custom");
  });
});

describe("matchSearch", () => {
  it("should return 100 for exact match", () => {
    expect(matchSearch("agent", "Agent")).toBe(100);
    expect(matchSearch("test", "test")).toBe(100);
  });

  it("should return 80 for startsWith match", () => {
    expect(matchSearch("ag", "Agent")).toBe(80);
    expect(matchSearch("tes", "testing")).toBe(80);
  });

  it("should return 60 for contains match", () => {
    expect(matchSearch("gen", "Agent")).toBe(60);
    expect(matchSearch("est", "testing")).toBe(60);
  });

  it("should return 0 for no match", () => {
    expect(matchSearch("xyz", "Agent")).toBe(0);
    expect(matchSearch("foo", "bar")).toBe(0);
  });

  it("should return 0 for empty query or text", () => {
    expect(matchSearch("", "Agent")).toBe(0);
    expect(matchSearch("test", "")).toBe(0);
  });
});

describe("buildEntriesFromNodes", () => {
  it("should create search entries from nodes", () => {
    const nodes: Node[] = [
      {
        id: "agent_1",
        type: "agent",
        position: { x: 0, y: 0 },
        data: { config: { name: "SearchAgent" } },
      },
      {
        id: "prompt_1",
        type: "prompt",
        position: { x: 0, y: 0 },
        data: { config: { name: "SystemPrompt" } },
      },
    ];

    const entries = buildEntriesFromNodes(nodes, "tab-1", "Main");

    expect(entries).toHaveLength(2);
    expect(entries[0]).toEqual({
      nodeId: "agent_1",
      nodeName: "SearchAgent",
      nodeType: "agent",
      nodeTypeLabel: "Agent",
      tabId: "tab-1",
      tabName: "Main",
    });
  });
});

describe("searchIndex", () => {
  const entries: SearchIndexEntry[] = [
    {
      nodeId: "agent_1",
      nodeName: "SearchAgent",
      nodeType: "agent",
      nodeTypeLabel: "Agent",
      tabId: "tab-1",
      tabName: "Main",
    },
    {
      nodeId: "prompt_1",
      nodeName: "SystemPrompt",
      nodeType: "prompt",
      nodeTypeLabel: "Prompt",
      tabId: "tab-1",
      tabName: "Main",
    },
    {
      nodeId: "agent_2",
      nodeName: "DataProcessor",
      nodeType: "agent",
      nodeTypeLabel: "Agent",
      tabId: "tab-2",
      tabName: "Secondary",
    },
  ];

  it("should find matching entries by name", () => {
    const results = searchIndex(entries, "search");
    expect(results).toHaveLength(1);
    expect(results[0].nodeName).toBe("SearchAgent");
  });

  it("should find entries by type label", () => {
    const results = searchIndex(entries, "agent");
    expect(results.length).toBeGreaterThanOrEqual(2);
  });

  it("should return empty for empty query", () => {
    expect(searchIndex(entries, "")).toEqual([]);
    expect(searchIndex(entries, "   ")).toEqual([]);
  });

  it("should return empty for no matches", () => {
    expect(searchIndex(entries, "xyz")).toEqual([]);
  });

  it("should sort results by score", () => {
    const results = searchIndex(entries, "system");
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].nodeName).toBe("SystemPrompt");
  });
});
