/**
 * Shared test utilities for LabelNode tests.
 */

import { vi } from "vitest";
import React from "react";

// Mock ReactFlow hooks and components
export const mockSetNodes = vi.fn();
export const mockUseStore = vi.fn();

vi.mock("@xyflow/react", () => ({
  useReactFlow: vi.fn(() => ({
    setNodes: mockSetNodes,
  })),
  useStore: (selector: (state: unknown) => unknown) => mockUseStore(selector),
  NodeResizer: ({
    isVisible,
    onResizeEnd,
  }: {
    isVisible: boolean;
    onResizeEnd: () => void;
  }) => (
    <div
      data-testid="node-resizer"
      data-visible={isVisible}
      onClick={() => onResizeEnd?.()}
    />
  ),
}));

// Mock ThemeContext
vi.mock("@/contexts/ThemeContext", () => ({
  useTheme: vi.fn(() => ({
    theme: {
      name: "test",
      colors: {
        nodes: {
          common: {
            container: { background: "#fff", border: "#ccc" },
            text: { primary: "#000", secondary: "#666", muted: "#999" },
          },
          label: { header: "#6b7280", text: "#fff", ring: "#3b82f6" },
        },
        ui: {
          background: "#ffffff",
          foreground: "#000000",
          border: "#e5e7eb",
          muted: "#f3f4f6",
        },
      },
    },
  })),
}));

// Mock ProjectContext
vi.mock("@/contexts/ProjectContext", () => ({
  useProject: vi.fn(() => ({
    isLocked: false,
  })),
}));

// Mock LabelNodeExpanded component
vi.mock("@/components/nodes/LabelNode/LabelNodeExpanded", () => ({
  default: ({
    data,
    onClose,
    onUpdate,
  }: {
    data: { label: string };
    onClose: () => void;
    onUpdate: (updates: Record<string, unknown>) => void;
  }) => (
    <div data-testid="label-node-expanded">
      <span data-testid="expanded-label">{data.label}</span>
      <button data-testid="close-expanded" onClick={onClose}>
        Close
      </button>
      <button
        data-testid="update-label"
        onClick={() => onUpdate({ label: "Updated Label" })}
      >
        Update
      </button>
    </div>
  ),
}));

// Mock createPortal
vi.mock("react-dom", async () => {
  const actual = await vi.importActual("react-dom");
  return {
    ...actual,
    createPortal: (children: React.ReactNode) => children,
  };
});

export const defaultNodeData = {
  label: "Test Label",
  fontFamily: "sans-serif",
  fontWeight: "normal",
  fontStyle: "normal",
  textAlign: "left" as const,
  color: "#374151",
};

export const createMockStore = (
  overrides: {
    parentId?: string;
    width?: number;
  } = {},
) => {
  return (
    selector: (state: {
      nodes: {
        id: string;
        parentId?: string;
        measured?: { width: number };
        style?: { width?: number };
        data?: Record<string, unknown>;
      }[];
    }) => unknown,
  ) => {
    const state = {
      nodes: [
        {
          id: "node-1",
          parentId: overrides.parentId,
          measured: overrides.width ? { width: overrides.width } : undefined,
          style: {} as { width?: number },
          data: {},
        },
      ],
    };
    return selector(state);
  };
};

export const defaultNodeProps = {
  id: "node-1",
  data: defaultNodeData,
  selected: false,
  type: "label" as const,
  zIndex: 1,
  isConnectable: true,
  positionAbsoluteX: 0,
  positionAbsoluteY: 0,
  dragging: false,
  draggable: true,
  selectable: true,
  deletable: true,
};
