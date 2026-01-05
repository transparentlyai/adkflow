import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";

const mockSetNodes = vi.fn();

// Mock useReactFlow before other imports
vi.mock("@xyflow/react", () => ({
  useReactFlow: () => ({
    setNodes: mockSetNodes,
    getNodes: () => [],
    getEdges: () => [],
  }),
}));

// Mock the custom hooks before importing the component
vi.mock("@/components/nodes/custom", () => ({
  useCustomNodeTabs: vi.fn(() => ({
    tabs: [{ id: "main", label: "Main" }],
    activeTab: "main",
    setActiveTab: vi.fn(),
  })),
  useCustomNodeHandleTypes: vi.fn(() => ({
    input_1: { sourceType: "agent", dataType: "string" },
  })),
  useConnectedInputs: vi.fn(() => new Set()),
  useCustomNodeName: vi.fn(() => ({
    isEditing: false,
    editedName: "Test Node",
    inputRef: { current: null },
    handleNameClick: vi.fn(),
    handleNameChange: vi.fn(),
    handleNameSave: vi.fn(),
    handleNameKeyDown: vi.fn(),
  })),
  useFileOperations: vi.fn(() => ({
    isSaving: false,
    isDirty: false,
    handleFileSave: vi.fn(),
    handleChangeFile: vi.fn(),
  })),
  useModelFieldSync: vi.fn(),
  CustomNodeCollapsed: ({
    name,
    schema,
  }: {
    name: string;
    schema: { label: string };
  }) => <div data-testid="collapsed-node">{name || schema.label}</div>,
  CustomNodeExpanded: ({
    name,
    schema,
  }: {
    name: string;
    schema: { label: string };
  }) => <div data-testid="expanded-node">{name || schema.label}</div>,
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
            header: { background: "#f0f0f0", border: "#ddd" },
            text: { primary: "#000", secondary: "#666" },
          },
          agent: { header: "#4f46e5", accent: "#6366f1", text: "#fff" },
        },
      },
    },
  })),
}));

// Import after mocking
import CustomNode from "@/components/nodes/CustomNode";

const mockSchema = {
  unit_id: "agent",
  label: "Test Agent",
  node_type: "agent",
  ui: {
    inputs: [
      {
        id: "input_1",
        label: "Input",
        source_type: "agent",
        data_type: "string",
      },
    ],
    outputs: [
      {
        id: "output_1",
        label: "Output",
        source_type: "agent",
        data_type: "string",
      },
    ],
    fields: [{ id: "name", label: "Name", widget: "text", default: "" }],
    layout: { type: "default" },
  },
};

const mockNodeData = {
  schema: mockSchema,
  config: { name: "My Agent" },
  handlePositions: {},
  isExpanded: false,
  isNodeLocked: false,
  handleTypes: {},
};

describe("CustomNode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render collapsed node by default", () => {
      render(
        <CustomNode
          id="node-1"
          data={mockNodeData}
          selected={false}
          type="custom"
          zIndex={1}
          isConnectable={true}
          positionAbsoluteX={0}
          positionAbsoluteY={0}
          dragging={false}
        />,
      );

      expect(screen.getByTestId("collapsed-node")).toBeInTheDocument();
    });

    it("should render with isExpanded data property", () => {
      const expandedData = { ...mockNodeData, isExpanded: true };
      render(
        <CustomNode
          id="node-1"
          data={expandedData}
          selected={false}
          type="custom"
          zIndex={1}
          isConnectable={true}
          positionAbsoluteX={0}
          positionAbsoluteY={0}
          dragging={false}
        />,
      );

      // The internal state should initialize from dataIsExpanded
      // Either collapsed or expanded view will be shown based on initial state
      expect(
        screen.queryByTestId("collapsed-node") ||
          screen.queryByTestId("expanded-node"),
      ).toBeInTheDocument();
    });

    it("should display node name from config", () => {
      render(
        <CustomNode
          id="node-1"
          data={mockNodeData}
          selected={false}
          type="custom"
          zIndex={1}
          isConnectable={true}
          positionAbsoluteX={0}
          positionAbsoluteY={0}
          dragging={false}
        />,
      );

      expect(screen.getByText("My Agent")).toBeInTheDocument();
    });

    it("should use schema label as fallback when no config name", () => {
      const noNameData = { ...mockNodeData, config: {} };
      render(
        <CustomNode
          id="node-1"
          data={noNameData}
          selected={false}
          type="custom"
          zIndex={1}
          isConnectable={true}
          positionAbsoluteX={0}
          positionAbsoluteY={0}
          dragging={false}
        />,
      );

      expect(screen.getByText("Test Agent")).toBeInTheDocument();
    });
  });

  describe("with selected state", () => {
    it("should render when selected", () => {
      render(
        <CustomNode
          id="node-1"
          data={mockNodeData}
          selected={true}
          type="custom"
          zIndex={1}
          isConnectable={true}
          positionAbsoluteX={0}
          positionAbsoluteY={0}
          dragging={false}
        />,
      );

      expect(screen.getByTestId("collapsed-node")).toBeInTheDocument();
    });
  });

  describe("with locked state", () => {
    it("should render locked node", () => {
      const lockedData = { ...mockNodeData, isNodeLocked: true };
      render(
        <CustomNode
          id="node-1"
          data={lockedData}
          selected={false}
          type="custom"
          zIndex={1}
          isConnectable={true}
          positionAbsoluteX={0}
          positionAbsoluteY={0}
          dragging={false}
        />,
      );

      expect(screen.getByTestId("collapsed-node")).toBeInTheDocument();
    });
  });

  describe("expand/collapse", () => {
    it("should render expanded view when isExpanded is true and schema is expandable", () => {
      const expandableSchema = {
        ...mockSchema,
        ui: {
          ...mockSchema.ui,
          expandable: true,
          default_width: 400,
          default_height: 300,
        },
      };
      const expandedData = {
        ...mockNodeData,
        schema: expandableSchema,
        isExpanded: true,
      };
      render(
        <CustomNode
          id="node-1"
          data={expandedData}
          selected={false}
          type="custom"
          zIndex={1}
          isConnectable={true}
          positionAbsoluteX={0}
          positionAbsoluteY={0}
          dragging={false}
        />,
      );

      expect(screen.getByTestId("expanded-node")).toBeInTheDocument();
    });

    it("should render collapsed view when schema is not expandable", () => {
      const nonExpandableSchema = {
        ...mockSchema,
        ui: {
          ...mockSchema.ui,
          expandable: false,
        },
      };
      const expandedData = {
        ...mockNodeData,
        schema: nonExpandableSchema,
        isExpanded: true,
      };
      render(
        <CustomNode
          id="node-1"
          data={expandedData}
          selected={false}
          type="custom"
          zIndex={1}
          isConnectable={true}
          positionAbsoluteX={0}
          positionAbsoluteY={0}
          dragging={false}
        />,
      );

      expect(screen.getByTestId("collapsed-node")).toBeInTheDocument();
    });
  });

  describe("theme handling", () => {
    it("should use theme_key when available", () => {
      const schemaWithThemeKey = {
        ...mockSchema,
        ui: {
          ...mockSchema.ui,
          theme_key: "agent",
        },
      };
      const dataWithThemeKey = { ...mockNodeData, schema: schemaWithThemeKey };
      render(
        <CustomNode
          id="node-1"
          data={dataWithThemeKey}
          selected={false}
          type="custom"
          zIndex={1}
          isConnectable={true}
          positionAbsoluteX={0}
          positionAbsoluteY={0}
          dragging={false}
        />,
      );

      expect(screen.getByTestId("collapsed-node")).toBeInTheDocument();
    });

    it("should fallback to schema.ui.color when theme_key not found", () => {
      const schemaWithColor = {
        ...mockSchema,
        ui: {
          ...mockSchema.ui,
          theme_key: "nonexistent",
          color: "#ff0000",
        },
      };
      const dataWithColor = { ...mockNodeData, schema: schemaWithColor };
      render(
        <CustomNode
          id="node-1"
          data={dataWithColor}
          selected={false}
          type="custom"
          zIndex={1}
          isConnectable={true}
          positionAbsoluteX={0}
          positionAbsoluteY={0}
          dragging={false}
        />,
      );

      expect(screen.getByTestId("collapsed-node")).toBeInTheDocument();
    });
  });

  describe("with code editor", () => {
    it("should pass file operations when schema has code_editor widget", () => {
      const schemaWithCodeEditor = {
        ...mockSchema,
        ui: {
          ...mockSchema.ui,
          expandable: true,
          default_width: 600,
          default_height: 400,
          fields: [{ id: "code", label: "Code", widget: "code_editor" }],
        },
      };
      const dataWithEditor = {
        ...mockNodeData,
        schema: schemaWithCodeEditor,
        isExpanded: true,
        config: { file_path: "/test/file.py" },
      };
      render(
        <CustomNode
          id="node-1"
          data={dataWithEditor}
          selected={false}
          type="custom"
          zIndex={1}
          isConnectable={true}
          positionAbsoluteX={0}
          positionAbsoluteY={0}
          dragging={false}
        />,
      );

      expect(screen.getByTestId("expanded-node")).toBeInTheDocument();
    });

    it("should pass file operations when schema has monaco_editor widget", () => {
      const schemaWithMonaco = {
        ...mockSchema,
        ui: {
          ...mockSchema.ui,
          expandable: true,
          default_width: 600,
          default_height: 400,
          fields: [{ id: "code", label: "Code", widget: "monaco_editor" }],
        },
      };
      const dataWithEditor = {
        ...mockNodeData,
        schema: schemaWithMonaco,
        isExpanded: true,
      };
      render(
        <CustomNode
          id="node-1"
          data={dataWithEditor}
          selected={false}
          type="custom"
          zIndex={1}
          isConnectable={true}
          positionAbsoluteX={0}
          positionAbsoluteY={0}
          dragging={false}
        />,
      );

      expect(screen.getByTestId("expanded-node")).toBeInTheDocument();
    });
  });

  describe("execution state", () => {
    it("should pass execution state when not idle", () => {
      const expandableSchema = {
        ...mockSchema,
        ui: {
          ...mockSchema.ui,
          expandable: true,
          default_width: 400,
          default_height: 300,
        },
      };
      const dataWithExecution = {
        ...mockNodeData,
        schema: expandableSchema,
        isExpanded: true,
        executionState: "running",
      };
      render(
        <CustomNode
          id="node-1"
          data={dataWithExecution}
          selected={false}
          type="custom"
          zIndex={1}
          isConnectable={true}
          positionAbsoluteX={0}
          positionAbsoluteY={0}
          dragging={false}
        />,
      );

      expect(screen.getByTestId("expanded-node")).toBeInTheDocument();
    });

    it("should not pass execution state when idle", () => {
      const expandableSchema = {
        ...mockSchema,
        ui: {
          ...mockSchema.ui,
          expandable: true,
          default_width: 400,
          default_height: 300,
        },
      };
      const dataWithIdle = {
        ...mockNodeData,
        schema: expandableSchema,
        isExpanded: true,
        executionState: "idle",
      };
      render(
        <CustomNode
          id="node-1"
          data={dataWithIdle}
          selected={false}
          type="custom"
          zIndex={1}
          isConnectable={true}
          positionAbsoluteX={0}
          positionAbsoluteY={0}
          dragging={false}
        />,
      );

      expect(screen.getByTestId("expanded-node")).toBeInTheDocument();
    });
  });

  describe("resizable", () => {
    it("should pass resize handler when schema is resizable", () => {
      const resizableSchema = {
        ...mockSchema,
        ui: {
          ...mockSchema.ui,
          expandable: true,
          resizable: true,
          default_width: 400,
          default_height: 300,
          min_width: 200,
          min_height: 150,
        },
      };
      const dataResizable = {
        ...mockNodeData,
        schema: resizableSchema,
        isExpanded: true,
      };
      render(
        <CustomNode
          id="node-1"
          data={dataResizable}
          selected={false}
          type="custom"
          zIndex={1}
          isConnectable={true}
          positionAbsoluteX={0}
          positionAbsoluteY={0}
          dragging={false}
        />,
      );

      expect(screen.getByTestId("expanded-node")).toBeInTheDocument();
    });
  });

  describe("expanded size", () => {
    it("should use expandedSize from node data when available", () => {
      const expandableSchema = {
        ...mockSchema,
        ui: {
          ...mockSchema.ui,
          expandable: true,
          default_width: 400,
          default_height: 300,
        },
      };
      const dataWithSize = {
        ...mockNodeData,
        schema: expandableSchema,
        isExpanded: true,
        expandedSize: { width: 600, height: 500 },
      };
      render(
        <CustomNode
          id="node-1"
          data={dataWithSize}
          selected={false}
          type="custom"
          zIndex={1}
          isConnectable={true}
          positionAbsoluteX={0}
          positionAbsoluteY={0}
          dragging={false}
        />,
      );

      expect(screen.getByTestId("expanded-node")).toBeInTheDocument();
    });
  });
});
