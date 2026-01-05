import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

// Mocks must be in the test file for vi.mock hoisting to work
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
          agent: { header: "#4f46e5", accent: "#6366f1", text: "#fff", ring: "#4f46e5" },
        },
        handles: { border: "#ccc", background: "#fff", connected: "#4f46e5", input: "#3b82f6", output: "#10b981" },
        state: { valid: { ring: "#22c55e" }, invalid: { ring: "#ef4444" } },
      },
    },
  })),
}));

vi.mock("@/contexts/ConnectionContext", () => ({
  useConnection: vi.fn(() => ({
    connectionState: { isDragging: false, sourceNodeId: null, sourceOutputSource: null, sourceOutputType: null },
  })),
}));

vi.mock("@/components/nodes/custom/CustomNodeInput", () => ({
  default: ({ input, isConnected, connectedSourceNames, onConfigChange }: {
    input: { id: string; label: string }; isConnected: boolean; connectedSourceNames?: string[];
    onConfigChange: (id: string, value: unknown) => void;
  }) => (
    <div data-testid={`input-${input.id}`}>
      <span data-testid={`input-label-${input.id}`}>{input.label}</span>
      <span data-testid={`input-connected-${input.id}`}>{isConnected ? "connected" : "disconnected"}</span>
      {connectedSourceNames && <span data-testid={`input-sources-${input.id}`}>{connectedSourceNames.join(", ")}</span>}
      <button data-testid={`input-change-${input.id}`} onClick={() => onConfigChange(input.id, "new-value")}>Change</button>
    </div>
  ),
}));

vi.mock("@/components/nodes/custom/CustomNodeOutput", () => ({
  default: ({ output }: { output: { id: string; label: string } }) => (
    <div data-testid={`output-${output.id}`}>
      <span data-testid={`output-label-${output.id}`}>{output.label}</span>
    </div>
  ),
}));

vi.mock("@/components/nodes/widgets/MonacoEditorWidget", () => ({
  default: ({ value, language, readOnly, height, filePath, onSave, isDirty }: {
    value: string; onChange: (v: string) => void; language: string; readOnly?: boolean;
    height: number; filePath?: string; onSave?: () => void; isDirty?: boolean;
  }) => (
    <div data-testid="monaco-editor">
      <span data-testid="monaco-value">{value}</span>
      <span data-testid="monaco-language">{language}</span>
      <span data-testid="monaco-readonly">{readOnly ? "readonly" : "editable"}</span>
      <span data-testid="monaco-height">{height}</span>
      {filePath && <span data-testid="monaco-filepath">{filePath}</span>}
      {onSave && <button data-testid="monaco-save" onClick={onSave}>Save</button>}
      {isDirty && <span data-testid="monaco-dirty">dirty</span>}
    </div>
  ),
}));

vi.mock("@/components/nodes/widgets/WidgetRenderer", () => ({
  renderWidget: (field: { id: string; widget: string }, value: unknown, onChange: (v: unknown) => void, options: { disabled?: boolean }) => (
    <div data-testid={`widget-${field.id}`}>
      <span data-testid={`widget-type-${field.id}`}>{field.widget}</span>
      <span data-testid={`widget-value-${field.id}`}>{String(value)}</span>
      <span data-testid={`widget-disabled-${field.id}`}>{options.disabled ? "disabled" : "enabled"}</span>
      <button data-testid={`widget-change-${field.id}`} onClick={() => onChange("updated")}>Update</button>
    </div>
  ),
}));

vi.mock("@/components/nodes/custom/expandedNodeUtils", () => ({
  groupBySection: <T extends { section?: string }>(items: T[]): Map<string | null, T[]> => {
    const groups = new Map<string | null, T[]>();
    items.forEach((item) => { const key = item.section || null; if (!groups.has(key)) groups.set(key, []); groups.get(key)!.push(item); });
    return groups;
  },
  hasCodeEditorWidget: (schema: { ui: { fields: { widget: string }[] } }) => schema.ui.fields.some((f) => f.widget === "code_editor"),
  getCodeEditorField: (schema: { ui: { fields: { widget: string }[] } }) => schema.ui.fields.find((f) => f.widget === "code_editor") || null,
}));

import { ExpandedNodeContentArea } from "@/components/nodes/custom/expanded/ExpandedNodeContentArea";
import { createDefaultProps, createNodeData, createSchema } from "./ExpandedNodeContentArea.testUtils";

describe("ExpandedNodeContentArea Behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
          { id: "input_main", label: "Main Input", source_type: "agent", tab: "Main" },
          { id: "input_adv", label: "Advanced Input", source_type: "agent", tab: "Advanced" },
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
          { id: "field_main", label: "Main Field", widget: "text_input", tab: "Main" },
          { id: "field_adv", label: "Advanced Field", widget: "text_input", tab: "Advanced" },
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
          { id: "input_1", label: "Input 1", source_type: "agent", section: "Section A" },
          { id: "input_2", label: "Input 2", source_type: "agent", section: "Section A" },
          { id: "input_3", label: "Input 3", source_type: "agent", section: "Section B" },
        ],
      });
      const props = createDefaultProps({ schema, nodeData: createNodeData({ schema }) });
      render(<ExpandedNodeContentArea {...props} />);
      expect(screen.getByTestId("input-input_1")).toBeInTheDocument();
      expect(screen.getByTestId("input-input_2")).toBeInTheDocument();
      expect(screen.getByTestId("input-input_3")).toBeInTheDocument();
      expect(screen.getByText("Section A")).toBeInTheDocument();
      expect(screen.getByText("Section B")).toBeInTheDocument();
    });

    it("should group fields by section", () => {
      const schema = createSchema({
        inputs: [],
        fields: [
          { id: "field_1", label: "Field 1", widget: "text_input", section: "Basic" },
          { id: "field_2", label: "Field 2", widget: "text_input", section: "Advanced" },
        ],
      });
      const props = createDefaultProps({ schema, nodeData: createNodeData({ schema }) });
      render(<ExpandedNodeContentArea {...props} />);
      expect(screen.getByText("Basic")).toBeInTheDocument();
      expect(screen.getByText("Advanced")).toBeInTheDocument();
    });
  });

  describe("required fields", () => {
    it("should show required indicator for required fields", () => {
      const schema = createSchema({
        inputs: [],
        fields: [
          { id: "required_field", label: "Required", widget: "text_input", required: true },
          { id: "optional_field", label: "Optional", widget: "text_input" },
        ],
      });
      const props = createDefaultProps({ schema, nodeData: createNodeData({ schema }) });
      render(<ExpandedNodeContentArea {...props} />);
      expect(screen.getByTestId("widget-required_field")).toBeInTheDocument();
      expect(screen.getByTestId("widget-optional_field")).toBeInTheDocument();
    });
  });

  describe("field defaults", () => {
    it("should use field default when config value is undefined", () => {
      const schema = createSchema({
        inputs: [],
        fields: [{ id: "field_1", label: "Field 1", widget: "text_input", default: "default_value" }],
      });
      const props = createDefaultProps({ schema, nodeData: createNodeData({ schema }), config: {} });
      render(<ExpandedNodeContentArea {...props} />);
      expect(screen.getByTestId("widget-value-field_1")).toHaveTextContent("default_value");
    });

    it("should use config value when set", () => {
      const schema = createSchema({
        inputs: [],
        fields: [{ id: "field_1", label: "Field 1", widget: "text_input", default: "default_value" }],
      });
      const props = createDefaultProps({ schema, nodeData: createNodeData({ schema }), config: { field_1: "custom_value" } });
      render(<ExpandedNodeContentArea {...props} />);
      expect(screen.getByTestId("widget-value-field_1")).toHaveTextContent("custom_value");
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
          additional_handles: [{ id: "flow_out", type: "source", position: "bottom" }],
        },
      });
      const props = createDefaultProps({ schema, nodeData: createNodeData({ schema }) });
      render(<ExpandedNodeContentArea {...props} />);
      expect(screen.getByTestId("output-output_1")).toBeInTheDocument();
      expect(screen.queryByTestId("output-flow_out")).not.toBeInTheDocument();
    });
  });
});
