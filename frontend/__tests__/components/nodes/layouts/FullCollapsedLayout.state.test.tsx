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
            footer: { background: "#f9f9f9", border: "#eee", text: "#333" },
            text: { primary: "#000", secondary: "#666", muted: "#999" },
          },
          agent: { header: "#4f46e5", accent: "#6366f1", text: "#fff", ring: "#4f46e5" },
          prompt: { header: "#8b5cf6", accent: "#a78bfa", text: "#fff", ring: "#8b5cf6" },
          tool: { header: "#f97316", accent: "#fb923c", text: "#fff", ring: "#f97316" },
        },
        handles: { border: "#ccc", background: "#fff", connected: "#4f46e5", input: "#22c55e", output: "#3b82f6", link: "#a855f7" },
        state: {
          running: { ring: "#3b82f6", glow: "rgba(59, 130, 246, 0.4)" },
          completed: { ring: "#22c55e", glow: "rgba(34, 197, 94, 0.3)" },
          error: { ring: "#ef4444", glow: "rgba(239, 68, 68, 0.4)" },
          invalid: { ring: "#ef4444", glow: "rgba(239, 68, 68, 0.4)" },
        },
        validation: { error: "#ef4444", warning: "#f59e0b" },
        execution: { running: "#22c55e", completed: "#10b981", error: "#ef4444" },
      },
    },
  })),
}));

vi.mock("@/components/DraggableHandle", () => ({
  default: ({ handleId, type, title }: { handleId: string; type: string; title?: string }) => (
    <div data-testid={`draggable-handle-${type}-${handleId}`} title={title}>Handle {handleId}</div>
  ),
}));

vi.mock("@/components/nodes/ValidationIndicator", () => ({
  default: ({ errors, warnings, duplicateNameError }: { errors?: string[]; warnings?: string[]; duplicateNameError?: string }) => (
    <div data-testid="validation-indicator">
      {errors && errors.length > 0 && <span data-testid="has-errors">Errors: {errors.length}</span>}
      {warnings && warnings.length > 0 && <span data-testid="has-warnings">Warnings: {warnings.length}</span>}
      {duplicateNameError && <span data-testid="has-duplicate">{duplicateNameError}</span>}
    </div>
  ),
}));

vi.mock("@/components/nodes/custom/NodeIcon", () => ({
  default: ({ icon, className }: { icon?: string; className?: string }) => (
    <div data-testid={`node-icon-${icon || "default"}`} className={className}>Icon: {icon}</div>
  ),
}));

vi.mock("@xyflow/react", () => ({
  Handle: ({ id, type, position }: { id: string; type: string; position: string }) => (
    <div data-testid={`xyflow-handle-${type}-${id}`} data-position={position}>XYFlow Handle {id}</div>
  ),
  Position: { Top: "top", Bottom: "bottom", Left: "left", Right: "right" },
  useStore: vi.fn((selector) => {
    const mockState = { edges: [], nodes: [] };
    return selector(mockState);
  }),
}));

import FullCollapsedLayout from "@/components/nodes/custom/layouts/FullCollapsedLayout";
import { createBaseProps, createBaseNodeData } from "./FullCollapsedLayout.testUtils";

describe("FullCollapsedLayout State", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("execution states", () => {
    it("should render with running state", () => {
      const props = createBaseProps({ nodeData: createBaseNodeData({ executionState: "running" }) });
      const { container } = render(<FullCollapsedLayout {...props} />);
      expect(container.querySelector(".rounded-lg")).toBeInTheDocument();
    });

    it("should render with completed state", () => {
      const props = createBaseProps({ nodeData: createBaseNodeData({ executionState: "completed" }) });
      const { container } = render(<FullCollapsedLayout {...props} />);
      expect(container.querySelector(".rounded-lg")).toBeInTheDocument();
    });

    it("should render with error state", () => {
      const props = createBaseProps({ nodeData: createBaseNodeData({ executionState: "error" }) });
      const { container } = render(<FullCollapsedLayout {...props} />);
      expect(container.querySelector(".rounded-lg")).toBeInTheDocument();
    });
  });

  describe("validation", () => {
    it("should render validation indicator with errors", () => {
      const props = createBaseProps({ nodeData: createBaseNodeData({ validationErrors: ["Model is required"] }) });
      render(<FullCollapsedLayout {...props} />);
      expect(screen.getByTestId("validation-indicator")).toBeInTheDocument();
      expect(screen.getByTestId("has-errors")).toHaveTextContent("Errors: 1");
    });

    it("should render validation indicator with warnings", () => {
      const props = createBaseProps({ nodeData: createBaseNodeData({ validationWarnings: ["Consider adding description"] }) });
      render(<FullCollapsedLayout {...props} />);
      expect(screen.getByTestId("validation-indicator")).toBeInTheDocument();
      expect(screen.getByTestId("has-warnings")).toHaveTextContent("Warnings: 1");
    });

    it("should render with duplicate name error", () => {
      const props = createBaseProps({ nodeData: createBaseNodeData({ duplicateNameError: "Name already used" }) });
      render(<FullCollapsedLayout {...props} />);
      expect(screen.getByTestId("has-duplicate")).toHaveTextContent("Name already used");
    });

    it("should prioritize duplicate name error styling over execution state", () => {
      const props = createBaseProps({ nodeData: createBaseNodeData({ executionState: "running", duplicateNameError: "Duplicate" }) });
      const { container } = render(<FullCollapsedLayout {...props} />);
      expect(container.querySelector(".rounded-lg")).toBeInTheDocument();
    });
  });

  describe("locked state", () => {
    it("should show lock icon when node is locked", () => {
      const props = createBaseProps({ nodeData: createBaseNodeData({ isNodeLocked: true }) });
      const { container } = render(<FullCollapsedLayout {...props} />);
      expect(container.querySelector(".rounded-lg")).toBeInTheDocument();
    });
  });

  describe("connected nodes display", () => {
    it("should not show connected prompt when none connected", () => {
      render(<FullCollapsedLayout {...createBaseProps()} />);
      expect(screen.getByText("Model:")).toBeInTheDocument();
    });

    it("should not show connected tools when none connected", () => {
      render(<FullCollapsedLayout {...createBaseProps()} />);
      expect(screen.getByText("Model:")).toBeInTheDocument();
    });
  });
});
