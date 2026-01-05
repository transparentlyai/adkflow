import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

describe("Tabs components", () => {
  describe("Tabs (Root)", () => {
    it("should render tab structure", () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>,
      );
      expect(screen.getByRole("tablist")).toBeInTheDocument();
      expect(screen.getAllByRole("tab")).toHaveLength(2);
    });

    it("should show correct default content", () => {
      render(
        <Tabs defaultValue="tab2">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>,
      );
      expect(screen.getByText("Content 2")).toBeInTheDocument();
    });

    it("should work as controlled component", () => {
      const { rerender } = render(
        <Tabs value="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>,
      );
      expect(screen.getByText("Content 1")).toBeInTheDocument();

      // Rerender with new value
      rerender(
        <Tabs value="tab2">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>,
      );
      expect(screen.getByText("Content 2")).toBeInTheDocument();
    });

    it("should support orientation prop", () => {
      render(
        <Tabs defaultValue="tab1" orientation="vertical">
          <TabsList data-testid="list">
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content</TabsContent>
        </Tabs>,
      );
      expect(screen.getByTestId("list")).toBeInTheDocument();
    });
  });

  describe("TabsList", () => {
    it("should render with default styles", () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList data-testid="list">
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
        </Tabs>,
      );
      const list = screen.getByTestId("list");
      expect(list).toHaveClass("inline-flex");
      expect(list).toHaveClass("rounded-lg");
      expect(list).toHaveClass("bg-muted");
    });

    it("should apply custom className", () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList className="custom-list">
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
        </Tabs>,
      );
      expect(screen.getByRole("tablist")).toHaveClass("custom-list");
    });

    it("should merge custom className with default classes", () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList className="custom-class" data-testid="list">
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
        </Tabs>,
      );
      const list = screen.getByTestId("list");
      expect(list).toHaveClass("custom-class");
      expect(list).toHaveClass("inline-flex");
    });

    it("should forward ref", () => {
      const ref = React.createRef<HTMLDivElement>();
      render(
        <Tabs defaultValue="tab1">
          <TabsList ref={ref}>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
        </Tabs>,
      );
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    it("should pass through additional props", () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList data-testid="list" aria-label="Navigation tabs">
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
        </Tabs>,
      );
      expect(screen.getByTestId("list")).toHaveAttribute(
        "aria-label",
        "Navigation tabs",
      );
    });

    it("should render multiple tabs", () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
            <TabsTrigger value="tab3">Tab 3</TabsTrigger>
            <TabsTrigger value="tab4">Tab 4</TabsTrigger>
          </TabsList>
        </Tabs>,
      );
      expect(screen.getAllByRole("tab")).toHaveLength(4);
    });
  });

  describe("TabsTrigger", () => {
    it("should show active state for selected tab", () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
        </Tabs>,
      );
      const tab1 = screen.getByRole("tab", { name: "Tab 1" });
      const tab2 = screen.getByRole("tab", { name: "Tab 2" });
      expect(tab1).toHaveAttribute("data-state", "active");
      expect(tab2).toHaveAttribute("data-state", "inactive");
    });

    it("should apply custom className", () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1" className="custom-trigger">
              Tab 1
            </TabsTrigger>
          </TabsList>
        </Tabs>,
      );
      expect(screen.getByRole("tab")).toHaveClass("custom-trigger");
    });

    it("should merge custom className with default classes", () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1" className="custom-class">
              Tab 1
            </TabsTrigger>
          </TabsList>
        </Tabs>,
      );
      const trigger = screen.getByRole("tab");
      expect(trigger).toHaveClass("custom-class");
      expect(trigger).toHaveClass("inline-flex");
    });

    it("should be disabled when disabled prop is true", () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1" disabled>
              Tab 1
            </TabsTrigger>
          </TabsList>
        </Tabs>,
      );
      expect(screen.getByRole("tab")).toBeDisabled();
    });

    it("should have disabled styling when disabled", () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1" disabled>
              Tab 1
            </TabsTrigger>
          </TabsList>
        </Tabs>,
      );
      expect(screen.getByRole("tab")).toHaveClass(
        "disabled:pointer-events-none",
      );
      expect(screen.getByRole("tab")).toHaveClass("disabled:opacity-50");
    });

    it("should forward ref", () => {
      const ref = React.createRef<HTMLButtonElement>();
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger ref={ref} value="tab1">
              Tab 1
            </TabsTrigger>
          </TabsList>
        </Tabs>,
      );
      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });

    it("should have correct initial active state", () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>,
      );

      expect(screen.getByText("Content 1")).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: "Tab 1" })).toHaveAttribute(
        "data-state",
        "active",
      );
      expect(screen.getByRole("tab", { name: "Tab 2" })).toHaveAttribute(
        "data-state",
        "inactive",
      );
    });

    it("should not switch to disabled tab", () => {
      const onChange = vi.fn();
      render(
        <Tabs defaultValue="tab1" onValueChange={onChange}>
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2" disabled>
              Tab 2
            </TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>,
      );

      fireEvent.click(screen.getByRole("tab", { name: "Tab 2" }));
      expect(onChange).not.toHaveBeenCalled();
    });

    it("should render with children elements", () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">
              <span data-testid="icon">Icon</span>
              <span>Tab Text</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>,
      );
      expect(screen.getByTestId("icon")).toBeInTheDocument();
      expect(screen.getByText("Tab Text")).toBeInTheDocument();
    });
  });

  describe("TabsContent", () => {
    it("should show content for active tab", () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>,
      );
      expect(screen.getByText("Content 1")).toBeInTheDocument();
    });

    it("should hide content for inactive tab", () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>,
      );
      // Tab 2 content panel should have hidden attribute
      const allPanels = screen.getAllByRole("tabpanel", { hidden: true });
      const inactivePanel = allPanels.find(
        (panel) => panel.getAttribute("data-state") === "inactive",
      );
      expect(inactivePanel).toHaveAttribute("hidden");
    });

    it("should apply custom className", () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1" className="custom-content">
            Content
          </TabsContent>
        </Tabs>,
      );
      expect(screen.getByRole("tabpanel")).toHaveClass("custom-content");
    });

    it("should merge custom className with default classes", () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1" className="custom-class">
            Content
          </TabsContent>
        </Tabs>,
      );
      const content = screen.getByRole("tabpanel");
      expect(content).toHaveClass("custom-class");
      expect(content).toHaveClass("mt-2");
    });

    it("should forward ref", () => {
      const ref = React.createRef<HTMLDivElement>();
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent ref={ref} value="tab1">
            Content
          </TabsContent>
        </Tabs>,
      );
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    it("should pass through additional props", () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent
            value="tab1"
            data-testid="content"
            aria-label="Tab content"
          >
            Content
          </TabsContent>
        </Tabs>,
      );
      const content = screen.getByTestId("content");
      expect(content).toHaveAttribute("aria-label", "Tab content");
    });

    it("should render complex content", () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">
            <div data-testid="nested">
              <h2>Heading</h2>
              <p>Paragraph</p>
              <button>Button</button>
            </div>
          </TabsContent>
        </Tabs>,
      );
      expect(screen.getByTestId("nested")).toBeInTheDocument();
      expect(screen.getByRole("heading")).toHaveTextContent("Heading");
      expect(screen.getByText("Paragraph")).toBeInTheDocument();
      expect(screen.getByRole("button")).toHaveTextContent("Button");
    });
  });

  describe("Tab switching", () => {
    it("should render all tabs as enabled", () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>,
      );

      const tabs = screen.getAllByRole("tab");
      expect(tabs).toHaveLength(2);
      tabs.forEach((tab) => {
        expect(tab).toBeEnabled();
      });
    });

    it("should have tabs that respond to value changes", () => {
      const { rerender } = render(
        <Tabs value="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
            <TabsTrigger value="tab3">Tab 3</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
          <TabsContent value="tab3">Content 3</TabsContent>
        </Tabs>,
      );

      // Initially tab1 is active
      expect(screen.getByRole("tab", { name: "Tab 1" })).toHaveAttribute(
        "data-state",
        "active",
      );

      // Change to tab2 via rerender
      rerender(
        <Tabs value="tab2">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
            <TabsTrigger value="tab3">Tab 3</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
          <TabsContent value="tab3">Content 3</TabsContent>
        </Tabs>,
      );
      expect(screen.getByRole("tab", { name: "Tab 2" })).toHaveAttribute(
        "data-state",
        "active",
      );

      // Change to tab3 via rerender
      rerender(
        <Tabs value="tab3">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
            <TabsTrigger value="tab3">Tab 3</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
          <TabsContent value="tab3">Content 3</TabsContent>
        </Tabs>,
      );
      expect(screen.getByRole("tab", { name: "Tab 3" })).toHaveAttribute(
        "data-state",
        "active",
      );
    });

    it("should have initial aria-selected state", () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>,
      );

      expect(screen.getByRole("tab", { name: "Tab 1" })).toHaveAttribute(
        "aria-selected",
        "true",
      );
      expect(screen.getByRole("tab", { name: "Tab 2" })).toHaveAttribute(
        "aria-selected",
        "false",
      );
    });
  });

  describe("keyboard navigation", () => {
    it("should have clickable tabs", () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>,
      );

      const tab1 = screen.getByRole("tab", { name: "Tab 1" });
      const tab2 = screen.getByRole("tab", { name: "Tab 2" });

      // Both tabs should be clickable buttons
      expect(tab1.tagName).toBe("BUTTON");
      expect(tab2.tagName).toBe("BUTTON");
    });
  });

  describe("accessibility", () => {
    it("should have proper ARIA attributes", () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>,
      );

      // Check tablist role
      expect(screen.getByRole("tablist")).toBeInTheDocument();

      // Check tab roles
      const tabs = screen.getAllByRole("tab");
      expect(tabs).toHaveLength(2);

      // Check tabpanel role
      expect(screen.getByRole("tabpanel")).toBeInTheDocument();

      // Active tab should have aria-selected true
      expect(screen.getByRole("tab", { name: "Tab 1" })).toHaveAttribute(
        "aria-selected",
        "true",
      );
      expect(screen.getByRole("tab", { name: "Tab 2" })).toHaveAttribute(
        "aria-selected",
        "false",
      );
    });

    it("should have proper aria-controls and aria-labelledby", () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
        </Tabs>,
      );

      const tab = screen.getByRole("tab");
      const panel = screen.getByRole("tabpanel");

      // Tab should control the panel
      const controlsId = tab.getAttribute("aria-controls");
      expect(panel).toHaveAttribute("id", controlsId);

      // Panel should be labeled by the tab
      const labelledById = panel.getAttribute("aria-labelledby");
      expect(tab).toHaveAttribute("id", labelledById);
    });
  });

  describe("displayName", () => {
    it("TabsList should have correct displayName", () => {
      expect(TabsList.displayName).toBe("TabsList");
    });

    it("TabsTrigger should have correct displayName", () => {
      expect(TabsTrigger.displayName).toBe("TabsTrigger");
    });

    it("TabsContent should have correct displayName", () => {
      expect(TabsContent.displayName).toBe("TabsContent");
    });
  });

  describe("edge cases", () => {
    it("should handle single tab", () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Only Tab</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Only Content</TabsContent>
        </Tabs>,
      );
      expect(screen.getByText("Only Tab")).toBeInTheDocument();
      expect(screen.getByText("Only Content")).toBeInTheDocument();
    });

    it("should handle many tabs", () => {
      const tabs = Array.from({ length: 10 }, (_, i) => `tab${i + 1}`);
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            {tabs.map((value) => (
              <TabsTrigger key={value} value={value}>
                {value}
              </TabsTrigger>
            ))}
          </TabsList>
          {tabs.map((value) => (
            <TabsContent key={value} value={value}>
              Content for {value}
            </TabsContent>
          ))}
        </Tabs>,
      );
      expect(screen.getAllByRole("tab")).toHaveLength(10);
    });

    it("should handle empty content", () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1" data-testid="empty-content" />
        </Tabs>,
      );
      expect(screen.getByTestId("empty-content")).toBeInTheDocument();
    });

    it("should handle many tabs", () => {
      const tabIds = Array.from({ length: 5 }, (_, i) => `tab${i + 1}`);
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            {tabIds.map((id) => (
              <TabsTrigger key={id} value={id}>
                {id}
              </TabsTrigger>
            ))}
          </TabsList>
          {tabIds.map((id) => (
            <TabsContent key={id} value={id}>
              Content {id}
            </TabsContent>
          ))}
        </Tabs>,
      );

      // Verify all tabs are rendered
      expect(screen.getAllByRole("tab")).toHaveLength(5);
      // First tab should be active
      expect(screen.getByRole("tab", { name: "tab1" })).toHaveAttribute(
        "data-state",
        "active",
      );
    });
  });
});
