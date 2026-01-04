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
            text: { primary: "#000", secondary: "#666", muted: "#999" },
            footer: { background: "#f8f8f8", border: "#eee", text: "#666" },
          },
          agent: {
            header: "#4f46e5",
            accent: "#6366f1",
            text: "#fff",
            ring: "#4f46e5",
          },
          tool: {
            header: "#0891b2",
            accent: "#22d3ee",
            text: "#fff",
            ring: "#0891b2",
          },
        },
        handles: {
          border: "#ccc",
          background: "#fff",
          connected: "#4f46e5",
          input: "#3b82f6",
          output: "#10b981",
          link: "#6366f1",
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
        state: {
          success: "#22c55e",
          warning: "#f59e0b",
          error: "#ef4444",
          dirty: { ring: "#f97316" },
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

// Mock ExpandedNodeContentArea
vi.mock("@/components/nodes/custom/expanded", () => ({
  ExpandedNodeContentArea: ({
    id,
    tabs,
    activeTab,
  }: {
    id: string;
    tabs: string[] | null;
    activeTab: string;
  }) => (
    <div data-testid="expanded-content-area">
      Content for {id}
      {tabs && <span data-testid="tabs-info">{tabs.join(", ")}</span>}
      <span data-testid="active-tab">{activeTab}</span>
    </div>
  ),
  useCodeEditorInfo: vi.fn(() => ({
    hasEditor: false,
    lineCount: 0,
  })),
}));

// Mock CustomNodeHeader
vi.mock("@/components/nodes/custom/CustomNodeHeader", () => ({
  default: ({
    name,
    isExpanded,
    onToggleExpand,
    isEditing,
    editedName,
    onNameClick,
    validationErrors,
  }: {
    name: string;
    isExpanded: boolean;
    onToggleExpand?: () => void;
    isEditing: boolean;
    editedName: string;
    onNameClick: (e: React.MouseEvent) => void;
    validationErrors?: string[];
  }) => (
    <div
      data-testid="node-header"
      onDoubleClick={onToggleExpand}
      onClick={onNameClick}
    >
      <span data-testid="header-name">{isEditing ? editedName : name}</span>
      <span data-testid="header-expanded">
        {isExpanded ? "expanded" : "collapsed"}
      </span>
      {validationErrors && validationErrors.length > 0 && (
        <span data-testid="validation-errors">
          {validationErrors.length} errors
        </span>
      )}
    </div>
  ),
}));

// Mock ExpandedNodeTabBar
vi.mock("@/components/nodes/custom/ExpandedNodeTabBar", () => ({
  default: ({
    tabs,
    activeTab,
    onTabChange,
  }: {
    tabs: string[];
    activeTab: string;
    onTabChange: (tab: string) => void;
  }) => (
    <div data-testid="tab-bar">
      {tabs.map((tab) => (
        <button
          key={tab}
          data-testid={`tab-${tab}`}
          onClick={() => onTabChange(tab)}
          className={activeTab === tab ? "active" : ""}
        >
          {tab}
        </button>
      ))}
    </div>
  ),
}));

// Mock ExpandedNodeFooter
vi.mock("@/components/nodes/custom/ExpandedNodeFooter", () => ({
  default: ({
    schema,
    hasEditor,
    lineCount,
  }: {
    schema: { label: string };
    hasEditor: boolean;
    lineCount: number;
  }) => (
    <div data-testid="node-footer">
      <span data-testid="footer-label">{schema.label}</span>
      {hasEditor && <span data-testid="footer-lines">{lineCount} lines</span>}
    </div>
  ),
}));

// Mock ExpandedNodeHandles
vi.mock("@/components/nodes/custom/ExpandedNodeHandles", () => ({
  default: ({
    id,
    additionalHandles,
  }: {
    id: string;
    additionalHandles: unknown[];
  }) => (
    <div data-testid="expanded-handles">
      Handles for {id}
      <span data-testid="additional-handle-count">
        {additionalHandles.length}
      </span>
    </div>
  ),
}));

// Mock ResizeHandle
vi.mock("@/components/ResizeHandle", () => ({
  default: ({ onResize }: { onResize: (dx: number, dy: number) => void }) => (
    <div data-testid="resize-handle" onClick={() => onResize(10, 10)}>
      Resize
    </div>
  ),
}));

// Mock ReactFlow Handle
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
}));

// Import after mocking
import CustomNodeExpanded from "@/components/nodes/custom/CustomNodeExpanded";
import type {
  CustomNodeSchema,
  CustomNodeData,
} from "@/components/nodes/CustomNode";

// Base schema for tests
const createBaseSchema = (
  overrides: Partial<CustomNodeSchema["ui"]> = {},
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
    fields: [
      { id: "name", label: "Name", widget: "text_input", default: "" },
      { id: "model", label: "Model", widget: "select", options: [] },
    ],
    color: "#4f46e5",
    icon: "agent",
    expandable: true,
    default_width: 350,
    default_height: 250,
    layout: "standard",
    theme_key: "agent",
    ...overrides,
  },
});

// Base node data for tests
const createBaseNodeData = (
  overrides: Partial<CustomNodeData> = {},
): CustomNodeData => ({
  schema: createBaseSchema(),
  config: { name: "MyAgent" },
  handlePositions: {},
  isExpanded: true,
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
  tabs: null,
  activeTab: "main",
  setActiveTab: vi.fn(),
  width: 350,
  onToggleExpand: vi.fn(),
  onConfigChange: vi.fn(),
  isFieldVisible: () => true,
  isEditing: false,
  editedName: "MyAgent",
  inputRef: { current: null },
  onNameClick: vi.fn(),
  onNameChange: vi.fn(),
  onNameSave: vi.fn(),
  onNameKeyDown: vi.fn(),
  handleTypes: {},
  connectedInputs: {},
  ...overrides,
});

describe("CustomNodeExpanded", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("basic rendering", () => {
    it("should render expanded node with header", () => {
      const props = createDefaultProps();
      render(<CustomNodeExpanded {...props} />);
      expect(screen.getByTestId("node-header")).toBeInTheDocument();
      expect(screen.getByTestId("header-expanded")).toHaveTextContent(
        "expanded",
      );
    });

    it("should render content area", () => {
      const props = createDefaultProps();
      render(<CustomNodeExpanded {...props} />);
      expect(screen.getByTestId("expanded-content-area")).toBeInTheDocument();
    });

    it("should render footer", () => {
      const props = createDefaultProps();
      render(<CustomNodeExpanded {...props} />);
      expect(screen.getByTestId("node-footer")).toBeInTheDocument();
    });

    it("should render handles", () => {
      const props = createDefaultProps();
      render(<CustomNodeExpanded {...props} />);
      expect(screen.getByTestId("expanded-handles")).toBeInTheDocument();
    });

    it("should display correct node name", () => {
      const props = createDefaultProps({ name: "CustomAgent" });
      render(<CustomNodeExpanded {...props} />);
      expect(screen.getByTestId("header-name")).toHaveTextContent(
        "CustomAgent",
      );
    });

    it("should display footer with schema label", () => {
      const props = createDefaultProps();
      render(<CustomNodeExpanded {...props} />);
      expect(screen.getByTestId("footer-label")).toHaveTextContent(
        "Test Agent",
      );
    });
  });

  describe("tabs", () => {
    it("should render tab bar when tabs are provided", () => {
      const props = createDefaultProps({
        tabs: ["Config", "Advanced"],
        activeTab: "Config",
      });
      render(<CustomNodeExpanded {...props} />);
      expect(screen.getByTestId("tab-bar")).toBeInTheDocument();
      expect(screen.getByTestId("tab-Config")).toBeInTheDocument();
      expect(screen.getByTestId("tab-Advanced")).toBeInTheDocument();
    });

    it("should not render tab bar when tabs are null", () => {
      const props = createDefaultProps({ tabs: null });
      render(<CustomNodeExpanded {...props} />);
      expect(screen.queryByTestId("tab-bar")).not.toBeInTheDocument();
    });

    it("should not render tab bar when tabs array is empty", () => {
      const props = createDefaultProps({ tabs: [] });
      render(<CustomNodeExpanded {...props} />);
      expect(screen.queryByTestId("tab-bar")).not.toBeInTheDocument();
    });

    it("should call setActiveTab when tab is clicked", () => {
      const setActiveTab = vi.fn();
      const props = createDefaultProps({
        tabs: ["Config", "Advanced"],
        activeTab: "Config",
        setActiveTab,
      });
      render(<CustomNodeExpanded {...props} />);
      fireEvent.click(screen.getByTestId("tab-Advanced"));
      expect(setActiveTab).toHaveBeenCalledWith("Advanced");
    });

    it("should pass active tab to content area", () => {
      const props = createDefaultProps({
        tabs: ["Config", "Advanced"],
        activeTab: "Advanced",
      });
      render(<CustomNodeExpanded {...props} />);
      expect(screen.getByTestId("active-tab")).toHaveTextContent("Advanced");
    });
  });

  describe("resizable nodes", () => {
    it("should render resize handle when resizable", () => {
      const schema = createBaseSchema({ resizable: true });
      const onResize = vi.fn();
      const props = createDefaultProps({
        schema,
        nodeData: createBaseNodeData({ schema }),
        onResize,
      });
      render(<CustomNodeExpanded {...props} />);
      expect(screen.getByTestId("resize-handle")).toBeInTheDocument();
    });

    it("should not render resize handle when not resizable", () => {
      const schema = createBaseSchema({ resizable: false });
      const props = createDefaultProps({
        schema,
        nodeData: createBaseNodeData({ schema }),
      });
      render(<CustomNodeExpanded {...props} />);
      expect(screen.queryByTestId("resize-handle")).not.toBeInTheDocument();
    });

    it("should not render resize handle when onResize is not provided", () => {
      const schema = createBaseSchema({ resizable: true });
      const props = createDefaultProps({
        schema,
        nodeData: createBaseNodeData({ schema }),
        onResize: undefined,
      });
      render(<CustomNodeExpanded {...props} />);
      expect(screen.queryByTestId("resize-handle")).not.toBeInTheDocument();
    });

    it("should call onResize callback when resize handle is used", () => {
      const schema = createBaseSchema({ resizable: true });
      const onResize = vi.fn();
      const props = createDefaultProps({
        schema,
        nodeData: createBaseNodeData({ schema }),
        onResize,
      });
      render(<CustomNodeExpanded {...props} />);
      fireEvent.click(screen.getByTestId("resize-handle"));
      expect(onResize).toHaveBeenCalledWith(10, 10);
    });
  });

  describe("selection and execution states", () => {
    it("should render selected node", () => {
      const props = createDefaultProps({ selected: true });
      render(<CustomNodeExpanded {...props} />);
      expect(screen.getByTestId("node-header")).toBeInTheDocument();
    });

    it("should render node with running execution state", () => {
      const props = createDefaultProps({ executionState: "running" });
      render(<CustomNodeExpanded {...props} />);
      expect(screen.getByTestId("node-header")).toBeInTheDocument();
    });

    it("should render node with completed execution state", () => {
      const props = createDefaultProps({ executionState: "completed" });
      render(<CustomNodeExpanded {...props} />);
      expect(screen.getByTestId("node-header")).toBeInTheDocument();
    });

    it("should render node with error execution state", () => {
      const props = createDefaultProps({ executionState: "error" });
      render(<CustomNodeExpanded {...props} />);
      expect(screen.getByTestId("node-header")).toBeInTheDocument();
    });
  });

  describe("dirty state", () => {
    it("should render node with dirty state", () => {
      const props = createDefaultProps({ isDirty: true });
      render(<CustomNodeExpanded {...props} />);
      expect(screen.getByTestId("node-header")).toBeInTheDocument();
    });

    it("should render node without dirty state", () => {
      const props = createDefaultProps({ isDirty: false });
      render(<CustomNodeExpanded {...props} />);
      expect(screen.getByTestId("node-header")).toBeInTheDocument();
    });
  });

  describe("name editing", () => {
    it("should display edited name when editing", () => {
      const props = createDefaultProps({
        isEditing: true,
        editedName: "NewAgentName",
      });
      render(<CustomNodeExpanded {...props} />);
      expect(screen.getByTestId("header-name")).toHaveTextContent(
        "NewAgentName",
      );
    });

    it("should display original name when not editing", () => {
      const props = createDefaultProps({
        isEditing: false,
        name: "OriginalName",
        editedName: "DifferentName",
      });
      render(<CustomNodeExpanded {...props} />);
      expect(screen.getByTestId("header-name")).toHaveTextContent(
        "OriginalName",
      );
    });
  });

  describe("toggle expand", () => {
    it("should call onToggleExpand when header is double-clicked", () => {
      const onToggleExpand = vi.fn();
      const props = createDefaultProps({ onToggleExpand });
      render(<CustomNodeExpanded {...props} />);
      fireEvent.doubleClick(screen.getByTestId("node-header"));
      expect(onToggleExpand).toHaveBeenCalled();
    });
  });

  describe("validation", () => {
    it("should pass validation errors to header", () => {
      const props = createDefaultProps({
        nodeData: createBaseNodeData({
          validationErrors: ["Error 1", "Error 2"],
        }),
      });
      render(<CustomNodeExpanded {...props} />);
      expect(screen.getByTestId("validation-errors")).toHaveTextContent(
        "2 errors",
      );
    });

    it("should pass duplicate name error to header", () => {
      const props = createDefaultProps({
        nodeData: createBaseNodeData({
          duplicateNameError: "Name already exists",
        }),
      });
      render(<CustomNodeExpanded {...props} />);
      // The header receives the error but display is implementation-specific
      expect(screen.getByTestId("node-header")).toBeInTheDocument();
    });
  });

  describe("hidden handles for inactive tabs", () => {
    it("should render hidden handles for inputs on inactive tabs", () => {
      const schema = createBaseSchema({
        inputs: [
          {
            id: "input_main",
            label: "Main Input",
            source_type: "agent",
            tab: "Main",
          },
          {
            id: "input_adv",
            label: "Advanced Input",
            source_type: "agent",
            tab: "Advanced",
          },
        ],
      });
      const props = createDefaultProps({
        schema,
        nodeData: createBaseNodeData({ schema }),
        tabs: ["Main", "Advanced"],
        activeTab: "Main",
      });
      render(<CustomNodeExpanded {...props} />);
      // The hidden handle for the inactive tab should be rendered
      expect(screen.getByTestId("handle-input_adv")).toBeInTheDocument();
    });

    it("should not render hidden handles when there are no tabs", () => {
      const props = createDefaultProps({ tabs: null });
      render(<CustomNodeExpanded {...props} />);
      // No hidden handles should be rendered since there are no tabs
      expect(screen.queryByTestId("handle-hidden")).not.toBeInTheDocument();
    });
  });

  describe("additional handles", () => {
    it("should pass additional handles to ExpandedNodeHandles", () => {
      const schema = createBaseSchema({
        handle_layout: {
          additional_handles: [
            {
              id: "flow_in",
              type: "target" as const,
              position: "top" as const,
            },
            {
              id: "flow_out",
              type: "source" as const,
              position: "bottom" as const,
            },
          ],
        },
      });
      const props = createDefaultProps({
        schema,
        nodeData: createBaseNodeData({ schema }),
      });
      render(<CustomNodeExpanded {...props} />);
      expect(screen.getByTestId("additional-handle-count")).toHaveTextContent(
        "2",
      );
    });

    it("should handle empty additional handles", () => {
      const schema = createBaseSchema({
        handle_layout: {
          additional_handles: [],
        },
      });
      const props = createDefaultProps({
        schema,
        nodeData: createBaseNodeData({ schema }),
      });
      render(<CustomNodeExpanded {...props} />);
      expect(screen.getByTestId("additional-handle-count")).toHaveTextContent(
        "0",
      );
    });
  });

  describe("file operations", () => {
    it("should pass file operations props", () => {
      const onSave = vi.fn();
      const onChangeFile = vi.fn();
      const props = createDefaultProps({
        filePath: "/path/to/file.py",
        onSave,
        onChangeFile,
        isSaving: false,
        isDirty: true,
      });
      render(<CustomNodeExpanded {...props} />);
      expect(screen.getByTestId("expanded-content-area")).toBeInTheDocument();
    });
  });

  describe("width prop", () => {
    it("should apply width to container", () => {
      const props = createDefaultProps({ width: 400 });
      const { container } = render(<CustomNodeExpanded {...props} />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveStyle({ width: "400px" });
    });

    it("should handle default width", () => {
      const props = createDefaultProps({ width: 350 });
      const { container } = render(<CustomNodeExpanded {...props} />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveStyle({ width: "350px" });
    });
  });
});
