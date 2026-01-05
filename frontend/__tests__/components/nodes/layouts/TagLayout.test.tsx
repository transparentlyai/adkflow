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
          agent: {
            header: "#4f46e5",
            accent: "#6366f1",
            text: "#fff",
            ring: "#4f46e5",
          },
          tool: {
            header: "#dc2626",
            accent: "#ef4444",
            text: "#fff",
            ring: "#dc2626",
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
import TagLayout from "@/components/nodes/custom/layouts/TagLayout";

const agentSchema = {
  unit_id: "agent",
  label: "Agent",
  node_type: "agent",
  ui: {
    theme_key: "agent",
    inputs: [{ id: "input", label: "In", source_type: "agent" }],
    outputs: [{ id: "output", label: "Out", source_type: "agent" }],
    fields: [{ id: "name", widget: "text" }],
    layout: { type: "tag" },
  },
};

const baseNodeData = {
  schema: agentSchema,
  config: { name: "MyAgent" },
  handlePositions: {},
  validationErrors: [],
  executionState: null,
  duplicateNameError: false,
};

describe("TagLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render tag node with name", () => {
      render(
        <TagLayout
          id="agent-1"
          nodeData={baseNodeData}
          schema={agentSchema}
          name="MyAgent"
          config={{ name: "MyAgent" }}
          headerColor="#4f46e5"
          selected={false}
          handleTypes={{}}
          handlePositions={{}}
          onToggleExpand={vi.fn()}
        />,
      );

      expect(screen.getByTestId("draggable-handle")).toBeInTheDocument();
      expect(screen.getByText("MyAgent")).toBeInTheDocument();
    });

    it("should render with selected state", () => {
      render(
        <TagLayout
          id="agent-1"
          nodeData={baseNodeData}
          schema={agentSchema}
          name="MyAgent"
          config={{ name: "MyAgent" }}
          headerColor="#4f46e5"
          selected={true}
          handleTypes={{}}
          handlePositions={{}}
          onToggleExpand={vi.fn()}
        />,
      );

      expect(screen.getByTestId("draggable-handle")).toBeInTheDocument();
    });

    it("should render with handles", () => {
      render(
        <TagLayout
          id="agent-1"
          nodeData={baseNodeData}
          schema={agentSchema}
          name="MyAgent"
          config={{ name: "MyAgent" }}
          headerColor="#4f46e5"
          selected={false}
          handleTypes={{ input: { sourceType: "agent" } }}
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
        <TagLayout
          id="agent-1"
          nodeData={nodeDataRunning}
          schema={agentSchema}
          name="MyAgent"
          config={{ name: "MyAgent" }}
          headerColor="#4f46e5"
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
        <TagLayout
          id="agent-1"
          nodeData={nodeDataCompleted}
          schema={agentSchema}
          name="MyAgent"
          config={{ name: "MyAgent" }}
          headerColor="#4f46e5"
          selected={false}
          handleTypes={{}}
          handlePositions={{}}
          onToggleExpand={vi.fn()}
        />,
      );

      expect(screen.getByTestId("draggable-handle")).toBeInTheDocument();
    });

    it("should render with error state", () => {
      const nodeDataError = {
        ...baseNodeData,
        executionState: { status: "error" },
      };

      render(
        <TagLayout
          id="agent-1"
          nodeData={nodeDataError}
          schema={agentSchema}
          name="MyAgent"
          config={{ name: "MyAgent" }}
          headerColor="#4f46e5"
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
    it("should render with validation errors", () => {
      const nodeDataWithErrors = {
        ...baseNodeData,
        validationErrors: [{ message: "Error" }],
      };

      render(
        <TagLayout
          id="agent-1"
          nodeData={nodeDataWithErrors}
          schema={agentSchema}
          name="MyAgent"
          config={{ name: "MyAgent" }}
          headerColor="#4f46e5"
          selected={false}
          handleTypes={{}}
          handlePositions={{}}
          onToggleExpand={vi.fn()}
        />,
      );

      expect(screen.getByTestId("validation-indicator")).toBeInTheDocument();
    });

    it("should render with duplicate name error", () => {
      const nodeDataWithDuplicate = {
        ...baseNodeData,
        duplicateNameError: true,
      };

      render(
        <TagLayout
          id="agent-1"
          nodeData={nodeDataWithDuplicate}
          schema={agentSchema}
          name="MyAgent"
          config={{ name: "MyAgent" }}
          headerColor="#4f46e5"
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
    it("should render locked node", () => {
      const nodeDataLocked = {
        ...baseNodeData,
        isNodeLocked: true,
      };

      render(
        <TagLayout
          id="agent-1"
          nodeData={nodeDataLocked}
          schema={agentSchema}
          name="MyAgent"
          config={{ name: "MyAgent" }}
          headerColor="#4f46e5"
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
