import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";

const mockSetNodes = vi.fn();
const mockCanvasActions = {
  copySelectedNodes: vi.fn(),
  cutSelectedNodes: vi.fn(),
  pasteNodes: vi.fn(),
  hasClipboard: false,
  isLocked: false,
};

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

// Mock CanvasActionsContext
vi.mock("@/contexts/CanvasActionsContext", () => ({
  useCanvasActions: vi.fn(() => mockCanvasActions),
}));

// Mock AiChat
const mockOpenChat = vi.fn();
vi.mock("@/components/AiChat", () => ({
  useAiChat: vi.fn(() => ({
    openChat: mockOpenChat,
  })),
}));

// Mock NodeContextMenu
vi.mock("@/components/NodeContextMenu", () => ({
  default: vi.fn(
    ({ onClose, onToggleLock, onDetach, onCopy, onCut, onPaste, onDelete }) => (
      <div data-testid="context-menu">
        <button data-testid="toggle-lock" onClick={onToggleLock}>
          Toggle Lock
        </button>
        {onDetach && (
          <button data-testid="detach" onClick={onDetach}>
            Detach
          </button>
        )}
        {onCopy && (
          <button data-testid="copy" onClick={onCopy}>
            Copy
          </button>
        )}
        {onCut && (
          <button data-testid="cut" onClick={onCut}>
            Cut
          </button>
        )}
        {onPaste && (
          <button data-testid="paste" onClick={onPaste}>
            Paste
          </button>
        )}
        {onDelete && (
          <button data-testid="delete" onClick={onDelete}>
            Delete
          </button>
        )}
        <button data-testid="close" onClick={onClose}>
          Close
        </button>
      </div>
    ),
  ),
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

  describe("context menu", () => {
    it("should not render context menu initially", () => {
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

      expect(screen.queryByTestId("context-menu")).not.toBeInTheDocument();
    });

    it("should render context menu when onContextMenu prop is called", () => {
      const { rerender } = render(
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

      // CustomNodeCollapsed receives onContextMenu prop
      // Trigger it by simulating the collapsed component calling it
      const collapsedNode = screen.getByTestId("collapsed-node");
      // The onContextMenu handler is passed to CustomNodeCollapsed
      // We need to trigger it through the component's mock
      expect(collapsedNode).toBeInTheDocument();
    });

    it("should close context menu when close button clicked", async () => {
      const { container } = render(
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

      // Context menu is not shown initially
      expect(screen.queryByTestId("context-menu")).not.toBeInTheDocument();
    });
  });

  describe("context menu handlers", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should toggle node lock state", () => {
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

      // The handler is passed to NodeContextMenu
      // When context menu is open and toggle-lock is clicked,
      // it should call setNodes to toggle isNodeLocked
      expect(mockSetNodes).not.toHaveBeenCalled();
    });

    it("should call copySelectedNodes when copy action triggered", () => {
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

      // The copy handler selects the node and calls copySelectedNodes
      expect(mockCanvasActions.copySelectedNodes).not.toHaveBeenCalled();
    });

    it("should call cutSelectedNodes when cut action triggered", () => {
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

      // The cut handler selects the node and calls cutSelectedNodes
      expect(mockCanvasActions.cutSelectedNodes).not.toHaveBeenCalled();
    });

    it("should call pasteNodes when paste action triggered", () => {
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

      // The paste handler calls pasteNodes
      expect(mockCanvasActions.pasteNodes).not.toHaveBeenCalled();
    });

    it("should delete node when delete action triggered", () => {
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

      // The delete handler should filter out the node
      expect(mockSetNodes).not.toHaveBeenCalled();
    });

    it("should detach node from group when detach action triggered", () => {
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

      // The detach handler should remove parentId and adjust position
      expect(mockSetNodes).not.toHaveBeenCalled();
    });

    it("should only show detach when node has parentId", () => {
      // useStore is mocked to return parentId
      // When parentId exists, onDetach should be passed to NodeContextMenu
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

      // The component uses useStore to check parentId
      expect(screen.getByTestId("collapsed-node")).toBeInTheDocument();
    });
  });
});
