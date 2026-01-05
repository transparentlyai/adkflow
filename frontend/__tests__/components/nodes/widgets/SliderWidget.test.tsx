import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SliderWidget from "@/components/nodes/widgets/SliderWidget";

const mockTheme = {
  colors: {
    nodes: {
      common: {
        text: { secondary: "#666" },
      },
      agent: { header: "#007bff" },
    },
  },
} as any;

const defaultField = {
  id: "volume",
  label: "Volume",
  widget: "slider" as const,
  min_value: 0,
  max_value: 100,
  step: 1,
};

const defaultOptions = {
  disabled: false,
  theme: mockTheme,
};

describe("SliderWidget", () => {
  it("should render range input", () => {
    const { container } = render(
      <SliderWidget
        field={defaultField}
        value={50}
        onChange={vi.fn()}
        options={defaultOptions}
      />,
    );
    expect(container.querySelector('input[type="range"]')).toBeInTheDocument();
  });

  it("should display current value", () => {
    render(
      <SliderWidget
        field={defaultField}
        value={75}
        onChange={vi.fn()}
        options={defaultOptions}
      />,
    );
    expect(screen.getByText("75")).toBeInTheDocument();
  });

  it("should call onChange when slider changes", () => {
    const onChange = vi.fn();
    const { container } = render(
      <SliderWidget
        field={defaultField}
        value={50}
        onChange={onChange}
        options={defaultOptions}
      />,
    );
    const slider = container.querySelector('input[type="range"]')!;
    fireEvent.change(slider, { target: { value: "80" } });
    expect(onChange).toHaveBeenCalledWith(80);
  });

  it("should respect min value", () => {
    const { container } = render(
      <SliderWidget
        field={defaultField}
        value={50}
        onChange={vi.fn()}
        options={defaultOptions}
      />,
    );
    expect(container.querySelector('input[type="range"]')).toHaveAttribute(
      "min",
      "0",
    );
  });

  it("should respect max value", () => {
    const { container } = render(
      <SliderWidget
        field={defaultField}
        value={50}
        onChange={vi.fn()}
        options={defaultOptions}
      />,
    );
    expect(container.querySelector('input[type="range"]')).toHaveAttribute(
      "max",
      "100",
    );
  });

  it("should respect step value", () => {
    const { container } = render(
      <SliderWidget
        field={defaultField}
        value={50}
        onChange={vi.fn()}
        options={defaultOptions}
      />,
    );
    expect(container.querySelector('input[type="range"]')).toHaveAttribute(
      "step",
      "1",
    );
  });

  it("should be disabled when disabled option is true", () => {
    const { container } = render(
      <SliderWidget
        field={defaultField}
        value={50}
        onChange={vi.fn()}
        options={{ ...defaultOptions, disabled: true }}
      />,
    );
    expect(container.querySelector('input[type="range"]')).toBeDisabled();
  });

  it("should use min as default when value is null", () => {
    render(
      <SliderWidget
        field={defaultField}
        value={null}
        onChange={vi.fn()}
        options={defaultOptions}
      />,
    );
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("should use default min of 0", () => {
    const fieldWithoutMin = { ...defaultField, min_value: undefined };
    render(
      <SliderWidget
        field={fieldWithoutMin}
        value={null}
        onChange={vi.fn()}
        options={defaultOptions}
      />,
    );
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("should use default max of 100", () => {
    const fieldWithoutMax = { ...defaultField, max_value: undefined };
    const { container } = render(
      <SliderWidget
        field={fieldWithoutMax}
        value={50}
        onChange={vi.fn()}
        options={defaultOptions}
      />,
    );
    expect(container.querySelector('input[type="range"]')).toHaveAttribute(
      "max",
      "100",
    );
  });

  it("should use default step of 1", () => {
    const fieldWithoutStep = { ...defaultField, step: undefined };
    const { container } = render(
      <SliderWidget
        field={fieldWithoutStep}
        value={50}
        onChange={vi.fn()}
        options={defaultOptions}
      />,
    );
    expect(container.querySelector('input[type="range"]')).toHaveAttribute(
      "step",
      "1",
    );
  });
});
