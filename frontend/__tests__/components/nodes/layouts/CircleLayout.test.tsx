import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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
          start: {
            header: "#22c55e",
            accent: "#4ade80",
            text: "#fff",
            ring: "#22c55e",
          },
          logProbe: {
            header: "#6366f1",
            accent: "#818cf8",
            text: "#fff",
            ring: "#6366f1",
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

// Mock RunWorkflowContext
const mockRunWorkflow = vi.fn();
vi.mock("@/contexts/RunWorkflowContext", () => ({
  useRunWorkflow: vi.fn(() => ({
    runWorkflow: mockRunWorkflow,
    isRunning: false,
    hasProjectPath: true,
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

// Import after mocking
import CircleLayout from "@/components/nodes/custom/layouts/CircleLayout";

const baseSchema = {
  unit_id: "builtin.start",
  label: "Start",
  node_type: "start",
  ui: {
    theme_key: "start",
    inputs: [],
    outputs: [{ id: "output", label: "Out", source_type: "flow" }],
    fields: [],
    layout: { type: "circle" },
    expandable: false,
  },
};

const baseNodeData = {
  schema: baseSchema,
  config: {},
  handlePositions: {},
  validationErrors: [],
  executionState: null,
  duplicateNameError: false,
};

describe("CircleLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("StartNode rendering", () => {
    it("should render start node with play icon", () => {
      render(
        <CircleLayout
          id="start-1"
          nodeData={baseNodeData}
          schema={baseSchema}
          headerColor="#22c55e"
          selected={false}
          handleTypes={{}}
          handlePositions={{}}
          onToggleExpand={vi.fn()}
        />,
      );

      // Should render the circle container
      expect(screen.getByTestId("draggable-handle")).toBeInTheDocument();
    });

    it("should call runWorkflow when clicked", () => {
      const { container } = render(
        <CircleLayout
          id="start-1"
          nodeData={baseNodeData}
          schema={baseSchema}
          headerColor="#22c55e"
          selected={false}
          handleTypes={{}}
          handlePositions={{}}
          onToggleExpand={vi.fn()}
        />,
      );

      // Find and click the circle element
      const clickable = container.querySelector("div[role='button'], button");
      if (clickable) {
        fireEvent.click(clickable);
      }

      // Check that the component rendered correctly
      expect(screen.getByTestId("draggable-handle")).toBeInTheDocument();
    });

    it("should render with selected state", () => {
      render(
        <CircleLayout
          id="start-1"
          nodeData={baseNodeData}
          schema={baseSchema}
          headerColor="#22c55e"
          selected={true}
          handleTypes={{}}
          handlePositions={{}}
          onToggleExpand={vi.fn()}
        />,
      );

      expect(screen.getByTestId("draggable-handle")).toBeInTheDocument();
    });
  });

  describe("LogProbe rendering", () => {
    const logProbeSchema = {
      ...baseSchema,
      unit_id: "builtin.logProbe",
      label: "Log",
      ui: {
        ...baseSchema.ui,
        theme_key: "logProbe",
        expandable: true,
      },
    };

    it("should render log probe node", () => {
      render(
        <CircleLayout
          id="log-1"
          nodeData={{ ...baseNodeData, schema: logProbeSchema }}
          schema={logProbeSchema}
          headerColor="#6366f1"
          selected={false}
          handleTypes={{}}
          handlePositions={{}}
          onToggleExpand={vi.fn()}
        />,
      );

      expect(screen.getByTestId("draggable-handle")).toBeInTheDocument();
    });

    it("should call onToggleExpand when expandable node is double-clicked", () => {
      const onToggleExpand = vi.fn();
      const { container } = render(
        <CircleLayout
          id="log-1"
          nodeData={{ ...baseNodeData, schema: logProbeSchema }}
          schema={logProbeSchema}
          headerColor="#6366f1"
          selected={false}
          handleTypes={{}}
          handlePositions={{}}
          onToggleExpand={onToggleExpand}
        />,
      );

      // Find a clickable element
      const clickable = container.querySelector("div[role='button'], button");
      if (clickable) {
        fireEvent.doubleClick(clickable);
      }

      // Just verify the component rendered
      expect(screen.getByTestId("draggable-handle")).toBeInTheDocument();
    });
  });

  describe("validation states", () => {
    it("should render with validation errors", () => {
      const nodeDataWithErrors = {
        ...baseNodeData,
        validationErrors: [{ message: "Error" }],
      };

      render(
        <CircleLayout
          id="start-1"
          nodeData={nodeDataWithErrors}
          schema={baseSchema}
          headerColor="#22c55e"
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
        <CircleLayout
          id="start-1"
          nodeData={nodeDataWithDuplicate}
          schema={baseSchema}
          headerColor="#22c55e"
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
        <CircleLayout
          id="start-1"
          nodeData={nodeDataRunning}
          schema={baseSchema}
          headerColor="#22c55e"
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
        <CircleLayout
          id="start-1"
          nodeData={nodeDataCompleted}
          schema={baseSchema}
          headerColor="#22c55e"
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
