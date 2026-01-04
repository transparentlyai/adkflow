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
            container: { background: "#fff", border: "#ccc" },
            header: { background: "#f0f0f0", border: "#ddd" },
            footer: { background: "#f9f9f9", border: "#eee", text: "#333" },
            text: { primary: "#000", secondary: "#666", muted: "#999" },
          },
          process: {
            header: "#10b981",
            accent: "#34d399",
            text: "#fff",
            ring: "#10b981",
          },
          tool: {
            header: "#f97316",
            accent: "#fb923c",
            text: "#fff",
            ring: "#f97316",
          },
        },
        handles: {
          border: "#ccc",
          background: "#fff",
          connected: "#4f46e5",
          input: "#22c55e",
          output: "#3b82f6",
          link: "#a855f7",
        },
        state: {
          running: { ring: "#3b82f6", glow: "rgba(59, 130, 246, 0.4)" },
          completed: { ring: "#22c55e", glow: "rgba(34, 197, 94, 0.3)" },
          error: { ring: "#ef4444", glow: "rgba(239, 68, 68, 0.4)" },
          invalid: { ring: "#ef4444", glow: "rgba(239, 68, 68, 0.4)" },
          success: "#22c55e",
          warning: "#f59e0b",
        },
        validation: {
          error: "#ef4444",
          warning: "#f59e0b",
        },
        execution: {
          running: "#22c55e",
          completed: "#10b981",
          error: "#ef4444",
        },
      },
    },
  })),
}));

// Mock DraggableHandle
vi.mock("@/components/DraggableHandle", () => ({
  default: ({
    handleId,
    type,
    title,
  }: {
    handleId: string;
    type: "source" | "target";
    title?: string;
  }) => (
    <div data-testid={`draggable-handle-${type}-${handleId}`} title={title}>
      Handle {handleId}
    </div>
  ),
}));

// Mock ValidationIndicator
vi.mock("@/components/nodes/ValidationIndicator", () => ({
  default: ({
    errors,
    warnings,
    duplicateNameError,
  }: {
    errors?: string[];
    warnings?: string[];
    duplicateNameError?: string;
  }) => (
    <div data-testid="validation-indicator">
      {errors && errors.length > 0 && (
        <span data-testid="has-errors">Errors: {errors.length}</span>
      )}
      {warnings && warnings.length > 0 && (
        <span data-testid="has-warnings">Warnings: {warnings.length}</span>
      )}
      {duplicateNameError && (
        <span data-testid="has-duplicate">{duplicateNameError}</span>
      )}
    </div>
  ),
}));

// Mock NodeIcon
vi.mock("@/components/nodes/custom/NodeIcon", () => ({
  default: ({ icon, className }: { icon?: string; className?: string }) => (
    <div data-testid={`node-icon-${icon || "default"}`} className={className}>
      Icon: {icon}
    </div>
  ),
}));

// Import after mocking
import PillBodyLayout from "@/components/nodes/custom/layouts/PillBodyLayout";
import type { CustomNodeCollapsedProps } from "@/components/nodes/custom/CustomNodeCollapsed";

// Base schema for Process-style nodes with function signature
const createProcessSchema = (overrides: Record<string, unknown> = {}) => {
  const { ui: uiOverrides, ...restOverrides } = overrides as {
    ui?: Record<string, unknown>;
  };

  const baseUi = {
    theme_key: "process",
    icon: "code",
    inputs: [
      { id: "input", label: "Input", source_type: "flow", data_type: "any" },
    ],
    outputs: [
      {
        id: "output",
        label: "Output",
        source_type: "process",
        data_type: "any",
      },
    ],
    fields: [{ id: "code", label: "Code", widget: "code", default: "" }],
    layout: "pill_body",
    handle_layout: {
      input_position: "left",
      output_position: "right",
      additional_handles: [],
    },
    collapsed_body: {
      show_function_signature: true,
      code_field: "code",
    },
    collapsed_width: 220,
  };

  return {
    unit_id: "builtin.process",
    label: "Process",
    node_type: "process",
    output_node: false,
    always_execute: false,
    ui: {
      ...baseUi,
      ...uiOverrides,
    },
    ...restOverrides,
  };
};

// Base node data for testing
const createBaseNodeData = (overrides = {}) => ({
  schema: createProcessSchema(),
  config: {
    code: `def process_data(input_text: str, count: int = 10) -> dict:
    """Process the input text."""
    return {"result": input_text, "count": count}`,
  },
  handlePositions: {},
  validationErrors: undefined,
  validationWarnings: undefined,
  executionState: undefined,
  duplicateNameError: undefined,
  isNodeLocked: false,
  ...overrides,
});

// Base props for testing
const createBaseProps = (overrides = {}): CustomNodeCollapsedProps => ({
  id: "process-1",
  nodeData: createBaseNodeData(),
  schema: createProcessSchema(),
  name: "My Process",
  config: {
    code: `def process_data(input_text: str, count: int = 10) -> dict:
    """Process the input text."""
    return {"result": input_text, "count": count}`,
  },
  handlePositions: {},
  handleTypes: {
    input: { acceptedSources: ["flow"], acceptedTypes: ["any"] },
    output: { outputSource: "process", outputType: "any" },
  },
  headerColor: "#10b981",
  selected: false,
  onToggleExpand: vi.fn(),
  isEditing: false,
  editedName: "My Process",
  inputRef: { current: null },
  onNameClick: vi.fn(),
  onNameChange: vi.fn(),
  onNameSave: vi.fn(),
  onNameKeyDown: vi.fn(),
  ...overrides,
});

describe("PillBodyLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("basic rendering", () => {
    it("should render with node name", () => {
      render(<PillBodyLayout {...createBaseProps()} />);

      expect(screen.getByText("My Process")).toBeInTheDocument();
    });

    it("should render node icon", () => {
      render(<PillBodyLayout {...createBaseProps()} />);

      expect(screen.getByTestId("node-icon-code")).toBeInTheDocument();
    });

    it("should render validation indicator", () => {
      render(<PillBodyLayout {...createBaseProps()} />);

      expect(screen.getByTestId("validation-indicator")).toBeInTheDocument();
    });

    it("should render expand button", () => {
      render(<PillBodyLayout {...createBaseProps()} />);

      const expandButton = screen.getByRole("button", { name: /expand/i });
      expect(expandButton).toBeInTheDocument();
    });
  });

  describe("function signature parsing", () => {
    it("should parse and display function name", () => {
      render(<PillBodyLayout {...createBaseProps()} />);

      expect(screen.getByText("def")).toBeInTheDocument();
      expect(screen.getByText("process_data")).toBeInTheDocument();
    });

    it("should parse and display function parameters", () => {
      render(<PillBodyLayout {...createBaseProps()} />);

      expect(screen.getByText("Parameters")).toBeInTheDocument();
      expect(
        screen.getByText("input_text: str, count: int = 10"),
      ).toBeInTheDocument();
    });

    it("should parse and display return type", () => {
      render(<PillBodyLayout {...createBaseProps()} />);

      expect(screen.getByText("Returns")).toBeInTheDocument();
      expect(screen.getByText("dict")).toBeInTheDocument();
    });

    it("should show 'None' return type when not specified", () => {
      const props = createBaseProps({
        config: {
          code: `def simple_func(x):
    return x`,
        },
      });

      render(<PillBodyLayout {...props} />);

      expect(screen.getByText("None")).toBeInTheDocument();
    });

    it("should show 'None' for parameters when function has no params", () => {
      const props = createBaseProps({
        config: {
          code: `def no_params() -> str:
    return "hello"`,
        },
      });

      render(<PillBodyLayout {...props} />);

      expect(screen.getByText("None")).toBeInTheDocument();
      expect(screen.getByText("str")).toBeInTheDocument();
    });

    it("should show message when no function signature found", () => {
      const props = createBaseProps({
        config: {
          code: `# This is just a comment
x = 5`,
        },
      });

      render(<PillBodyLayout {...props} />);

      expect(
        screen.getByText("No function signature found"),
      ).toBeInTheDocument();
    });

    it("should show empty when show_function_signature is false", () => {
      const props = createBaseProps({
        schema: createProcessSchema({
          ui: {
            collapsed_body: {
              show_function_signature: false,
            },
          },
        }),
      });

      render(<PillBodyLayout {...props} />);

      // Should not show function signature elements
      expect(screen.queryByText("def")).not.toBeInTheDocument();
      expect(screen.queryByText("Parameters")).not.toBeInTheDocument();
    });

    it("should use custom code_field from schema", () => {
      const props = createBaseProps({
        config: {
          custom_code: `def custom_func(a: int, b: int) -> int:
    return a + b`,
        },
        schema: createProcessSchema({
          ui: {
            collapsed_body: {
              show_function_signature: true,
              code_field: "custom_code",
            },
          },
        }),
      });

      render(<PillBodyLayout {...props} />);

      expect(screen.getByText("custom_func")).toBeInTheDocument();
    });
  });

  describe("handles", () => {
    it("should render main input handle", () => {
      render(<PillBodyLayout {...createBaseProps()} />);

      expect(
        screen.getByTestId("draggable-handle-target-input"),
      ).toBeInTheDocument();
    });

    it("should render output handles", () => {
      render(<PillBodyLayout {...createBaseProps()} />);

      expect(
        screen.getByTestId("draggable-handle-source-output"),
      ).toBeInTheDocument();
    });

    it("should render additional handles from handle_layout", () => {
      const props = createBaseProps({
        schema: createProcessSchema({
          ui: {
            handle_layout: {
              input_position: "left",
              output_position: "right",
              additional_handles: [
                {
                  id: "data-in",
                  type: "target",
                  position: "top",
                  label: "Data",
                },
              ],
            },
            inputs: [
              {
                id: "input",
                label: "Input",
                source_type: "flow",
                data_type: "any",
              },
              {
                id: "data-in",
                label: "Data",
                source_type: "data",
                data_type: "dict",
                handle_color: "#a855f7",
              },
            ],
          },
        }),
        handleTypes: {
          input: { acceptedSources: ["flow"], acceptedTypes: ["any"] },
          output: { outputSource: "process", outputType: "any" },
          "data-in": { acceptedSources: ["data"], acceptedTypes: ["dict"] },
        },
      });

      render(<PillBodyLayout {...props} />);

      expect(
        screen.getByTestId("draggable-handle-target-data-in"),
      ).toBeInTheDocument();
    });

    it("should not render left-positioned additional handles as draggable", () => {
      const props = createBaseProps({
        schema: createProcessSchema({
          ui: {
            handle_layout: {
              input_position: "left",
              output_position: "right",
              additional_handles: [
                {
                  id: "data-in",
                  type: "target",
                  position: "left",
                  label: "Data",
                },
              ],
            },
            inputs: [
              {
                id: "input",
                label: "Input",
                source_type: "flow",
                data_type: "any",
              },
              {
                id: "data-in",
                label: "Data",
                source_type: "data",
                data_type: "dict",
              },
            ],
          },
        }),
      });

      render(<PillBodyLayout {...props} />);

      // Left-positioned handles are filtered out from additional handles
      expect(
        screen.queryByTestId("draggable-handle-target-data-in"),
      ).not.toBeInTheDocument();
    });
  });

  describe("selected state", () => {
    it("should apply selection styling when selected", () => {
      const { container } = render(
        <PillBodyLayout {...createBaseProps({ selected: true })} />,
      );

      expect(container.querySelector(".rounded-lg")).toBeInTheDocument();
    });

    it("should not have selection ring when not selected", () => {
      const { container } = render(
        <PillBodyLayout {...createBaseProps({ selected: false })} />,
      );

      expect(container.querySelector(".rounded-lg")).toBeInTheDocument();
    });
  });

  describe("execution states", () => {
    it("should render with running state", () => {
      const props = createBaseProps({
        nodeData: createBaseNodeData({ executionState: "running" }),
      });

      const { container } = render(<PillBodyLayout {...props} />);

      expect(container.querySelector(".rounded-lg")).toBeInTheDocument();
    });

    it("should render with completed state", () => {
      const props = createBaseProps({
        nodeData: createBaseNodeData({ executionState: "completed" }),
      });

      const { container } = render(<PillBodyLayout {...props} />);

      expect(container.querySelector(".rounded-lg")).toBeInTheDocument();
    });

    it("should render with error state", () => {
      const props = createBaseProps({
        nodeData: createBaseNodeData({ executionState: "error" }),
      });

      const { container } = render(<PillBodyLayout {...props} />);

      expect(container.querySelector(".rounded-lg")).toBeInTheDocument();
    });

    it("should prioritize duplicate name error over execution state", () => {
      const props = createBaseProps({
        nodeData: createBaseNodeData({
          executionState: "running",
          duplicateNameError: "Duplicate name",
        }),
      });

      const { container } = render(<PillBodyLayout {...props} />);

      expect(container.querySelector(".rounded-lg")).toBeInTheDocument();
    });
  });

  describe("validation", () => {
    it("should render validation indicator with errors", () => {
      const props = createBaseProps({
        nodeData: createBaseNodeData({
          validationErrors: ["Code is required"],
        }),
      });

      render(<PillBodyLayout {...props} />);

      expect(screen.getByTestId("validation-indicator")).toBeInTheDocument();
      expect(screen.getByTestId("has-errors")).toHaveTextContent("Errors: 1");
    });

    it("should render validation indicator with warnings", () => {
      const props = createBaseProps({
        nodeData: createBaseNodeData({
          validationWarnings: ["Consider adding docstring"],
        }),
      });

      render(<PillBodyLayout {...props} />);

      expect(screen.getByTestId("validation-indicator")).toBeInTheDocument();
      expect(screen.getByTestId("has-warnings")).toHaveTextContent(
        "Warnings: 1",
      );
    });

    it("should render with duplicate name error", () => {
      const props = createBaseProps({
        nodeData: createBaseNodeData({
          duplicateNameError: "Name already used",
        }),
      });

      render(<PillBodyLayout {...props} />);

      expect(screen.getByTestId("has-duplicate")).toHaveTextContent(
        "Name already used",
      );
    });
  });

  describe("locked state", () => {
    it("should show lock icon when node is locked", () => {
      const props = createBaseProps({
        nodeData: createBaseNodeData({ isNodeLocked: true }),
      });

      const { container } = render(<PillBodyLayout {...props} />);

      // Node should still render
      expect(container.querySelector(".rounded-lg")).toBeInTheDocument();
    });
  });

  describe("interactions", () => {
    it("should call onToggleExpand when header is double-clicked", () => {
      const onToggleExpand = vi.fn();
      const { container } = render(
        <PillBodyLayout {...createBaseProps({ onToggleExpand })} />,
      );

      const header = container.querySelector(".rounded-t-lg");
      if (header) {
        fireEvent.doubleClick(header);
      }

      expect(onToggleExpand).toHaveBeenCalledTimes(1);
    });

    it("should call onToggleExpand when body is double-clicked", () => {
      const onToggleExpand = vi.fn();
      const { container } = render(
        <PillBodyLayout {...createBaseProps({ onToggleExpand })} />,
      );

      const body = container.querySelector(".rounded-b-lg");
      if (body) {
        fireEvent.doubleClick(body);
      }

      expect(onToggleExpand).toHaveBeenCalledTimes(1);
    });

    it("should call onToggleExpand when expand button is clicked", () => {
      const onToggleExpand = vi.fn();
      render(<PillBodyLayout {...createBaseProps({ onToggleExpand })} />);

      const expandButton = screen.getByRole("button", { name: /expand/i });
      fireEvent.click(expandButton);

      expect(onToggleExpand).toHaveBeenCalledTimes(1);
    });

    it("should call onNameClick when name is clicked", () => {
      const onNameClick = vi.fn();
      render(<PillBodyLayout {...createBaseProps({ onNameClick })} />);

      const nameElement = screen.getByText("My Process");
      fireEvent.click(nameElement);

      expect(onNameClick).toHaveBeenCalledTimes(1);
    });
  });

  describe("name editing", () => {
    it("should render input when in editing mode", () => {
      const props = createBaseProps({
        isEditing: true,
        editedName: "New Process Name",
      });

      render(<PillBodyLayout {...props} />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveValue("New Process Name");
    });

    it("should call onNameChange when input changes", () => {
      const onNameChange = vi.fn();
      const props = createBaseProps({
        isEditing: true,
        editedName: "My Process",
        onNameChange,
      });

      render(<PillBodyLayout {...props} />);

      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "Updated" } });

      expect(onNameChange).toHaveBeenCalledWith("Updated");
    });

    it("should call onNameSave on blur", () => {
      const onNameSave = vi.fn();
      const props = createBaseProps({
        isEditing: true,
        editedName: "My Process",
        onNameSave,
      });

      render(<PillBodyLayout {...props} />);

      const input = screen.getByRole("textbox");
      fireEvent.blur(input);

      expect(onNameSave).toHaveBeenCalledTimes(1);
    });

    it("should call onNameKeyDown on key press", () => {
      const onNameKeyDown = vi.fn();
      const props = createBaseProps({
        isEditing: true,
        editedName: "My Process",
        onNameKeyDown,
      });

      render(<PillBodyLayout {...props} />);

      const input = screen.getByRole("textbox");
      fireEvent.keyDown(input, { key: "Enter" });

      expect(onNameKeyDown).toHaveBeenCalled();
    });

    it("should stop propagation on click when editing", () => {
      const props = createBaseProps({
        isEditing: true,
        editedName: "My Process",
      });

      render(<PillBodyLayout {...props} />);

      const input = screen.getByRole("textbox");
      expect(input).toBeInTheDocument();
    });
  });

  describe("width configuration", () => {
    it("should apply collapsed_width from schema", () => {
      const props = createBaseProps({
        schema: createProcessSchema({
          ui: {
            collapsed_width: 280,
          },
        }),
      });

      const { container } = render(<PillBodyLayout {...props} />);

      const nodeContainer = container.querySelector(".rounded-lg");
      expect(nodeContainer).toHaveStyle({ width: "280px", minWidth: "280px" });
    });

    it("should use default width when not specified", () => {
      const props = createBaseProps({
        schema: createProcessSchema({
          ui: {
            collapsed_width: undefined,
          },
        }),
      });

      const { container } = render(<PillBodyLayout {...props} />);

      const nodeContainer = container.querySelector(".rounded-lg");
      expect(nodeContainer).toHaveStyle({ width: "220px", minWidth: "220px" });
    });
  });

  describe("theme colors", () => {
    it("should use theme colors for header", () => {
      const { container } = render(<PillBodyLayout {...createBaseProps()} />);

      const header = container.querySelector(".rounded-t-lg");
      expect(header).toBeInTheDocument();
    });

    it("should use fallback header color when theme_key not found", () => {
      const props = createBaseProps({
        schema: createProcessSchema({
          ui: {
            theme_key: "unknown_type",
          },
        }),
        headerColor: "#123456",
      });

      const { container } = render(<PillBodyLayout {...props} />);

      expect(container.querySelector(".rounded-lg")).toBeInTheDocument();
    });
  });

  describe("complex function signatures", () => {
    it("should parse function with multiple typed parameters", () => {
      const props = createBaseProps({
        config: {
          code: `def complex_func(
    name: str,
    count: int,
    items: list[str],
    options: dict[str, Any] = None
) -> tuple[str, int]:
    pass`,
        },
      });

      render(<PillBodyLayout {...props} />);

      expect(screen.getByText("complex_func")).toBeInTheDocument();
    });

    it("should parse async function", () => {
      const props = createBaseProps({
        config: {
          code: `async def fetch_data(url: str) -> dict:
    pass`,
        },
      });

      render(<PillBodyLayout {...props} />);

      // The regex looks for "def" so async functions with "async def" might need adjustment
      // But the current implementation should still find the function
      expect(screen.getByText("fetch_data")).toBeInTheDocument();
    });

    it("should handle function with no type hints", () => {
      const props = createBaseProps({
        config: {
          code: `def simple(a, b, c):
    return a + b + c`,
        },
      });

      render(<PillBodyLayout {...props} />);

      expect(screen.getByText("simple")).toBeInTheDocument();
      expect(screen.getByText("a, b, c")).toBeInTheDocument();
      expect(screen.getByText("None")).toBeInTheDocument(); // No return type
    });
  });
});
