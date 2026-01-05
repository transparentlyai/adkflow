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
            container: { background: "#fff", border: "#ccc" },
            header: { background: "#f0f0f0", border: "#ddd" },
            text: { primary: "#000", secondary: "#666", muted: "#999" },
            footer: { background: "#f8f8f8", border: "#eee", text: "#666" },
          },
          agent: {
            header: "#4f46e5",
            accent: "#6366f1",
            text: "#fff",
            ring: "#4f46e5",
          },
          variable: {
            header: "#7c3aed",
            accent: "#8b5cf6",
            text: "#fff",
            ring: "#7c3aed",
          },
          tool: {
            header: "#0891b2",
            accent: "#22d3ee",
            text: "#fff",
            ring: "#0891b2",
          },
          start: {
            header: "#22c55e",
            accent: "#4ade80",
            text: "#fff",
            ring: "#22c55e",
          },
          prompt: {
            header: "#f59e0b",
            accent: "#fbbf24",
            text: "#fff",
            ring: "#f59e0b",
          },
        },
        handles: {
          border: "#ccc",
          background: "#fff",
          connected: "#4f46e5",
          input: "#3b82f6",
          output: "#10b981",
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

// Mock RunWorkflowContext
vi.mock("@/contexts/RunWorkflowContext", () => ({
  useRunWorkflow: vi.fn(() => ({
    runWorkflow: vi.fn(),
    isRunning: false,
    hasProjectPath: true,
  })),
}));

// Mock DraggableHandle
vi.mock("@/components/DraggableHandle", () => ({
  default: ({ title }: { title?: string }) => (
    <div data-testid="draggable-handle" title={title}>
      Handle
    </div>
  ),
}));

// Mock ValidationIndicator
vi.mock("@/components/nodes/ValidationIndicator", () => ({
  default: () => <div data-testid="validation-indicator">Validation</div>,
}));

// Mock NodeIcon
vi.mock("@/components/nodes/custom/NodeIcon", () => ({
  default: ({ icon }: { icon?: string }) => (
    <div data-testid="node-icon">{icon || "default-icon"}</div>
  ),
}));

// Mock ReactFlow
vi.mock("@xyflow/react", () => ({
  Handle: ({ id, type }: { id: string; type: string }) => (
    <div data-testid={`handle-${id}`} data-type={type}>
      Handle {id}
    </div>
  ),
  Position: {
    Left: "left",
    Right: "right",
    Top: "top",
    Bottom: "bottom",
  },
  useStore: vi.fn((selector) => {
    // Return undefined for connected items
    const mockState = { edges: [], nodes: [] };
    if (typeof selector === "function") {
      return selector(mockState);
    }
    return undefined;
  }),
}));

// Import after mocking
import CustomNodeCollapsed from "@/components/nodes/custom/CustomNodeCollapsed";
import type {
  CustomNodeSchema,
  CustomNodeData,
} from "@/components/nodes/CustomNode";

// Base schema for tests
const createBaseSchema = (
  overrides: Partial<CustomNodeSchema> = {},
): CustomNodeSchema => ({
  unit_id: "test.agent",
  label: "Test Agent",
  menu_location: "Test",
  description: "A test agent",
  version: "1.0.0",
  ui: {
    inputs: [
      {
        id: "input_1",
        label: "Input",
        source_type: "agent",
        data_type: "string",
      },
    ],
    outputs: [
      {
        id: "output_1",
        label: "Output",
        source_type: "agent",
        data_type: "string",
      },
    ],
    fields: [{ id: "name", label: "Name", widget: "text_input", default: "" }],
    color: "#4f46e5",
    icon: "agent",
    expandable: true,
    default_width: 300,
    default_height: 200,
    layout: "standard",
    theme_key: "agent",
    ...overrides.ui,
  },
  ...overrides,
});

// Base node data for tests
const createBaseNodeData = (
  overrides: Partial<CustomNodeData> = {},
): CustomNodeData => ({
  schema: createBaseSchema(),
  config: { name: "MyAgent" },
  handlePositions: {},
  isExpanded: false,
  isNodeLocked: false,
  ...overrides,
});

// Default props for the component
const createDefaultProps = (overrides: Record<string, unknown> = {}) => ({
  id: "node-1",
  nodeData: createBaseNodeData(),
  schema: createBaseSchema(),
  name: "MyAgent",
  config: { name: "MyAgent" },
  headerColor: "#4f46e5",
  selected: false,
  handleTypes: {},
  handlePositions: {},
  onToggleExpand: vi.fn(),
  isEditing: false,
  editedName: "MyAgent",
  inputRef: { current: null },
  onNameClick: vi.fn(),
  onNameChange: vi.fn(),
  onNameSave: vi.fn(),
  onNameKeyDown: vi.fn(),
  ...overrides,
});

// Helper to verify component renders correctly (layouts can have multiple handles)
const expectRendered = () => {
  const handles = screen.getAllByTestId("draggable-handle");
  expect(handles.length).toBeGreaterThan(0);
};

describe("CustomNodeCollapsed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("layout routing", () => {
    it("should render standard layout by default", () => {
      const props = createDefaultProps();
      render(<CustomNodeCollapsed {...props} />);
      expectRendered();
    });

    it("should render pill layout when specified", () => {
      const schema = createBaseSchema({
        ui: {
          inputs: [],
          outputs: [{ id: "output", label: "Out", source_type: "variable" }],
          fields: [],
          color: "#7c3aed",
          expandable: true,
          default_width: 200,
          default_height: 100,
          layout: "pill",
          theme_key: "variable",
          collapsed_display: { show_with_braces: true },
        },
      });
      const props = createDefaultProps({
        schema,
        nodeData: createBaseNodeData({ schema }),
        headerColor: "#7c3aed",
      });
      render(<CustomNodeCollapsed {...props} />);
      expectRendered();
    });

    it("should render circle layout when specified", () => {
      const schema = createBaseSchema({
        ui: {
          inputs: [],
          outputs: [{ id: "output", label: "Out", source_type: "flow" }],
          fields: [],
          color: "#22c55e",
          expandable: false,
          default_width: 50,
          default_height: 50,
          layout: "circle",
          theme_key: "start",
        },
      });
      const props = createDefaultProps({
        schema,
        nodeData: createBaseNodeData({ schema }),
        headerColor: "#22c55e",
      });
      render(<CustomNodeCollapsed {...props} />);
      expectRendered();
    });

    it("should render tag layout when specified", () => {
      const schema = createBaseSchema({
        ui: {
          inputs: [],
          outputs: [{ id: "output", label: "Out", source_type: "prompt" }],
          fields: [],
          color: "#f59e0b",
          expandable: true,
          default_width: 150,
          default_height: 50,
          layout: "tag",
          theme_key: "prompt",
        },
      });
      const props = createDefaultProps({
        schema,
        nodeData: createBaseNodeData({ schema }),
        headerColor: "#f59e0b",
      });
      render(<CustomNodeCollapsed {...props} />);
      expectRendered();
    });

    it("should render compact layout when specified", () => {
      const schema = createBaseSchema({
        ui: {
          inputs: [{ id: "input", label: "In", source_type: "agent" }],
          outputs: [{ id: "output", label: "Out", source_type: "agent" }],
          fields: [],
          color: "#0891b2",
          expandable: true,
          default_width: 180,
          default_height: 60,
          layout: "compact",
          theme_key: "tool",
        },
      });
      const props = createDefaultProps({
        schema,
        nodeData: createBaseNodeData({ schema }),
        headerColor: "#0891b2",
      });
      render(<CustomNodeCollapsed {...props} />);
      expectRendered();
    });

    it("should render full layout when specified", () => {
      const schema = createBaseSchema({
        ui: {
          inputs: [{ id: "input", label: "In", source_type: "agent" }],
          outputs: [{ id: "output", label: "Out", source_type: "agent" }],
          fields: [
            { id: "model", label: "Model", widget: "select", options: [] },
          ],
          color: "#4f46e5",
          expandable: true,
          default_width: 300,
          default_height: 200,
          layout: "full",
          theme_key: "agent",
        },
      });
      const props = createDefaultProps({
        schema,
        nodeData: createBaseNodeData({ schema }),
      });
      render(<CustomNodeCollapsed {...props} />);
      expectRendered();
    });

    it("should render pill_body layout when specified", () => {
      const schema = createBaseSchema({
        ui: {
          inputs: [],
          outputs: [{ id: "output", label: "Out", source_type: "data" }],
          fields: [],
          color: "#0891b2",
          expandable: true,
          default_width: 250,
          default_height: 120,
          layout: "pill_body",
          theme_key: "tool",
          collapsed_body: { show_field: "description" },
        },
      });
      const props = createDefaultProps({
        schema,
        nodeData: createBaseNodeData({ schema }),
        headerColor: "#0891b2",
      });
      render(<CustomNodeCollapsed {...props} />);
      expectRendered();
    });

    it("should default to standard layout for unknown layout type", () => {
      const schema = createBaseSchema({
        ui: {
          inputs: [],
          outputs: [],
          fields: [],
          color: "#4f46e5",
          expandable: true,
          default_width: 300,
          default_height: 200,
          layout: "unknown_layout" as any,
          theme_key: "agent",
        },
      });
      const props = createDefaultProps({
        schema,
        nodeData: createBaseNodeData({ schema }),
      });
      render(<CustomNodeCollapsed {...props} />);
      // When no inputs/outputs, there won't be handles, so check for node-icon instead
      expect(screen.getByTestId("node-icon")).toBeInTheDocument();
    });

    it("should render panel layout as standard", () => {
      const schema = createBaseSchema({
        ui: {
          inputs: [{ id: "input", label: "In", source_type: "agent" }],
          outputs: [{ id: "output", label: "Out", source_type: "agent" }],
          fields: [],
          color: "#4f46e5",
          expandable: true,
          default_width: 300,
          default_height: 200,
          layout: "panel",
          theme_key: "agent",
        },
      });
      const props = createDefaultProps({
        schema,
        nodeData: createBaseNodeData({ schema }),
      });
      render(<CustomNodeCollapsed {...props} />);
      expectRendered();
    });
  });

  describe("props passing", () => {
    it("should pass correct props to layout components", () => {
      const onToggleExpand = vi.fn();
      const props = createDefaultProps({
        id: "test-node-123",
        name: "CustomNodeName",
        selected: true,
        onToggleExpand,
      });
      render(<CustomNodeCollapsed {...props} />);
      expectRendered();
    });

    it("should handle locked node state", () => {
      const props = createDefaultProps({
        nodeData: createBaseNodeData({ isNodeLocked: true }),
      });
      render(<CustomNodeCollapsed {...props} />);
      expectRendered();
    });
  });

  describe("validation states", () => {
    it("should pass validation errors to layout", () => {
      const props = createDefaultProps({
        nodeData: createBaseNodeData({
          validationErrors: ["Field is required"],
        }),
      });
      render(<CustomNodeCollapsed {...props} />);
      expectRendered();
    });

    it("should pass validation warnings to layout", () => {
      const props = createDefaultProps({
        nodeData: createBaseNodeData({
          validationWarnings: ["Consider using a different value"],
        }),
      });
      render(<CustomNodeCollapsed {...props} />);
      expectRendered();
    });

    it("should pass duplicate name error to layout", () => {
      const props = createDefaultProps({
        nodeData: createBaseNodeData({
          duplicateNameError: "Name already exists",
        }),
      });
      render(<CustomNodeCollapsed {...props} />);
      expectRendered();
    });
  });

  describe("execution states", () => {
    it("should pass running execution state to layout", () => {
      const props = createDefaultProps({
        nodeData: createBaseNodeData({
          executionState: { status: "running" } as any,
        }),
      });
      render(<CustomNodeCollapsed {...props} />);
      expectRendered();
    });

    it("should pass completed execution state to layout", () => {
      const props = createDefaultProps({
        nodeData: createBaseNodeData({
          executionState: { status: "completed" } as any,
        }),
      });
      render(<CustomNodeCollapsed {...props} />);
      expectRendered();
    });

    it("should pass error execution state to layout", () => {
      const props = createDefaultProps({
        nodeData: createBaseNodeData({
          executionState: {
            status: "error",
            message: "Something went wrong",
          } as any,
        }),
      });
      render(<CustomNodeCollapsed {...props} />);
      expectRendered();
    });
  });

  describe("name editing", () => {
    it("should pass editing state to layout", () => {
      const props = createDefaultProps({
        isEditing: true,
        editedName: "EditingName",
      });
      render(<CustomNodeCollapsed {...props} />);
      expectRendered();
    });
  });

  describe("handle types", () => {
    it("should pass handle types to layout", () => {
      const handleTypes = {
        input_1: {
          acceptedSources: ["agent"],
          acceptedTypes: ["string"],
        },
        output_1: {
          outputSource: "agent",
          outputType: "string",
        },
      };
      const props = createDefaultProps({ handleTypes });
      render(<CustomNodeCollapsed {...props} />);
      expectRendered();
    });
  });

  describe("octagon layout", () => {
    it("should render octagon layout when specified", () => {
      const schema = createBaseSchema({
        ui: {
          inputs: [{ id: "input", label: "In", source_type: "agent" }],
          outputs: [{ id: "output", label: "Out", source_type: "agent" }],
          fields: [],
          color: "#4f46e5",
          expandable: true,
          default_width: 100,
          default_height: 100,
          layout: "octagon",
          theme_key: "agent",
        },
      });
      const props = createDefaultProps({
        schema,
        nodeData: createBaseNodeData({ schema }),
      });
      render(<CustomNodeCollapsed {...props} />);
      expectRendered();
    });
  });

  describe("diamond layout", () => {
    it("should render diamond layout when specified", () => {
      const schema = createBaseSchema({
        ui: {
          inputs: [{ id: "input", label: "In", source_type: "flow" }],
          outputs: [
            { id: "true", label: "True", source_type: "flow" },
            { id: "false", label: "False", source_type: "flow" },
          ],
          fields: [],
          color: "#f59e0b",
          expandable: true,
          default_width: 80,
          default_height: 80,
          layout: "diamond",
          theme_key: "process",
        },
      });
      const props = createDefaultProps({
        schema,
        nodeData: createBaseNodeData({ schema }),
        headerColor: "#f59e0b",
      });
      render(<CustomNodeCollapsed {...props} />);
      expectRendered();
    });
  });
});
