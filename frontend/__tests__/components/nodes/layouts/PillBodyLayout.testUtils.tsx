/**
 * Shared test utilities for PillBodyLayout tests.
 */

import { vi } from "vitest";
import React from "react";
import type { CustomNodeCollapsedProps } from "@/components/nodes/custom/CustomNodeCollapsed";

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

// Default code sample for testing
export const DEFAULT_CODE = `def process_data(input_text: str, count: int = 10) -> dict:
    """Process the input text."""
    return {"result": input_text, "count": count}`;

// Base schema for Process-style nodes with function signature
export const createProcessSchema = (
  overrides: Record<string, unknown> = {},
) => {
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
export const createBaseNodeData = (overrides = {}) => ({
  schema: createProcessSchema(),
  config: {
    code: DEFAULT_CODE,
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
export const createBaseProps = (
  overrides = {},
): CustomNodeCollapsedProps => ({
  id: "process-1",
  nodeData: createBaseNodeData(),
  schema: createProcessSchema(),
  name: "My Process",
  config: {
    code: DEFAULT_CODE,
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
