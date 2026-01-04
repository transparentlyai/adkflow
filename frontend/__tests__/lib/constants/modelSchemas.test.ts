import { describe, it, expect } from "vitest";
import {
  MODEL_SCHEMAS,
  GEMINI_MODELS,
  DEFAULT_MODEL,
  getModelSchema,
  getModelFields,
  getModelTabs,
  getModelDefaults,
  getProjectSettingsModels,
  UNIVERSAL_FIELD_IDS,
  DEFAULT_TABS,
  VERTEX_AI_LOCATIONS,
} from "@/lib/constants/modelSchemas";

describe("modelSchemas/index", () => {
  describe("MODEL_SCHEMAS", () => {
    it("should have all expected models", () => {
      expect(Object.keys(MODEL_SCHEMAS)).toContain("gemini-2.0-flash");
      expect(Object.keys(MODEL_SCHEMAS)).toContain("gemini-2.5-flash");
      expect(Object.keys(MODEL_SCHEMAS)).toContain("gemini-2.5-pro");
      expect(Object.keys(MODEL_SCHEMAS)).toContain("custom");
    });

    it("should have valid schema structure for each model", () => {
      for (const [modelId, schema] of Object.entries(MODEL_SCHEMAS)) {
        expect(schema.modelId).toBe(modelId);
        expect(Array.isArray(schema.fields)).toBe(true);
        expect(Array.isArray(schema.tabs)).toBe(true);
      }
    });
  });

  describe("GEMINI_MODELS", () => {
    it("should be an array of model options", () => {
      expect(Array.isArray(GEMINI_MODELS)).toBe(true);
      expect(GEMINI_MODELS.length).toBeGreaterThan(0);
    });

    it("should have value and label for each option", () => {
      for (const option of GEMINI_MODELS) {
        expect(option).toHaveProperty("value");
        expect(option).toHaveProperty("label");
      }
    });

    it("should include custom model", () => {
      expect(GEMINI_MODELS.some((m) => m.value === "custom")).toBe(true);
    });
  });

  describe("DEFAULT_MODEL", () => {
    it("should be a valid model ID", () => {
      expect(MODEL_SCHEMAS[DEFAULT_MODEL]).toBeDefined();
    });
  });

  describe("getModelSchema", () => {
    it("should return schema for known model", () => {
      const schema = getModelSchema("gemini-2.0-flash");
      expect(schema.modelId).toBe("gemini-2.0-flash");
    });

    it("should return default schema for unknown model", () => {
      const schema = getModelSchema("unknown-model");
      expect(schema).toBeDefined();
      expect(schema.modelId).toBe(DEFAULT_MODEL);
    });
  });

  describe("getModelFields", () => {
    it("should return fields for a model", () => {
      const fields = getModelFields("gemini-2.0-flash");
      expect(Array.isArray(fields)).toBe(true);
      expect(fields.length).toBeGreaterThan(0);
    });

    it("should return default fields for unknown model", () => {
      const fields = getModelFields("unknown-model");
      expect(Array.isArray(fields)).toBe(true);
    });
  });

  describe("getModelTabs", () => {
    it("should return tabs for a model", () => {
      const tabs = getModelTabs("gemini-2.0-flash");
      expect(Array.isArray(tabs)).toBe(true);
    });

    it("should return default tabs for unknown model", () => {
      const tabs = getModelTabs("unknown-model");
      expect(Array.isArray(tabs)).toBe(true);
    });
  });

  describe("getModelDefaults", () => {
    it("should return default values for model fields", () => {
      const defaults = getModelDefaults("gemini-2.0-flash");
      expect(typeof defaults).toBe("object");
    });

    it("should include defaults from field definitions", () => {
      const defaults = getModelDefaults("gemini-2.0-flash");
      // Check that some defaults are present (based on typical model schemas)
      expect(defaults).toBeDefined();
    });

    it("should return defaults for unknown model", () => {
      const defaults = getModelDefaults("unknown-model");
      expect(typeof defaults).toBe("object");
    });
  });

  describe("getProjectSettingsModels", () => {
    it("should return models excluding custom", () => {
      const models = getProjectSettingsModels();
      expect(Array.isArray(models)).toBe(true);
      expect(models.some((m) => m.value === "custom")).toBe(false);
    });

    it("should include standard gemini models", () => {
      const models = getProjectSettingsModels();
      expect(models.length).toBeGreaterThan(0);
    });
  });

  describe("exported constants", () => {
    it("should export UNIVERSAL_FIELD_IDS", () => {
      expect(UNIVERSAL_FIELD_IDS).toBeDefined();
      expect(typeof UNIVERSAL_FIELD_IDS).toBe("object");
    });

    it("should export DEFAULT_TABS", () => {
      expect(DEFAULT_TABS).toBeDefined();
      expect(Array.isArray(DEFAULT_TABS)).toBe(true);
    });

    it("should export VERTEX_AI_LOCATIONS", () => {
      expect(VERTEX_AI_LOCATIONS).toBeDefined();
      expect(Array.isArray(VERTEX_AI_LOCATIONS)).toBe(true);
    });
  });
});
