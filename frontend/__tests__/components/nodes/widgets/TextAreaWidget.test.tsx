import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TextAreaWidget from "@/components/nodes/widgets/TextAreaWidget";

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
  id: "description",
  label: "Description",
  widget: "textarea" as const,
  placeholder: "Enter description",
};

const defaultOptions = {
  disabled: false,
  theme: mockTheme,
  compact: false,
};

describe("TextAreaWidget", () => {
  it("should render textarea", () => {
    const { container } = render(
      <TextAreaWidget
        field={defaultField}
        value=""
        onChange={vi.fn()}
        options={defaultOptions}
      />,
    );
    expect(container.querySelector("textarea")).toBeInTheDocument();
  });

  it("should display value", () => {
    const { container } = render(
      <TextAreaWidget
        field={defaultField}
        value="test content"
        onChange={vi.fn()}
        options={defaultOptions}
      />,
    );
    expect(container.querySelector("textarea")).toHaveValue("test content");
  });

  it("should call onChange when value changes", () => {
    const onChange = vi.fn();
    const { container } = render(
      <TextAreaWidget
        field={defaultField}
        value=""
        onChange={onChange}
        options={defaultOptions}
      />,
    );
    const textarea = container.querySelector("textarea")!;
    fireEvent.change(textarea, { target: { value: "new content" } });
    expect(onChange).toHaveBeenCalledWith("new content");
  });

  it("should show placeholder", () => {
    render(
      <TextAreaWidget
        field={defaultField}
        value=""
        onChange={vi.fn()}
        options={defaultOptions}
      />,
    );
    expect(
      screen.getByPlaceholderText("Enter description"),
    ).toBeInTheDocument();
  });

  it("should be disabled when disabled option is true", () => {
    const { container } = render(
      <TextAreaWidget
        field={defaultField}
        value=""
        onChange={vi.fn()}
        options={{ ...defaultOptions, disabled: true }}
      />,
    );
    expect(container.querySelector("textarea")).toBeDisabled();
  });

  it("should handle null value", () => {
    const { container } = render(
      <TextAreaWidget
        field={defaultField}
        value={null}
        onChange={vi.fn()}
        options={defaultOptions}
      />,
    );
    expect(container.querySelector("textarea")).toHaveValue("");
  });

  it("should have 3 rows by default", () => {
    const { container } = render(
      <TextAreaWidget
        field={defaultField}
        value=""
        onChange={vi.fn()}
        options={defaultOptions}
      />,
    );
    expect(container.querySelector("textarea")).toHaveAttribute("rows", "3");
  });

  it("should have 2 rows in compact mode", () => {
    const { container } = render(
      <TextAreaWidget
        field={defaultField}
        value=""
        onChange={vi.fn()}
        options={{ ...defaultOptions, compact: true }}
      />,
    );
    expect(container.querySelector("textarea")).toHaveAttribute("rows", "2");
  });

  it("should apply compact styles", () => {
    const { container } = render(
      <TextAreaWidget
        field={defaultField}
        value=""
        onChange={vi.fn()}
        options={{ ...defaultOptions, compact: true }}
      />,
    );
    const textarea = container.querySelector("textarea")!;
    expect(textarea).toHaveClass("text-[11px]");
  });
});
