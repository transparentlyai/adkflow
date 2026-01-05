import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

// Import after mocking is not needed since we don't need to mock for this component
import ExpandedNodeTabBar from "@/components/nodes/custom/ExpandedNodeTabBar";
import type { Theme } from "@/lib/themes/types";

// Create a mock theme
const createMockTheme = (): Theme =>
  ({
    name: "test",
    version: "1.0.0",
    colors: {
      nodes: {
        common: {
          container: { background: "#fff", border: "#ccc" },
          header: { background: "#f0f0f0", border: "#ddd" },
          text: { primary: "#000", secondary: "#666", muted: "#999" },
          footer: { background: "#f8f8f8", border: "#eee", text: "#666" },
        },
      },
    },
  }) as Theme;

describe("ExpandedNodeTabBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render all tabs", () => {
      const tabs = ["Config", "Advanced", "Code"];
      render(
        <ExpandedNodeTabBar
          tabs={tabs}
          activeTab="Config"
          headerColor="#4f46e5"
          theme={createMockTheme()}
          onTabChange={vi.fn()}
        />,
      );

      expect(screen.getByText("Config")).toBeInTheDocument();
      expect(screen.getByText("Advanced")).toBeInTheDocument();
      expect(screen.getByText("Code")).toBeInTheDocument();
    });

    it("should render single tab", () => {
      render(
        <ExpandedNodeTabBar
          tabs={["Single"]}
          activeTab="Single"
          headerColor="#4f46e5"
          theme={createMockTheme()}
          onTabChange={vi.fn()}
        />,
      );

      expect(screen.getByText("Single")).toBeInTheDocument();
    });

    it("should render tabs as buttons", () => {
      const tabs = ["Tab1", "Tab2"];
      render(
        <ExpandedNodeTabBar
          tabs={tabs}
          activeTab="Tab1"
          headerColor="#4f46e5"
          theme={createMockTheme()}
          onTabChange={vi.fn()}
        />,
      );

      const buttons = screen.getAllByRole("button");
      expect(buttons).toHaveLength(2);
    });
  });

  describe("active tab styling", () => {
    it("should apply border to active tab", () => {
      render(
        <ExpandedNodeTabBar
          tabs={["Tab1", "Tab2"]}
          activeTab="Tab1"
          headerColor="#4f46e5"
          theme={createMockTheme()}
          onTabChange={vi.fn()}
        />,
      );

      const activeTab = screen.getByText("Tab1");
      expect(activeTab).toHaveClass("border-b-2");
    });

    it("should not apply border to inactive tab", () => {
      render(
        <ExpandedNodeTabBar
          tabs={["Tab1", "Tab2"]}
          activeTab="Tab1"
          headerColor="#4f46e5"
          theme={createMockTheme()}
          onTabChange={vi.fn()}
        />,
      );

      const inactiveTab = screen.getByText("Tab2");
      expect(inactiveTab).not.toHaveClass("border-b-2");
    });

    it("should use header color for active tab border", () => {
      render(
        <ExpandedNodeTabBar
          tabs={["Tab1", "Tab2"]}
          activeTab="Tab1"
          headerColor="#ff0000"
          theme={createMockTheme()}
          onTabChange={vi.fn()}
        />,
      );

      const activeTab = screen.getByText("Tab1");
      expect(activeTab).toHaveStyle({ borderColor: "#ff0000" });
    });

    it("should use transparent border for inactive tab", () => {
      render(
        <ExpandedNodeTabBar
          tabs={["Tab1", "Tab2"]}
          activeTab="Tab1"
          headerColor="#4f46e5"
          theme={createMockTheme()}
          onTabChange={vi.fn()}
        />,
      );

      const inactiveTab = screen.getByText("Tab2");
      expect(inactiveTab).toHaveStyle({ borderColor: "transparent" });
    });
  });

  describe("tab change interaction", () => {
    it("should call onTabChange when tab is clicked", () => {
      const onTabChange = vi.fn();
      render(
        <ExpandedNodeTabBar
          tabs={["Tab1", "Tab2", "Tab3"]}
          activeTab="Tab1"
          headerColor="#4f46e5"
          theme={createMockTheme()}
          onTabChange={onTabChange}
        />,
      );

      fireEvent.click(screen.getByText("Tab2"));
      expect(onTabChange).toHaveBeenCalledWith("Tab2");
    });

    it("should call onTabChange with correct tab name", () => {
      const onTabChange = vi.fn();
      render(
        <ExpandedNodeTabBar
          tabs={["Config", "Advanced", "Code"]}
          activeTab="Config"
          headerColor="#4f46e5"
          theme={createMockTheme()}
          onTabChange={onTabChange}
        />,
      );

      fireEvent.click(screen.getByText("Advanced"));
      expect(onTabChange).toHaveBeenCalledWith("Advanced");

      fireEvent.click(screen.getByText("Code"));
      expect(onTabChange).toHaveBeenCalledWith("Code");
    });

    it("should allow clicking already active tab", () => {
      const onTabChange = vi.fn();
      render(
        <ExpandedNodeTabBar
          tabs={["Tab1", "Tab2"]}
          activeTab="Tab1"
          headerColor="#4f46e5"
          theme={createMockTheme()}
          onTabChange={onTabChange}
        />,
      );

      fireEvent.click(screen.getByText("Tab1"));
      expect(onTabChange).toHaveBeenCalledWith("Tab1");
    });
  });

  describe("theming", () => {
    it("should apply theme colors to text", () => {
      const theme = createMockTheme();
      render(
        <ExpandedNodeTabBar
          tabs={["Tab1", "Tab2"]}
          activeTab="Tab1"
          headerColor="#4f46e5"
          theme={theme}
          onTabChange={vi.fn()}
        />,
      );

      const activeTab = screen.getByText("Tab1");
      expect(activeTab).toHaveStyle({
        color: theme.colors.nodes.common.text.primary,
      });

      const inactiveTab = screen.getByText("Tab2");
      expect(inactiveTab).toHaveStyle({
        color: theme.colors.nodes.common.text.secondary,
      });
    });

    it("should apply theme border color to container", () => {
      const theme = createMockTheme();
      const { container } = render(
        <ExpandedNodeTabBar
          tabs={["Tab1"]}
          activeTab="Tab1"
          headerColor="#4f46e5"
          theme={theme}
          onTabChange={vi.fn()}
        />,
      );

      const tabBar = container.firstChild as HTMLElement;
      expect(tabBar).toHaveStyle({
        borderColor: theme.colors.nodes.common.container.border,
      });
    });
  });

  describe("styling classes", () => {
    it("should have correct base classes on tabs", () => {
      render(
        <ExpandedNodeTabBar
          tabs={["Tab1"]}
          activeTab="Tab1"
          headerColor="#4f46e5"
          theme={createMockTheme()}
          onTabChange={vi.fn()}
        />,
      );

      const tab = screen.getByText("Tab1");
      expect(tab).toHaveClass("px-2");
      expect(tab).toHaveClass("py-1");
      expect(tab).toHaveClass("text-[10px]");
      expect(tab).toHaveClass("font-medium");
    });

    it("should have flex layout on container", () => {
      const { container } = render(
        <ExpandedNodeTabBar
          tabs={["Tab1", "Tab2"]}
          activeTab="Tab1"
          headerColor="#4f46e5"
          theme={createMockTheme()}
          onTabChange={vi.fn()}
        />,
      );

      const tabBar = container.firstChild as HTMLElement;
      expect(tabBar).toHaveClass("flex");
      expect(tabBar).toHaveClass("border-b");
    });
  });

  describe("edge cases", () => {
    it("should handle tab names with spaces", () => {
      render(
        <ExpandedNodeTabBar
          tabs={["My Tab", "Another Tab"]}
          activeTab="My Tab"
          headerColor="#4f46e5"
          theme={createMockTheme()}
          onTabChange={vi.fn()}
        />,
      );

      expect(screen.getByText("My Tab")).toBeInTheDocument();
      expect(screen.getByText("Another Tab")).toBeInTheDocument();
    });

    it("should handle tab names with special characters", () => {
      render(
        <ExpandedNodeTabBar
          tabs={["Config & Settings", "I/O"]}
          activeTab="Config & Settings"
          headerColor="#4f46e5"
          theme={createMockTheme()}
          onTabChange={vi.fn()}
        />,
      );

      expect(screen.getByText("Config & Settings")).toBeInTheDocument();
      expect(screen.getByText("I/O")).toBeInTheDocument();
    });

    it("should handle many tabs", () => {
      const tabs = Array.from({ length: 10 }, (_, i) => `Tab${i + 1}`);
      render(
        <ExpandedNodeTabBar
          tabs={tabs}
          activeTab="Tab1"
          headerColor="#4f46e5"
          theme={createMockTheme()}
          onTabChange={vi.fn()}
        />,
      );

      tabs.forEach((tab) => {
        expect(screen.getByText(tab)).toBeInTheDocument();
      });
    });
  });

  describe("different header colors", () => {
    it("should apply different header colors", () => {
      const { rerender } = render(
        <ExpandedNodeTabBar
          tabs={["Tab1"]}
          activeTab="Tab1"
          headerColor="#ff0000"
          theme={createMockTheme()}
          onTabChange={vi.fn()}
        />,
      );

      let activeTab = screen.getByText("Tab1");
      expect(activeTab).toHaveStyle({ borderColor: "#ff0000" });

      rerender(
        <ExpandedNodeTabBar
          tabs={["Tab1"]}
          activeTab="Tab1"
          headerColor="#00ff00"
          theme={createMockTheme()}
          onTabChange={vi.fn()}
        />,
      );

      activeTab = screen.getByText("Tab1");
      expect(activeTab).toHaveStyle({ borderColor: "#00ff00" });
    });
  });
});
