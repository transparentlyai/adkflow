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

describe("PillBodyLayout Function Signature", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("function signature parsing", () => {
    it("should parse and display function name", () => {
      render(<PillBodyLayout {...createBaseProps()} />);
      expect(screen.getByText("def")).toBeInTheDocument();
      expect(screen.getByText("process_data")).toBeInTheDocument();
    });

    it("should parse and display function parameters", () => {
      render(<PillBodyLayout {...createBaseProps()} />);
      expect(screen.getByText("Parameters")).toBeInTheDocument();
      expect(screen.getByText("input_text: str, count: int = 10")).toBeInTheDocument();
    });

    it("should parse and display return type", () => {
      render(<PillBodyLayout {...createBaseProps()} />);
      expect(screen.getByText("Returns")).toBeInTheDocument();
      expect(screen.getByText("dict")).toBeInTheDocument();
    });

    it("should show 'None' return type when not specified", () => {
      const props = createBaseProps({
        config: { code: `def simple_func(x):\n    return x` },
      });
      render(<PillBodyLayout {...props} />);
      expect(screen.getByText("None")).toBeInTheDocument();
    });

    it("should show 'None' for parameters when function has no params", () => {
      const props = createBaseProps({
        config: { code: `def no_params() -> str:\n    return "hello"` },
      });
      render(<PillBodyLayout {...props} />);
      expect(screen.getByText("None")).toBeInTheDocument();
      expect(screen.getByText("str")).toBeInTheDocument();
    });

    it("should show message when no function signature found", () => {
      const props = createBaseProps({
        config: { code: `# This is just a comment\nx = 5` },
      });
      render(<PillBodyLayout {...props} />);
      expect(screen.getByText("No function signature found")).toBeInTheDocument();
    });

    it("should show empty when show_function_signature is false", () => {
      const props = createBaseProps({
        schema: createProcessSchema({
          ui: { collapsed_body: { show_function_signature: false } },
        }),
      });
      render(<PillBodyLayout {...props} />);
      expect(screen.queryByText("def")).not.toBeInTheDocument();
      expect(screen.queryByText("Parameters")).not.toBeInTheDocument();
    });

    it("should use custom code_field from schema", () => {
      const props = createBaseProps({
        config: { custom_code: `def custom_func(a: int, b: int) -> int:\n    return a + b` },
        schema: createProcessSchema({
          ui: { collapsed_body: { show_function_signature: true, code_field: "custom_code" } },
        }),
      });
      render(<PillBodyLayout {...props} />);
      expect(screen.getByText("custom_func")).toBeInTheDocument();
    });
  });

  describe("complex function signatures", () => {
    it("should parse function with multiple typed parameters", () => {
      const props = createBaseProps({
        config: {
          code: `def complex_func(\n    name: str,\n    count: int,\n    items: list[str],\n    options: dict[str, Any] = None\n) -> tuple[str, int]:\n    pass`,
        },
      });
      render(<PillBodyLayout {...props} />);
      expect(screen.getByText("complex_func")).toBeInTheDocument();
    });

    it("should parse async function", () => {
      const props = createBaseProps({
        config: { code: `async def fetch_data(url: str) -> dict:\n    pass` },
      });
      render(<PillBodyLayout {...props} />);
      expect(screen.getByText("fetch_data")).toBeInTheDocument();
    });

    it("should handle function with no type hints", () => {
      const props = createBaseProps({
        config: { code: `def simple(a, b, c):\n    return a + b + c` },
      });
      render(<PillBodyLayout {...props} />);
      expect(screen.getByText("simple")).toBeInTheDocument();
      expect(screen.getByText("a, b, c")).toBeInTheDocument();
      expect(screen.getByText("None")).toBeInTheDocument();
    });
  });
});
