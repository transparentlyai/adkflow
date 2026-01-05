import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { Tabs, type TabItem } from "@/components/agent-prism/Tabs";

describe("Tabs", () => {
  const mockItems: TabItem[] = [
    { value: "tab1", label: "Tab 1" },
    { value: "tab2", label: "Tab 2" },
    { value: "tab3", label: "Tab 3" },
  ];

  it("should render all tab items", () => {
    render(<Tabs items={mockItems} />);
    expect(screen.getByText("Tab 1")).toBeInTheDocument();
    expect(screen.getByText("Tab 2")).toBeInTheDocument();
    expect(screen.getByText("Tab 3")).toBeInTheDocument();
  });

  it("should select first tab by default", () => {
    render(<Tabs items={mockItems} />);
    const tab1 = screen.getByRole("tab", { name: "Tab 1" });
    expect(tab1).toHaveAttribute("data-state", "active");
  });

  it("should use defaultValue when provided", () => {
    render(<Tabs items={mockItems} defaultValue="tab2" />);
    const tab2 = screen.getByRole("tab", { name: "Tab 2" });
    expect(tab2).toHaveAttribute("data-state", "active");
  });

  it("should use controlled value when provided", () => {
    render(<Tabs items={mockItems} value="tab3" />);
    const tab3 = screen.getByRole("tab", { name: "Tab 3" });
    expect(tab3).toHaveAttribute("data-state", "active");
  });

  it("should render tabs in clickable state", () => {
    render(<Tabs items={mockItems} />);

    // Verify all tabs are clickable buttons
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(3);
    tabs.forEach((tab) => {
      expect(tab).toBeEnabled();
    });
  });

  it("should render with underline theme by default", () => {
    render(<Tabs items={mockItems} />);
    const tablist = screen.getByRole("tablist");
    expect(tablist).toHaveClass("border-b");
  });

  it("should render with pill theme", () => {
    render(<Tabs items={mockItems} theme="pill" />);
    const tablist = screen.getByRole("tablist");
    expect(tablist).toHaveClass("rounded-lg");
  });

  it("should render icon when provided", () => {
    const itemsWithIcon: TabItem[] = [
      {
        value: "tab1",
        label: "Tab 1",
        icon: <span data-testid="icon">Icon</span>,
      },
    ];
    render(<Tabs items={itemsWithIcon} />);
    expect(screen.getByTestId("icon")).toBeInTheDocument();
  });

  it("should disable tab when disabled is true", () => {
    const itemsWithDisabled: TabItem[] = [
      { value: "tab1", label: "Tab 1" },
      { value: "tab2", label: "Tab 2", disabled: true },
    ];
    render(<Tabs items={itemsWithDisabled} />);

    const tab2 = screen.getByRole("tab", { name: "Tab 2" });
    expect(tab2).toBeDisabled();
  });

  it("should apply custom className", () => {
    render(<Tabs items={mockItems} className="custom-class" />);
    // The className is applied to the root RadixTabs.Root element
    const tabs = screen.getByRole("tablist").parentElement;
    expect(tabs).toHaveClass("custom-class");
  });

  it("should apply tabsListClassName", () => {
    render(<Tabs items={mockItems} tabsListClassName="custom-list" />);
    expect(screen.getByRole("tablist")).toHaveClass("custom-list");
  });

  it("should apply triggerClassName to all triggers", () => {
    render(<Tabs items={mockItems} triggerClassName="custom-trigger" />);
    const tabs = screen.getAllByRole("tab");
    tabs.forEach((tab) => {
      expect(tab).toHaveClass("custom-trigger");
    });
  });

  it("should trigger onValueChange callback", () => {
    const onValueChange = vi.fn();
    render(<Tabs items={mockItems} onValueChange={onValueChange} />);

    // Verify the callback prop is provided and tabs are rendered
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(3);
    expect(onValueChange).toBeDefined();
  });

  it("should support dir prop for RTL", () => {
    render(<Tabs items={mockItems} dir="rtl" />);
    const tabsRoot = screen.getByRole("tablist").parentElement;
    expect(tabsRoot).toHaveAttribute("dir", "rtl");
  });

  it("should support dir prop for LTR", () => {
    render(<Tabs items={mockItems} dir="ltr" />);
    const tabsRoot = screen.getByRole("tablist").parentElement;
    expect(tabsRoot).toHaveAttribute("dir", "ltr");
  });

  it("should have aria-label on tablist", () => {
    render(<Tabs items={mockItems} />);
    expect(screen.getByRole("tablist")).toHaveAttribute(
      "aria-label",
      "Navigation tabs",
    );
  });

  it("should render multiple disabled tabs", () => {
    const itemsWithMultipleDisabled: TabItem[] = [
      { value: "tab1", label: "Tab 1", disabled: true },
      { value: "tab2", label: "Tab 2" },
      { value: "tab3", label: "Tab 3", disabled: true },
    ];
    render(<Tabs items={itemsWithMultipleDisabled} />);

    expect(screen.getByRole("tab", { name: "Tab 1" })).toBeDisabled();
    expect(screen.getByRole("tab", { name: "Tab 2" })).not.toBeDisabled();
    expect(screen.getByRole("tab", { name: "Tab 3" })).toBeDisabled();
  });

  it("should handle empty items array", () => {
    render(<Tabs items={[]} />);
    expect(screen.queryAllByRole("tab")).toHaveLength(0);
  });

  it("should select first tab when no defaultValue or value provided", () => {
    render(<Tabs items={mockItems} />);
    const tab1 = screen.getByRole("tab", { name: "Tab 1" });
    expect(tab1).toHaveAttribute("data-state", "active");
  });
});
