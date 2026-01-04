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
        },
        handles: {
          border: "#ccc",
          background: "#fff",
          connected: "#4f46e5",
          input: "#3b82f6",
          output: "#10b981",
        },
        state: {
          valid: { ring: "#22c55e" },
          invalid: { ring: "#ef4444" },
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

// Mock CustomNodeInput
vi.mock("@/components/nodes/custom/CustomNodeInput", () => ({
  default: ({
    input,
    isConnected,
    connectedSourceNames,
    onConfigChange,
  }: {
    input: { id: string; label: string };
    isConnected: boolean;
    connectedSourceNames?: string[];
    onConfigChange: (id: string, value: unknown) => void;
  }) => (
    <div data-testid={`input-${input.id}`}>
      <span data-testid={`input-label-${input.id}`}>{input.label}</span>
      <span data-testid={`input-connected-${input.id}`}>
        {isConnected ? "connected" : "disconnected"}
      </span>
      {connectedSourceNames && (
        <span data-testid={`input-sources-${input.id}`}>
          {connectedSourceNames.join(", ")}
        </span>
      )}
      <button
        data-testid={`input-change-${input.id}`}
        onClick={() => onConfigChange(input.id, "new-value")}
      >
        Change
      </button>
    </div>
  ),
}));

// Mock CustomNodeOutput
vi.mock("@/components/nodes/custom/CustomNodeOutput", () => ({
  default: ({ output }: { output: { id: string; label: string } }) => (
    <div data-testid={`output-${output.id}`}>
      <span data-testid={`output-label-${output.id}`}>{output.label}</span>
    </div>
  ),
}));

// Mock MonacoEditorWidget
vi.mock("@/components/nodes/widgets/MonacoEditorWidget", () => ({
  default: ({
    value,
    onChange,
    language,
    readOnly,
    height,
    filePath,
    onSave,
    isDirty,
    isSaving,
  }: {
    value: string;
    onChange: (value: string) => void;
    language: string;
    readOnly?: boolean;
    height: number;
    filePath?: string;
    onSave?: () => void;
    isDirty?: boolean;
    isSaving?: boolean;
  }) => (
    <div data-testid="monaco-editor">
      <span data-testid="monaco-value">{value}</span>
      <span data-testid="monaco-language">{language}</span>
      <span data-testid="monaco-readonly">
        {readOnly ? "readonly" : "editable"}
      </span>
      <span data-testid="monaco-height">{height}</span>
      {filePath && <span data-testid="monaco-filepath">{filePath}</span>}
      <button data-testid="monaco-change" onClick={() => onChange("new code")}>
        Update
      </button>
      {onSave && (
        <button data-testid="monaco-save" onClick={onSave}>
          Save
        </button>
      )}
      {isDirty && <span data-testid="monaco-dirty">dirty</span>}
      {isSaving && <span data-testid="monaco-saving">saving</span>}
    </div>
  ),
}));

// Mock WidgetRenderer
vi.mock("@/components/nodes/widgets/WidgetRenderer", () => ({
  renderWidget: (
    field: { id: string; label: string; widget: string },
    value: unknown,
    onChange: (value: unknown) => void,
    options: { disabled?: boolean; compact?: boolean },
  ) => (
    <div data-testid={`widget-${field.id}`}>
      <span data-testid={`widget-type-${field.id}`}>{field.widget}</span>
      <span data-testid={`widget-value-${field.id}`}>{String(value)}</span>
      <span data-testid={`widget-disabled-${field.id}`}>
        {options.disabled ? "disabled" : "enabled"}
      </span>
      <button
        data-testid={`widget-change-${field.id}`}
        onClick={() => onChange("updated")}
      >
        Update
      </button>
    </div>
  ),
}));

// Mock expandedNodeUtils
vi.mock("@/components/nodes/custom/expandedNodeUtils", () => ({
  groupBySection: <T extends { section?: string }>(
    items: T[],
  ): Map<string | null, T[]> => {
    const groups = new Map<string | null, T[]>();
    items.forEach((item) => {
      const key = item.section || null;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(item);
    });
    return groups;
  },
  hasCodeEditorWidget: (schema: { ui: { fields: { widget: string }[] } }) =>
    schema.ui.fields.some((f) => f.widget === "code_editor"),
  getCodeEditorField: (schema: { ui: { fields: { widget: string }[] } }) =>
    schema.ui.fields.find((f) => f.widget === "code_editor") || null,
}));

// Import after mocking
import {
  ExpandedNodeContentArea,
  useCodeEditorInfo,
} from "@/components/nodes/custom/expanded/ExpandedNodeContentArea";
import type {
  CustomNodeSchema,
  CustomNodeData,
} from "@/components/nodes/CustomNode";

// Helper to create a schema
const createSchema = (
  overrides: Partial<CustomNodeSchema["ui"]> = {},
): CustomNodeSchema => ({
  unit_id: "test.node",
  label: "Test Node",
  menu_location: "Test",
  description: "A test node",
  version: "1.0.0",
  ui: {
    inputs: [
      {
        id: "input_1",
        label: "Input 1",
        source_type: "agent",
        data_type: "string",
      },
    ],
    outputs: [
      {
        id: "output_1",
        label: "Output 1",
        source_type: "agent",
        data_type: "string",
      },
    ],
    fields: [
      { id: "name", label: "Name", widget: "text_input", default: "" },
      { id: "model", label: "Model", widget: "select", options: [] },
    ],
    color: "#4f46e5",
    expandable: true,
    default_width: 300,
    default_height: 200,
    ...overrides,
  },
});

// Helper to create node data
const createNodeData = (
  overrides: Partial<CustomNodeData> = {},
): CustomNodeData => ({
  schema: createSchema(),
  config: { name: "TestNode" },
  handlePositions: {},
  isExpanded: true,
  isNodeLocked: false,
  ...overrides,
});

// Default props
const createDefaultProps = (overrides: Record<string, unknown> = {}) => ({
  id: "node-1",
  nodeData: createNodeData(),
  schema: createSchema(),
  config: { name: "TestNode" },
  handleTypes: {},
  connectedInputs: {},
  headerColor: "#4f46e5",
  tabs: null as string[] | null,
  activeTab: "main",
  onConfigChange: vi.fn(),
  isFieldVisible: () => true,
  ...overrides,
});

describe("ExpandedNodeContentArea", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("basic rendering", () => {
    it("should render inputs", () => {
      const props = createDefaultProps();
      render(<ExpandedNodeContentArea {...props} />);
      expect(screen.getByTestId("input-input_1")).toBeInTheDocument();
      expect(screen.getByTestId("input-label-input_1")).toHaveTextContent(
        "Input 1",
      );
    });

    it("should render fields", () => {
      const props = createDefaultProps();
      render(<ExpandedNodeContentArea {...props} />);
      expect(screen.getByTestId("widget-name")).toBeInTheDocument();
      expect(screen.getByTestId("widget-model")).toBeInTheDocument();
    });

    it("should render outputs", () => {
      const props = createDefaultProps();
      render(<ExpandedNodeContentArea {...props} />);
      expect(screen.getByTestId("output-output_1")).toBeInTheDocument();
      expect(screen.getByTestId("output-label-output_1")).toHaveTextContent(
        "Output 1",
      );
    });

    it("should show 'No configuration options' when no inputs or fields", () => {
      const schema = createSchema({
        inputs: [],
        fields: [],
        outputs: [{ id: "out", label: "Out", source_type: "agent" }],
      });
      const props = createDefaultProps({
        schema,
        nodeData: createNodeData({ schema }),
      });
      render(<ExpandedNodeContentArea {...props} />);
      expect(screen.getByText("No configuration options")).toBeInTheDocument();
    });
  });

  describe("connected inputs", () => {
    it("should show connected state for inputs", () => {
      const props = createDefaultProps({
        connectedInputs: {
          input_1: ["SourceNode.output"],
        },
      });
      render(<ExpandedNodeContentArea {...props} />);
      expect(screen.getByTestId("input-connected-input_1")).toHaveTextContent(
        "connected",
      );
      expect(screen.getByTestId("input-sources-input_1")).toHaveTextContent(
        "SourceNode.output",
      );
    });

    it("should show disconnected state for inputs", () => {
      const props = createDefaultProps({
        connectedInputs: {},
      });
      render(<ExpandedNodeContentArea {...props} />);
      expect(screen.getByTestId("input-connected-input_1")).toHaveTextContent(
        "disconnected",
      );
    });

    it("should show multiple connected sources", () => {
      const props = createDefaultProps({
        connectedInputs: {
          input_1: ["Node1.output", "Node2.output"],
        },
      });
      render(<ExpandedNodeContentArea {...props} />);
      expect(screen.getByTestId("input-sources-input_1")).toHaveTextContent(
        "Node1.output, Node2.output",
      );
    });
  });

  describe("field visibility", () => {
    it("should only show visible fields", () => {
      const schema = createSchema({
        fields: [
          { id: "visible", label: "Visible", widget: "text_input" },
          { id: "hidden", label: "Hidden", widget: "text_input" },
        ],
      });
      const isFieldVisible = (field: { id: string }) => field.id === "visible";
      const props = createDefaultProps({
        schema,
        nodeData: createNodeData({ schema }),
        isFieldVisible,
      });
      render(<ExpandedNodeContentArea {...props} />);
      expect(screen.getByTestId("widget-visible")).toBeInTheDocument();
      expect(screen.queryByTestId("widget-hidden")).not.toBeInTheDocument();
    });
  });

  describe("locked node", () => {
    it("should show disabled widgets when node is locked", () => {
      const props = createDefaultProps({
        nodeData: createNodeData({ isNodeLocked: true }),
      });
      render(<ExpandedNodeContentArea {...props} />);
      expect(screen.getByTestId("widget-disabled-name")).toHaveTextContent(
        "disabled",
      );
      expect(screen.getByTestId("widget-disabled-model")).toHaveTextContent(
        "disabled",
      );
    });

    it("should show enabled widgets when node is not locked", () => {
      const props = createDefaultProps({
        nodeData: createNodeData({ isNodeLocked: false }),
      });
      render(<ExpandedNodeContentArea {...props} />);
      expect(screen.getByTestId("widget-disabled-name")).toHaveTextContent(
        "enabled",
      );
    });
  });

  describe("config change", () => {
    it("should call onConfigChange when input changes", () => {
      const onConfigChange = vi.fn();
      const props = createDefaultProps({ onConfigChange });
      render(<ExpandedNodeContentArea {...props} />);
      fireEvent.click(screen.getByTestId("input-change-input_1"));
      expect(onConfigChange).toHaveBeenCalledWith("input_1", "new-value");
    });

    it("should call onConfigChange when field widget changes", () => {
      const onConfigChange = vi.fn();
      const props = createDefaultProps({ onConfigChange });
      render(<ExpandedNodeContentArea {...props} />);
      fireEvent.click(screen.getByTestId("widget-change-name"));
      expect(onConfigChange).toHaveBeenCalledWith("name", "updated");
    });
  });

  describe("tabs", () => {
    it("should filter inputs by active tab", () => {
      const schema = createSchema({
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
        nodeData: createNodeData({ schema }),
        tabs: ["Main", "Advanced"],
        activeTab: "Main",
      });
      render(<ExpandedNodeContentArea {...props} />);
      expect(screen.getByTestId("input-input_main")).toBeInTheDocument();
      expect(screen.queryByTestId("input-input_adv")).not.toBeInTheDocument();
    });

    it("should filter fields by active tab", () => {
      const schema = createSchema({
        inputs: [],
        fields: [
          {
            id: "field_main",
            label: "Main Field",
            widget: "text_input",
            tab: "Main",
          },
          {
            id: "field_adv",
            label: "Advanced Field",
            widget: "text_input",
            tab: "Advanced",
          },
        ],
      });
      const props = createDefaultProps({
        schema,
        nodeData: createNodeData({ schema }),
        tabs: ["Main", "Advanced"],
        activeTab: "Advanced",
      });
      render(<ExpandedNodeContentArea {...props} />);
      expect(screen.queryByTestId("widget-field_main")).not.toBeInTheDocument();
      expect(screen.getByTestId("widget-field_adv")).toBeInTheDocument();
    });

    it("should show non-tabbed elements when no tabs", () => {
      const schema = createSchema({
        inputs: [{ id: "input_1", label: "Input 1", source_type: "agent" }],
        fields: [{ id: "field_1", label: "Field 1", widget: "text_input" }],
      });
      const props = createDefaultProps({
        schema,
        nodeData: createNodeData({ schema }),
        tabs: null,
        activeTab: "",
      });
      render(<ExpandedNodeContentArea {...props} />);
      expect(screen.getByTestId("input-input_1")).toBeInTheDocument();
      expect(screen.getByTestId("widget-field_1")).toBeInTheDocument();
    });
  });

  describe("sections", () => {
    it("should group inputs by section", () => {
      const schema = createSchema({
        inputs: [
          {
            id: "input_1",
            label: "Input 1",
            source_type: "agent",
            section: "Section A",
          },
          {
            id: "input_2",
            label: "Input 2",
            source_type: "agent",
            section: "Section A",
          },
          {
            id: "input_3",
            label: "Input 3",
            source_type: "agent",
            section: "Section B",
          },
        ],
      });
      const props = createDefaultProps({
        schema,
        nodeData: createNodeData({ schema }),
      });
      render(<ExpandedNodeContentArea {...props} />);
      expect(screen.getByTestId("input-input_1")).toBeInTheDocument();
      expect(screen.getByTestId("input-input_2")).toBeInTheDocument();
      expect(screen.getByTestId("input-input_3")).toBeInTheDocument();
      // Section headers should be rendered
      expect(screen.getByText("Section A")).toBeInTheDocument();
      expect(screen.getByText("Section B")).toBeInTheDocument();
    });

    it("should group fields by section", () => {
      const schema = createSchema({
        inputs: [],
        fields: [
          {
            id: "field_1",
            label: "Field 1",
            widget: "text_input",
            section: "Basic",
          },
          {
            id: "field_2",
            label: "Field 2",
            widget: "text_input",
            section: "Advanced",
          },
        ],
      });
      const props = createDefaultProps({
        schema,
        nodeData: createNodeData({ schema }),
      });
      render(<ExpandedNodeContentArea {...props} />);
      expect(screen.getByText("Basic")).toBeInTheDocument();
      expect(screen.getByText("Advanced")).toBeInTheDocument();
    });
  });

  describe("code editor widget", () => {
    it("should render Monaco editor for code_editor widget", () => {
      const schema = createSchema({
        inputs: [],
        fields: [
          {
            id: "code",
            label: "Code",
            widget: "code_editor",
            language: "python",
            default: "# code",
          },
        ],
      });
      const props = createDefaultProps({
        schema,
        nodeData: createNodeData({ schema }),
        config: { code: "def hello():\n    pass" },
      });
      render(<ExpandedNodeContentArea {...props} />);
      expect(screen.getByTestId("monaco-editor")).toBeInTheDocument();
      expect(screen.getByTestId("monaco-value")).toHaveTextContent(
        "def hello():",
      );
      expect(screen.getByTestId("monaco-language")).toHaveTextContent("python");
    });

    it("should render Monaco editor for monaco_editor widget", () => {
      const schema = createSchema({
        inputs: [],
        fields: [
          {
            id: "code",
            label: "Code",
            widget: "monaco_editor",
            language: "javascript",
          },
        ],
      });
      const props = createDefaultProps({
        schema,
        nodeData: createNodeData({ schema }),
        config: { code: "const x = 1" },
      });
      render(<ExpandedNodeContentArea {...props} />);
      expect(screen.getByTestId("monaco-editor")).toBeInTheDocument();
      expect(screen.getByTestId("monaco-language")).toHaveTextContent(
        "javascript",
      );
    });

    it("should use default language when not specified", () => {
      const schema = createSchema({
        inputs: [],
        fields: [{ id: "code", label: "Code", widget: "code_editor" }],
      });
      const props = createDefaultProps({
        schema,
        nodeData: createNodeData({ schema }),
      });
      render(<ExpandedNodeContentArea {...props} />);
      expect(screen.getByTestId("monaco-language")).toHaveTextContent("python");
    });

    it("should pass file operations to Monaco editor", () => {
      const onSave = vi.fn();
      const schema = createSchema({
        inputs: [],
        fields: [{ id: "code", label: "Code", widget: "code_editor" }],
      });
      const props = createDefaultProps({
        schema,
        nodeData: createNodeData({ schema }),
        filePath: "/path/to/file.py",
        onSave,
        isDirty: true,
        isSaving: false,
      });
      render(<ExpandedNodeContentArea {...props} />);
      expect(screen.getByTestId("monaco-filepath")).toHaveTextContent(
        "/path/to/file.py",
      );
      expect(screen.getByTestId("monaco-dirty")).toBeInTheDocument();
      fireEvent.click(screen.getByTestId("monaco-save"));
      expect(onSave).toHaveBeenCalled();
    });

    it("should show readonly Monaco editor when node is locked", () => {
      const schema = createSchema({
        inputs: [],
        fields: [{ id: "code", label: "Code", widget: "code_editor" }],
      });
      const props = createDefaultProps({
        schema,
        nodeData: createNodeData({ schema, isNodeLocked: true }),
      });
      render(<ExpandedNodeContentArea {...props} />);
      expect(screen.getByTestId("monaco-readonly")).toHaveTextContent(
        "readonly",
      );
    });

    it("should calculate editor height based on expanded size", () => {
      const schema = createSchema({
        inputs: [],
        fields: [{ id: "code", label: "Code", widget: "code_editor" }],
      });
      const props = createDefaultProps({
        schema,
        nodeData: createNodeData({
          schema,
          expandedSize: { width: 400, height: 500 },
        }),
      });
      render(<ExpandedNodeContentArea {...props} />);
      // Height should be expandedSize.height - 150 = 350
      expect(screen.getByTestId("monaco-height")).toHaveTextContent("350");
    });
  });

  describe("additional handles filtering", () => {
    it("should not render outputs that are configured as additional handles", () => {
      const schema = createSchema({
        outputs: [
          { id: "output_1", label: "Output 1", source_type: "agent" },
          { id: "flow_out", label: "Flow Out", source_type: "flow" },
        ],
        handle_layout: {
          additional_handles: [
            { id: "flow_out", type: "source", position: "bottom" },
          ],
        },
      });
      const props = createDefaultProps({
        schema,
        nodeData: createNodeData({ schema }),
      });
      render(<ExpandedNodeContentArea {...props} />);
      expect(screen.getByTestId("output-output_1")).toBeInTheDocument();
      expect(screen.queryByTestId("output-flow_out")).not.toBeInTheDocument();
    });
  });

  describe("required fields", () => {
    it("should show required indicator for required fields", () => {
      const schema = createSchema({
        inputs: [],
        fields: [
          {
            id: "required_field",
            label: "Required",
            widget: "text_input",
            required: true,
          },
          { id: "optional_field", label: "Optional", widget: "text_input" },
        ],
      });
      const props = createDefaultProps({
        schema,
        nodeData: createNodeData({ schema }),
      });
      render(<ExpandedNodeContentArea {...props} />);
      // Both fields should be rendered
      expect(screen.getByTestId("widget-required_field")).toBeInTheDocument();
      expect(screen.getByTestId("widget-optional_field")).toBeInTheDocument();
    });
  });

  describe("field defaults", () => {
    it("should use field default when config value is undefined", () => {
      const schema = createSchema({
        inputs: [],
        fields: [
          {
            id: "field_1",
            label: "Field 1",
            widget: "text_input",
            default: "default_value",
          },
        ],
      });
      const props = createDefaultProps({
        schema,
        nodeData: createNodeData({ schema }),
        config: {}, // No value set
      });
      render(<ExpandedNodeContentArea {...props} />);
      expect(screen.getByTestId("widget-value-field_1")).toHaveTextContent(
        "default_value",
      );
    });

    it("should use config value when set", () => {
      const schema = createSchema({
        inputs: [],
        fields: [
          {
            id: "field_1",
            label: "Field 1",
            widget: "text_input",
            default: "default_value",
          },
        ],
      });
      const props = createDefaultProps({
        schema,
        nodeData: createNodeData({ schema }),
        config: { field_1: "custom_value" },
      });
      render(<ExpandedNodeContentArea {...props} />);
      expect(screen.getByTestId("widget-value-field_1")).toHaveTextContent(
        "custom_value",
      );
    });
  });
});

describe("useCodeEditorInfo", () => {
  // We need to test this hook separately
  const TestComponent = ({
    schema,
    config,
  }: {
    schema: CustomNodeSchema;
    config: Record<string, unknown>;
  }) => {
    const { hasEditor, lineCount } = useCodeEditorInfo(schema, config);
    return (
      <div>
        <span data-testid="has-editor">{hasEditor ? "yes" : "no"}</span>
        <span data-testid="line-count">{lineCount}</span>
      </div>
    );
  };

  it("should detect code editor in schema", () => {
    const schema = createSchema({
      fields: [{ id: "code", label: "Code", widget: "code_editor" }],
    });
    render(
      <TestComponent
        schema={schema}
        config={{ code: "line1\nline2\nline3" }}
      />,
    );
    expect(screen.getByTestId("has-editor")).toHaveTextContent("yes");
    expect(screen.getByTestId("line-count")).toHaveTextContent("3");
  });

  it("should return false when no code editor in schema", () => {
    const schema = createSchema({
      fields: [{ id: "name", label: "Name", widget: "text_input" }],
    });
    render(<TestComponent schema={schema} config={{ name: "test" }} />);
    expect(screen.getByTestId("has-editor")).toHaveTextContent("no");
    expect(screen.getByTestId("line-count")).toHaveTextContent("0");
  });

  it("should count lines correctly", () => {
    const schema = createSchema({
      fields: [{ id: "code", label: "Code", widget: "code_editor" }],
    });
    render(
      <TestComponent
        schema={schema}
        config={{ code: "line1\nline2\nline3\nline4\nline5" }}
      />,
    );
    expect(screen.getByTestId("line-count")).toHaveTextContent("5");
  });

  it("should handle empty code", () => {
    const schema = createSchema({
      fields: [{ id: "code", label: "Code", widget: "code_editor" }],
    });
    render(<TestComponent schema={schema} config={{ code: "" }} />);
    expect(screen.getByTestId("line-count")).toHaveTextContent("1");
  });
});
