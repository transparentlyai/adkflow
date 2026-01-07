import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

// Mock ThemeContext
vi.mock("@/contexts/ThemeContext", () => ({
  useTheme: vi.fn(() => ({
    theme: {
      name: "test",
      colors: {
        nodes: {
          common: {
            text: {
              secondary: "#666",
            },
          },
        },
        handles: {
          border: "#ccc",
          output: "#10b981",
        },
      },
    },
  })),
}));

// Mock HandleTooltip
vi.mock("@/components/HandleTooltip", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock @xyflow/react
vi.mock("@xyflow/react", () => ({
  Handle: ({ id, type, position, style }: any) => (
    <div
      data-testid={`handle-${id}`}
      data-type={type}
      data-position={position}
      style={style}
    />
  ),
  Position: {
    Left: "left",
    Right: "right",
    Top: "top",
    Bottom: "bottom",
  },
}));

// Import after mocking
import CustomNodeOutput from "@/components/nodes/custom/CustomNodeOutput";
import type { PortDefinition } from "@/components/nodes/CustomNode";

describe("CustomNodeOutput", () => {
  const defaultProps = {
    output: {
      id: "test-output",
      label: "Test Output",
      source_type: "agent",
      data_type: "string",
    } as PortDefinition,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("basic rendering", () => {
    it("should render output with label", () => {
      render(<CustomNodeOutput {...defaultProps} />);
      expect(screen.getByText("Test Output")).toBeInTheDocument();
    });

    it("should render handle with correct id", () => {
      render(<CustomNodeOutput {...defaultProps} />);
      expect(screen.getByTestId("handle-test-output")).toBeInTheDocument();
    });

    it("should render handle with source type", () => {
      render(<CustomNodeOutput {...defaultProps} />);
      const handle = screen.getByTestId("handle-test-output");
      expect(handle).toHaveAttribute("data-type", "source");
    });
  });

  describe("handle positioning", () => {
    it("should render right-positioned handle by default", () => {
      render(<CustomNodeOutput {...defaultProps} />);
      const handle = screen.getByTestId("handle-test-output");
      expect(handle).toHaveAttribute("data-position", "right");
    });

    it("should render left-positioned handle when specified", () => {
      render(<CustomNodeOutput {...defaultProps} handlePosition="left" />);
      const handle = screen.getByTestId("handle-test-output");
      expect(handle).toHaveAttribute("data-position", "left");
    });

    it("should use right-aligned layout by default", () => {
      const { container } = render(<CustomNodeOutput {...defaultProps} />);
      const wrapper = container.querySelector(".justify-end");
      expect(wrapper).toBeInTheDocument();
    });

    it("should use left-aligned layout for left handles", () => {
      const { container } = render(
        <CustomNodeOutput {...defaultProps} handlePosition="left" />,
      );
      const wrapper = container.querySelector(".justify-start");
      expect(wrapper).toBeInTheDocument();
    });
  });

  describe("handle styling", () => {
    it("should apply custom handle color", () => {
      const props = {
        output: {
          ...defaultProps.output,
          handle_color: "#ff0000",
        },
      };
      render(<CustomNodeOutput {...props} />);
      const handle = screen.getByTestId("handle-test-output");
      expect(handle).toHaveStyle({ backgroundColor: "#ff0000" });
    });

    it("should use theme output color by default", () => {
      render(<CustomNodeOutput {...defaultProps} />);
      const handle = screen.getByTestId("handle-test-output");
      expect(handle).toHaveStyle({ backgroundColor: "#10b981" });
    });

    it("should have consistent handle dimensions", () => {
      render(<CustomNodeOutput {...defaultProps} />);
      const handle = screen.getByTestId("handle-test-output");
      expect(handle).toHaveStyle({
        width: "10px",
        height: "10px",
      });
    });

    it("should have border styling", () => {
      render(<CustomNodeOutput {...defaultProps} />);
      const handle = screen.getByTestId("handle-test-output");
      expect(handle).toHaveStyle({
        border: "2px solid #ccc",
      });
    });

    it("should have absolute positioning", () => {
      render(<CustomNodeOutput {...defaultProps} />);
      const handle = screen.getByTestId("handle-test-output");
      expect(handle).toHaveStyle({
        position: "absolute",
      });
    });

    it("should position right handle correctly", () => {
      render(<CustomNodeOutput {...defaultProps} handlePosition="right" />);
      const handle = screen.getByTestId("handle-test-output");
      expect(handle).toHaveStyle({
        right: "-5px",
        top: "50%",
        transform: "translateY(-50%)",
      });
    });

    it("should position left handle correctly", () => {
      render(<CustomNodeOutput {...defaultProps} handlePosition="left" />);
      const handle = screen.getByTestId("handle-test-output");
      expect(handle).toHaveStyle({
        left: "-5px",
        top: "50%",
        transform: "translateY(-50%)",
      });
    });
  });

  describe("layout structure", () => {
    it("should have gap spacing", () => {
      const { container } = render(<CustomNodeOutput {...defaultProps} />);
      const wrapper = container.querySelector(".gap-2");
      expect(wrapper).toBeInTheDocument();
    });

    it("should have vertical padding", () => {
      const { container } = render(<CustomNodeOutput {...defaultProps} />);
      const wrapper = container.querySelector(".py-0\\.5");
      expect(wrapper).toBeInTheDocument();
    });

    it("should have right padding for right-positioned handles", () => {
      const { container } = render(
        <CustomNodeOutput {...defaultProps} handlePosition="right" />,
      );
      const wrapper = container.querySelector(".pr-3");
      expect(wrapper).toBeInTheDocument();
    });

    it("should have left padding for left-positioned handles", () => {
      const { container } = render(
        <CustomNodeOutput {...defaultProps} handlePosition="left" />,
      );
      const wrapper = container.querySelector(".pl-3");
      expect(wrapper).toBeInTheDocument();
    });
  });

  describe("label text styling", () => {
    it("should apply text size class", () => {
      render(<CustomNodeOutput {...defaultProps} />);
      const label = screen.getByText("Test Output");
      expect(label).toHaveClass("text-xs");
    });

    it("should apply theme color to label", () => {
      render(<CustomNodeOutput {...defaultProps} />);
      const label = screen.getByText("Test Output");
      expect(label).toHaveStyle({ color: "#666" });
    });
  });

  describe("element order", () => {
    it("should render label before handle for right-positioned handles", () => {
      const { container } = render(
        <CustomNodeOutput {...defaultProps} handlePosition="right" />,
      );
      const wrapper = container.firstChild as HTMLElement;
      const label = screen.getByText("Test Output");
      const handle = screen.getByTestId("handle-test-output");

      // Label should be in the DOM tree before the handle's parent
      const labelIndex = Array.from(wrapper.children).indexOf(label);
      const handleParentIndex = Array.from(wrapper.children).indexOf(
        handle.parentElement!,
      );
      expect(labelIndex).toBeLessThan(handleParentIndex);
    });

    it("should render handle before label for left-positioned handles", () => {
      const { container } = render(
        <CustomNodeOutput {...defaultProps} handlePosition="left" />,
      );
      const wrapper = container.firstChild as HTMLElement;
      const label = screen.getByText("Test Output");
      const handle = screen.getByTestId("handle-test-output");

      // Handle's parent should be in the DOM tree before the label
      const labelIndex = Array.from(wrapper.children).indexOf(label);
      const handleParentIndex = Array.from(wrapper.children).indexOf(
        handle.parentElement!,
      );
      expect(handleParentIndex).toBeLessThan(labelIndex);
    });
  });

  describe("edge cases", () => {
    it("should handle empty label", () => {
      const props = {
        output: {
          ...defaultProps.output,
          label: "",
        },
      };
      render(<CustomNodeOutput {...props} />);
      expect(screen.getByTestId("handle-test-output")).toBeInTheDocument();
    });

    it("should handle long labels", () => {
      const props = {
        output: {
          ...defaultProps.output,
          label: "Very Long Output Label That Should Still Render",
        },
      };
      render(<CustomNodeOutput {...props} />);
      expect(
        screen.getByText("Very Long Output Label That Should Still Render"),
      ).toBeInTheDocument();
    });

    it("should handle special characters in label", () => {
      const props = {
        output: {
          ...defaultProps.output,
          label: "Output <>&\"'",
        },
      };
      render(<CustomNodeOutput {...props} />);
      expect(screen.getByText("Output <>&\"'")).toBeInTheDocument();
    });

    it("should handle missing handle_color", () => {
      const props = {
        output: {
          id: "test",
          label: "Test",
          source_type: "agent",
          data_type: "string",
          // No handle_color specified
        } as PortDefinition,
      };
      render(<CustomNodeOutput {...props} />);
      const handle = screen.getByTestId("handle-test");
      expect(handle).toHaveStyle({ backgroundColor: "#10b981" });
    });
  });

  describe("component props", () => {
    it("should accept explicit right position", () => {
      render(<CustomNodeOutput {...defaultProps} handlePosition="right" />);
      const handle = screen.getByTestId("handle-test-output");
      expect(handle).toHaveAttribute("data-position", "right");
    });

    it("should accept explicit left position", () => {
      render(<CustomNodeOutput {...defaultProps} handlePosition="left" />);
      const handle = screen.getByTestId("handle-test-output");
      expect(handle).toHaveAttribute("data-position", "left");
    });

    it("should work with different output definitions", () => {
      const output = {
        id: "custom-id",
        label: "Custom Label",
        source_type: "flow",
        data_type: "trigger",
        handle_color: "#9333ea",
      } as PortDefinition;

      render(<CustomNodeOutput output={output} />);
      expect(screen.getByText("Custom Label")).toBeInTheDocument();
      const handle = screen.getByTestId("handle-custom-id");
      expect(handle).toHaveStyle({ backgroundColor: "#9333ea" });
    });
  });

  describe("relative positioning", () => {
    it("should have relative positioning on wrapper", () => {
      const { container } = render(<CustomNodeOutput {...defaultProps} />);
      const wrapper = container.querySelector(".relative");
      expect(wrapper).toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("should render semantic HTML", () => {
      const { container } = render(<CustomNodeOutput {...defaultProps} />);
      expect(container.querySelector("div")).toBeInTheDocument();
      expect(container.querySelector("span")).toBeInTheDocument();
    });

    it("should have readable text content", () => {
      render(<CustomNodeOutput {...defaultProps} />);
      const text = screen.getByText("Test Output");
      expect(text).toBeVisible();
    });
  });
});
