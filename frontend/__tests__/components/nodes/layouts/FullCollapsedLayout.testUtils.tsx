/**
 * Shared test utilities for FullCollapsedLayout tests.
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
    const mockState = {
      edges: [],
      nodes: [],
    };
    return selector(mockState);
  }),
}));

// Base schema for Agent-style nodes
export const createAgentSchema = (overrides: Record<string, unknown> = {}) => {
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
export const createBaseNodeData = (overrides = {}) => ({
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
export const createBaseProps = (overrides = {}): CustomNodeCollapsedProps => ({
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
