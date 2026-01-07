import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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
              muted: "#999",
            },
            container: {
              border: "#ccc",
            },
          },
        },
        handles: {
          border: "#ccc",
          input: "#3b82f6",
          output: "#10b981",
        },
        state: {
          invalid: { ring: "#ef4444" },
          valid: { ring: "#22c55e" },
        },
      },
    },
  })),
}));

// Mock ConnectionContext
vi.mock("@/contexts/ConnectionContext", () => ({
  useConnection: vi.fn(() => ({
    connectionState: {
      isDragging: false,
      sourceNodeId: null,
      sourceOutputSource: null,
      sourceOutputType: null,
    },
  })),
}));

// Mock type utilities
vi.mock("@/lib/types", () => ({
  isTypeCompatible: vi.fn(() => true),
}));

// Mock HandleTooltip
vi.mock("@/components/HandleTooltip", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock WidgetRenderer
vi.mock("@/components/nodes/widgets/WidgetRenderer", () => ({
  renderWidget: vi.fn((field, value, onChange, options) => (
    <input
      data-testid={`widget-${field.id}`}
      value={value as string}
      onChange={(e) => onChange(e.target.value)}
      disabled={options?.disabled}
    />
  )),
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

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  ArrowRight: () => <svg data-testid="icon-arrow-right" />,
}));

// Import after mocking
import CustomNodeInput from "@/components/nodes/custom/CustomNodeInput";
import type { PortDefinition } from "@/components/nodes/CustomNode";
import { useConnection } from "@/contexts/ConnectionContext";
import { isTypeCompatible } from "@/lib/types";

describe("CustomNodeInput", () => {
  const mockOnConfigChange = vi.fn();

  const defaultProps = {
    input: {
      id: "test-input",
      label: "Test Input",
      source_type: "agent",
      data_type: "string",
      required: false,
    } as PortDefinition,
    config: {},
    isConnected: false,
    nodeId: "node-1",
    onConfigChange: mockOnConfigChange,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("basic rendering", () => {
    it("should render input with label", () => {
      render(<CustomNodeInput {...defaultProps} />);
      expect(screen.getByText("Test Input")).toBeInTheDocument();
    });

    it("should render handle with correct id", () => {
      render(<CustomNodeInput {...defaultProps} />);
      expect(screen.getByTestId("handle-test-input")).toBeInTheDocument();
    });

    it("should show required indicator when required", () => {
      const props = {
        ...defaultProps,
        input: { ...defaultProps.input, required: true },
      };
      render(<CustomNodeInput {...props} />);
      const label = screen.getByText("Test Input").parentElement;
      expect(label?.textContent).toContain("*");
    });

    it("should not show required indicator when not required", () => {
      render(<CustomNodeInput {...defaultProps} />);
      const label = screen.getByText("Test Input").parentElement;
      expect(label?.textContent).not.toContain("*");
    });
  });

  describe("handle positioning", () => {
    it("should render left-positioned handle by default", () => {
      render(<CustomNodeInput {...defaultProps} />);
      const handle = screen.getByTestId("handle-test-input");
      expect(handle).toHaveAttribute("data-position", "left");
    });

    it("should render right-positioned handle when specified", () => {
      render(<CustomNodeInput {...defaultProps} handlePosition="right" />);
      const handle = screen.getByTestId("handle-test-input");
      expect(handle).toHaveAttribute("data-position", "right");
    });

    it("should use right-aligned layout for right handles", () => {
      const { container } = render(
        <CustomNodeInput {...defaultProps} handlePosition="right" />,
      );
      const wrapper = container.querySelector(".justify-end");
      expect(wrapper).toBeInTheDocument();
    });

    it("should use left-aligned layout for left handles", () => {
      const { container } = render(
        <CustomNodeInput {...defaultProps} handlePosition="left" />,
      );
      const wrapper = container.querySelector(".justify-end");
      expect(wrapper).not.toBeInTheDocument();
    });
  });

  describe("connection state", () => {
    it("should show connected source names when connected", () => {
      render(
        <CustomNodeInput
          {...defaultProps}
          isConnected={true}
          connectedSourceNames={["Source A", "Source B"]}
        />,
      );
      expect(screen.getByText("Source A, Source B")).toBeInTheDocument();
    });

    it("should show arrow icon when connected", () => {
      render(
        <CustomNodeInput
          {...defaultProps}
          isConnected={true}
          connectedSourceNames={["Source A"]}
        />,
      );
      expect(screen.getByTestId("icon-arrow-right")).toBeInTheDocument();
    });

    it("should not show arrow when not connected", () => {
      render(<CustomNodeInput {...defaultProps} isConnected={false} />);
      expect(screen.queryByTestId("icon-arrow-right")).not.toBeInTheDocument();
    });

    it("should not render widget when connected and connection_only is default", () => {
      render(
        <CustomNodeInput
          {...defaultProps}
          isConnected={true}
          connectedSourceNames={["Source A"]}
        />,
      );
      expect(screen.queryByTestId("widget-test-input")).not.toBeInTheDocument();
    });
  });

  describe("widget rendering", () => {
    it("should render widget when not connected and not connection_only", () => {
      const props = {
        ...defaultProps,
        input: {
          ...defaultProps.input,
          connection_only: false,
          widget: "text_input",
        },
      };
      render(<CustomNodeInput {...props} isConnected={false} />);
      expect(screen.getByTestId("widget-test-input")).toBeInTheDocument();
    });

    it("should not render widget when connection_only is true", () => {
      const props = {
        ...defaultProps,
        input: {
          ...defaultProps.input,
          connection_only: true,
        },
      };
      render(<CustomNodeInput {...props} isConnected={false} />);
      expect(screen.queryByTestId("widget-test-input")).not.toBeInTheDocument();
    });

    it("should pass config value to widget", () => {
      const props = {
        ...defaultProps,
        input: {
          ...defaultProps.input,
          connection_only: false,
          widget: "text_input",
        },
        config: { "test-input": "test value" },
      };
      render(<CustomNodeInput {...props} />);
      const widget = screen.getByTestId("widget-test-input");
      expect(widget).toHaveValue("test value");
    });

    it("should call onConfigChange when widget value changes", () => {
      const props = {
        ...defaultProps,
        input: {
          ...defaultProps.input,
          connection_only: false,
          widget: "text_input",
        },
      };
      render(<CustomNodeInput {...props} />);
      const widget = screen.getByTestId("widget-test-input");
      fireEvent.change(widget, { target: { value: "new value" } });
      expect(mockOnConfigChange).toHaveBeenCalledWith("test-input", "new value");
    });

    it("should disable widget when node is locked", () => {
      const props = {
        ...defaultProps,
        input: {
          ...defaultProps.input,
          connection_only: false,
          widget: "text_input",
        },
        isNodeLocked: true,
      };
      render(<CustomNodeInput {...props} />);
      const widget = screen.getByTestId("widget-test-input");
      expect(widget).toBeDisabled();
    });
  });

  describe("handle styling", () => {
    it("should apply custom handle color", () => {
      const props = {
        ...defaultProps,
        input: {
          ...defaultProps.input,
          handle_color: "#ff0000",
        },
      };
      render(<CustomNodeInput {...props} />);
      const handle = screen.getByTestId("handle-test-input");
      expect(handle).toHaveStyle({ backgroundColor: "#ff0000" });
    });

    it("should use theme input color by default", () => {
      render(<CustomNodeInput {...defaultProps} />);
      const handle = screen.getByTestId("handle-test-input");
      expect(handle).toHaveStyle({ backgroundColor: "#3b82f6" });
    });
  });

  describe("connection validation", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should show invalid style when dragging from same node", () => {
      vi.mocked(useConnection).mockReturnValue({
        connectionState: {
          isDragging: true,
          sourceNodeId: "node-1",
          sourceOutputSource: "agent",
          sourceOutputType: "string",
        },
      } as any);

      render(
        <CustomNodeInput
          {...defaultProps}
          handleTypeInfo={{
            acceptedSources: ["agent"],
            acceptedTypes: ["string"],
          }}
        />,
      );

      const handle = screen.getByTestId("handle-test-input");
      expect(handle.style.boxShadow).toContain("#ef4444");
    });

    it("should show valid style when compatible types", () => {
      vi.mocked(useConnection).mockReturnValue({
        connectionState: {
          isDragging: true,
          sourceNodeId: "node-2",
          sourceOutputSource: "agent",
          sourceOutputType: "string",
        },
      } as any);

      vi.mocked(isTypeCompatible).mockReturnValue(true);

      render(
        <CustomNodeInput
          {...defaultProps}
          handleTypeInfo={{
            acceptedSources: ["agent"],
            acceptedTypes: ["string"],
          }}
        />,
      );

      const handle = screen.getByTestId("handle-test-input");
      expect(handle.style.boxShadow).toContain("#22c55e");
    });

    it("should show invalid style when incompatible types", () => {
      vi.mocked(useConnection).mockReturnValue({
        connectionState: {
          isDragging: true,
          sourceNodeId: "node-2",
          sourceOutputSource: "prompt",
          sourceOutputType: "string",
        },
      } as any);

      vi.mocked(isTypeCompatible).mockReturnValue(false);

      render(
        <CustomNodeInput
          {...defaultProps}
          handleTypeInfo={{
            acceptedSources: ["agent"],
            acceptedTypes: ["dict"],
          }}
        />,
      );

      const handle = screen.getByTestId("handle-test-input");
      expect(handle.style.boxShadow).toContain("#ef4444");
    });

    it("should not apply validation styles when not dragging", () => {
      vi.mocked(useConnection).mockReturnValue({
        connectionState: {
          isDragging: false,
          sourceNodeId: null,
          sourceOutputSource: null,
          sourceOutputType: null,
        },
      } as any);

      render(
        <CustomNodeInput
          {...defaultProps}
          handleTypeInfo={{
            acceptedSources: ["agent"],
            acceptedTypes: ["string"],
          }}
        />,
      );

      const handle = screen.getByTestId("handle-test-input");
      expect(handle.style.boxShadow).toBe("");
    });
  });

  describe("multi-line widgets", () => {
    it("should use items-start for textarea widget", () => {
      const props = {
        ...defaultProps,
        input: {
          ...defaultProps.input,
          widget: "textarea",
          connection_only: false,
        },
      };
      const { container } = render(<CustomNodeInput {...props} />);
      const wrapper = container.querySelector(".items-start");
      expect(wrapper).toBeInTheDocument();
    });

    it("should use items-start for text_area widget", () => {
      const props = {
        ...defaultProps,
        input: {
          ...defaultProps.input,
          widget: "text_area",
          connection_only: false,
        },
      };
      const { container } = render(<CustomNodeInput {...props} />);
      const wrapper = container.querySelector(".items-start");
      expect(wrapper).toBeInTheDocument();
    });

    it("should use items-center for other widgets", () => {
      const props = {
        ...defaultProps,
        input: {
          ...defaultProps.input,
          widget: "text_input",
          connection_only: false,
        },
      };
      const { container } = render(<CustomNodeInput {...props} />);
      const wrapper = container.querySelector(".items-center");
      expect(wrapper).toBeInTheDocument();
    });
  });

  describe("label width", () => {
    it("should apply custom label width when specified", () => {
      render(<CustomNodeInput {...defaultProps} labelWidth={20} />);
      const label = screen.getByText("Test Input");
      expect(label).toHaveStyle({ minWidth: "11ch" }); // 20 * 0.55
    });

    it("should not apply label width when not specified", () => {
      render(<CustomNodeInput {...defaultProps} />);
      const label = screen.getByText("Test Input");
      expect(label.style.minWidth).toBe("");
    });
  });

  describe("right-positioned layout", () => {
    it("should render source names before label for right handles", () => {
      const { container } = render(
        <CustomNodeInput
          {...defaultProps}
          handlePosition="right"
          isConnected={true}
          connectedSourceNames={["Source A"]}
        />,
      );
      const wrapper = container.firstChild as HTMLElement;
      const text = wrapper.textContent;
      expect(text?.indexOf("Source A")).toBeLessThan(
        text?.indexOf("Test Input") || Infinity,
      );
    });

    it("should render label before handle for right handles", () => {
      const { container } = render(
        <CustomNodeInput {...defaultProps} handlePosition="right" />,
      );
      const wrapper = container.firstChild as HTMLElement;
      const label = screen.getByText("Test Input");
      const handle = screen.getByTestId("handle-test-input");
      const labelIndex = Array.from(wrapper.children).indexOf(
        label.parentElement!,
      );
      const handleIndex = Array.from(wrapper.children).indexOf(
        handle.parentElement!,
      );
      expect(labelIndex).toBeLessThan(handleIndex);
    });
  });

  describe("handle type info", () => {
    it("should work without handle type info", () => {
      render(<CustomNodeInput {...defaultProps} />);
      expect(screen.getByTestId("handle-test-input")).toBeInTheDocument();
    });

    it("should pass accepted types to validation", () => {
      vi.mocked(useConnection).mockReturnValue({
        connectionState: {
          isDragging: true,
          sourceNodeId: "node-2",
          sourceOutputSource: "agent",
          sourceOutputType: "string",
        },
      } as any);

      render(
        <CustomNodeInput
          {...defaultProps}
          handleTypeInfo={{
            acceptedSources: ["agent", "prompt"],
            acceptedTypes: ["string", "dict"],
          }}
        />,
      );

      expect(isTypeCompatible).toHaveBeenCalledWith(
        "agent",
        "string",
        ["agent", "prompt"],
        ["string", "dict"],
      );
    });
  });
});
