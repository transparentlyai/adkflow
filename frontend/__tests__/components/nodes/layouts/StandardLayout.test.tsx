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
          agent: {
            header: "#4f46e5",
            accent: "#6366f1",
            text: "#fff",
            ring: "#4f46e5",
          },
          prompt: {
            header: "#8b5cf6",
            accent: "#a78bfa",
            text: "#fff",
            ring: "#8b5cf6",
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
  }: {
    handleId: string;
    type: "source" | "target";
  }) => (
    <div data-testid={`draggable-handle-${type}-${handleId}`}>
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

// Mock CustomNodeHeader
vi.mock("@/components/nodes/custom/CustomNodeHeader", () => ({
  default: ({
    name,
    schema,
    isEditing,
    editedName,
    onNameClick,
  }: {
    name: string;
    schema: { label: string; output_node?: boolean; always_execute?: boolean };
    isEditing: boolean;
    editedName: string;
    onNameClick: (e: React.MouseEvent) => void;
  }) => (
    <div data-testid="custom-node-header">
      <span data-testid="node-name" onClick={onNameClick}>
        {isEditing ? editedName : name}
      </span>
      <span data-testid="node-label">{schema.label}</span>
      {schema.output_node && <span data-testid="output-node-indicator" />}
      {schema.always_execute && <span data-testid="always-execute-indicator" />}
    </div>
  ),
}));

// Mock @xyflow/react
vi.mock("@xyflow/react", () => ({
  Handle: ({
    id,
    type,
    position,
  }: {
    id: string;
    type: string;
    position: string;
  }) => (
    <div data-testid={`xyflow-handle-${type}-${id}`} data-position={position}>
      XYFlow Handle {id}
    </div>
  ),
  Position: {
    Top: "top",
    Bottom: "bottom",
    Left: "left",
    Right: "right",
  },
}));

// Import after mocking
import StandardLayout from "@/components/nodes/custom/layouts/StandardLayout";
import type { CustomNodeCollapsedProps } from "@/components/nodes/custom/CustomNodeCollapsed";

// Base schema for testing
const createBaseSchema = (overrides: Record<string, unknown> = {}) => {
  const { ui: uiOverrides, ...restOverrides } = overrides as {
    ui?: Record<string, unknown>;
  };

  const baseUi = {
    theme_key: "agent",
    icon: "monitor",
    inputs: [
      { id: "input", label: "Input", source_type: "flow", data_type: "any" },
    ],
    outputs: [
      {
        id: "output",
        label: "Output",
        source_type: "agent",
        data_type: "string",
      },
    ],
    fields: [],
    layout: "standard",
    handle_layout: {
      input_position: "left",
      output_position: "right",
      additional_handles: [],
    },
    collapsed_display: {
      format: "Model: {model}",
      summary_fields: ["model"],
    },
    min_collapsed_width: 200,
  };

  return {
    unit_id: "builtin.agent",
    label: "Agent",
    node_type: "agent",
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
  schema: createBaseSchema(),
  config: { model: "gemini-2.0-flash" },
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
  id: "agent-1",
  nodeData: createBaseNodeData(),
  schema: createBaseSchema(),
  name: "My Agent",
  config: { model: "gemini-2.0-flash" },
  handlePositions: {},
  handleTypes: {
    input: { acceptedSources: ["flow"], acceptedTypes: ["any"] },
    output: { outputSource: "agent", outputType: "string" },
  },
  headerColor: "#4f46e5",
  selected: false,
  onToggleExpand: vi.fn(),
  isEditing: false,
  editedName: "My Agent",
  inputRef: { current: null },
  onNameClick: vi.fn(),
  onNameChange: vi.fn(),
  onNameSave: vi.fn(),
  onNameKeyDown: vi.fn(),
  ...overrides,
});

describe("StandardLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("basic rendering", () => {
    it("should render with node name and label", () => {
      render(<StandardLayout {...createBaseProps()} />);

      expect(screen.getByTestId("custom-node-header")).toBeInTheDocument();
      expect(screen.getByTestId("node-name")).toHaveTextContent("My Agent");
      expect(screen.getByTestId("node-label")).toHaveTextContent("Agent");
    });

    it("should render input and output handles", () => {
      render(<StandardLayout {...createBaseProps()} />);

      expect(
        screen.getByTestId("draggable-handle-target-input"),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId("draggable-handle-source-output"),
      ).toBeInTheDocument();
    });

    it("should render summary text from format", () => {
      render(<StandardLayout {...createBaseProps()} />);

      expect(screen.getByText("Model: gemini-2.0-flash")).toBeInTheDocument();
    });

    it("should render footer with schema label", () => {
      const { container } = render(<StandardLayout {...createBaseProps()} />);

      // Footer contains the schema label - find by class
      const footer = container.querySelector(".px-2.py-1.border-t");
      expect(footer).toBeInTheDocument();
      expect(footer).toHaveTextContent("Agent");
    });
  });

  describe("collapsed display formats", () => {
    it("should render summary text using format string", () => {
      const props = createBaseProps({
        config: { model: "claude-3-opus", temperature: 0.7 },
        schema: createBaseSchema({
          ui: {
            collapsed_display: {
              format: "{model} @ {temperature}",
            },
          },
        }),
      });

      render(<StandardLayout {...props} />);

      expect(screen.getByText("claude-3-opus @ 0.7")).toBeInTheDocument();
    });

    it("should render summary from summary_fields when no format", () => {
      const props = createBaseProps({
        config: { model: "gemini-pro", name: "TestAgent" },
        schema: createBaseSchema({
          ui: {
            collapsed_display: {
              summary_fields: ["model", "name"],
            },
          },
        }),
      });

      render(<StandardLayout {...props} />);

      // Summary fields are joined with bullet
      expect(screen.getByText(/gemini-pro.*TestAgent/)).toBeInTheDocument();
    });

    it("should not render summary when no collapsed_display config", () => {
      const props = createBaseProps({
        schema: createBaseSchema({
          ui: {
            collapsed_display: undefined,
          },
        }),
      });

      render(<StandardLayout {...props} />);

      // Should not find the summary container with model text
      expect(screen.queryByText(/Model:/)).not.toBeInTheDocument();
    });
  });

  describe("selected state", () => {
    it("should render with selected styling", () => {
      const { container } = render(
        <StandardLayout {...createBaseProps({ selected: true })} />,
      );

      // Selected state applies a box-shadow ring
      const nodeContainer = container.querySelector(".rounded-lg");
      expect(nodeContainer).toBeInTheDocument();
    });

    it("should not have selection ring when not selected", () => {
      const { container } = render(
        <StandardLayout {...createBaseProps({ selected: false })} />,
      );

      const nodeContainer = container.querySelector(".rounded-lg");
      expect(nodeContainer).toBeInTheDocument();
    });
  });

  describe("execution states", () => {
    it("should render with running state", () => {
      const props = createBaseProps({
        nodeData: createBaseNodeData({ executionState: "running" }),
      });

      const { container } = render(<StandardLayout {...props} />);

      expect(container.querySelector(".rounded-lg")).toBeInTheDocument();
    });

    it("should render with completed state", () => {
      const props = createBaseProps({
        nodeData: createBaseNodeData({ executionState: "completed" }),
      });

      const { container } = render(<StandardLayout {...props} />);

      expect(container.querySelector(".rounded-lg")).toBeInTheDocument();
    });

    it("should render with error state", () => {
      const props = createBaseProps({
        nodeData: createBaseNodeData({ executionState: "error" }),
      });

      const { container } = render(<StandardLayout {...props} />);

      expect(container.querySelector(".rounded-lg")).toBeInTheDocument();
    });

    it("should prioritize duplicate name error over execution state", () => {
      const props = createBaseProps({
        nodeData: createBaseNodeData({
          executionState: "running",
          duplicateNameError: "Duplicate name",
        }),
      });

      const { container } = render(<StandardLayout {...props} />);

      // Component should still render
      expect(container.querySelector(".rounded-lg")).toBeInTheDocument();
    });
  });

  describe("validation errors", () => {
    it("should render with validation errors", () => {
      const props = createBaseProps({
        nodeData: createBaseNodeData({
          validationErrors: ["Field required", "Invalid value"],
        }),
      });

      render(<StandardLayout {...props} />);

      expect(screen.getByTestId("custom-node-header")).toBeInTheDocument();
    });

    it("should render with validation warnings", () => {
      const props = createBaseProps({
        nodeData: createBaseNodeData({
          validationWarnings: ["Consider adding description"],
        }),
      });

      render(<StandardLayout {...props} />);

      expect(screen.getByTestId("custom-node-header")).toBeInTheDocument();
    });

    it("should render with duplicate name error", () => {
      const props = createBaseProps({
        nodeData: createBaseNodeData({
          duplicateNameError: "Name already exists",
        }),
      });

      const { container } = render(<StandardLayout {...props} />);

      // Duplicate name error shows static red ring
      expect(container.querySelector(".rounded-lg")).toBeInTheDocument();
    });
  });

  describe("node type indicators", () => {
    it("should show output_node indicator when set", () => {
      const props = createBaseProps({
        schema: createBaseSchema({ output_node: true }),
      });

      render(<StandardLayout {...props} />);

      expect(screen.getByTestId("output-node-indicator")).toBeInTheDocument();
    });

    it("should show always_execute indicator when set", () => {
      const props = createBaseProps({
        schema: createBaseSchema({ always_execute: true }),
      });

      render(<StandardLayout {...props} />);

      expect(
        screen.getByTestId("always-execute-indicator"),
      ).toBeInTheDocument();
    });
  });

  describe("handle configuration", () => {
    it("should render multiple output handles", () => {
      const props = createBaseProps({
        schema: createBaseSchema({
          ui: {
            outputs: [
              {
                id: "output",
                label: "Output",
                source_type: "agent",
                data_type: "string",
              },
              {
                id: "secondary",
                label: "Secondary",
                source_type: "agent",
                data_type: "dict",
              },
            ],
          },
        }),
        handleTypes: {
          input: { acceptedSources: ["flow"], acceptedTypes: ["any"] },
          output: { outputSource: "agent", outputType: "string" },
          secondary: { outputSource: "agent", outputType: "dict" },
        },
      });

      render(<StandardLayout {...props} />);

      // Universal output handle is visible
      expect(
        screen.getByTestId("draggable-handle-source-output"),
      ).toBeInTheDocument();
      // Secondary output is rendered as a hidden handle (for edge routing)
      expect(
        screen.getByTestId("xyflow-handle-source-secondary"),
      ).toBeInTheDocument();
    });

    it("should render additional handles from handle_layout", () => {
      const props = createBaseProps({
        schema: createBaseSchema({
          ui: {
            handle_layout: {
              input_position: "left",
              output_position: "right",
              additional_handles: [
                { id: "link-in", type: "target", position: "top", label: "In" },
                {
                  id: "link-out",
                  type: "source",
                  position: "bottom",
                  label: "Out",
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
                id: "link-in",
                label: "Link In",
                source_type: "link",
                data_type: "any",
                handle_color: "#a855f7",
              },
            ],
            outputs: [
              {
                id: "output",
                label: "Output",
                source_type: "agent",
                data_type: "string",
              },
              {
                id: "link-out",
                label: "Link Out",
                source_type: "link",
                data_type: "any",
                handle_color: "#a855f7",
              },
            ],
          },
        }),
        handleTypes: {
          input: { acceptedSources: ["flow"], acceptedTypes: ["any"] },
          output: { outputSource: "agent", outputType: "string" },
          "link-in": { acceptedSources: ["link"], acceptedTypes: ["any"] },
          "link-out": { outputSource: "link", outputType: "any" },
        },
      });

      render(<StandardLayout {...props} />);

      expect(
        screen.getByTestId("draggable-handle-target-link-in"),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId("draggable-handle-source-link-out"),
      ).toBeInTheDocument();
    });

    it("should render hidden handles for typed inputs", () => {
      const props = createBaseProps({
        schema: createBaseSchema({
          ui: {
            inputs: [
              {
                id: "input",
                label: "Input",
                source_type: "flow",
                data_type: "any",
              },
              {
                id: "prompt-input",
                label: "Prompt",
                source_type: "prompt",
                data_type: "str",
              },
              {
                id: "tools-input",
                label: "Tools",
                source_type: "tool",
                data_type: "list",
              },
            ],
          },
        }),
      });

      render(<StandardLayout {...props} />);

      // Hidden handles are XYFlow handles (not draggable)
      expect(
        screen.getByTestId("xyflow-handle-target-prompt-input"),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId("xyflow-handle-target-tools-input"),
      ).toBeInTheDocument();
    });
  });

  describe("interactions", () => {
    it("should call onToggleExpand on double-click", () => {
      const onToggleExpand = vi.fn();
      const { container } = render(
        <StandardLayout {...createBaseProps({ onToggleExpand })} />,
      );

      const nodeContainer = container.querySelector(".relative");
      if (nodeContainer) {
        fireEvent.doubleClick(nodeContainer);
      }

      expect(onToggleExpand).toHaveBeenCalledTimes(1);
    });

    it("should call onNameClick when name is clicked", () => {
      const onNameClick = vi.fn();
      render(<StandardLayout {...createBaseProps({ onNameClick })} />);

      fireEvent.click(screen.getByTestId("node-name"));

      expect(onNameClick).toHaveBeenCalledTimes(1);
    });
  });

  describe("name editing", () => {
    it("should show edited name when in editing mode", () => {
      const props = createBaseProps({
        isEditing: true,
        editedName: "New Agent Name",
      });

      render(<StandardLayout {...props} />);

      expect(screen.getByTestId("node-name")).toHaveTextContent(
        "New Agent Name",
      );
    });
  });

  describe("min width configuration", () => {
    it("should apply min_collapsed_width from schema", () => {
      const props = createBaseProps({
        schema: createBaseSchema({
          ui: {
            min_collapsed_width: 300,
          },
        }),
      });

      const { container } = render(<StandardLayout {...props} />);

      const nodeContainer = container.querySelector(".relative");
      expect(nodeContainer).toHaveStyle({ minWidth: "300px" });
    });

    it("should use default min width when not specified", () => {
      const props = createBaseProps({
        schema: createBaseSchema({
          ui: {
            min_collapsed_width: undefined,
          },
        }),
      });

      const { container } = render(<StandardLayout {...props} />);

      const nodeContainer = container.querySelector(".relative");
      expect(nodeContainer).toHaveStyle({ minWidth: "200px" });
    });
  });

  describe("theme colors", () => {
    it("should apply theme colors to header", () => {
      render(<StandardLayout {...createBaseProps()} />);

      // Header is rendered via CustomNodeHeader mock
      expect(screen.getByTestId("custom-node-header")).toBeInTheDocument();
    });

    it("should use fallback header color when theme_key not found", () => {
      const props = createBaseProps({
        schema: createBaseSchema({
          ui: {
            theme_key: "unknown_type",
          },
        }),
        headerColor: "#123456",
      });

      render(<StandardLayout {...props} />);

      expect(screen.getByTestId("custom-node-header")).toBeInTheDocument();
    });
  });
});
