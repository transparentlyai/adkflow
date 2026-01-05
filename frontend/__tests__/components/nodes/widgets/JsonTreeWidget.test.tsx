import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import JsonTreeWidget from "@/components/nodes/widgets/JsonTreeWidget";

const mockTheme = {
  name: "test",
  colors: {
    nodes: {
      common: {
        container: { background: "#1e1e1e", border: "#333" },
        text: { primary: "#fff", secondary: "#aaa", muted: "#666" },
      },
      agent: { header: "#4f46e5" },
    },
  },
};

const mockField = {
  id: "json-tree-field",
  label: "JSON Tree",
  widget: "json_tree",
};

const defaultOptions = {
  disabled: false,
  theme: mockTheme,
  compact: false,
};

describe("JsonTreeWidget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render a container with styling", () => {
      render(
        <JsonTreeWidget
          field={mockField}
          value={{}}
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      const container = screen.getByText((content, element) => {
        return (
          element?.tagName === "DIV" && element.className.includes("rounded")
        );
      });
      expect(container).toBeInTheDocument();
    });

    it("should render empty object", () => {
      const { container } = render(
        <JsonTreeWidget
          field={mockField}
          value={{}}
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      // Empty object should render an empty container
      expect(container.querySelector(".rounded")).toBeInTheDocument();
    });

    it("should render object with primitive values", () => {
      render(
        <JsonTreeWidget
          field={mockField}
          value={{
            name: "test",
            count: 42,
            active: true,
            empty: null,
          }}
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      expect(screen.getByText("name:")).toBeInTheDocument();
      expect(screen.getByText('"test"')).toBeInTheDocument();
      expect(screen.getByText("count:")).toBeInTheDocument();
      expect(screen.getByText("42")).toBeInTheDocument();
      expect(screen.getByText("active:")).toBeInTheDocument();
      expect(screen.getByText("true")).toBeInTheDocument();
      expect(screen.getByText("empty:")).toBeInTheDocument();
      expect(screen.getByText("null")).toBeInTheDocument();
    });

    it("should render nested objects", () => {
      render(
        <JsonTreeWidget
          field={mockField}
          value={{
            outer: {
              inner: "value",
            },
          }}
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      expect(screen.getByText("outer:")).toBeInTheDocument();
      expect(screen.getByText("inner:")).toBeInTheDocument();
      expect(screen.getByText('"value"')).toBeInTheDocument();
    });

    it("should render arrays", () => {
      render(
        <JsonTreeWidget
          field={mockField}
          value={{
            items: [1, 2, 3],
          }}
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      expect(screen.getByText("items:")).toBeInTheDocument();
      expect(screen.getByText("0:")).toBeInTheDocument();
      expect(screen.getByText("1")).toBeInTheDocument();
      expect(screen.getByText("1:")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
      expect(screen.getByText("2:")).toBeInTheDocument();
      expect(screen.getByText("3")).toBeInTheDocument();
    });

    it("should apply theme colors to values", () => {
      render(
        <JsonTreeWidget
          field={mockField}
          value={{
            str: "text",
            num: 123,
            bool: false,
            nil: null,
          }}
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      // String values should be green
      const stringValue = screen.getByText('"text"');
      expect(stringValue).toHaveStyle({ color: "#22c55e" });

      // Number values should be blue
      const numberValue = screen.getByText("123");
      expect(numberValue).toHaveStyle({ color: "#3b82f6" });

      // Boolean values should be amber
      const boolValue = screen.getByText("false");
      expect(boolValue).toHaveStyle({ color: "#f59e0b" });

      // Null values should be gray
      const nullValue = screen.getByText("null");
      expect(nullValue).toHaveStyle({ color: "#6b7280" });
    });
  });

  describe("expand/collapse behavior", () => {
    it("should auto-expand nodes at depth < 2", () => {
      render(
        <JsonTreeWidget
          field={mockField}
          value={{
            level1: {
              level2: {
                level3: {
                  level4: "very deep",
                },
              },
            },
          }}
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      // Level 1 (depth 0) and level 2 (depth 1) should be expanded by default
      expect(screen.getByText("level1:")).toBeInTheDocument();
      expect(screen.getByText("level2:")).toBeInTheDocument();
      // Level 3 (depth 2) should be collapsed and show preview
      expect(screen.getByText("Object{1}")).toBeInTheDocument();
    });

    it("should toggle expansion when clicking on object node", () => {
      render(
        <JsonTreeWidget
          field={mockField}
          value={{
            nested: {
              value: "test",
            },
          }}
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      // Initially expanded (depth 0)
      expect(screen.getByText("value:")).toBeInTheDocument();
      expect(screen.getByText('"test"')).toBeInTheDocument();

      // Click to collapse
      const nestedNode = screen.getByText("nested:");
      fireEvent.click(nestedNode.parentElement!);

      // Should now show preview instead of children
      expect(screen.getByText("Object{1}")).toBeInTheDocument();

      // Click again to expand
      fireEvent.click(screen.getByText("nested:").parentElement!);

      // Should show children again
      expect(screen.getByText("value:")).toBeInTheDocument();
    });

    it("should show array preview when collapsed", () => {
      render(
        <JsonTreeWidget
          field={mockField}
          value={{
            deep: {
              nested: {
                items: [1, 2, 3, 4, 5],
              },
            },
          }}
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      // The deeply nested array should be collapsed
      expect(screen.getByText("Array(5)")).toBeInTheDocument();
    });
  });

  describe("JSON string parsing", () => {
    it("should parse JSON string value", () => {
      render(
        <JsonTreeWidget
          field={mockField}
          value='{"key": "value", "number": 42}'
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      expect(screen.getByText("key:")).toBeInTheDocument();
      expect(screen.getByText('"value"')).toBeInTheDocument();
      expect(screen.getByText("number:")).toBeInTheDocument();
      expect(screen.getByText("42")).toBeInTheDocument();
    });

    it("should handle invalid JSON string as primitive", () => {
      render(
        <JsonTreeWidget
          field={mockField}
          value="not valid json"
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      expect(screen.getByText("not valid json")).toBeInTheDocument();
    });
  });

  describe("edge cases", () => {
    it("should handle null value", () => {
      const { container } = render(
        <JsonTreeWidget
          field={mockField}
          value={null}
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      // Should render empty container (null defaults to {})
      expect(container.querySelector(".rounded")).toBeInTheDocument();
    });

    it("should handle undefined value", () => {
      const { container } = render(
        <JsonTreeWidget
          field={mockField}
          value={undefined}
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      // Should render empty container (undefined defaults to {})
      expect(container.querySelector(".rounded")).toBeInTheDocument();
    });

    it("should handle primitive number value", () => {
      render(
        <JsonTreeWidget
          field={mockField}
          value={42}
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      expect(screen.getByText("42")).toBeInTheDocument();
    });

    it("should handle primitive boolean value", () => {
      render(
        <JsonTreeWidget
          field={mockField}
          value={true}
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      expect(screen.getByText("true")).toBeInTheDocument();
    });

    it("should handle primitive string value", () => {
      render(
        <JsonTreeWidget
          field={mockField}
          value="plain string"
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      expect(screen.getByText("plain string")).toBeInTheDocument();
    });

    it("should handle deeply nested structure", () => {
      const deepValue = {
        a: { b: { c: { d: { e: { f: "deep" } } } } },
      };

      const { container } = render(
        <JsonTreeWidget
          field={mockField}
          value={deepValue}
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      expect(container.querySelector(".rounded")).toBeInTheDocument();
      expect(screen.getByText("a:")).toBeInTheDocument();
    });

    it("should handle array at root level", () => {
      render(
        <JsonTreeWidget
          field={mockField}
          value={{ items: ["one", "two", "three"] }}
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      expect(screen.getByText('"one"')).toBeInTheDocument();
      expect(screen.getByText('"two"')).toBeInTheDocument();
      expect(screen.getByText('"three"')).toBeInTheDocument();
    });

    it("should handle mixed types in object", () => {
      render(
        <JsonTreeWidget
          field={mockField}
          value={{
            string: "text",
            number: 3.14,
            boolean: false,
            null: null,
            array: [1],
            object: { key: "val" },
          }}
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      expect(screen.getByText('"text"')).toBeInTheDocument();
      expect(screen.getByText("3.14")).toBeInTheDocument();
      expect(screen.getByText("false")).toBeInTheDocument();
    });

    it("should handle empty string value", () => {
      render(
        <JsonTreeWidget
          field={mockField}
          value={{ empty: "" }}
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      expect(screen.getByText('""')).toBeInTheDocument();
    });

    it("should handle special characters in strings", () => {
      render(
        <JsonTreeWidget
          field={mockField}
          value={{ special: "hello <world>" }}
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      expect(screen.getByText('"hello <world>"')).toBeInTheDocument();
    });

    it("should handle undefined value in object property", () => {
      const valueWithUndefined = { undef: undefined } as Record<
        string,
        unknown
      >;
      render(
        <JsonTreeWidget
          field={mockField}
          value={valueWithUndefined}
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      expect(screen.getByText("undef:")).toBeInTheDocument();
      expect(screen.getByText("undefined")).toBeInTheDocument();
    });
  });

  describe("styling", () => {
    it("should apply container background from theme", () => {
      const { container } = render(
        <JsonTreeWidget
          field={mockField}
          value={{ key: "value" }}
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      const wrapper = container.querySelector(".rounded");
      expect(wrapper).toHaveStyle({
        backgroundColor: "#1e1e1e",
        borderColor: "#333",
      });
    });

    it("should apply font-mono class for code appearance", () => {
      const { container } = render(
        <JsonTreeWidget
          field={mockField}
          value={{ key: "value" }}
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      const wrapper = container.querySelector(".font-mono");
      expect(wrapper).toBeInTheDocument();
    });

    it("should have max-height for scrolling", () => {
      const { container } = render(
        <JsonTreeWidget
          field={mockField}
          value={{ key: "value" }}
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      const wrapper = container.querySelector(".max-h-48");
      expect(wrapper).toBeInTheDocument();
    });
  });
});
