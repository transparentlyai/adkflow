/**
 * Shared test utilities for ExpandedNodeContentArea tests.
 */

import { vi } from "vitest";
import React from "react";
import type {
  CustomNodeSchema,
  CustomNodeData,
} from "@/components/nodes/CustomNode";

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

// Helper to create a schema
export const createSchema = (
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
export const createNodeData = (
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
export const createDefaultProps = (
  overrides: Record<string, unknown> = {},
) => ({
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
