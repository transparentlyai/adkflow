import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { TextInput } from "@/components/agent-prism/TextInput";

describe("TextInput", () => {
  it("should render input with id", () => {
    render(<TextInput id="test-input" />);
    expect(screen.getByRole("textbox")).toHaveAttribute("id", "test-input");
  });

  it("should render label when provided", () => {
    render(<TextInput id="test-input" label="Email" />);
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("should hide label visually when hideLabel is true", () => {
    render(<TextInput id="test-input" label="Email" hideLabel />);
    const label = screen.getByText("Email");
    expect(label).toHaveClass("sr-only");
  });

  it("should call onChange when value changes", () => {
    const onChange = vi.fn();
    render(<TextInput id="test-input" onChange={onChange} />);

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "test" },
    });

    expect(onChange).toHaveBeenCalled();
  });

  it("should call onValueChange with new value", () => {
    const onValueChange = vi.fn();
    render(<TextInput id="test-input" onValueChange={onValueChange} />);

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "test value" },
    });

    expect(onValueChange).toHaveBeenCalledWith("test value");
  });

  it("should render start icon when provided", () => {
    render(
      <TextInput
        id="test-input"
        startIcon={<span data-testid="start-icon">Icon</span>}
      />,
    );
    expect(screen.getByTestId("start-icon")).toBeInTheDocument();
  });

  it("should show clear button when onClear and value are provided", () => {
    const onClear = vi.fn();
    render(<TextInput id="test-input" onClear={onClear} value="test" />);
    expect(screen.getByLabelText("Clear input value")).toBeInTheDocument();
  });

  it("should not show clear button when no value", () => {
    const onClear = vi.fn();
    render(<TextInput id="test-input" onClear={onClear} value="" />);
    expect(
      screen.queryByLabelText("Clear input value"),
    ).not.toBeInTheDocument();
  });

  it("should call onClear when clear button is clicked", () => {
    const onClear = vi.fn();
    render(<TextInput id="test-input" onClear={onClear} value="test" />);

    fireEvent.click(screen.getByLabelText("Clear input value"));

    expect(onClear).toHaveBeenCalled();
  });

  it("should focus input via provided ref when clearing", () => {
    const onClear = vi.fn();
    const ref = React.createRef<HTMLInputElement>();
    render(
      <TextInput id="test-input" onClear={onClear} value="test" ref={ref} />,
    );

    fireEvent.click(screen.getByLabelText("Clear input value"));

    expect(onClear).toHaveBeenCalled();
    // Input should be focused after clear
    expect(document.activeElement).toBe(ref.current);
  });

  it("should apply custom className", () => {
    render(<TextInput id="test-input" className="custom-class" />);
    const wrapper = screen.getByRole("textbox").closest("div")?.parentElement;
    expect(wrapper).toHaveClass("custom-class");
  });

  it("should apply inputClassName to input element", () => {
    render(<TextInput id="test-input" inputClassName="input-custom" />);
    expect(screen.getByRole("textbox")).toHaveClass("input-custom");
  });

  it("should pass through placeholder prop", () => {
    render(<TextInput id="test-input" placeholder="Enter text..." />);
    expect(screen.getByPlaceholderText("Enter text...")).toBeInTheDocument();
  });

  it("should be disabled when disabled prop is true", () => {
    render(<TextInput id="test-input" disabled />);
    expect(screen.getByRole("textbox")).toBeDisabled();
  });
});
