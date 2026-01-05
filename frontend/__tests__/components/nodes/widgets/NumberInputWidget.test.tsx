import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import NumberInputWidget from "@/components/nodes/widgets/NumberInputWidget";

const mockTheme = {
  colors: {
    nodes: {
      common: {
        container: { background: "#fff", border: "#ccc" },
        text: { primary: "#000" },
      },
    },
  },
} as any;

const defaultField = {
  id: "count",
  label: "Count",
  widget: "number" as const,
  min_value: 0,
  max_value: 100,
  step: 1,
};

const defaultOptions = {
  disabled: false,
  theme: mockTheme,
  compact: false,
};

describe("NumberInputWidget", () => {
  it("should render number input", () => {
    const { container } = render(
      <NumberInputWidget
        field={defaultField}
        value={5}
        onChange={vi.fn()}
        options={defaultOptions}
      />,
    );
    expect(container.querySelector('input[type="number"]')).toBeInTheDocument();
  });

  it("should display value", () => {
    const { container } = render(
      <NumberInputWidget
        field={defaultField}
        value={42}
        onChange={vi.fn()}
        options={defaultOptions}
      />,
    );
    expect(container.querySelector('input[type="number"]')).toHaveValue(42);
  });

  it("should call onChange when value changes", () => {
    const onChange = vi.fn();
    const { container } = render(
      <NumberInputWidget
        field={defaultField}
        value={0}
        onChange={onChange}
        options={defaultOptions}
      />,
    );
    const input = container.querySelector('input[type="number"]')!;
    fireEvent.change(input, { target: { value: "25" } });
    expect(onChange).toHaveBeenCalledWith(25);
  });

  it("should respect min value attribute", () => {
    const { container } = render(
      <NumberInputWidget
        field={defaultField}
        value={0}
        onChange={vi.fn()}
        options={defaultOptions}
      />,
    );
    expect(container.querySelector('input[type="number"]')).toHaveAttribute(
      "min",
      "0",
    );
  });

  it("should respect max value attribute", () => {
    const { container } = render(
      <NumberInputWidget
        field={defaultField}
        value={0}
        onChange={vi.fn()}
        options={defaultOptions}
      />,
    );
    expect(container.querySelector('input[type="number"]')).toHaveAttribute(
      "max",
      "100",
    );
  });

  it("should respect step attribute", () => {
    const { container } = render(
      <NumberInputWidget
        field={defaultField}
        value={0}
        onChange={vi.fn()}
        options={defaultOptions}
      />,
    );
    expect(container.querySelector('input[type="number"]')).toHaveAttribute(
      "step",
      "1",
    );
  });

  it("should be disabled when disabled option is true", () => {
    const { container } = render(
      <NumberInputWidget
        field={defaultField}
        value={0}
        onChange={vi.fn()}
        options={{ ...defaultOptions, disabled: true }}
      />,
    );
    expect(container.querySelector('input[type="number"]')).toBeDisabled();
  });

  it("should use default value from field when value is null", () => {
    const fieldWithDefault = { ...defaultField, default: 10 };
    const { container } = render(
      <NumberInputWidget
        field={fieldWithDefault}
        value={null}
        onChange={vi.fn()}
        options={defaultOptions}
      />,
    );
    expect(container.querySelector('input[type="number"]')).toHaveValue(10);
  });

  it("should fallback to 0 when no value or default", () => {
    const { container } = render(
      <NumberInputWidget
        field={{ ...defaultField, default: undefined }}
        value={null}
        onChange={vi.fn()}
        options={defaultOptions}
      />,
    );
    expect(container.querySelector('input[type="number"]')).toHaveValue(0);
  });

  it("should apply compact styles", () => {
    const { container } = render(
      <NumberInputWidget
        field={defaultField}
        value={0}
        onChange={vi.fn()}
        options={{ ...defaultOptions, compact: true }}
      />,
    );
    const input = container.querySelector('input[type="number"]')!;
    expect(input).toHaveClass("text-[11px]");
  });

  it("should handle NaN as 0", () => {
    const onChange = vi.fn();
    const { container } = render(
      <NumberInputWidget
        field={defaultField}
        value={0}
        onChange={onChange}
        options={defaultOptions}
      />,
    );
    const input = container.querySelector('input[type="number"]')!;
    fireEvent.change(input, { target: { value: "abc" } });
    expect(onChange).toHaveBeenCalledWith(0);
  });
});
