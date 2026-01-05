import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import InfoDisplayWidget from "@/components/nodes/widgets/InfoDisplayWidget";

const mockTheme = {
  name: "test",
  colors: {
    nodes: {
      common: {
        container: { background: "#fff", border: "#ccc" },
        text: { primary: "#000", secondary: "#666", muted: "#999" },
      },
      agent: { header: "#4f46e5" },
    },
  },
};

const mockField = {
  id: "info-display-field",
  label: "Info Display",
  widget: "info_display",
  help_text: "This is helpful information",
};

const defaultOptions = {
  disabled: false,
  theme: mockTheme,
  compact: false,
};

describe("InfoDisplayWidget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render help_text content", () => {
      render(
        <InfoDisplayWidget
          field={mockField}
          value={null}
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      expect(
        screen.getByText("This is helpful information"),
      ).toBeInTheDocument();
    });

    it("should render info icon", () => {
      const { container } = render(
        <InfoDisplayWidget
          field={mockField}
          value={null}
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      // Check for lucide info icon (rendered as svg)
      const svgIcon = container.querySelector("svg");
      expect(svgIcon).toBeInTheDocument();
    });

    it("should render default text when help_text is not provided", () => {
      const fieldWithoutHelp = {
        ...mockField,
        help_text: undefined,
      };

      render(
        <InfoDisplayWidget
          field={fieldWithoutHelp}
          value={null}
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      expect(screen.getByText("No information available")).toBeInTheDocument();
    });

    it("should render default text when help_text is empty string", () => {
      const fieldWithEmptyHelp = {
        ...mockField,
        help_text: "",
      };

      render(
        <InfoDisplayWidget
          field={fieldWithEmptyHelp}
          value={null}
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      expect(screen.getByText("No information available")).toBeInTheDocument();
    });
  });

  describe("styling", () => {
    it("should apply theme text color", () => {
      const { container } = render(
        <InfoDisplayWidget
          field={mockField}
          value={null}
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      const wrapper = container.querySelector(".flex");
      expect(wrapper).toHaveStyle({ color: "#666" });
    });

    it("should apply icon styling from theme", () => {
      const { container } = render(
        <InfoDisplayWidget
          field={mockField}
          value={null}
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      const icon = container.querySelector("svg");
      expect(icon).toHaveStyle({ color: "#666" });
    });

    it("should have flex layout with gap", () => {
      const { container } = render(
        <InfoDisplayWidget
          field={mockField}
          value={null}
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      const wrapper = container.querySelector(".flex.items-start.gap-2");
      expect(wrapper).toBeInTheDocument();
    });

    it("should have relaxed line-height for readability", () => {
      const { container } = render(
        <InfoDisplayWidget
          field={mockField}
          value={null}
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      const textSpan = container.querySelector(".leading-relaxed");
      expect(textSpan).toBeInTheDocument();
    });
  });

  describe("compact mode", () => {
    it("should use smaller font in compact mode", () => {
      const { container } = render(
        <InfoDisplayWidget
          field={mockField}
          value={null}
          onChange={vi.fn()}
          options={{ ...defaultOptions, compact: true }}
        />,
      );

      const wrapper = container.querySelector(".flex");
      expect(wrapper).toHaveClass("text-[10px]");
    });

    it("should use smaller icon in compact mode", () => {
      const { container } = render(
        <InfoDisplayWidget
          field={mockField}
          value={null}
          onChange={vi.fn()}
          options={{ ...defaultOptions, compact: true }}
        />,
      );

      const icon = container.querySelector("svg");
      expect(icon).toHaveClass("w-3", "h-3");
    });

    it("should use larger font in normal mode", () => {
      const { container } = render(
        <InfoDisplayWidget
          field={mockField}
          value={null}
          onChange={vi.fn()}
          options={{ ...defaultOptions, compact: false }}
        />,
      );

      const wrapper = container.querySelector(".flex");
      expect(wrapper).toHaveClass("text-xs");
    });

    it("should use larger icon in normal mode", () => {
      const { container } = render(
        <InfoDisplayWidget
          field={mockField}
          value={null}
          onChange={vi.fn()}
          options={{ ...defaultOptions, compact: false }}
        />,
      );

      const icon = container.querySelector("svg");
      expect(icon).toHaveClass("w-3.5", "h-3.5");
    });
  });

  describe("read-only nature", () => {
    it("should not have any interactive elements", () => {
      render(
        <InfoDisplayWidget
          field={mockField}
          value={null}
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
      expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    });

    it("should not be affected by disabled state (always display)", () => {
      render(
        <InfoDisplayWidget
          field={mockField}
          value={null}
          onChange={vi.fn()}
          options={{ ...defaultOptions, disabled: true }}
        />,
      );

      // Content should still be visible when disabled
      expect(
        screen.getByText("This is helpful information"),
      ).toBeInTheDocument();
    });

    it("should ignore value prop (display-only widget)", () => {
      render(
        <InfoDisplayWidget
          field={mockField}
          value="some value that should be ignored"
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      // Should display help_text, not the value
      expect(
        screen.getByText("This is helpful information"),
      ).toBeInTheDocument();
      expect(
        screen.queryByText("some value that should be ignored"),
      ).not.toBeInTheDocument();
    });
  });

  describe("edge cases", () => {
    it("should handle long help_text", () => {
      const longHelpField = {
        ...mockField,
        help_text:
          "This is a very long help text that might wrap across multiple lines in the display. It contains lots of information about the field and how it should be used in the application.",
      };

      render(
        <InfoDisplayWidget
          field={longHelpField}
          value={null}
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      expect(screen.getByText(longHelpField.help_text)).toBeInTheDocument();
    });

    it("should handle help_text with special characters", () => {
      const specialCharsField = {
        ...mockField,
        help_text: 'Set in Project Settings → Location & use <file> "path"',
      };

      render(
        <InfoDisplayWidget
          field={specialCharsField}
          value={null}
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      expect(
        screen.getByText(
          'Set in Project Settings → Location & use <file> "path"',
        ),
      ).toBeInTheDocument();
    });

    it("should handle help_text with line breaks in string", () => {
      const multiLineField = {
        ...mockField,
        help_text: "Line 1\nLine 2\nLine 3",
      };

      const { container } = render(
        <InfoDisplayWidget
          field={multiLineField}
          value={null}
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      // Check that the text content includes all lines
      const textSpan = container.querySelector(".leading-relaxed");
      expect(textSpan?.textContent).toBe("Line 1\nLine 2\nLine 3");
    });

    it("should render with different theme colors", () => {
      const darkTheme = {
        ...mockTheme,
        colors: {
          ...mockTheme.colors,
          nodes: {
            ...mockTheme.colors.nodes,
            common: {
              ...mockTheme.colors.nodes.common,
              text: { primary: "#fff", secondary: "#bbb", muted: "#888" },
            },
          },
        },
      };

      const { container } = render(
        <InfoDisplayWidget
          field={mockField}
          value={null}
          onChange={vi.fn()}
          options={{ ...defaultOptions, theme: darkTheme }}
        />,
      );

      const wrapper = container.querySelector(".flex");
      expect(wrapper).toHaveStyle({ color: "#bbb" });
    });
  });

  describe("icon positioning", () => {
    it("should have flex-shrink-0 on icon to prevent shrinking", () => {
      const { container } = render(
        <InfoDisplayWidget
          field={mockField}
          value={null}
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      const icon = container.querySelector("svg");
      expect(icon).toHaveClass("flex-shrink-0");
    });

    it("should have top margin on icon for alignment", () => {
      const { container } = render(
        <InfoDisplayWidget
          field={mockField}
          value={null}
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      const icon = container.querySelector("svg");
      expect(icon).toHaveClass("mt-0.5");
    });
  });
});
