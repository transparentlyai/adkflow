import { describe, it, expect, vi, beforeEach } from "vitest";
import { calculateFieldChanges } from "@/components/nodes/custom/hooks/useModelChangeConfirmation";
import * as modelSchemas from "@/lib/constants/modelSchemas";

// Mock model schemas
vi.mock("@/lib/constants/modelSchemas", async () => {
  const actual = await vi.importActual("@/lib/constants/modelSchemas");
  return {
    ...actual,
    getModelSchema: vi.fn(),
    getModelDefaults: vi.fn(),
  };
});

const mockGetModelSchema = vi.mocked(modelSchemas.getModelSchema);
const mockGetModelDefaults = vi.mocked(modelSchemas.getModelDefaults);

// Test schemas and defaults
const model1Schema = {
  label: "Model 1",
  tabs: [{ id: "main", label: "Main" }],
  fields: [
    { id: "field1", label: "Field 1", widget: "text" as const, default: "value1" },
    { id: "field2", label: "Field 2", widget: "number" as const, default: 10 },
    { id: "model", label: "Model", widget: "select" as const, default: "model1" },
  ],
};

const model2Schema = {
  label: "Model 2",
  tabs: [{ id: "main", label: "Main" }],
  fields: [
    { id: "field1", label: "Field 1", widget: "text" as const, default: "value2" },
    { id: "field3", label: "Field 3", widget: "checkbox" as const, default: true },
    { id: "model", label: "Model", widget: "select" as const, default: "model2" },
  ],
};

const model1Defaults = {
  field1: "value1",
  field2: 10,
  model: "model1",
};

const model2Defaults = {
  field1: "value2",
  field3: true,
  model: "model2",
};

describe("calculateFieldChanges", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetModelSchema.mockImplementation((model) => {
      if (model === "model1") return model1Schema as any;
      if (model === "model2") return model2Schema as any;
      throw new Error(`Unknown model: ${model}`);
    });
    mockGetModelDefaults.mockImplementation((model) => {
      if (model === "model1") return model1Defaults;
      if (model === "model2") return model2Defaults;
      throw new Error(`Unknown model: ${model}`);
    });
  });

  describe("field modifications", () => {
    it("should detect when a field value will change", () => {
      const config = { field1: "customValue", field2: 10 };
      const changes = calculateFieldChanges(config, "model1", "model2");

      expect(changes).toContainEqual(
        expect.objectContaining({
          fieldId: "field1",
          label: "Field 1",
          currentValue: "customValue",
          newValue: "value2",
          isRemoved: false,
          isNew: false,
        }),
      );
    });

    it("should use default value when field not in config", () => {
      const config = {}; // field1 not set, will use model1 default
      const changes = calculateFieldChanges(config, "model1", "model2");

      expect(changes).toContainEqual(
        expect.objectContaining({
          fieldId: "field1",
          currentValue: "value1", // from model1 defaults
          newValue: "value2", // from model2 defaults
        }),
      );
    });

    it("should not include fields that don't change", () => {
      const config = { field1: "value2" }; // Already has model2's default
      const changes = calculateFieldChanges(config, "model1", "model2");

      const field1Changes = changes.filter((c) => c.fieldId === "field1");
      expect(field1Changes).toHaveLength(0);
    });
  });

  describe("new fields", () => {
    it("should mark new fields that don't exist in current model", () => {
      const config = { field1: "value1", field2: 10 };
      const changes = calculateFieldChanges(config, "model1", "model2");

      expect(changes).toContainEqual(
        expect.objectContaining({
          fieldId: "field3",
          label: "Field 3",
          currentValue: undefined,
          newValue: true,
          isRemoved: false,
          isNew: true,
        }),
      );
    });
  });

  describe("removed fields", () => {
    it("should mark fields being removed with effective values", () => {
      const config = { field1: "value1", field2: 20 }; // field2 customized
      const changes = calculateFieldChanges(config, "model1", "model2");

      expect(changes).toContainEqual(
        expect.objectContaining({
          fieldId: "field2",
          label: "Field 2",
          currentValue: 20, // custom value
          newValue: undefined,
          isRemoved: true,
          isNew: false,
        }),
      );
    });

    it("should include removed fields with default values", () => {
      const config = {}; // field2 will use default
      const changes = calculateFieldChanges(config, "model1", "model2");

      expect(changes).toContainEqual(
        expect.objectContaining({
          fieldId: "field2",
          currentValue: 10, // from defaults
          isRemoved: true,
        }),
      );
    });

    it("should not include removed fields with no effective value", () => {
      mockGetModelDefaults.mockImplementation((model) => {
        if (model === "model1") return { field1: "value1", model: "model1" }; // no field2
        if (model === "model2") return model2Defaults;
        throw new Error(`Unknown model: ${model}`);
      });

      const config = {}; // no field2 value
      const changes = calculateFieldChanges(config, "model1", "model2");

      const field2Changes = changes.filter((c) => c.fieldId === "field2");
      expect(field2Changes).toHaveLength(0);
    });
  });

  describe("model field exclusion", () => {
    it("should exclude the model field itself from changes", () => {
      const config = { model: "model1" };
      const changes = calculateFieldChanges(config, "model1", "model2");

      const modelChanges = changes.filter((c) => c.fieldId === "model");
      expect(modelChanges).toHaveLength(0);
    });
  });
});
