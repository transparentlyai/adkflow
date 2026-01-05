import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import CheckboxWidget from "@/components/nodes/widgets/CheckboxWidget";

const mockTheme = {
  colors: {
    nodes: {
      agent: { header: "#007bff" },
    },
  },
} as any;

const defaultField = {
  id: "enabled",
  label: "Enabled",
  widget: "checkbox" as const,
};

const defaultOptions = {
  disabled: false,
  theme: mockTheme,
};

describe("CheckboxWidget", () => {
  it("should render checkbox input", () => {
    const { container } = render(
      <CheckboxWidget
        field={defaultField}
        value={false}
        onChange={vi.fn()}
        options={defaultOptions}
      />,
    );
    expect(
      container.querySelector('input[type="checkbox"]'),
    ).toBeInTheDocument();
  });

  it("should be checked when value is true", () => {
    const { container } = render(
      <CheckboxWidget
        field={defaultField}
        value={true}
        onChange={vi.fn()}
        options={defaultOptions}
      />,
    );
    expect(container.querySelector('input[type="checkbox"]')).toBeChecked();
  });

  it("should not be checked when value is false", () => {
    const { container } = render(
      <CheckboxWidget
        field={defaultField}
        value={false}
        onChange={vi.fn()}
        options={defaultOptions}
      />,
    );
    expect(container.querySelector('input[type="checkbox"]')).not.toBeChecked();
  });

  it("should call onChange with true when unchecked checkbox clicked", () => {
    const onChange = vi.fn();
    const { container } = render(
      <CheckboxWidget
        field={defaultField}
        value={false}
        onChange={onChange}
        options={defaultOptions}
      />,
    );
    const checkbox = container.querySelector('input[type="checkbox"]')!;
    fireEvent.click(checkbox);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("should call onChange with false when checked checkbox clicked", () => {
    const onChange = vi.fn();
    const { container } = render(
      <CheckboxWidget
        field={defaultField}
        value={true}
        onChange={onChange}
        options={defaultOptions}
      />,
    );
    const checkbox = container.querySelector('input[type="checkbox"]')!;
    fireEvent.click(checkbox);
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it("should be disabled when disabled option is true", () => {
    const { container } = render(
      <CheckboxWidget
        field={defaultField}
        value={false}
        onChange={vi.fn()}
        options={{ ...defaultOptions, disabled: true }}
      />,
    );
    expect(container.querySelector('input[type="checkbox"]')).toBeDisabled();
  });

  it("should handle null value as false", () => {
    const { container } = render(
      <CheckboxWidget
        field={defaultField}
        value={null}
        onChange={vi.fn()}
        options={defaultOptions}
      />,
    );
    expect(container.querySelector('input[type="checkbox"]')).not.toBeChecked();
  });

  it("should handle undefined value as false", () => {
    const { container } = render(
      <CheckboxWidget
        field={defaultField}
        value={undefined}
        onChange={vi.fn()}
        options={defaultOptions}
      />,
    );
    expect(container.querySelector('input[type="checkbox"]')).not.toBeChecked();
  });
});
