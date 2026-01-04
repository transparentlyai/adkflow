import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  renderWidget,
  type FieldDefinition,
} from "@/components/nodes/widgets/WidgetRenderer";

const mockTheme = {
  colors: {
    nodes: {
      common: {
        container: { background: "#fff", border: "#ccc" },
        text: { primary: "#000", secondary: "#666" },
      },
      agent: { header: "#007bff" },
    },
  },
} as any;

const defaultOptions = {
  disabled: false,
  theme: mockTheme,
  compact: false,
};

describe("renderWidget", () => {
  describe("text widget", () => {
    it("should render text input", () => {
      const field: FieldDefinition = {
        id: "name",
        label: "Name",
        widget: "text",
        placeholder: "Enter name",
      };
      const { container } = render(
        <>{renderWidget(field, "", vi.fn(), defaultOptions)}</>,
      );
      expect(container.querySelector('input[type="text"]')).toBeInTheDocument();
    });

    it("should render text_input variant", () => {
      const field: FieldDefinition = {
        id: "name",
        label: "Name",
        widget: "text_input",
      };
      const { container } = render(
        <>{renderWidget(field, "", vi.fn(), defaultOptions)}</>,
      );
      expect(container.querySelector('input[type="text"]')).toBeInTheDocument();
    });

    it("should call onChange when value changes", () => {
      const onChange = vi.fn();
      const field: FieldDefinition = {
        id: "name",
        label: "Name",
        widget: "text",
      };
      const { container } = render(
        <>{renderWidget(field, "", onChange, defaultOptions)}</>,
      );
      const input = container.querySelector('input[type="text"]')!;
      fireEvent.change(input, { target: { value: "new value" } });
      expect(onChange).toHaveBeenCalledWith("new value");
    });
  });

  describe("textarea widget", () => {
    it("should render textarea", () => {
      const field: FieldDefinition = {
        id: "description",
        label: "Description",
        widget: "textarea",
      };
      const { container } = render(
        <>{renderWidget(field, "", vi.fn(), defaultOptions)}</>,
      );
      expect(container.querySelector("textarea")).toBeInTheDocument();
    });

    it("should render text_area variant", () => {
      const field: FieldDefinition = {
        id: "description",
        label: "Description",
        widget: "text_area",
      };
      const { container } = render(
        <>{renderWidget(field, "", vi.fn(), defaultOptions)}</>,
      );
      expect(container.querySelector("textarea")).toBeInTheDocument();
    });
  });

  describe("number widget", () => {
    it("should render number input", () => {
      const field: FieldDefinition = {
        id: "count",
        label: "Count",
        widget: "number",
        min_value: 0,
        max_value: 100,
      };
      const { container } = render(
        <>{renderWidget(field, 5, vi.fn(), defaultOptions)}</>,
      );
      expect(
        container.querySelector('input[type="number"]'),
      ).toBeInTheDocument();
    });

    it("should render number_input variant", () => {
      const field: FieldDefinition = {
        id: "count",
        label: "Count",
        widget: "number_input",
      };
      const { container } = render(
        <>{renderWidget(field, 0, vi.fn(), defaultOptions)}</>,
      );
      expect(
        container.querySelector('input[type="number"]'),
      ).toBeInTheDocument();
    });
  });

  describe("checkbox widget", () => {
    it("should render checkbox", () => {
      const field: FieldDefinition = {
        id: "enabled",
        label: "Enabled",
        widget: "checkbox",
      };
      const { container } = render(
        <>{renderWidget(field, true, vi.fn(), defaultOptions)}</>,
      );
      expect(
        container.querySelector('input[type="checkbox"]'),
      ).toBeInTheDocument();
    });

    it("should be checked when value is true", () => {
      const field: FieldDefinition = {
        id: "enabled",
        label: "Enabled",
        widget: "checkbox",
      };
      const { container } = render(
        <>{renderWidget(field, true, vi.fn(), defaultOptions)}</>,
      );
      expect(container.querySelector('input[type="checkbox"]')).toBeChecked();
    });
  });

  describe("color widget", () => {
    it("should render color input", () => {
      const field: FieldDefinition = {
        id: "color",
        label: "Color",
        widget: "color",
      };
      const { container } = render(
        <>{renderWidget(field, "#ff0000", vi.fn(), defaultOptions)}</>,
      );
      expect(
        container.querySelector('input[type="color"]'),
      ).toBeInTheDocument();
    });

    it("should display color value", () => {
      const field: FieldDefinition = {
        id: "color",
        label: "Color",
        widget: "color",
      };
      render(<>{renderWidget(field, "#ff0000", vi.fn(), defaultOptions)}</>);
      expect(screen.getByText("#ff0000")).toBeInTheDocument();
    });

    it("should default to black", () => {
      const field: FieldDefinition = {
        id: "color",
        label: "Color",
        widget: "color",
      };
      render(<>{renderWidget(field, null, vi.fn(), defaultOptions)}</>);
      expect(screen.getByText("#000000")).toBeInTheDocument();
    });
  });

  describe("unknown widget", () => {
    it("should fallback to text input", () => {
      const field: FieldDefinition = {
        id: "unknown",
        label: "Unknown",
        widget: "unknown_widget" as any,
      };
      const { container } = render(
        <>{renderWidget(field, "", vi.fn(), defaultOptions)}</>,
      );
      expect(container.querySelector('input[type="text"]')).toBeInTheDocument();
    });
  });

  describe("disabled state", () => {
    it("should disable input when disabled option is true", () => {
      const field: FieldDefinition = {
        id: "name",
        label: "Name",
        widget: "text",
      };
      const { container } = render(
        <>
          {renderWidget(field, "", vi.fn(), {
            ...defaultOptions,
            disabled: true,
          })}
        </>,
      );
      expect(container.querySelector('input[type="text"]')).toBeDisabled();
    });
  });

  describe("compact mode", () => {
    it("should render in compact mode", () => {
      const field: FieldDefinition = {
        id: "name",
        label: "Name",
        widget: "text",
      };
      const { container } = render(
        <>
          {renderWidget(field, "", vi.fn(), {
            ...defaultOptions,
            compact: true,
          })}
        </>,
      );
      expect(container.querySelector('input[type="text"]')).toBeInTheDocument();
    });
  });
});
