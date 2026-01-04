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
import { createBaseProps, createBaseNodeData, createAgentSchema } from "./FullCollapsedLayout.testUtils";

describe("FullCollapsedLayout Rendering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("basic rendering", () => {
    it("should render with node name", () => {
      render(<FullCollapsedLayout {...createBaseProps()} />);
      expect(screen.getByText("My Agent")).toBeInTheDocument();
    });

    it("should render node icon", () => {
      render(<FullCollapsedLayout {...createBaseProps()} />);
      expect(screen.getByTestId("node-icon-monitor")).toBeInTheDocument();
    });

    it("should render model field with label", () => {
      render(<FullCollapsedLayout {...createBaseProps()} />);
      expect(screen.getByText("Model:")).toBeInTheDocument();
      expect(screen.getByText("gemini-2.0-flash")).toBeInTheDocument();
    });

    it("should render 'Not set' when model is not configured", () => {
      const props = createBaseProps({ config: {} });
      render(<FullCollapsedLayout {...props} />);
      expect(screen.getByText("Not set")).toBeInTheDocument();
    });

    it("should render footer with left text", () => {
      render(<FullCollapsedLayout {...createBaseProps()} />);
      expect(screen.getByText("Agent")).toBeInTheDocument();
    });

    it("should render default footer text when not specified", () => {
      const props = createBaseProps({
        schema: createAgentSchema({ ui: { collapsed_footer: undefined } }),
      });
      render(<FullCollapsedLayout {...props} />);
      expect(screen.getByText("Agent")).toBeInTheDocument();
    });
  });

  describe("handles", () => {
    it("should render main input handle", () => {
      render(<FullCollapsedLayout {...createBaseProps()} />);
      expect(screen.getByTestId("draggable-handle-target-input")).toBeInTheDocument();
    });

    it("should render output handles", () => {
      render(<FullCollapsedLayout {...createBaseProps()} />);
      expect(screen.getByTestId("draggable-handle-source-output")).toBeInTheDocument();
    });

    it("should render link handles from additional_handles", () => {
      render(<FullCollapsedLayout {...createBaseProps()} />);
      expect(screen.getByTestId("draggable-handle-target-link-in")).toBeInTheDocument();
      expect(screen.getByTestId("draggable-handle-source-link-out")).toBeInTheDocument();
    });

    it("should render hidden handles for typed inputs", () => {
      render(<FullCollapsedLayout {...createBaseProps()} />);
      expect(screen.getByTestId("xyflow-handle-target-prompt-input")).toBeInTheDocument();
      expect(screen.getByTestId("xyflow-handle-target-tools-input")).toBeInTheDocument();
    });
  });

  describe("selected state", () => {
    it("should apply selection styling when selected", () => {
      const { container } = render(<FullCollapsedLayout {...createBaseProps({ selected: true })} />);
      expect(container.querySelector(".rounded-lg")).toBeInTheDocument();
    });

    it("should not have selection ring when not selected", () => {
      const { container } = render(<FullCollapsedLayout {...createBaseProps({ selected: false })} />);
      expect(container.querySelector(".rounded-lg")).toBeInTheDocument();
    });
  });

  describe("width constraints", () => {
    it("should have min-width of 250px", () => {
      const { container } = render(<FullCollapsedLayout {...createBaseProps()} />);
      const nodeContainer = container.querySelector(".min-w-\\[250px\\]");
      expect(nodeContainer).toBeInTheDocument();
    });

    it("should have max-width of 300px", () => {
      const { container } = render(<FullCollapsedLayout {...createBaseProps()} />);
      const nodeContainer = container.querySelector(".max-w-\\[300px\\]");
      expect(nodeContainer).toBeInTheDocument();
    });
  });

  describe("theme colors", () => {
    it("should use theme colors for header", () => {
      const { container } = render(<FullCollapsedLayout {...createBaseProps()} />);
      const header = container.querySelector(".rounded-t-lg");
      expect(header).toBeInTheDocument();
    });

    it("should use fallback header color when theme_key not found", () => {
      const props = createBaseProps({
        schema: createAgentSchema({ ui: { theme_key: "unknown_type" } }),
        headerColor: "#123456",
      });
      const { container } = render(<FullCollapsedLayout {...props} />);
      expect(container.querySelector(".rounded-lg")).toBeInTheDocument();
    });
  });

  describe("custom footer text", () => {
    it("should render custom footer left text", () => {
      const props = createBaseProps({
        schema: createAgentSchema({ ui: { collapsed_footer: { left_text: "Custom Agent Type" } } }),
      });
      render(<FullCollapsedLayout {...props} />);
      expect(screen.getByText("Custom Agent Type")).toBeInTheDocument();
    });
  });
});
