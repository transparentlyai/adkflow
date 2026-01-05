import { describe, it, expect } from "vitest";
import { generateNodeId } from "@/lib/workflowHelpers";

describe("generateNodeId", () => {
  it("should generate unique IDs", () => {
    const id1 = generateNodeId();
    const id2 = generateNodeId();
    expect(id1).not.toBe(id2);
  });

  it("should use default prefix 'node'", () => {
    const id = generateNodeId();
    expect(id.startsWith("node_")).toBe(true);
  });

  it("should use custom prefix when provided", () => {
    const id = generateNodeId("agent");
    expect(id.startsWith("agent_")).toBe(true);
  });

  it("should include timestamp in ID", () => {
    const before = Date.now();
    const id = generateNodeId();
    const after = Date.now();

    // Extract timestamp from ID
    const parts = id.split("_");
    const timestamp = parseInt(parts[1], 10);

    expect(timestamp).toBeGreaterThanOrEqual(before);
    expect(timestamp).toBeLessThanOrEqual(after);
  });

  it("should include random suffix", () => {
    const id = generateNodeId();
    const parts = id.split("_");
    expect(parts.length).toBe(3);
    expect(parts[2].length).toBe(9);
  });

  it("should generate valid identifier format", () => {
    const id = generateNodeId();
    // Should contain only alphanumeric and underscore
    expect(id).toMatch(/^[a-zA-Z0-9_]+$/);
  });

  it("should handle empty prefix", () => {
    const id = generateNodeId("");
    expect(id.startsWith("_")).toBe(true);
  });

  it("should handle special characters in prefix", () => {
    // Function uses prefix as-is
    const id = generateNodeId("test-node");
    expect(id.startsWith("test-node_")).toBe(true);
  });

  describe("uniqueness under load", () => {
    it("should generate unique IDs in rapid succession", () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateNodeId());
      }
      expect(ids.size).toBe(100);
    });

    it("should generate unique IDs with same prefix", () => {
      const ids = new Set<string>();
      for (let i = 0; i < 50; i++) {
        ids.add(generateNodeId("agent"));
      }
      expect(ids.size).toBe(50);
    });
  });

  describe("prefix variations", () => {
    it("should work with common node type prefixes", () => {
      const prefixes = ["agent", "prompt", "tool", "context", "group", "start"];
      prefixes.forEach((prefix) => {
        const id = generateNodeId(prefix);
        expect(id.startsWith(`${prefix}_`)).toBe(true);
      });
    });

    it("should work with numeric prefix", () => {
      const id = generateNodeId("123");
      expect(id.startsWith("123_")).toBe(true);
    });

    it("should work with underscore prefix", () => {
      const id = generateNodeId("_private");
      expect(id.startsWith("_private_")).toBe(true);
    });
  });
});
