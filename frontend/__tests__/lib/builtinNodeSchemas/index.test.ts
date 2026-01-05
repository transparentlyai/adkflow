import { describe, it, expect } from "vitest";
import {
  agentNodeSchema,
  toolNodeSchema,
  agentToolNodeSchema,
  processNodeSchema,
  inputProbeNodeSchema,
  outputProbeNodeSchema,
  logProbeNodeSchema,
  promptNodeSchema,
  contextNodeSchema,
  userInputNodeSchema,
  outputFileNodeSchema,
  startNodeSchema,
  endNodeSchema,
  teleportInNodeSchema,
  teleportOutNodeSchema,
  variableNodeSchema,
  builtinNodeSchemas,
} from "@/lib/builtinNodeSchemas";
import { getAgentNodeSchemaForModel } from "@/lib/builtinNodeSchemas/agentNodeSchema";

describe("builtinNodeSchemas", () => {
  describe("individual schemas", () => {
    const schemas = [
      { name: "agentNodeSchema", schema: agentNodeSchema },
      { name: "toolNodeSchema", schema: toolNodeSchema },
      { name: "agentToolNodeSchema", schema: agentToolNodeSchema },
      { name: "processNodeSchema", schema: processNodeSchema },
      { name: "inputProbeNodeSchema", schema: inputProbeNodeSchema },
      { name: "outputProbeNodeSchema", schema: outputProbeNodeSchema },
      { name: "logProbeNodeSchema", schema: logProbeNodeSchema },
      { name: "promptNodeSchema", schema: promptNodeSchema },
      { name: "contextNodeSchema", schema: contextNodeSchema },
      { name: "userInputNodeSchema", schema: userInputNodeSchema },
      { name: "outputFileNodeSchema", schema: outputFileNodeSchema },
      { name: "startNodeSchema", schema: startNodeSchema },
      { name: "endNodeSchema", schema: endNodeSchema },
      { name: "teleportInNodeSchema", schema: teleportInNodeSchema },
      { name: "teleportOutNodeSchema", schema: teleportOutNodeSchema },
      { name: "variableNodeSchema", schema: variableNodeSchema },
    ];

    for (const { name, schema } of schemas) {
      describe(name, () => {
        it("should have a unit_id", () => {
          expect(schema.unit_id).toBeDefined();
          expect(typeof schema.unit_id).toBe("string");
          expect(schema.unit_id.startsWith("builtin.")).toBe(true);
        });

        it("should have a label", () => {
          expect(schema.label).toBeDefined();
          expect(typeof schema.label).toBe("string");
        });

        it("should have a menu_location", () => {
          expect(schema.menu_location).toBeDefined();
          expect(typeof schema.menu_location).toBe("string");
        });

        it("should have ui configuration", () => {
          expect(schema.ui).toBeDefined();
        });

        it("should have version", () => {
          expect(schema.version).toBeDefined();
        });
      });
    }
  });

  describe("builtinNodeSchemas collection", () => {
    it("should contain all node schemas", () => {
      expect(builtinNodeSchemas.length).toBe(16);
    });

    it("should have unique unit_ids", () => {
      const unitIds = builtinNodeSchemas.map((s) => s.unit_id);
      const uniqueIds = new Set(unitIds);
      expect(uniqueIds.size).toBe(unitIds.length);
    });

    it("should have valid menu locations", () => {
      const validPrefixes = [
        "Agents/",
        "Tools/",
        "Processing/",
        "Probes/",
        "Content/",
        "Flow Control/",
        "Connectors/",
        "Output/",
        "Interaction/",
      ];
      for (const schema of builtinNodeSchemas) {
        const hasValidPrefix = validPrefixes.some((prefix) =>
          schema.menu_location.startsWith(prefix),
        );
        expect(hasValidPrefix).toBe(true);
      }
    });
  });

  describe("agentNodeSchema", () => {
    it("should have agent unit_id", () => {
      expect(agentNodeSchema.unit_id).toBe("builtin.agent");
    });

    it("should have ui.inputs defined", () => {
      expect(agentNodeSchema.ui.inputs).toBeDefined();
    });

    it("should have ui.outputs defined", () => {
      expect(agentNodeSchema.ui.outputs).toBeDefined();
    });

    it("should be in Agents menu", () => {
      expect(agentNodeSchema.menu_location.startsWith("Agents/")).toBe(true);
    });
  });

  describe("toolNodeSchema", () => {
    it("should have tool unit_id", () => {
      expect(toolNodeSchema.unit_id).toBe("builtin.tool");
    });

    it("should be in Tools menu", () => {
      expect(toolNodeSchema.menu_location.startsWith("Tools/")).toBe(true);
    });
  });

  describe("startNodeSchema", () => {
    it("should have start unit_id", () => {
      expect(startNodeSchema.unit_id).toBe("builtin.start");
    });

    it("should be in Flow Control menu", () => {
      expect(startNodeSchema.menu_location.startsWith("Flow Control/")).toBe(
        true,
      );
    });
  });

  describe("endNodeSchema", () => {
    it("should have end unit_id", () => {
      expect(endNodeSchema.unit_id).toBe("builtin.end");
    });

    it("should be in Flow Control menu", () => {
      expect(endNodeSchema.menu_location.startsWith("Flow Control/")).toBe(
        true,
      );
    });
  });

  describe("promptNodeSchema", () => {
    it("should have prompt unit_id", () => {
      expect(promptNodeSchema.unit_id).toBe("builtin.prompt");
    });

    it("should be in Content menu", () => {
      expect(promptNodeSchema.menu_location.startsWith("Content/")).toBe(true);
    });
  });

  describe("teleportInNodeSchema", () => {
    it("should have teleportIn unit_id", () => {
      expect(teleportInNodeSchema.unit_id).toBe("builtin.teleportIn");
    });

    it("should be in Connectors menu", () => {
      expect(teleportInNodeSchema.menu_location.startsWith("Connectors/")).toBe(
        true,
      );
    });
  });

  describe("teleportOutNodeSchema", () => {
    it("should have teleportOut unit_id", () => {
      expect(teleportOutNodeSchema.unit_id).toBe("builtin.teleportOut");
    });

    it("should be in Connectors menu", () => {
      expect(
        teleportOutNodeSchema.menu_location.startsWith("Connectors/"),
      ).toBe(true);
    });
  });

  describe("getAgentNodeSchemaForModel", () => {
    it("should return schema with model-specific fields", () => {
      const schema = getAgentNodeSchemaForModel("gemini-2.5-flash");

      expect(schema.unit_id).toBe("builtin.agent");
      expect(schema.ui).toBeDefined();
      expect(schema.ui.tabs).toBeDefined();
      expect(schema.ui.fields).toBeDefined();
    });

    it("should preserve base schema properties", () => {
      const schema = getAgentNodeSchemaForModel("gemini-2.0-flash");

      expect(schema.label).toBe(agentNodeSchema.label);
      expect(schema.menu_location).toBe(agentNodeSchema.menu_location);
      expect(schema.version).toBe(agentNodeSchema.version);
    });

    it("should return schema for custom model", () => {
      const schema = getAgentNodeSchemaForModel("custom-model-id");

      expect(schema.unit_id).toBe("builtin.agent");
      expect(schema.ui.tabs).toBeDefined();
    });
  });
});
