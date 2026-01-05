import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import type { CustomNodeSchema } from "@/components/nodes/CustomNode";

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

import { ExpandedNodeContentArea, useCodeEditorInfo } from "@/components/nodes/custom/expanded/ExpandedNodeContentArea";
import { createDefaultProps, createNodeData, createSchema } from "./ExpandedNodeContentArea.testUtils";

describe("ExpandedNodeContentArea Editor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("code editor widget", () => {
    it("should render Monaco editor for code_editor widget", () => {
      const schema = createSchema({
        inputs: [],
        fields: [{ id: "code", label: "Code", widget: "code_editor", language: "python", default: "# code" }],
      });
      const props = createDefaultProps({
        schema,
        nodeData: createNodeData({ schema }),
        config: { code: "def hello():\n    pass" },
      });
      render(<ExpandedNodeContentArea {...props} />);
      expect(screen.getByTestId("monaco-editor")).toBeInTheDocument();
      expect(screen.getByTestId("monaco-value")).toHaveTextContent("def hello():");
      expect(screen.getByTestId("monaco-language")).toHaveTextContent("python");
    });

    it("should render Monaco editor for monaco_editor widget", () => {
      const schema = createSchema({
        inputs: [],
        fields: [{ id: "code", label: "Code", widget: "monaco_editor", language: "javascript" }],
      });
      const props = createDefaultProps({
        schema,
        nodeData: createNodeData({ schema }),
        config: { code: "const x = 1" },
      });
      render(<ExpandedNodeContentArea {...props} />);
      expect(screen.getByTestId("monaco-editor")).toBeInTheDocument();
      expect(screen.getByTestId("monaco-language")).toHaveTextContent("javascript");
    });

    it("should use default language when not specified", () => {
      const schema = createSchema({
        inputs: [],
        fields: [{ id: "code", label: "Code", widget: "code_editor" }],
      });
      const props = createDefaultProps({ schema, nodeData: createNodeData({ schema }) });
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
      expect(screen.getByTestId("monaco-filepath")).toHaveTextContent("/path/to/file.py");
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
      expect(screen.getByTestId("monaco-readonly")).toHaveTextContent("readonly");
    });

    it("should calculate editor height based on expanded size", () => {
      const schema = createSchema({
        inputs: [],
        fields: [{ id: "code", label: "Code", widget: "code_editor" }],
      });
      const props = createDefaultProps({
        schema,
        nodeData: createNodeData({ schema, expandedSize: { width: 400, height: 500 } }),
      });
      render(<ExpandedNodeContentArea {...props} />);
      expect(screen.getByTestId("monaco-height")).toHaveTextContent("350");
    });
  });
});

describe("useCodeEditorInfo", () => {
  const TestComponent = ({ schema, config }: { schema: CustomNodeSchema; config: Record<string, unknown> }) => {
    const { hasEditor, lineCount } = useCodeEditorInfo(schema, config);
    return (
      <div>
        <span data-testid="has-editor">{hasEditor ? "yes" : "no"}</span>
        <span data-testid="line-count">{lineCount}</span>
      </div>
    );
  };

  it("should detect code editor in schema", () => {
    const schema = createSchema({ fields: [{ id: "code", label: "Code", widget: "code_editor" }] });
    render(<TestComponent schema={schema} config={{ code: "line1\nline2\nline3" }} />);
    expect(screen.getByTestId("has-editor")).toHaveTextContent("yes");
    expect(screen.getByTestId("line-count")).toHaveTextContent("3");
  });

  it("should return false when no code editor in schema", () => {
    const schema = createSchema({ fields: [{ id: "name", label: "Name", widget: "text_input" }] });
    render(<TestComponent schema={schema} config={{ name: "test" }} />);
    expect(screen.getByTestId("has-editor")).toHaveTextContent("no");
    expect(screen.getByTestId("line-count")).toHaveTextContent("0");
  });

  it("should count lines correctly", () => {
    const schema = createSchema({ fields: [{ id: "code", label: "Code", widget: "code_editor" }] });
    render(<TestComponent schema={schema} config={{ code: "line1\nline2\nline3\nline4\nline5" }} />);
    expect(screen.getByTestId("line-count")).toHaveTextContent("5");
  });

  it("should handle empty code", () => {
    const schema = createSchema({ fields: [{ id: "code", label: "Code", widget: "code_editor" }] });
    render(<TestComponent schema={schema} config={{ code: "" }} />);
    expect(screen.getByTestId("line-count")).toHaveTextContent("1");
  });
});
