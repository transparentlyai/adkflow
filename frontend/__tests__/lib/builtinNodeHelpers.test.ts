import { describe, it, expect } from "vitest";
import {
  builtinTypeToSchema,
  builtinUnitIdToSchema,
  getBuiltinSchema,
  isBuiltinSchemaType,
  getBuiltinNodeType,
  getDefaultBuiltinNodeData,
  schemaDriverNodeTypes,
  builtinNodeSchemas,
} from "@/lib/builtinNodeHelpers";

describe("builtinNodeHelpers", () => {
  describe("builtinTypeToSchema", () => {
    it("should have all expected node types", () => {
      const expectedTypes = [
        "agent",
        "prompt",
        "context",
        "inputProbe",
        "outputProbe",
        "logProbe",
        "outputFile",
        "tool",
        "agentTool",
        "process",
        "variable",
        "teleportIn",
        "teleportOut",
        "userInput",
        "start",
        "end",
      ];

      for (const type of expectedTypes) {
        expect(builtinTypeToSchema[type]).toBeDefined();
      }
    });

    it("should map to valid schemas", () => {
      for (const schema of Object.values(builtinTypeToSchema)) {
        expect(schema.unit_id).toBeDefined();
        expect(schema.label).toBeDefined();
        expect(schema.ui).toBeDefined();
      }
    });
  });

  describe("builtinUnitIdToSchema", () => {
    it("should map unit_ids to schemas", () => {
      expect(builtinUnitIdToSchema["builtin.agent"]).toBeDefined();
      expect(builtinUnitIdToSchema["builtin.prompt"]).toBeDefined();
      expect(builtinUnitIdToSchema["builtin.tool"]).toBeDefined();
    });

    it("should have same count as builtinNodeSchemas", () => {
      expect(Object.keys(builtinUnitIdToSchema).length).toBe(
        builtinNodeSchemas.length,
      );
    });
  });

  describe("getBuiltinSchema", () => {
    it("should return schema for valid type", () => {
      const schema = getBuiltinSchema("agent");
      expect(schema).toBeDefined();
      expect(schema?.unit_id).toBe("builtin.agent");
    });

    it("should return undefined for invalid type", () => {
      expect(getBuiltinSchema("unknown")).toBeUndefined();
    });

    it("should return correct schema for each type", () => {
      expect(getBuiltinSchema("prompt")?.unit_id).toBe("builtin.prompt");
      expect(getBuiltinSchema("tool")?.unit_id).toBe("builtin.tool");
      expect(getBuiltinSchema("start")?.unit_id).toBe("builtin.start");
    });
  });

  describe("isBuiltinSchemaType", () => {
    it("should return true for builtin types", () => {
      expect(isBuiltinSchemaType("agent")).toBe(true);
      expect(isBuiltinSchemaType("prompt")).toBe(true);
      expect(isBuiltinSchemaType("tool")).toBe(true);
    });

    it("should return false for non-builtin types", () => {
      expect(isBuiltinSchemaType("unknown")).toBe(false);
      expect(isBuiltinSchemaType("custom")).toBe(false);
      expect(isBuiltinSchemaType("group")).toBe(false);
    });
  });

  describe("getBuiltinNodeType", () => {
    it("should extract type from unit_id", () => {
      const schema = getBuiltinSchema("agent")!;
      expect(getBuiltinNodeType(schema)).toBe("agent");
    });

    it("should work for all builtin schemas", () => {
      for (const [type, schema] of Object.entries(builtinTypeToSchema)) {
        expect(getBuiltinNodeType(schema)).toBe(type);
      }
    });
  });

  describe("getDefaultBuiltinNodeData", () => {
    it("should return node data for valid type", () => {
      const data = getDefaultBuiltinNodeData("agent");
      expect(data).toBeDefined();
      expect(data?.schema).toBeDefined();
      expect(data?.config).toBeDefined();
    });

    it("should return undefined for invalid type", () => {
      expect(getDefaultBuiltinNodeData("unknown")).toBeUndefined();
    });

    it("should include handleTypes", () => {
      const data = getDefaultBuiltinNodeData("agent");
      expect(data?.handleTypes).toBeDefined();
    });
  });

  describe("schemaDriverNodeTypes", () => {
    it("should contain all builtin types", () => {
      expect(schemaDriverNodeTypes).toContain("agent");
      expect(schemaDriverNodeTypes).toContain("prompt");
      expect(schemaDriverNodeTypes).toContain("tool");
      expect(schemaDriverNodeTypes).toContain("start");
      expect(schemaDriverNodeTypes).toContain("end");
    });

    it("should have 17 types", () => {
      expect(schemaDriverNodeTypes.length).toBe(17);
    });
  });

  describe("builtinNodeSchemas export", () => {
    it("should be an array", () => {
      expect(Array.isArray(builtinNodeSchemas)).toBe(true);
    });

    it("should have 17 schemas", () => {
      expect(builtinNodeSchemas.length).toBe(17);
    });
  });
});
