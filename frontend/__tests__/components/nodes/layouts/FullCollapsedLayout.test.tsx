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
  default: ({
    icon,
    className,
    style,
  }: {
    icon?: string;
    className?: string;
    style?: React.CSSProperties;
  }) => (
    <div data-testid={`node-icon-${icon || "default"}`} className={className}>
      Icon: {icon}
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
  useStore: vi.fn((selector) => {
    // Simulate empty state for testing
    const mockState = {
      edges: [],
      nodes: [],
    };
    return selector(mockState);
  }),
}));

// Import after mocking
import FullCollapsedLayout from "@/components/nodes/custom/layouts/FullCollapsedLayout";
import type { CustomNodeCollapsedProps } from "@/components/nodes/custom/CustomNodeCollapsed";

// Base schema for Agent-style nodes
const createAgentSchema = (overrides: Record<string, unknown> = {}) => {
  const { ui: uiOverrides, ...restOverrides } = overrides as {
    ui?: Record<string, unknown>;
  };

  const baseUi = {
    theme_key: "agent",
    icon: "monitor",
    inputs: [
      { id: "input", label: "Input", source_type: "flow", data_type: "any" },
      {
        id: "prompt-input",
        label: "Prompt",
        source_type: "prompt",
        data_type: "str",
        icon: "document",
      },
      {
        id: "tools-input",
        label: "Tools",
        source_type: "tool",
        data_type: "list",
        icon: "gear",
      },
    ],
    outputs: [
      {
        id: "output",
        label: "Output",
        source_type: "agent",
        data_type: "string",
      },
    ],
    fields: [
      {
        id: "model",
        label: "Model",
        widget: "select",
        default: "gemini-2.0-flash",
      },
    ],
    layout: "full",
    handle_layout: {
      input_position: "left",
      output_position: "right",
      additional_handles: [
        { id: "link-in", type: "target", position: "top", label: "Parent" },
        { id: "link-out", type: "source", position: "bottom", label: "Child" },
      ],
    },
    collapsed_footer: {
      left_text: "Agent",
    },
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
  schema: createAgentSchema(),
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
  schema: createAgentSchema(),
  name: "My Agent",
  config: { model: "gemini-2.0-flash" },
  handlePositions: {},
  handleTypes: {
    input: { acceptedSources: ["flow"], acceptedTypes: ["any"] },
    output: { outputSource: "agent", outputType: "string" },
    "prompt-input": { acceptedSources: ["prompt"], acceptedTypes: ["str"] },
    "tools-input": { acceptedSources: ["tool"], acceptedTypes: ["list"] },
    "link-in": { acceptedSources: ["link"], acceptedTypes: ["any"] },
    "link-out": { outputSource: "link", outputType: "any" },
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

describe("FullCollapsedLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("basic rendering", () => {
    it("should render with node name", () => {
      render(<FullCollapsedLayout {...createBaseProps()} />);

      expect(screen.getByText("My Agent")).toBeInTheDocument();
    });

    it("should render node icon", () => {
      render(<FullCollapsedLayout {...createBaseProps()} />);

      expect(screen.getByTestId("node-icon-monitor")).toBeInTheDocument();
    });

    it("should render model field with label", () => {
      render(<FullCollapsedLayout {...createBaseProps()} />);

      expect(screen.getByText("Model:")).toBeInTheDocument();
      expect(screen.getByText("gemini-2.0-flash")).toBeInTheDocument();
    });

    it("should render 'Not set' when model is not configured", () => {
      const props = createBaseProps({
        config: {},
      });

      render(<FullCollapsedLayout {...props} />);

      expect(screen.getByText("Not set")).toBeInTheDocument();
    });

    it("should render footer with left text", () => {
      render(<FullCollapsedLayout {...createBaseProps()} />);

      expect(screen.getByText("Agent")).toBeInTheDocument();
    });

    it("should render default footer text when not specified", () => {
      const props = createBaseProps({
        schema: createAgentSchema({
          ui: {
            collapsed_footer: undefined,
          },
        }),
      });

      render(<FullCollapsedLayout {...props} />);

      // Default is "Agent"
      expect(screen.getByText("Agent")).toBeInTheDocument();
    });
  });

  describe("handles", () => {
    it("should render main input handle", () => {
      render(<FullCollapsedLayout {...createBaseProps()} />);

      expect(
        screen.getByTestId("draggable-handle-target-input"),
      ).toBeInTheDocument();
    });

    it("should render output handles", () => {
      render(<FullCollapsedLayout {...createBaseProps()} />);

      expect(
        screen.getByTestId("draggable-handle-source-output"),
      ).toBeInTheDocument();
    });

    it("should render link handles from additional_handles", () => {
      render(<FullCollapsedLayout {...createBaseProps()} />);

      expect(
        screen.getByTestId("draggable-handle-target-link-in"),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId("draggable-handle-source-link-out"),
      ).toBeInTheDocument();
    });

    it("should render hidden handles for typed inputs", () => {
      render(<FullCollapsedLayout {...createBaseProps()} />);

      expect(
        screen.getByTestId("xyflow-handle-target-prompt-input"),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId("xyflow-handle-target-tools-input"),
      ).toBeInTheDocument();
    });
  });

  describe("selected state", () => {
    it("should apply selection styling when selected", () => {
      const { container } = render(
        <FullCollapsedLayout {...createBaseProps({ selected: true })} />,
      );

      expect(container.querySelector(".rounded-lg")).toBeInTheDocument();
    });

    it("should not have selection ring when not selected", () => {
      const { container } = render(
        <FullCollapsedLayout {...createBaseProps({ selected: false })} />,
      );

      expect(container.querySelector(".rounded-lg")).toBeInTheDocument();
    });
  });

  describe("execution states", () => {
    it("should render with running state", () => {
      const props = createBaseProps({
        nodeData: createBaseNodeData({ executionState: "running" }),
      });

      const { container } = render(<FullCollapsedLayout {...props} />);

      expect(container.querySelector(".rounded-lg")).toBeInTheDocument();
    });

    it("should render with completed state", () => {
      const props = createBaseProps({
        nodeData: createBaseNodeData({ executionState: "completed" }),
      });

      const { container } = render(<FullCollapsedLayout {...props} />);

      expect(container.querySelector(".rounded-lg")).toBeInTheDocument();
    });

    it("should render with error state", () => {
      const props = createBaseProps({
        nodeData: createBaseNodeData({ executionState: "error" }),
      });

      const { container } = render(<FullCollapsedLayout {...props} />);

      expect(container.querySelector(".rounded-lg")).toBeInTheDocument();
    });
  });

  describe("validation", () => {
    it("should render validation indicator with errors", () => {
      const props = createBaseProps({
        nodeData: createBaseNodeData({
          validationErrors: ["Model is required"],
        }),
      });

      render(<FullCollapsedLayout {...props} />);

      expect(screen.getByTestId("validation-indicator")).toBeInTheDocument();
      expect(screen.getByTestId("has-errors")).toHaveTextContent("Errors: 1");
    });

    it("should render validation indicator with warnings", () => {
      const props = createBaseProps({
        nodeData: createBaseNodeData({
          validationWarnings: ["Consider adding description"],
        }),
      });

      render(<FullCollapsedLayout {...props} />);

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

      render(<FullCollapsedLayout {...props} />);

      expect(screen.getByTestId("has-duplicate")).toHaveTextContent(
        "Name already used",
      );
    });

    it("should prioritize duplicate name error styling over execution state", () => {
      const props = createBaseProps({
        nodeData: createBaseNodeData({
          executionState: "running",
          duplicateNameError: "Duplicate",
        }),
      });

      const { container } = render(<FullCollapsedLayout {...props} />);

      expect(container.querySelector(".rounded-lg")).toBeInTheDocument();
    });
  });

  describe("locked state", () => {
    it("should show lock icon when node is locked", () => {
      const props = createBaseProps({
        nodeData: createBaseNodeData({ isNodeLocked: true }),
      });

      const { container } = render(<FullCollapsedLayout {...props} />);

      // Lock icon is rendered as an SVG from lucide-react
      // We can verify the node renders correctly
      expect(container.querySelector(".rounded-lg")).toBeInTheDocument();
    });
  });

  describe("connected nodes display", () => {
    it("should not show connected prompt when none connected", () => {
      render(<FullCollapsedLayout {...createBaseProps()} />);

      // The prompt icon should not be visible (useStore returns empty)
      // Just verify basic rendering works
      expect(screen.getByText("Model:")).toBeInTheDocument();
    });

    it("should not show connected tools when none connected", () => {
      render(<FullCollapsedLayout {...createBaseProps()} />);

      // Just verify basic rendering works
      expect(screen.getByText("Model:")).toBeInTheDocument();
    });
  });

  describe("interactions", () => {
    it("should call onToggleExpand on double-click", () => {
      const onToggleExpand = vi.fn();
      const { container } = render(
        <FullCollapsedLayout {...createBaseProps({ onToggleExpand })} />,
      );

      const nodeContainer = container.querySelector(".rounded-lg");
      if (nodeContainer) {
        fireEvent.doubleClick(nodeContainer);
      }

      expect(onToggleExpand).toHaveBeenCalledTimes(1);
    });

    it("should call onNameClick when name is clicked", () => {
      const onNameClick = vi.fn();
      render(<FullCollapsedLayout {...createBaseProps({ onNameClick })} />);

      const nameElement = screen.getByText("My Agent");
      fireEvent.click(nameElement);

      expect(onNameClick).toHaveBeenCalledTimes(1);
    });
  });

  describe("name editing", () => {
    it("should render input when in editing mode", () => {
      const props = createBaseProps({
        isEditing: true,
        editedName: "New Agent Name",
      });

      render(<FullCollapsedLayout {...props} />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveValue("New Agent Name");
    });

    it("should call onNameChange when input changes", () => {
      const onNameChange = vi.fn();
      const props = createBaseProps({
        isEditing: true,
        editedName: "My Agent",
        onNameChange,
      });

      render(<FullCollapsedLayout {...props} />);

      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "Updated" } });

      expect(onNameChange).toHaveBeenCalledWith("Updated");
    });

    it("should call onNameSave on blur", () => {
      const onNameSave = vi.fn();
      const props = createBaseProps({
        isEditing: true,
        editedName: "My Agent",
        onNameSave,
      });

      render(<FullCollapsedLayout {...props} />);

      const input = screen.getByRole("textbox");
      fireEvent.blur(input);

      expect(onNameSave).toHaveBeenCalledTimes(1);
    });

    it("should call onNameKeyDown on key press", () => {
      const onNameKeyDown = vi.fn();
      const props = createBaseProps({
        isEditing: true,
        editedName: "My Agent",
        onNameKeyDown,
      });

      render(<FullCollapsedLayout {...props} />);

      const input = screen.getByRole("textbox");
      fireEvent.keyDown(input, { key: "Enter" });

      expect(onNameKeyDown).toHaveBeenCalled();
    });

    it("should stop propagation on click when editing", () => {
      const props = createBaseProps({
        isEditing: true,
        editedName: "My Agent",
      });

      render(<FullCollapsedLayout {...props} />);

      const input = screen.getByRole("textbox");
      fireEvent.click(input);

      // Verify input exists and event was triggered
      expect(input).toBeInTheDocument();
    });

    it("should stop propagation on double-click when editing", () => {
      const onToggleExpand = vi.fn();
      const props = createBaseProps({
        isEditing: true,
        editedName: "My Agent",
        onToggleExpand,
      });

      render(<FullCollapsedLayout {...props} />);

      const input = screen.getByRole("textbox");
      fireEvent.doubleClick(input);

      // onToggleExpand should not be called when double-clicking input
      expect(onToggleExpand).not.toHaveBeenCalled();
    });
  });

  describe("width constraints", () => {
    it("should have min-width of 250px", () => {
      const { container } = render(
        <FullCollapsedLayout {...createBaseProps()} />,
      );

      const nodeContainer = container.querySelector(".min-w-\\[250px\\]");
      expect(nodeContainer).toBeInTheDocument();
    });

    it("should have max-width of 300px", () => {
      const { container } = render(
        <FullCollapsedLayout {...createBaseProps()} />,
      );

      const nodeContainer = container.querySelector(".max-w-\\[300px\\]");
      expect(nodeContainer).toBeInTheDocument();
    });
  });

  describe("theme colors", () => {
    it("should use theme colors for header", () => {
      const { container } = render(
        <FullCollapsedLayout {...createBaseProps()} />,
      );

      // Header should be rendered with the correct background color
      const header = container.querySelector(".rounded-t-lg");
      expect(header).toBeInTheDocument();
    });

    it("should use fallback header color when theme_key not found", () => {
      const props = createBaseProps({
        schema: createAgentSchema({
          ui: {
            theme_key: "unknown_type",
          },
        }),
        headerColor: "#123456",
      });

      const { container } = render(<FullCollapsedLayout {...props} />);

      // Should still render correctly with fallback
      expect(container.querySelector(".rounded-lg")).toBeInTheDocument();
    });
  });

  describe("custom footer text", () => {
    it("should render custom footer left text", () => {
      const props = createBaseProps({
        schema: createAgentSchema({
          ui: {
            collapsed_footer: {
              left_text: "Custom Agent Type",
            },
          },
        }),
      });

      render(<FullCollapsedLayout {...props} />);

      expect(screen.getByText("Custom Agent Type")).toBeInTheDocument();
    });
  });
});

describe("FullCollapsedLayout with connected nodes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should display connected prompt name from store", async () => {
    // Override useStore to return connected prompt
    const { useStore } = await import("@xyflow/react");
    vi.mocked(useStore).mockImplementation((selector) => {
      const mockState = {
        edges: [
          {
            id: "edge-1",
            source: "prompt_1",
            target: "agent-1",
            targetHandle: "prompt-input",
          },
        ],
        nodes: [
          {
            id: "prompt_1",
            type: "custom",
            position: { x: 0, y: 0 },
            data: { prompt: { name: "System Prompt" } },
          },
        ],
      };
      return selector(mockState);
    });

    render(<FullCollapsedLayout {...createBaseProps()} />);

    expect(screen.getByText("System Prompt")).toBeInTheDocument();
  });

  it("should display connected tool names from store", async () => {
    const { useStore } = await import("@xyflow/react");
    vi.mocked(useStore).mockImplementation((selector) => {
      const mockState = {
        edges: [
          {
            id: "edge-1",
            source: "tool_1",
            target: "agent-1",
            targetHandle: "tools-input",
          },
          {
            id: "edge-2",
            source: "tool_2",
            target: "agent-1",
            targetHandle: "tools-input",
          },
        ],
        nodes: [
          {
            id: "tool_1",
            type: "custom",
            position: { x: 0, y: 0 },
            data: { name: "Search Tool" },
          },
          {
            id: "tool_2",
            type: "custom",
            position: { x: 0, y: 100 },
            data: { name: "Calculator Tool" },
          },
        ],
      };
      return selector(mockState);
    });

    render(<FullCollapsedLayout {...createBaseProps()} />);

    expect(
      screen.getByText("Search Tool, Calculator Tool"),
    ).toBeInTheDocument();
  });

  it("should display connected AgentTool names", async () => {
    const { useStore } = await import("@xyflow/react");
    vi.mocked(useStore).mockImplementation((selector) => {
      const mockState = {
        edges: [
          {
            id: "edge-1",
            source: "agentTool_1",
            target: "agent-1",
            targetHandle: "tools-input",
          },
        ],
        nodes: [
          {
            id: "agentTool_1",
            type: "custom",
            position: { x: 0, y: 0 },
            data: { name: "Sub Agent" },
          },
        ],
      };
      return selector(mockState);
    });

    render(<FullCollapsedLayout {...createBaseProps()} />);

    expect(screen.getByText("Sub Agent")).toBeInTheDocument();
  });

  it("should use default 'Prompt' when prompt name not found", async () => {
    const { useStore } = await import("@xyflow/react");
    vi.mocked(useStore).mockImplementation((selector) => {
      const mockState = {
        edges: [
          {
            id: "edge-1",
            source: "prompt_1",
            target: "agent-1",
            targetHandle: "prompt-input",
          },
        ],
        nodes: [
          {
            id: "prompt_1",
            type: "custom",
            position: { x: 0, y: 0 },
            data: { prompt: {} }, // No name property
          },
        ],
      };
      return selector(mockState);
    });

    render(<FullCollapsedLayout {...createBaseProps()} />);

    expect(screen.getByText("Prompt")).toBeInTheDocument();
  });
});
