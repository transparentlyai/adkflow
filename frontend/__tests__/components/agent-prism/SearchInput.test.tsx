import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { SearchInput } from "@/components/agent-prism/SearchInput";

describe("SearchInput", () => {
  it("should render with search icon", () => {
    render(<SearchInput id="search" />);
    // Should have the Filter placeholder from SearchInput
    expect(screen.getByPlaceholderText("Filter...")).toBeInTheDocument();
  });

  it("should pass through id prop", () => {
    render(<SearchInput id="search-input" />);
    expect(screen.getByRole("textbox")).toHaveAttribute("id", "search-input");
  });

  it("should allow overriding placeholder", () => {
    render(<SearchInput id="search" placeholder="Search..." />);
    expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument();
  });

  it("should handle value change", () => {
    const onValueChange = vi.fn();
    render(<SearchInput id="search" onValueChange={onValueChange} />);

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "query" },
    });

    expect(onValueChange).toHaveBeenCalledWith("query");
  });

  it("should show clear button when value and onClear provided", () => {
    const onClear = vi.fn();
    render(<SearchInput id="search" value="test" onClear={onClear} />);
    expect(screen.getByLabelText("Clear input value")).toBeInTheDocument();
  });

  it("should call onClear when clear button clicked", () => {
    const onClear = vi.fn();
    render(<SearchInput id="search" value="test" onClear={onClear} />);

    fireEvent.click(screen.getByLabelText("Clear input value"));

    expect(onClear).toHaveBeenCalled();
  });

  it("should not show clear button when value is empty", () => {
    const onClear = vi.fn();
    render(<SearchInput id="search" value="" onClear={onClear} />);
    expect(
      screen.queryByLabelText("Clear input value"),
    ).not.toBeInTheDocument();
  });

  it("should pass through className to wrapper", () => {
    render(<SearchInput id="search" className="custom-wrapper" />);
    const wrapper = screen.getByRole("textbox").closest("div")?.parentElement;
    expect(wrapper).toHaveClass("custom-wrapper");
  });

  it("should be disabled when disabled prop is true", () => {
    render(<SearchInput id="search" disabled />);
    expect(screen.getByRole("textbox")).toBeDisabled();
  });

  it("should accept controlled value", () => {
    render(<SearchInput id="search" value="controlled value" />);
    expect(screen.getByRole("textbox")).toHaveValue("controlled value");
  });

  it("should call both onChange and onValueChange", () => {
    const onChange = vi.fn();
    const onValueChange = vi.fn();
    render(
      <SearchInput
        id="search"
        onChange={onChange}
        onValueChange={onValueChange}
      />,
    );

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "test" },
    });

    expect(onChange).toHaveBeenCalled();
    expect(onValueChange).toHaveBeenCalledWith("test");
  });
});
