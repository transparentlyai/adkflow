import { describe, it, expect } from "vitest";
import { deepFormatJson } from "@/components/LogExplorer/logExplorerUtils";

describe("logExplorerUtils deepFormatJson", () => {
  describe("primitive values", () => {
    it("should format null", () => {
      expect(deepFormatJson(null)).toBe("null");
    });

    it("should format undefined", () => {
      expect(deepFormatJson(undefined)).toBe("undefined");
    });

    it("should format numbers", () => {
      expect(deepFormatJson(42)).toBe("42");
      expect(deepFormatJson(3.14)).toBe("3.14");
      expect(deepFormatJson(-10)).toBe("-10");
      expect(deepFormatJson(0)).toBe("0");
    });

    it("should format booleans", () => {
      expect(deepFormatJson(true)).toBe("true");
      expect(deepFormatJson(false)).toBe("false");
    });

    it("should format simple strings", () => {
      expect(deepFormatJson("test")).toBe('"test"');
    });

    it("should format strings with special characters", () => {
      expect(deepFormatJson("hello\nworld")).toBe('"hello\\nworld"');
      expect(deepFormatJson('quote"test')).toBe('"quote\\"test"');
    });
  });

  describe("arrays", () => {
    it("should format empty array", () => {
      expect(deepFormatJson([])).toBe("[]");
    });

    it("should format array with numbers", () => {
      const result = deepFormatJson([1, 2, 3]);
      expect(result).toContain("1");
      expect(result).toContain("2");
      expect(result).toContain("3");
    });

    it("should format array with mixed types", () => {
      const result = deepFormatJson([1, "two", true, null]);
      expect(result).toContain("1");
      expect(result).toContain('"two"');
      expect(result).toContain("true");
      expect(result).toContain("null");
    });

    it("should format nested arrays", () => {
      const result = deepFormatJson([
        [1, 2],
        [3, 4],
      ]);
      expect(result).toContain("[");
      expect(result).toContain("1");
      expect(result).toContain("4");
    });
  });

  describe("objects", () => {
    it("should format empty object", () => {
      expect(deepFormatJson({})).toBe("{}");
    });

    it("should format simple object", () => {
      const result = deepFormatJson({ key: "value" });
      expect(result).toContain('"key"');
      expect(result).toContain('"value"');
    });

    it("should format object with multiple keys", () => {
      const result = deepFormatJson({ a: 1, b: 2, c: 3 });
      expect(result).toContain('"a"');
      expect(result).toContain('"b"');
      expect(result).toContain('"c"');
      expect(result).toContain("1");
      expect(result).toContain("2");
      expect(result).toContain("3");
    });

    it("should format nested objects", () => {
      const result = deepFormatJson({ outer: { inner: "value" } });
      expect(result).toContain('"outer"');
      expect(result).toContain('"inner"');
      expect(result).toContain('"value"');
    });

    it("should format object with array value", () => {
      const result = deepFormatJson({ items: [1, 2, 3] });
      expect(result).toContain('"items"');
      expect(result).toContain("[");
      expect(result).toContain("1");
    });
  });

  describe("nested JSON strings", () => {
    it("should parse and format JSON object string", () => {
      const result = deepFormatJson('{"key": "value"}');
      expect(result).toContain('"key"');
      expect(result).toContain('"value"');
    });

    it("should parse and format JSON array string", () => {
      const result = deepFormatJson("[1, 2, 3]");
      expect(result).toContain("1");
      expect(result).toContain("2");
      expect(result).toContain("3");
    });

    it("should handle deeply nested JSON strings", () => {
      const nested = JSON.stringify({ outer: { inner: { deep: "value" } } });
      const result = deepFormatJson(nested);
      expect(result).toContain('"outer"');
      expect(result).toContain('"inner"');
      expect(result).toContain('"deep"');
      expect(result).toContain('"value"');
    });

    it("should handle invalid JSON string gracefully", () => {
      const result = deepFormatJson("{invalid json}");
      expect(result).toBe('"{invalid json}"');
    });

    it("should handle JSON with whitespace", () => {
      const result = deepFormatJson('  { "key": "value" }  ');
      expect(result).toContain('"key"');
      expect(result).toContain('"value"');
    });
  });

  describe("Python repr strings", () => {
    it("should format Python repr strings with escape sequences", () => {
      const pythonRepr = "Part(text='hello\\nworld')";
      const result = deepFormatJson(pythonRepr);
      expect(result).toContain("hello");
      expect(result).toContain("world");
    });

    it("should format Python function call pattern", () => {
      const result = deepFormatJson("Config(name='test')");
      expect(result).toContain("Config");
      expect(result).toContain("name");
    });

    it("should format Python list pattern", () => {
      const result = deepFormatJson("[Item(id=1), Item(id=2)]");
      expect(result).toContain("Item");
    });

    it("should handle Python escape sequences", () => {
      const result = deepFormatJson("text='line1\\nline2\\ttab'");
      expect(result).toContain("line1");
      expect(result).toContain("line2");
      expect(result).toContain("tab");
    });

    it("should format Part(...) pattern from example", () => {
      const result = deepFormatJson("Part(text='content')");
      expect(result).toContain("Part");
      expect(result).toContain("content");
    });
  });

  describe("indentation", () => {
    it("should apply correct indentation to nested objects", () => {
      const result = deepFormatJson({ a: { b: { c: 1 } } });
      const lines = result.split("\n");
      expect(lines.length).toBeGreaterThan(1);
    });

    it("should apply correct indentation to arrays", () => {
      const result = deepFormatJson([1, 2, 3]);
      const lines = result.split("\n");
      expect(lines.length).toBeGreaterThan(1);
    });

    it("should use custom indent level", () => {
      const result = deepFormatJson({ key: "value" }, 2);
      expect(result).toContain("    ");
    });
  });

  describe("edge cases", () => {
    it("should handle empty string", () => {
      expect(deepFormatJson("")).toBe('""');
    });

    it("should handle string that looks like JSON but isnt", () => {
      const result = deepFormatJson("[not json]");
      expect(result).toBe('"[not json]"');
    });

    it("should handle circular-like structures (deeply nested)", () => {
      const deep: Record<string, unknown> = { level: 1 };
      let current = deep;
      for (let i = 2; i <= 10; i++) {
        current.nested = { level: i };
        current = current.nested as Record<string, unknown>;
      }
      const result = deepFormatJson(deep);
      expect(result).toContain('"level"');
      expect(result).toContain("10");
    });

    it("should handle object with numeric keys", () => {
      const result = deepFormatJson({ "0": "a", "1": "b" });
      expect(result).toContain('"0"');
      expect(result).toContain('"1"');
    });

    it("should handle object with special key names", () => {
      const result = deepFormatJson({ "key-with-dash": "value" });
      expect(result).toContain('"key-with-dash"');
    });

    it("should handle very long strings", () => {
      const longString = "a".repeat(1000);
      const result = deepFormatJson(longString);
      expect(result).toContain("a");
    });
  });
});
