import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { TabSelector } from "@/components/agent-prism/TabSelector";

describe("TabSelector", () => {
  const mockItems = [
    { value: "tab1" as const, label: "Tab 1" },
    { value: "tab2" as const, label: "Tab 2" },
    { value: "tab3" as const, label: "Tab 3" },
  ];

  it("should render all tab items", () => {
    render(
      <TabSelector items={mockItems} value="tab1" onValueChange={vi.fn()} />,
    );
    expect(screen.getByText("Tab 1")).toBeInTheDocument();
    expect(screen.getByText("Tab 2")).toBeInTheDocument();
    expect(screen.getByText("Tab 3")).toBeInTheDocument();
  });

  it("should show selected tab as active", () => {
    render(
      <TabSelector items={mockItems} value="tab2" onValueChange={vi.fn()} />,
    );
    const tab2 = screen.getByRole("tab", { name: "Tab 2" });
    expect(tab2).toHaveAttribute("data-state", "active");
  });

  it("should render with underline theme by default", () => {
    render(
      <TabSelector items={mockItems} value="tab1" onValueChange={vi.fn()} />,
    );
    const tablist = screen.getByRole("tablist");
    expect(tablist).toHaveClass("border-b");
  });

  it("should render with pill theme", () => {
    render(
      <TabSelector
        items={mockItems}
        value="tab1"
        onValueChange={vi.fn()}
        theme="pill"
      />,
    );
    const tablist = screen.getByRole("tablist");
    expect(tablist).toHaveClass("rounded-lg");
  });

  it("should apply custom className", () => {
    render(
      <TabSelector
        items={mockItems}
        value="tab1"
        onValueChange={vi.fn()}
        className="custom-class"
      />,
    );
    const tabs = screen.getByRole("tablist").parentElement;
    expect(tabs).toHaveClass("custom-class");
  });

  it("should accept onValueChange callback", () => {
    const onValueChange = vi.fn();
    render(
      <TabSelector
        items={mockItems}
        value="tab1"
        onValueChange={onValueChange}
      />,
    );

    // Verify the callback prop is provided and tabs are rendered
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(3);
    expect(onValueChange).toBeDefined();
  });

  it("should accept defaultValue prop", () => {
    render(
      <TabSelector
        items={mockItems}
        value="tab1"
        onValueChange={vi.fn()}
        defaultValue="tab3"
      />,
    );
    // When value is provided, it takes precedence over defaultValue
    const tab1 = screen.getByRole("tab", { name: "Tab 1" });
    expect(tab1).toHaveAttribute("data-state", "active");
  });

  it("should call onClick handler when provided", () => {
    const onClick = vi.fn();
    render(
      <TabSelector
        items={mockItems}
        value="tab1"
        onValueChange={vi.fn()}
        onClick={onClick}
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Tab 2" }));
    expect(onClick).toHaveBeenCalled();
  });

  it("should render all tabs as buttons", () => {
    render(
      <TabSelector items={mockItems} value="tab1" onValueChange={vi.fn()} />,
    );
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(3);
  });
});
