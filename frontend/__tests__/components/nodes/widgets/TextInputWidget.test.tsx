import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TextInputWidget from "@/components/nodes/widgets/TextInputWidget";

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
  id: "name",
  label: "Name",
  widget: "text" as const,
  placeholder: "Enter name",
};

const defaultOptions = {
  disabled: false,
  theme: mockTheme,
  compact: false,
};

describe("TextInputWidget", () => {
  it("should render text input", () => {
    const { container } = render(
      <TextInputWidget
        field={defaultField}
        value=""
        onChange={vi.fn()}
        options={defaultOptions}
      />,
    );
    expect(container.querySelector('input[type="text"]')).toBeInTheDocument();
  });

  it("should display value", () => {
    const { container } = render(
      <TextInputWidget
        field={defaultField}
        value="test value"
        onChange={vi.fn()}
        options={defaultOptions}
      />,
    );
    expect(container.querySelector('input[type="text"]')).toHaveValue(
      "test value",
    );
  });

  it("should call onChange when value changes", () => {
    const onChange = vi.fn();
    const { container } = render(
      <TextInputWidget
        field={defaultField}
        value=""
        onChange={onChange}
        options={defaultOptions}
      />,
    );
    const input = container.querySelector('input[type="text"]')!;
    fireEvent.change(input, { target: { value: "new value" } });
    expect(onChange).toHaveBeenCalledWith("new value");
  });

  it("should show placeholder", () => {
    render(
      <TextInputWidget
        field={defaultField}
        value=""
        onChange={vi.fn()}
        options={defaultOptions}
      />,
    );
    expect(screen.getByPlaceholderText("Enter name")).toBeInTheDocument();
  });

  it("should be disabled when disabled option is true", () => {
    const { container } = render(
      <TextInputWidget
        field={defaultField}
        value=""
        onChange={vi.fn()}
        options={{ ...defaultOptions, disabled: true }}
      />,
    );
    expect(container.querySelector('input[type="text"]')).toBeDisabled();
  });

  it("should handle null value", () => {
    const { container } = render(
      <TextInputWidget
        field={defaultField}
        value={null}
        onChange={vi.fn()}
        options={defaultOptions}
      />,
    );
    expect(container.querySelector('input[type="text"]')).toHaveValue("");
  });

  it("should apply compact styles", () => {
    const { container } = render(
      <TextInputWidget
        field={defaultField}
        value=""
        onChange={vi.fn()}
        options={{ ...defaultOptions, compact: true }}
      />,
    );
    const input = container.querySelector('input[type="text"]')!;
    expect(input).toHaveClass("text-[11px]");
  });
});
