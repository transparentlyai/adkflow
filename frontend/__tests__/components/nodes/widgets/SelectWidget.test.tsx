import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SelectWidget from "@/components/nodes/widgets/SelectWidget";

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
  id: "status",
  label: "Status",
  widget: "select" as const,
  options: [
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
  ],
};

const defaultOptions = {
  disabled: false,
  theme: mockTheme,
  compact: false,
};

describe("SelectWidget", () => {
  it("should render select element", () => {
    const { container } = render(
      <SelectWidget
        field={defaultField}
        value=""
        onChange={vi.fn()}
        options={defaultOptions}
      />,
    );
    expect(container.querySelector("select")).toBeInTheDocument();
  });

  it("should show default placeholder option", () => {
    render(
      <SelectWidget
        field={defaultField}
        value=""
        onChange={vi.fn()}
        options={defaultOptions}
      />,
    );
    expect(screen.getByText("Select...")).toBeInTheDocument();
  });

  it("should render all options", () => {
    render(
      <SelectWidget
        field={defaultField}
        value=""
        onChange={vi.fn()}
        options={defaultOptions}
      />,
    );
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Inactive")).toBeInTheDocument();
  });

  it("should display selected value", () => {
    const { container } = render(
      <SelectWidget
        field={defaultField}
        value="active"
        onChange={vi.fn()}
        options={defaultOptions}
      />,
    );
    expect(container.querySelector("select")).toHaveValue("active");
  });

  it("should call onChange when selection changes", () => {
    const onChange = vi.fn();
    const { container } = render(
      <SelectWidget
        field={defaultField}
        value=""
        onChange={onChange}
        options={defaultOptions}
      />,
    );
    const select = container.querySelector("select")!;
    fireEvent.change(select, { target: { value: "inactive" } });
    expect(onChange).toHaveBeenCalledWith("inactive");
  });

  it("should be disabled when disabled option is true", () => {
    const { container } = render(
      <SelectWidget
        field={defaultField}
        value=""
        onChange={vi.fn()}
        options={{ ...defaultOptions, disabled: true }}
      />,
    );
    expect(container.querySelector("select")).toBeDisabled();
  });

  it("should handle null value", () => {
    const { container } = render(
      <SelectWidget
        field={defaultField}
        value={null}
        onChange={vi.fn()}
        options={defaultOptions}
      />,
    );
    expect(container.querySelector("select")).toHaveValue("");
  });

  it("should handle field without options", () => {
    const fieldWithoutOptions = { ...defaultField, options: undefined };
    render(
      <SelectWidget
        field={fieldWithoutOptions}
        value=""
        onChange={vi.fn()}
        options={defaultOptions}
      />,
    );
    expect(screen.getByText("Select...")).toBeInTheDocument();
  });

  it("should apply compact styles", () => {
    const { container } = render(
      <SelectWidget
        field={defaultField}
        value=""
        onChange={vi.fn()}
        options={{ ...defaultOptions, compact: true }}
      />,
    );
    const select = container.querySelector("select")!;
    expect(select).toHaveClass("text-[11px]");
  });
});
