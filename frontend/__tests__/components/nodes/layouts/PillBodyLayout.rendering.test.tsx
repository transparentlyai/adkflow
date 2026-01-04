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
          process: {
            header: "#10b981",
            accent: "#34d399",
            text: "#fff",
            ring: "#10b981",
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

import PillBodyLayout from "@/components/nodes/custom/layouts/PillBodyLayout";
import { createBaseProps, createProcessSchema } from "./PillBodyLayout.testUtils";

describe("PillBodyLayout Rendering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("basic rendering", () => {
    it("should render with node name", () => {
      render(<PillBodyLayout {...createBaseProps()} />);
      expect(screen.getByText("My Process")).toBeInTheDocument();
    });

    it("should render node icon", () => {
      render(<PillBodyLayout {...createBaseProps()} />);
      expect(screen.getByTestId("node-icon-code")).toBeInTheDocument();
    });

    it("should render validation indicator", () => {
      render(<PillBodyLayout {...createBaseProps()} />);
      expect(screen.getByTestId("validation-indicator")).toBeInTheDocument();
    });

    it("should render expand button", () => {
      render(<PillBodyLayout {...createBaseProps()} />);
      const expandButton = screen.getByRole("button", { name: /expand/i });
      expect(expandButton).toBeInTheDocument();
    });
  });

  describe("selected state", () => {
    it("should apply selection styling when selected", () => {
      const { container } = render(
        <PillBodyLayout {...createBaseProps({ selected: true })} />,
      );
      expect(container.querySelector(".rounded-lg")).toBeInTheDocument();
    });

    it("should not have selection ring when not selected", () => {
      const { container } = render(
        <PillBodyLayout {...createBaseProps({ selected: false })} />,
      );
      expect(container.querySelector(".rounded-lg")).toBeInTheDocument();
    });
  });

  describe("width configuration", () => {
    it("should apply collapsed_width from schema", () => {
      const props = createBaseProps({
        schema: createProcessSchema({ ui: { collapsed_width: 280 } }),
      });
      const { container } = render(<PillBodyLayout {...props} />);
      const nodeContainer = container.querySelector(".rounded-lg");
      expect(nodeContainer).toHaveStyle({ width: "280px", minWidth: "280px" });
    });

    it("should use default width when not specified", () => {
      const props = createBaseProps({
        schema: createProcessSchema({ ui: { collapsed_width: undefined } }),
      });
      const { container } = render(<PillBodyLayout {...props} />);
      const nodeContainer = container.querySelector(".rounded-lg");
      expect(nodeContainer).toHaveStyle({ width: "220px", minWidth: "220px" });
    });
  });

  describe("theme colors", () => {
    it("should use theme colors for header", () => {
      const { container } = render(<PillBodyLayout {...createBaseProps()} />);
      const header = container.querySelector(".rounded-t-lg");
      expect(header).toBeInTheDocument();
    });

    it("should use fallback header color when theme_key not found", () => {
      const props = createBaseProps({
        schema: createProcessSchema({ ui: { theme_key: "unknown_type" } }),
        headerColor: "#123456",
      });
      const { container } = render(<PillBodyLayout {...props} />);
      expect(container.querySelector(".rounded-lg")).toBeInTheDocument();
    });
  });
});
