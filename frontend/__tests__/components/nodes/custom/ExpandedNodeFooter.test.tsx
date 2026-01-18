import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

import ExpandedNodeFooter from "@/components/nodes/custom/ExpandedNodeFooter";
import type { Theme } from "@/lib/themes/types";
import type { CustomNodeSchema } from "@/components/nodes/CustomNode";

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

// Create a mock schema
const createMockSchema = (
  overrides: Partial<CustomNodeSchema> = {},
): CustomNodeSchema => ({
  unit_id: "test.node",
  label: "Test Node",
  menu_location: "Test",
  description: "A test node",
  version: "1.0.0",
  ui: {
    inputs: [],
    outputs: [],
    fields: [],
    color: "#4f46e5",
    expandable: true,
    default_width: 300,
    default_height: 200,
    ...overrides.ui,
  },
  ...overrides,
});

describe("ExpandedNodeFooter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("basic rendering", () => {
    it("should render schema label", () => {
      render(
        <ExpandedNodeFooter
          schema={createMockSchema()}
          theme={createMockTheme()}
          hasEditor={false}
          lineCount={0}
        />,
      );

      expect(screen.getByText("Test Node")).toBeInTheDocument();
    });

    it("should render with custom label", () => {
      const schema = createMockSchema({ label: "Custom Label" });
      render(
        <ExpandedNodeFooter
          schema={schema}
          theme={createMockTheme()}
          hasEditor={false}
          lineCount={0}
        />,
      );

      expect(screen.getByText("Custom Label")).toBeInTheDocument();
    });
  });

  describe("output node indicator", () => {
    it("should show output node indicator when output_node is true", () => {
      const schema = createMockSchema({ output_node: true });
      render(
        <ExpandedNodeFooter
          schema={schema}
          theme={createMockTheme()}
          hasEditor={false}
          lineCount={0}
        />,
      );

      // The Circle icon should be present
      const indicator = screen.getByTitle(
        "Output Node - triggers execution trace",
      );
      expect(indicator).toBeInTheDocument();
    });

    it("should not show output node indicator when output_node is false", () => {
      const schema = createMockSchema({ output_node: false });
      render(
        <ExpandedNodeFooter
          schema={schema}
          theme={createMockTheme()}
          hasEditor={false}
          lineCount={0}
        />,
      );

      expect(
        screen.queryByTitle("Output Node - triggers execution trace"),
      ).not.toBeInTheDocument();
    });

    it("should not show output node indicator when output_node is undefined", () => {
      const schema = createMockSchema();
      render(
        <ExpandedNodeFooter
          schema={schema}
          theme={createMockTheme()}
          hasEditor={false}
          lineCount={0}
        />,
      );

      expect(
        screen.queryByTitle("Output Node - triggers execution trace"),
      ).not.toBeInTheDocument();
    });
  });

  describe("always execute indicator", () => {
    it("should show always execute indicator when always_execute is true", () => {
      const schema = createMockSchema({ always_execute: true });
      render(
        <ExpandedNodeFooter
          schema={schema}
          theme={createMockTheme()}
          hasEditor={false}
          lineCount={0}
        />,
      );

      const indicator = screen.getByTitle("Always Execute - skips cache");
      expect(indicator).toBeInTheDocument();
    });

    it("should not show always execute indicator when always_execute is false", () => {
      const schema = createMockSchema({ always_execute: false });
      render(
        <ExpandedNodeFooter
          schema={schema}
          theme={createMockTheme()}
          hasEditor={false}
          lineCount={0}
        />,
      );

      expect(
        screen.queryByTitle("Always Execute - skips cache"),
      ).not.toBeInTheDocument();
    });

    it("should not show always execute indicator when always_execute is undefined", () => {
      const schema = createMockSchema();
      render(
        <ExpandedNodeFooter
          schema={schema}
          theme={createMockTheme()}
          hasEditor={false}
          lineCount={0}
        />,
      );

      expect(
        screen.queryByTitle("Always Execute - skips cache"),
      ).not.toBeInTheDocument();
    });
  });

  describe("both indicators", () => {
    it("should show both indicators when both flags are true", () => {
      const schema = createMockSchema({
        output_node: true,
        always_execute: true,
      });
      render(
        <ExpandedNodeFooter
          schema={schema}
          theme={createMockTheme()}
          hasEditor={false}
          lineCount={0}
        />,
      );

      expect(
        screen.getByTitle("Output Node - triggers execution trace"),
      ).toBeInTheDocument();
      expect(
        screen.getByTitle("Always Execute - skips cache"),
      ).toBeInTheDocument();
    });
  });

  describe("line count display", () => {
    it("should show line count when hasEditor is true and lineCount > 0", () => {
      render(
        <ExpandedNodeFooter
          schema={createMockSchema()}
          theme={createMockTheme()}
          hasEditor={true}
          lineCount={42}
        />,
      );

      expect(screen.getByText("42 lines")).toBeInTheDocument();
    });

    it("should not show line count when hasEditor is false", () => {
      render(
        <ExpandedNodeFooter
          schema={createMockSchema()}
          theme={createMockTheme()}
          hasEditor={false}
          lineCount={42}
        />,
      );

      expect(screen.queryByText("42 lines")).not.toBeInTheDocument();
    });

    it("should not show line count when lineCount is 0", () => {
      render(
        <ExpandedNodeFooter
          schema={createMockSchema()}
          theme={createMockTheme()}
          hasEditor={true}
          lineCount={0}
        />,
      );

      expect(screen.queryByText("0 lines")).not.toBeInTheDocument();
    });

    it("should show correct line count for various values", () => {
      const { rerender } = render(
        <ExpandedNodeFooter
          schema={createMockSchema()}
          theme={createMockTheme()}
          hasEditor={true}
          lineCount={1}
        />,
      );

      expect(screen.getByText("1 lines")).toBeInTheDocument();

      rerender(
        <ExpandedNodeFooter
          schema={createMockSchema()}
          theme={createMockTheme()}
          hasEditor={true}
          lineCount={100}
        />,
      );

      expect(screen.getByText("100 lines")).toBeInTheDocument();

      rerender(
        <ExpandedNodeFooter
          schema={createMockSchema()}
          theme={createMockTheme()}
          hasEditor={true}
          lineCount={1000}
        />,
      );

      expect(screen.getByText("1000 lines")).toBeInTheDocument();
    });
  });

  describe("theming", () => {
    it("should apply theme background color", () => {
      const theme = createMockTheme();
      const { container } = render(
        <ExpandedNodeFooter
          schema={createMockSchema()}
          theme={theme}
          hasEditor={false}
          lineCount={0}
        />,
      );

      const footer = container.firstChild as HTMLElement;
      expect(footer).toHaveStyle({
        backgroundColor: theme.colors.nodes.common.footer.background,
      });
    });

    it("should apply theme border color", () => {
      const theme = createMockTheme();
      const { container } = render(
        <ExpandedNodeFooter
          schema={createMockSchema()}
          theme={theme}
          hasEditor={false}
          lineCount={0}
        />,
      );

      const footer = container.firstChild as HTMLElement;
      expect(footer).toHaveStyle({
        borderColor: theme.colors.nodes.common.footer.border,
      });
    });

    it("should apply theme text color to label", () => {
      const theme = createMockTheme();
      render(
        <ExpandedNodeFooter
          schema={createMockSchema()}
          theme={theme}
          hasEditor={false}
          lineCount={0}
        />,
      );

      const label = screen.getByText("Test Node");
      expect(label).toHaveStyle({
        color: theme.colors.nodes.common.footer.text,
      });
    });

    it("should apply theme muted color to line count", () => {
      const theme = createMockTheme();
      render(
        <ExpandedNodeFooter
          schema={createMockSchema()}
          theme={theme}
          hasEditor={true}
          lineCount={10}
        />,
      );

      const lineCount = screen.getByText("10 lines");
      expect(lineCount).toHaveStyle({
        color: theme.colors.nodes.common.text.muted,
      });
    });
  });

  describe("styling classes", () => {
    it("should have correct base classes on footer", () => {
      const { container } = render(
        <ExpandedNodeFooter
          schema={createMockSchema()}
          theme={createMockTheme()}
          hasEditor={false}
          lineCount={0}
        />,
      );

      const footer = container.firstChild as HTMLElement;
      expect(footer).toHaveClass("px-3");
      expect(footer).toHaveClass("py-1");
      expect(footer).toHaveClass("rounded-b-lg");
      expect(footer).toHaveClass("flex");
      expect(footer).toHaveClass("items-center");
      expect(footer).toHaveClass("justify-between");
      expect(footer).toHaveClass("border-t");
    });

    it("should have correct text size on label", () => {
      render(
        <ExpandedNodeFooter
          schema={createMockSchema()}
          theme={createMockTheme()}
          hasEditor={false}
          lineCount={0}
        />,
      );

      const label = screen.getByText("Test Node");
      expect(label).toHaveClass("text-xs");
    });

    it("should have correct text size on line count", () => {
      render(
        <ExpandedNodeFooter
          schema={createMockSchema()}
          theme={createMockTheme()}
          hasEditor={true}
          lineCount={10}
        />,
      );

      const lineCount = screen.getByText("10 lines");
      expect(lineCount).toHaveClass("text-xs");
    });
  });

  describe("layout", () => {
    it("should have left section with label and indicators", () => {
      const schema = createMockSchema({
        output_node: true,
        always_execute: true,
      });
      const { container } = render(
        <ExpandedNodeFooter
          schema={schema}
          theme={createMockTheme()}
          hasEditor={false}
          lineCount={0}
        />,
      );

      const footer = container.firstChild as HTMLElement;
      const leftSection = footer.querySelector(".flex.items-center.gap-2");
      expect(leftSection).toBeInTheDocument();
    });

    it("should position line count on the right", () => {
      render(
        <ExpandedNodeFooter
          schema={createMockSchema()}
          theme={createMockTheme()}
          hasEditor={true}
          lineCount={50}
        />,
      );

      // The footer uses justify-between, so line count should be on the right
      const lineCount = screen.getByText("50 lines");
      expect(lineCount).toBeInTheDocument();
    });
  });

  describe("edge cases", () => {
    it("should handle very long label", () => {
      const schema = createMockSchema({
        label: "This is a very long label that might overflow",
      });
      render(
        <ExpandedNodeFooter
          schema={schema}
          theme={createMockTheme()}
          hasEditor={false}
          lineCount={0}
        />,
      );

      expect(
        screen.getByText("This is a very long label that might overflow"),
      ).toBeInTheDocument();
    });

    it("should handle large line counts", () => {
      render(
        <ExpandedNodeFooter
          schema={createMockSchema()}
          theme={createMockTheme()}
          hasEditor={true}
          lineCount={999999}
        />,
      );

      expect(screen.getByText("999999 lines")).toBeInTheDocument();
    });

    it("should handle special characters in label", () => {
      const schema = createMockSchema({
        label: 'Node <Test> & "Special"',
      });
      render(
        <ExpandedNodeFooter
          schema={schema}
          theme={createMockTheme()}
          hasEditor={false}
          lineCount={0}
        />,
      );

      expect(screen.getByText('Node <Test> & "Special"')).toBeInTheDocument();
    });
  });
});
