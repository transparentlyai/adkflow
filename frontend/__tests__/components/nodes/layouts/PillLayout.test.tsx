import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

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
            text: { primary: "#000", secondary: "#666" },
          },
          variable: {
            header: "#7c3aed",
            accent: "#8b5cf6",
            text: "#fff",
            ring: "#7c3aed",
          },
          outputFile: {
            header: "#f59e0b",
            accent: "#fbbf24",
            text: "#fff",
            ring: "#f59e0b",
          },
        },
        handles: {
          border: "#ccc",
          background: "#fff",
          connected: "#4f46e5",
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
  default: () => <div data-testid="draggable-handle">Handle</div>,
}));

// Mock ValidationIndicator
vi.mock("@/components/nodes/ValidationIndicator", () => ({
  default: () => <div data-testid="validation-indicator">Validation</div>,
}));

// Mock NodeIcon
vi.mock("@/components/nodes/custom/NodeIcon", () => ({
  default: ({ icon }: { icon: string }) => (
    <div data-testid="node-icon">{icon}</div>
  ),
}));

// Import after mocking
import PillLayout from "@/components/nodes/custom/layouts/PillLayout";

const variableSchema = {
  unit_id: "builtin.variable",
  label: "Variable",
  node_type: "variable",
  ui: {
    theme_key: "variable",
    inputs: [],
    outputs: [{ id: "output", label: "Out", source_type: "variable" }],
    fields: [],
    layout: { type: "pill" },
    collapsed_display: { show_with_braces: true },
  },
};

const outputFileSchema = {
  unit_id: "builtin.outputFile",
  label: "Output File",
  node_type: "outputFile",
  ui: {
    theme_key: "outputFile",
    inputs: [{ id: "input", label: "In", source_type: "agent" }],
    outputs: [],
    fields: [],
    layout: { type: "pill" },
    collapsed_display: { format: "{file_path}" },
  },
};

const baseNodeData = {
  schema: variableSchema,
  config: { name: "myVar" },
  handlePositions: {},
  validationErrors: [],
  executionState: null,
  duplicateNameError: false,
};

describe("PillLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Variable node rendering", () => {
    it("should render variable node with braces", () => {
      render(
        <PillLayout
          id="var-1"
          nodeData={baseNodeData}
          schema={variableSchema}
          name="myVar"
          config={{ name: "myVar" }}
          headerColor="#7c3aed"
          selected={false}
          handleTypes={{}}
          handlePositions={{}}
          onToggleExpand={vi.fn()}
        />,
      );

      expect(screen.getByTestId("draggable-handle")).toBeInTheDocument();
      expect(screen.getByText("{myVar}")).toBeInTheDocument();
    });

    it("should render with selected state", () => {
      render(
        <PillLayout
          id="var-1"
          nodeData={baseNodeData}
          schema={variableSchema}
          name="myVar"
          config={{ name: "myVar" }}
          headerColor="#7c3aed"
          selected={true}
          handleTypes={{}}
          handlePositions={{}}
          onToggleExpand={vi.fn()}
        />,
      );

      expect(screen.getByTestId("draggable-handle")).toBeInTheDocument();
    });
  });

  describe("OutputFile node rendering", () => {
    it("should render output file node", () => {
      const nodeData = {
        ...baseNodeData,
        schema: outputFileSchema,
        config: { file_path: "output.txt" },
      };

      render(
        <PillLayout
          id="output-1"
          nodeData={nodeData}
          schema={outputFileSchema}
          name="output.txt"
          config={{ file_path: "output.txt" }}
          headerColor="#f59e0b"
          selected={false}
          handleTypes={{}}
          handlePositions={{}}
          onToggleExpand={vi.fn()}
        />,
      );

      expect(screen.getByTestId("draggable-handle")).toBeInTheDocument();
    });
  });

  describe("execution states", () => {
    it("should render with running state", () => {
      const nodeDataRunning = {
        ...baseNodeData,
        executionState: { status: "running" },
      };

      render(
        <PillLayout
          id="var-1"
          nodeData={nodeDataRunning}
          schema={variableSchema}
          name="myVar"
          config={{ name: "myVar" }}
          headerColor="#7c3aed"
          selected={false}
          handleTypes={{}}
          handlePositions={{}}
          onToggleExpand={vi.fn()}
        />,
      );

      expect(screen.getByTestId("draggable-handle")).toBeInTheDocument();
    });

    it("should render with completed state", () => {
      const nodeDataCompleted = {
        ...baseNodeData,
        executionState: { status: "completed" },
      };

      render(
        <PillLayout
          id="var-1"
          nodeData={nodeDataCompleted}
          schema={variableSchema}
          name="myVar"
          config={{ name: "myVar" }}
          headerColor="#7c3aed"
          selected={false}
          handleTypes={{}}
          handlePositions={{}}
          onToggleExpand={vi.fn()}
        />,
      );

      expect(screen.getByTestId("draggable-handle")).toBeInTheDocument();
    });
  });

  describe("validation", () => {
    it("should render with duplicate name error", () => {
      const nodeDataWithDuplicate = {
        ...baseNodeData,
        duplicateNameError: true,
      };

      render(
        <PillLayout
          id="var-1"
          nodeData={nodeDataWithDuplicate}
          schema={variableSchema}
          name="myVar"
          config={{ name: "myVar" }}
          headerColor="#7c3aed"
          selected={false}
          handleTypes={{}}
          handlePositions={{}}
          onToggleExpand={vi.fn()}
        />,
      );

      expect(screen.getByTestId("draggable-handle")).toBeInTheDocument();
    });
  });

  describe("locked state", () => {
    it("should render locked variable", () => {
      const nodeDataLocked = {
        ...baseNodeData,
        isNodeLocked: true,
      };

      render(
        <PillLayout
          id="var-1"
          nodeData={nodeDataLocked}
          schema={variableSchema}
          name="myVar"
          config={{ name: "myVar" }}
          headerColor="#7c3aed"
          selected={false}
          handleTypes={{}}
          handlePositions={{}}
          onToggleExpand={vi.fn()}
        />,
      );

      expect(screen.getByTestId("draggable-handle")).toBeInTheDocument();
    });
  });
});
