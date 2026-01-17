import { describe, it, expect } from "vitest";
import { callbackNodeSchema } from "@/lib/builtinNodeSchemas/callbackNodeSchema";

describe("callbackNodeSchema", () => {
  describe("core properties", () => {
    it("should have correct unit_id", () => {
      expect(callbackNodeSchema.unit_id).toBe("builtin.callback");
    });

    it("should have label", () => {
      expect(callbackNodeSchema.label).toBe("Callback");
    });

    it("should have menu_location in Callbacks category", () => {
      expect(callbackNodeSchema.menu_location).toBe("Callbacks/Callback");
    });

    it("should have description", () => {
      expect(callbackNodeSchema.description).toBeDefined();
      expect(typeof callbackNodeSchema.description).toBe("string");
      expect(callbackNodeSchema.description.length).toBeGreaterThan(0);
    });

    it("should have version", () => {
      expect(callbackNodeSchema.version).toBe("1.0.0");
    });

    it("should not be an output node", () => {
      expect(callbackNodeSchema.output_node).toBe(false);
    });

    it("should not always execute", () => {
      expect(callbackNodeSchema.always_execute).toBe(false);
    });
  });

  describe("ui configuration", () => {
    it("should have ui object defined", () => {
      expect(callbackNodeSchema.ui).toBeDefined();
    });

    it("should have purple color for callback nodes", () => {
      expect(callbackNodeSchema.ui.color).toBe("#a855f7");
    });

    it("should have callback icon", () => {
      expect(callbackNodeSchema.ui.icon).toBe("callback");
    });

    it("should be expandable", () => {
      expect(callbackNodeSchema.ui.expandable).toBe(true);
    });

    it("should be resizable", () => {
      expect(callbackNodeSchema.ui.resizable).toBe(true);
    });

    it("should have pill layout", () => {
      expect(callbackNodeSchema.ui.layout).toBe("pill");
    });

    it("should have callback theme_key", () => {
      expect(callbackNodeSchema.ui.theme_key).toBe("callback");
    });

    it("should have default dimensions", () => {
      expect(callbackNodeSchema.ui.default_width).toBe(500);
      expect(callbackNodeSchema.ui.default_height).toBe(320);
    });

    it("should have minimum dimensions", () => {
      expect(callbackNodeSchema.ui.min_width).toBe(300);
      expect(callbackNodeSchema.ui.min_height).toBe(200);
      expect(callbackNodeSchema.ui.min_collapsed_width).toBe(120);
    });
  });

  describe("inputs", () => {
    it("should have exactly one input", () => {
      expect(callbackNodeSchema.ui.inputs).toHaveLength(1);
    });

    it("should have callback input with correct properties", () => {
      const input = callbackNodeSchema.ui.inputs[0];

      expect(input.id).toBe("input");
      expect(input.label).toBe("Callback");
      expect(input.source_type).toBe("callback");
      expect(input.data_type).toBe("callable");
    });

    it("should accept callback source type and callable data type", () => {
      const input = callbackNodeSchema.ui.inputs[0];

      expect(input.accepted_sources).toEqual(["callback"]);
      expect(input.accepted_types).toEqual(["callable"]);
    });

    it("should be connection_only input", () => {
      const input = callbackNodeSchema.ui.inputs[0];

      expect(input.connection_only).toBe(true);
    });

    it("should not be required or multiple", () => {
      const input = callbackNodeSchema.ui.inputs[0];

      expect(input.required).toBe(false);
      expect(input.multiple).toBe(false);
    });

    it("should be in Code tab", () => {
      const input = callbackNodeSchema.ui.inputs[0];

      expect(input.tab).toBe("Code");
    });
  });

  describe("outputs", () => {
    it("should have no outputs", () => {
      expect(callbackNodeSchema.ui.outputs).toEqual([]);
    });
  });

  describe("tabs", () => {
    it("should have Code tab", () => {
      expect(callbackNodeSchema.ui.tabs).toEqual(["Code"]);
    });
  });

  describe("fields", () => {
    it("should have exactly two fields", () => {
      expect(callbackNodeSchema.ui.fields).toHaveLength(2);
    });

    describe("file_path field", () => {
      it("should be the first field", () => {
        const field = callbackNodeSchema.ui.fields[0];
        expect(field.id).toBe("file_path");
      });

      it("should have file_picker widget", () => {
        const field = callbackNodeSchema.ui.fields[0];
        expect(field.widget).toBe("file_picker");
      });

      it("should have label and help text", () => {
        const field = callbackNodeSchema.ui.fields[0];
        expect(field.label).toBe("File Path");
        expect(field.help_text).toBeDefined();
        expect(field.help_text).toContain(".py");
      });

      it("should have empty default value", () => {
        const field = callbackNodeSchema.ui.fields[0];
        expect(field.default).toBe("");
      });

      it("should have placeholder text", () => {
        const field = callbackNodeSchema.ui.fields[0];
        expect(field.placeholder).toBe("Select a Python file...");
      });

      it("should be in Code tab", () => {
        const field = callbackNodeSchema.ui.fields[0];
        expect(field.tab).toBe("Code");
      });
    });

    describe("code field", () => {
      it("should be the second field", () => {
        const field = callbackNodeSchema.ui.fields[1];
        expect(field.id).toBe("code");
      });

      it("should have code_editor widget", () => {
        const field = callbackNodeSchema.ui.fields[1];
        expect(field.widget).toBe("code_editor");
      });

      it("should use Python language", () => {
        const field = callbackNodeSchema.ui.fields[1];
        expect(field.language).toBe("python");
      });

      it("should have label and help text", () => {
        const field = callbackNodeSchema.ui.fields[1];
        expect(field.label).toBe("Code");
        expect(field.help_text).toBeDefined();
        expect(field.help_text).toContain("callback");
      });

      it("should have default callback code template", () => {
        const field = callbackNodeSchema.ui.fields[1];
        expect(field.default).toBeDefined();
        expect(typeof field.default).toBe("string");
        expect(field.default).toContain("async def callback");
        expect(field.default).toContain("return None");
      });

      it("should include documentation in default code", () => {
        const field = callbackNodeSchema.ui.fields[1];
        const defaultCode = field.default as string;

        expect(defaultCode).toContain("before_agent");
        expect(defaultCode).toContain("after_agent");
        expect(defaultCode).toContain("before_model");
        expect(defaultCode).toContain("after_model");
        expect(defaultCode).toContain("before_tool");
        expect(defaultCode).toContain("after_tool");
      });

      it("should be in Code tab", () => {
        const field = callbackNodeSchema.ui.fields[1];
        expect(field.tab).toBe("Code");
      });
    });

    it("should have both fields in Code tab", () => {
      const allFieldsInCodeTab = callbackNodeSchema.ui.fields.every(
        (field) => field.tab === "Code",
      );
      expect(allFieldsInCodeTab).toBe(true);
    });
  });

  describe("handle_layout", () => {
    it("should have handle_layout defined", () => {
      expect(callbackNodeSchema.ui.handle_layout).toBeDefined();
    });

    it("should have input_position on left", () => {
      expect(callbackNodeSchema.ui.handle_layout?.input_position).toBe("left");
    });
  });

  describe("collapsed_display", () => {
    it("should have collapsed_display defined", () => {
      expect(callbackNodeSchema.ui.collapsed_display).toBeDefined();
    });

    it("should display node name in collapsed state", () => {
      expect(callbackNodeSchema.ui.collapsed_display?.format).toBe("{name}");
    });
  });

  describe("schema consistency", () => {
    it("should have matching tab references", () => {
      const definedTabs = callbackNodeSchema.ui.tabs || [];
      const inputTabs = callbackNodeSchema.ui.inputs
        .map((i) => i.tab)
        .filter(Boolean);
      const fieldTabs = callbackNodeSchema.ui.fields
        .map((f) => f.tab)
        .filter(Boolean);
      const outputTabs = callbackNodeSchema.ui.outputs
        .map((o) => o.tab)
        .filter(Boolean);

      const usedTabs = new Set([...inputTabs, ...fieldTabs, ...outputTabs]);

      for (const tab of usedTabs) {
        expect(definedTabs).toContain(tab);
      }
    });

    it("should have all tabs used by at least one element", () => {
      const definedTabs = callbackNodeSchema.ui.tabs || [];
      const inputTabs = new Set(
        callbackNodeSchema.ui.inputs.map((i) => i.tab).filter(Boolean),
      );
      const fieldTabs = new Set(
        callbackNodeSchema.ui.fields.map((f) => f.tab).filter(Boolean),
      );
      const outputTabs = new Set(
        callbackNodeSchema.ui.outputs.map((o) => o.tab).filter(Boolean),
      );

      const usedTabs = new Set([...inputTabs, ...fieldTabs, ...outputTabs]);

      for (const tab of definedTabs) {
        expect(usedTabs.has(tab)).toBe(true);
      }
    });

    it("should have widget types matching expected patterns", () => {
      const validWidgets = [
        "text_input",
        "textarea",
        "select",
        "checkbox",
        "number",
        "file_picker",
        "code_editor",
        "slider",
        "color_picker",
        "multiselect",
        "json",
        "text_area",
      ];

      for (const field of callbackNodeSchema.ui.fields) {
        expect(validWidgets).toContain(field.widget);
      }
    });

    it("should have valid source and data types for inputs", () => {
      const validSourceTypes = [
        "agent",
        "tool",
        "prompt",
        "context",
        "callback",
        "process",
        "probe",
        "content",
        "variable",
      ];
      const validDataTypes = [
        "str",
        "int",
        "float",
        "bool",
        "list",
        "dict",
        "agent",
        "tool",
        "callable",
        "any",
      ];

      for (const input of callbackNodeSchema.ui.inputs) {
        expect(validSourceTypes).toContain(input.source_type);
        expect(validDataTypes).toContain(input.data_type);
      }
    });
  });

  describe("comparison with similar nodes", () => {
    it("should match ToolNode style pill layout", () => {
      expect(callbackNodeSchema.ui.layout).toBe("pill");
    });

    it("should have code editor like ToolNode", () => {
      const hasCodeEditor = callbackNodeSchema.ui.fields.some(
        (field) => field.widget === "code_editor",
      );
      expect(hasCodeEditor).toBe(true);
    });

    it("should have file picker like ToolNode", () => {
      const hasFilePicker = callbackNodeSchema.ui.fields.some(
        (field) => field.widget === "file_picker",
      );
      expect(hasFilePicker).toBe(true);
    });

    it("should have input handle visible in both states", () => {
      const input = callbackNodeSchema.ui.inputs[0];
      // connection_only true means handle is always visible
      expect(input.connection_only).toBe(true);
    });
  });
});
