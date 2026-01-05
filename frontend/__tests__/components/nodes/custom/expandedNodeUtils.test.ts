import { describe, it, expect } from "vitest";
import {
  groupBySection,
  hasCodeEditorWidget,
  getCodeEditorField,
  extractTabsInOrder,
} from "@/components/nodes/custom/expandedNodeUtils";
import type {
  CustomNodeSchema,
  FieldDefinition,
} from "@/components/nodes/CustomNode";

// Helper to create a mock schema
const createMockSchema = (
  overrides: Partial<CustomNodeSchema["ui"]> = {},
): CustomNodeSchema => ({
  unit_id: "test.node",
  label: "Test Node",
  menu_location: "Test",
  description: "A test node",
  version: "1.0.0",
  ui: {
    inputs: [],
    outputs: [],
    fields: [],
    color: "#4f46e5",
    expandable: true,
    default_width: 300,
    default_height: 200,
    ...overrides,
  },
});

describe("expandedNodeUtils", () => {
  describe("groupBySection", () => {
    it("should group items by section", () => {
      const items = [
        { id: "1", section: "A" },
        { id: "2", section: "A" },
        { id: "3", section: "B" },
        { id: "4", section: "B" },
        { id: "5", section: "C" },
      ];

      const result = groupBySection(items);

      expect(result.size).toBe(3);
      expect(result.get("A")).toHaveLength(2);
      expect(result.get("B")).toHaveLength(2);
      expect(result.get("C")).toHaveLength(1);
    });

    it("should group items without section under null key", () => {
      const items = [{ id: "1" }, { id: "2" }, { id: "3", section: "A" }];

      const result = groupBySection(items);

      expect(result.size).toBe(2);
      expect(result.get(null)).toHaveLength(2);
      expect(result.get("A")).toHaveLength(1);
    });

    it("should handle empty array", () => {
      const items: { id: string; section?: string }[] = [];
      const result = groupBySection(items);
      expect(result.size).toBe(0);
    });

    it("should handle all items with same section", () => {
      const items = [
        { id: "1", section: "Same" },
        { id: "2", section: "Same" },
        { id: "3", section: "Same" },
      ];

      const result = groupBySection(items);

      expect(result.size).toBe(1);
      expect(result.get("Same")).toHaveLength(3);
    });

    it("should handle all items without section", () => {
      const items = [{ id: "1" }, { id: "2" }, { id: "3" }];

      const result = groupBySection(items);

      expect(result.size).toBe(1);
      expect(result.get(null)).toHaveLength(3);
    });

    it("should preserve item order within groups", () => {
      const items = [
        { id: "first", section: "A" },
        { id: "second", section: "A" },
        { id: "third", section: "A" },
      ];

      const result = groupBySection(items);
      const group = result.get("A")!;

      expect(group[0].id).toBe("first");
      expect(group[1].id).toBe("second");
      expect(group[2].id).toBe("third");
    });

    it("should treat undefined section as null", () => {
      const items = [{ id: "1", section: undefined }, { id: "2" }];

      const result = groupBySection(items);

      expect(result.size).toBe(1);
      expect(result.get(null)).toHaveLength(2);
    });
  });

  describe("hasCodeEditorWidget", () => {
    it("should return true when schema has code_editor widget", () => {
      const schema = createMockSchema({
        fields: [
          { id: "code", label: "Code", widget: "code_editor" },
          { id: "name", label: "Name", widget: "text_input" },
        ],
      });

      expect(hasCodeEditorWidget(schema)).toBe(true);
    });

    it("should return false when schema has no code_editor widget", () => {
      const schema = createMockSchema({
        fields: [
          { id: "name", label: "Name", widget: "text_input" },
          { id: "model", label: "Model", widget: "select" },
        ],
      });

      expect(hasCodeEditorWidget(schema)).toBe(false);
    });

    it("should return false when schema has no fields", () => {
      const schema = createMockSchema({ fields: [] });
      expect(hasCodeEditorWidget(schema)).toBe(false);
    });

    it("should return true when first field is code_editor", () => {
      const schema = createMockSchema({
        fields: [{ id: "code", label: "Code", widget: "code_editor" }],
      });

      expect(hasCodeEditorWidget(schema)).toBe(true);
    });

    it("should return true when last field is code_editor", () => {
      const schema = createMockSchema({
        fields: [
          { id: "name", label: "Name", widget: "text_input" },
          { id: "code", label: "Code", widget: "code_editor" },
        ],
      });

      expect(hasCodeEditorWidget(schema)).toBe(true);
    });
  });

  describe("getCodeEditorField", () => {
    it("should return code_editor field when present", () => {
      const codeField: FieldDefinition = {
        id: "code",
        label: "Code",
        widget: "code_editor",
        language: "python",
      };
      const schema = createMockSchema({
        fields: [
          { id: "name", label: "Name", widget: "text_input" },
          codeField,
        ],
      });

      const result = getCodeEditorField(schema);

      expect(result).not.toBeNull();
      expect(result?.id).toBe("code");
      expect(result?.widget).toBe("code_editor");
    });

    it("should return null when no code_editor field", () => {
      const schema = createMockSchema({
        fields: [{ id: "name", label: "Name", widget: "text_input" }],
      });

      expect(getCodeEditorField(schema)).toBeNull();
    });

    it("should return null when no fields", () => {
      const schema = createMockSchema({ fields: [] });
      expect(getCodeEditorField(schema)).toBeNull();
    });

    it("should return first code_editor if multiple exist", () => {
      const schema = createMockSchema({
        fields: [
          { id: "code1", label: "Code 1", widget: "code_editor" },
          { id: "code2", label: "Code 2", widget: "code_editor" },
        ],
      });

      const result = getCodeEditorField(schema);

      expect(result?.id).toBe("code1");
    });

    it("should return full field definition", () => {
      const schema = createMockSchema({
        fields: [
          {
            id: "code",
            label: "Python Code",
            widget: "code_editor",
            language: "python",
            default: "# code here",
          },
        ],
      });

      const result = getCodeEditorField(schema);

      expect(result).toEqual({
        id: "code",
        label: "Python Code",
        widget: "code_editor",
        language: "python",
        default: "# code here",
      });
    });
  });

  describe("extractTabsInOrder", () => {
    it("should extract tabs from inputs, fields, and outputs in order", () => {
      const schema = createMockSchema({
        inputs: [
          { id: "in1", label: "Input 1", source_type: "agent", tab: "Config" },
          {
            id: "in2",
            label: "Input 2",
            source_type: "agent",
            tab: "Advanced",
          },
        ],
        fields: [
          { id: "f1", label: "Field 1", widget: "text_input", tab: "Config" },
          { id: "f2", label: "Field 2", widget: "text_input", tab: "Code" },
        ],
        outputs: [
          {
            id: "out1",
            label: "Output 1",
            source_type: "agent",
            tab: "Output",
          },
        ],
      });

      const result = extractTabsInOrder(schema);

      expect(result).toEqual(["Config", "Advanced", "Code", "Output"]);
    });

    it("should not duplicate tabs", () => {
      const schema = createMockSchema({
        inputs: [
          { id: "in1", label: "Input 1", source_type: "agent", tab: "Tab1" },
        ],
        fields: [
          { id: "f1", label: "Field 1", widget: "text_input", tab: "Tab1" },
        ],
        outputs: [
          { id: "out1", label: "Output 1", source_type: "agent", tab: "Tab1" },
        ],
      });

      const result = extractTabsInOrder(schema);

      expect(result).toEqual(["Tab1"]);
    });

    it("should return empty array when no tabs", () => {
      const schema = createMockSchema({
        inputs: [{ id: "in1", label: "Input 1", source_type: "agent" }],
        fields: [{ id: "f1", label: "Field 1", widget: "text_input" }],
        outputs: [{ id: "out1", label: "Output 1", source_type: "agent" }],
      });

      const result = extractTabsInOrder(schema);

      expect(result).toEqual([]);
    });

    it("should handle empty schema", () => {
      const schema = createMockSchema({
        inputs: [],
        fields: [],
        outputs: [],
      });

      const result = extractTabsInOrder(schema);

      expect(result).toEqual([]);
    });

    it("should process inputs before fields before outputs", () => {
      const schema = createMockSchema({
        outputs: [
          { id: "out1", label: "Output 1", source_type: "agent", tab: "Tab C" },
        ],
        fields: [
          { id: "f1", label: "Field 1", widget: "text_input", tab: "Tab B" },
        ],
        inputs: [
          { id: "in1", label: "Input 1", source_type: "agent", tab: "Tab A" },
        ],
      });

      const result = extractTabsInOrder(schema);

      // Inputs are processed first, then fields, then outputs
      expect(result).toEqual(["Tab A", "Tab B", "Tab C"]);
    });

    it("should preserve discovery order within each category", () => {
      const schema = createMockSchema({
        inputs: [
          { id: "in1", label: "Input 1", source_type: "agent", tab: "First" },
          { id: "in2", label: "Input 2", source_type: "agent", tab: "Second" },
          { id: "in3", label: "Input 3", source_type: "agent", tab: "Third" },
        ],
        fields: [],
        outputs: [],
      });

      const result = extractTabsInOrder(schema);

      expect(result).toEqual(["First", "Second", "Third"]);
    });

    it("should skip items without tab property", () => {
      const schema = createMockSchema({
        inputs: [
          { id: "in1", label: "Input 1", source_type: "agent", tab: "Tab1" },
          { id: "in2", label: "Input 2", source_type: "agent" }, // no tab
        ],
        fields: [
          { id: "f1", label: "Field 1", widget: "text_input" }, // no tab
          { id: "f2", label: "Field 2", widget: "text_input", tab: "Tab2" },
        ],
        outputs: [],
      });

      const result = extractTabsInOrder(schema);

      expect(result).toEqual(["Tab1", "Tab2"]);
    });
  });
});
