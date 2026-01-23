import { describe, it, expect } from "vitest";
import { monitorNodeSchema } from "@/lib/builtinNodeSchemas/monitorNodeSchema";

describe("monitorNodeSchema", () => {
  describe("basic schema structure", () => {
    it("should have correct unit_id", () => {
      expect(monitorNodeSchema.unit_id).toBe("builtin.monitor");
    });

    it("should have label", () => {
      expect(monitorNodeSchema.label).toBe("Monitor");
    });

    it("should have menu location in Probes", () => {
      expect(monitorNodeSchema.menu_location).toBe("Probes/Monitor");
    });

    it("should have description", () => {
      expect(monitorNodeSchema.description).toContain("runtime output");
      expect(monitorNodeSchema.description).toContain("read-only");
    });

    it("should have version", () => {
      expect(monitorNodeSchema.version).toBe("1.0.0");
    });
  });

  describe("node behavior flags", () => {
    it("should be an output node", () => {
      expect(monitorNodeSchema.output_node).toBe(true);
    });

    it("should always execute", () => {
      expect(monitorNodeSchema.always_execute).toBe(true);
    });
  });

  describe("ui configuration", () => {
    it("should have ui object", () => {
      expect(monitorNodeSchema.ui).toBeDefined();
      expect(typeof monitorNodeSchema.ui).toBe("object");
    });

    it("should have icon", () => {
      expect(monitorNodeSchema.ui.icon).toBe("Eye");
    });

    it("should use probe theme", () => {
      expect(monitorNodeSchema.ui.theme_key).toBe("probe");
    });

    it("should have empty color (uses theme)", () => {
      expect(monitorNodeSchema.ui.color).toBe("");
    });

    it("should use circle layout", () => {
      expect(monitorNodeSchema.ui.layout).toBe("circle");
    });

    it("should be expandable", () => {
      expect(monitorNodeSchema.ui.expandable).toBe(true);
    });
  });

  describe("resizable properties", () => {
    it("should be resizable", () => {
      expect(monitorNodeSchema.ui.resizable).toBe(true);
    });

    it("should have default width", () => {
      expect(monitorNodeSchema.ui.default_width).toBe(400);
    });

    it("should have default height", () => {
      expect(monitorNodeSchema.ui.default_height).toBe(280);
    });

    it("should have min width", () => {
      expect(monitorNodeSchema.ui.min_width).toBe(300);
    });

    it("should have min height", () => {
      expect(monitorNodeSchema.ui.min_height).toBe(200);
    });

    it("should have reasonable default dimensions", () => {
      expect(monitorNodeSchema.ui.default_width).toBeGreaterThanOrEqual(
        monitorNodeSchema.ui.min_width!,
      );
      expect(monitorNodeSchema.ui.default_height).toBeGreaterThanOrEqual(
        monitorNodeSchema.ui.min_height!,
      );
    });
  });

  describe("inputs configuration", () => {
    it("should have inputs array", () => {
      expect(monitorNodeSchema.ui.inputs).toBeDefined();
      expect(Array.isArray(monitorNodeSchema.ui.inputs)).toBe(true);
    });

    it("should have exactly one input", () => {
      expect(monitorNodeSchema.ui.inputs).toHaveLength(1);
    });

    it("should have input with correct id", () => {
      const input = monitorNodeSchema.ui.inputs[0];
      expect(input.id).toBe("input");
    });

    it("should have input with label", () => {
      const input = monitorNodeSchema.ui.inputs[0];
      expect(input.label).toBe("Input");
    });

    it("should accept any source type", () => {
      const input = monitorNodeSchema.ui.inputs[0];
      expect(input.source_type).toBe("*");
    });

    it("should accept any data type", () => {
      const input = monitorNodeSchema.ui.inputs[0];
      expect(input.data_type).toBe("any");
    });

    it("should accept all sources", () => {
      const input = monitorNodeSchema.ui.inputs[0];
      expect(input.accepted_sources).toEqual(["*"]);
    });

    it("should accept multiple types", () => {
      const input = monitorNodeSchema.ui.inputs[0];
      expect(input.accepted_types).toContain("str");
      expect(input.accepted_types).toContain("dict");
      expect(input.accepted_types).toContain("any");
    });

    it("should not be required", () => {
      const input = monitorNodeSchema.ui.inputs[0];
      expect(input.required).toBe(false);
    });

    it("should not allow multiple connections", () => {
      const input = monitorNodeSchema.ui.inputs[0];
      expect(input.multiple).toBe(false);
    });

    it("should be connection only", () => {
      const input = monitorNodeSchema.ui.inputs[0];
      expect(input.connection_only).toBe(true);
    });
  });

  describe("outputs configuration", () => {
    it("should have outputs array", () => {
      expect(monitorNodeSchema.ui.outputs).toBeDefined();
      expect(Array.isArray(monitorNodeSchema.ui.outputs)).toBe(true);
    });

    it("should have no outputs (sink node)", () => {
      expect(monitorNodeSchema.ui.outputs).toHaveLength(0);
    });
  });

  describe("fields configuration", () => {
    it("should have fields array", () => {
      expect(monitorNodeSchema.ui.fields).toBeDefined();
      expect(Array.isArray(monitorNodeSchema.ui.fields)).toBe(true);
    });

    it("should have 4 fields", () => {
      expect(monitorNodeSchema.ui.fields).toHaveLength(4);
    });

    describe("name field", () => {
      const nameField = monitorNodeSchema.ui.fields.find(
        (f) => f.id === "name",
      );

      it("should exist", () => {
        expect(nameField).toBeDefined();
      });

      it("should have correct properties", () => {
        expect(nameField?.label).toBe("Name");
        expect(nameField?.widget).toBe("text");
        expect(nameField?.default).toBe("Monitor");
        expect(nameField?.placeholder).toBe("Monitor name...");
      });

      it("should have help text", () => {
        expect(nameField?.help_text).toContain("Display name");
      });
    });

    describe("monitoredValue field", () => {
      const valueField = monitorNodeSchema.ui.fields.find(
        (f) => f.id === "monitoredValue",
      );

      it("should exist", () => {
        expect(valueField).toBeDefined();
      });

      it("should be hidden widget", () => {
        expect(valueField?.widget).toBe("hidden");
      });

      it("should have empty default", () => {
        expect(valueField?.default).toBe("");
      });

      it("should have help text", () => {
        expect(valueField?.help_text).toContain("Last captured value");
        expect(valueField?.help_text).toContain("persistence");
      });
    });

    describe("monitoredValueType field", () => {
      const typeField = monitorNodeSchema.ui.fields.find(
        (f) => f.id === "monitoredValueType",
      );

      it("should exist", () => {
        expect(typeField).toBeDefined();
      });

      it("should be hidden widget", () => {
        expect(typeField?.widget).toBe("hidden");
      });

      it("should default to plaintext", () => {
        expect(typeField?.default).toBe("plaintext");
      });

      it("should have help text describing content types", () => {
        expect(typeField?.help_text).toContain("json");
        expect(typeField?.help_text).toContain("markdown");
        expect(typeField?.help_text).toContain("plaintext");
      });
    });

    describe("monitoredTimestamp field", () => {
      const timestampField = monitorNodeSchema.ui.fields.find(
        (f) => f.id === "monitoredTimestamp",
      );

      it("should exist", () => {
        expect(timestampField).toBeDefined();
      });

      it("should be hidden widget", () => {
        expect(timestampField?.widget).toBe("hidden");
      });

      it("should have empty default", () => {
        expect(timestampField?.default).toBe("");
      });

      it("should have help text", () => {
        expect(timestampField?.help_text).toContain("last captured");
      });
    });
  });

  describe("handle layout", () => {
    it("should have handle_layout configuration", () => {
      expect(monitorNodeSchema.ui.handle_layout).toBeDefined();
    });

    it("should position input at bottom", () => {
      expect(monitorNodeSchema.ui.handle_layout?.input_position).toBe("bottom");
    });

    it("should show input in footer", () => {
      expect(monitorNodeSchema.ui.handle_layout?.input_in_footer).toBe(true);
    });
  });

  describe("collapsed display", () => {
    it("should have collapsed_display configuration", () => {
      expect(monitorNodeSchema.ui.collapsed_display).toBeDefined();
    });

    it('should show "MON" label when collapsed', () => {
      expect(monitorNodeSchema.ui.collapsed_display?.format).toBe("MON");
    });
  });

  describe("consistency checks", () => {
    it("should be consistent with probe nodes (circle layout)", () => {
      expect(monitorNodeSchema.ui.layout).toBe("circle");
      expect(monitorNodeSchema.ui.theme_key).toBe("probe");
    });

    it("should have expandable with resizable properties", () => {
      expect(monitorNodeSchema.ui.expandable).toBe(true);
      expect(monitorNodeSchema.ui.resizable).toBe(true);
      expect(monitorNodeSchema.ui.default_width).toBeGreaterThan(0);
      expect(monitorNodeSchema.ui.default_height).toBeGreaterThan(0);
    });

    it("should have output_node with always_execute for monitoring", () => {
      expect(monitorNodeSchema.output_node).toBe(true);
      expect(monitorNodeSchema.always_execute).toBe(true);
    });

    it("should have no outputs as a sink node", () => {
      expect(monitorNodeSchema.ui.outputs).toHaveLength(0);
      expect(monitorNodeSchema.output_node).toBe(true);
    });

    it("should accept any input type for monitoring flexibility", () => {
      const input = monitorNodeSchema.ui.inputs[0];
      expect(input.source_type).toBe("*");
      expect(input.data_type).toBe("any");
      expect(input.accepted_sources).toContain("*");
    });
  });

  describe("field ids match expected runtime behavior", () => {
    it("should have field for persisting monitored value", () => {
      const field = monitorNodeSchema.ui.fields.find(
        (f) => f.id === "monitoredValue",
      );
      expect(field).toBeDefined();
      expect(field?.widget).toBe("hidden");
    });

    it("should have field for persisting value type", () => {
      const field = monitorNodeSchema.ui.fields.find(
        (f) => f.id === "monitoredValueType",
      );
      expect(field).toBeDefined();
      expect(field?.widget).toBe("hidden");
    });

    it("should have field for persisting timestamp", () => {
      const field = monitorNodeSchema.ui.fields.find(
        (f) => f.id === "monitoredTimestamp",
      );
      expect(field).toBeDefined();
      expect(field?.widget).toBe("hidden");
    });

    it("should have field for display name", () => {
      const field = monitorNodeSchema.ui.fields.find((f) => f.id === "name");
      expect(field).toBeDefined();
      expect(field?.widget).toBe("text");
    });
  });

  describe("comparison with similar nodes", () => {
    it("should be similar to probe nodes in structure", () => {
      expect(monitorNodeSchema.ui.layout).toBe("circle");
      expect(monitorNodeSchema.ui.theme_key).toBe("probe");
      expect(monitorNodeSchema.menu_location).toContain("Probes/");
    });

    it("should be distinct from other probes with monitor-specific fields", () => {
      const monitorFields = monitorNodeSchema.ui.fields.map((f) => f.id);
      expect(monitorFields).toContain("monitoredValue");
      expect(monitorFields).toContain("monitoredValueType");
      expect(monitorFields).toContain("monitoredTimestamp");
    });
  });
});
