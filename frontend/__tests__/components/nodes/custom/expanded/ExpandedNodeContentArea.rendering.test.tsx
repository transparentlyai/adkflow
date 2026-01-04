import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
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

describe("ExpandedNodeContentArea Rendering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("basic rendering", () => {
    it("should render inputs", () => {
      const props = createDefaultProps();
      render(<ExpandedNodeContentArea {...props} />);
      expect(screen.getByTestId("input-input_1")).toBeInTheDocument();
      expect(screen.getByTestId("input-label-input_1")).toHaveTextContent("Input 1");
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
      expect(screen.getByTestId("output-label-output_1")).toHaveTextContent("Output 1");
    });

    it("should show 'No configuration options' when no inputs or fields", () => {
      const schema = createSchema({
        inputs: [],
        fields: [],
        outputs: [{ id: "out", label: "Out", source_type: "agent" }],
      });
      const props = createDefaultProps({ schema, nodeData: createNodeData({ schema }) });
      render(<ExpandedNodeContentArea {...props} />);
      expect(screen.getByText("No configuration options")).toBeInTheDocument();
    });
  });

  describe("connected inputs", () => {
    it("should show connected state for inputs", () => {
      const props = createDefaultProps({ connectedInputs: { input_1: ["SourceNode.output"] } });
      render(<ExpandedNodeContentArea {...props} />);
      expect(screen.getByTestId("input-connected-input_1")).toHaveTextContent("connected");
      expect(screen.getByTestId("input-sources-input_1")).toHaveTextContent("SourceNode.output");
    });

    it("should show disconnected state for inputs", () => {
      const props = createDefaultProps({ connectedInputs: {} });
      render(<ExpandedNodeContentArea {...props} />);
      expect(screen.getByTestId("input-connected-input_1")).toHaveTextContent("disconnected");
    });

    it("should show multiple connected sources", () => {
      const props = createDefaultProps({ connectedInputs: { input_1: ["Node1.output", "Node2.output"] } });
      render(<ExpandedNodeContentArea {...props} />);
      expect(screen.getByTestId("input-sources-input_1")).toHaveTextContent("Node1.output, Node2.output");
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
      const props = createDefaultProps({ schema, nodeData: createNodeData({ schema }), isFieldVisible });
      render(<ExpandedNodeContentArea {...props} />);
      expect(screen.getByTestId("widget-visible")).toBeInTheDocument();
      expect(screen.queryByTestId("widget-hidden")).not.toBeInTheDocument();
    });
  });

  describe("locked node", () => {
    it("should show disabled widgets when node is locked", () => {
      const props = createDefaultProps({ nodeData: createNodeData({ isNodeLocked: true }) });
      render(<ExpandedNodeContentArea {...props} />);
      expect(screen.getByTestId("widget-disabled-name")).toHaveTextContent("disabled");
      expect(screen.getByTestId("widget-disabled-model")).toHaveTextContent("disabled");
    });

    it("should show enabled widgets when node is not locked", () => {
      const props = createDefaultProps({ nodeData: createNodeData({ isNodeLocked: false }) });
      render(<ExpandedNodeContentArea {...props} />);
      expect(screen.getByTestId("widget-disabled-name")).toHaveTextContent("enabled");
    });
  });
});
