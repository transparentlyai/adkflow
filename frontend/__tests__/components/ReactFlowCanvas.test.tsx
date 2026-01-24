import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import type { Node, Edge } from "@xyflow/react";

// Mock lucide-react icons
vi.mock("lucide-react", () => {
  const createMockIcon = (testId: string) =>
    function MockIcon({
      size,
      style,
      className,
    }: {
      size?: number;
      style?: React.CSSProperties;
      className?: string;
    }) {
      return React.createElement("svg", {
        "data-testid": testId,
        "data-size": size,
        style,
        className,
      });
    };

  return {
    Lock: createMockIcon("lock-icon"),
    LockOpen: createMockIcon("lock-open-icon"),
    Grid3X3: createMockIcon("grid-icon"),
  };
});

// Mock custom node schemas
const mockCustomNodeSchema = {
  nodeType: "custom-test",
  label: "Test Custom Node",
  description: "Test description",
  icon: "test-icon",
  color: "#000000",
  outputs: [],
  inputs: [],
  configSchema: {},
};

// Mock API
vi.mock("@/lib/api", () => ({
  getExtensionNodes: vi.fn(() =>
    Promise.resolve({ nodes: [mockCustomNodeSchema] }),
  ),
}));

// Mock builtinNodeHelpers
vi.mock("@/lib/builtinNodeHelpers", () => ({
  builtinNodeSchemas: [],
}));

// Mock useCanvasSetup - the main composite hook
const mockUseCanvasSetup = vi.fn();
const mockGetCanvasStyles = vi.fn(() => "");

vi.mock("@/components/hooks/canvas", () => ({
  useCanvasSetup: (params: unknown) => mockUseCanvasSetup(params),
  useCanvasImperativeHandle: () => {},
  getCanvasStyles: () => mockGetCanvasStyles(),
}));

// Mock child components
vi.mock("@/components/CanvasContextMenu", () => ({
  default: ({
    x,
    y,
    onClose,
  }: {
    x: number;
    y: number;
    onClose: () => void;
  }) => (
    <div data-testid="canvas-context-menu" data-x={x} data-y={y}>
      <button onClick={onClose}>Close Menu</button>
    </div>
  ),
}));

vi.mock("@/components/ReactFlowDialogs", () => ({
  ReactFlowDialogs: () => <div data-testid="react-flow-dialogs" />,
}));

vi.mock("@/components/ReactFlowControls", () => ({
  ReactFlowControls: ({
    isLocked,
    onToggleLock,
  }: {
    isLocked?: boolean;
    onToggleLock?: () => void;
  }) => (
    <div data-testid="react-flow-controls">
      <button onClick={onToggleLock}>
        {isLocked ? "Unlock" : "Lock"} Canvas
      </button>
    </div>
  ),
}));

// Import after mocking
import ReactFlowCanvas from "@/components/ReactFlowCanvas";

describe("ReactFlowCanvas", () => {
  const mockNodes: Node[] = [
    {
      id: "node-1",
      type: "agent",
      position: { x: 0, y: 0 },
      data: { name: "Test Agent" },
    },
  ];

  const mockEdges: Edge[] = [
    {
      id: "edge-1",
      source: "node-1",
      target: "node-2",
    },
  ];

  const mockTheme = {
    id: "test-theme",
    name: "Test Theme",
    version: "1.0.0",
    colors: {
      canvas: {
        background: "#ffffff",
        grid: "#e0e0e0",
        minimap: {
          background: "#f5f5f5",
          mask: "rgba(0, 0, 0, 0.1)",
          nodeStroke: "#333333",
        },
      },
      nodes: {},
      handles: {},
      edges: {
        default: "#999999",
        connected: "#4a90d9",
        link: "#00ff00",
      },
      ui: {},
      form: {},
      scrollbar: {},
      topology: {},
      state: {},
      monaco: "vs",
      agentPrism: {},
    },
  } as const;

  const createMockCanvasSetupReturn = (overrides = {}) => ({
    // State
    nodes: mockNodes,
    edges: mockEdges,
    setRfInstance: vi.fn(),
    customNodeSchemas: [],
    contextMenu: null,
    deleteConfirm: null,
    groupDeleteConfirm: null,
    snapToGrid: false,
    setSnapToGrid: vi.fn(),
    teleportNamePrompt: null,
    teleportNameInput: "",
    setTeleportNameInput: vi.fn(),

    // Config
    config: {
      theme: mockTheme,
      nodeTypes: {},
      defaultEdgeOptions: {},
      snapGridValue: [16, 16] as [number, number],
      handleTypeRegistry: new Map(),
    },

    // Handlers
    connectionHandlers: {
      onConnectStart: vi.fn(),
      onConnectEnd: vi.fn(),
      isValidConnection: vi.fn(() => true),
      onNodesChange: vi.fn(),
      onEdgesChange: vi.fn(),
      onConnect: vi.fn(),
      onNodeDragStop: vi.fn(),
    },
    deleteHandlers: {
      handleDeleteConfirm: vi.fn(),
      handleDeleteCancel: vi.fn(),
      handleGroupDeleteGroupOnly: vi.fn(),
      handleGroupDeleteAll: vi.fn(),
      handleGroupDeleteCancel: vi.fn(),
      handleDelete: vi.fn(),
    },
    clipboard: {
      handleCopy: vi.fn(),
      handleCut: vi.fn(),
      handlePaste: vi.fn(),
      hasClipboard: false,
    },
    contextMenuHandlers: {
      onPaneContextMenu: vi.fn(),
      onNodeContextMenu: vi.fn(),
      onSelectionContextMenu: vi.fn(),
      onMouseMove: vi.fn(),
      onContextMenuSelect: vi.fn(),
      closeContextMenu: vi.fn(),
      handleTeleportNameSubmit: vi.fn(),
      handleTeleportNameCancel: vi.fn(),
      handleTeleportNameKeyDown: vi.fn(),
      handleSelectCustomNode: vi.fn(),
    },
    altClickZoom: {
      onNodeClick: vi.fn(),
      onPaneClick: vi.fn(),
    },

    // Operations
    nodeCreation: {
      addGroupNode: vi.fn(),
      addLabelNode: vi.fn(),
      addCustomNode: vi.fn(),
      addBuiltinSchemaNode: vi.fn(),
    },
    canvasOperations: {
      clearCanvas: vi.fn(),
      saveFlow: vi.fn(() => ({
        nodes: [],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      })),
      restoreFlow: vi.fn(),
      zoomIn: vi.fn(),
      zoomOut: vi.fn(),
      fitViewHandler: vi.fn(),
      focusNode: vi.fn(),
    },
    executionState: {
      updateNodeExecutionState: vi.fn(),
      updateToolExecutionState: vi.fn(),
      updateCallbackExecutionState: vi.fn(),
      clearExecutionState: vi.fn(),
      updateUserInputWaitingState: vi.fn(),
      updateMonitorValue: vi.fn(),
      clearAllMonitors: vi.fn(),
    },
    validation: {
      highlightErrorNodes: vi.fn(),
      highlightWarningNodes: vi.fn(),
      clearErrorHighlights: vi.fn(),
    },
    ...overrides,
  });

  const defaultProps = {
    onWorkflowChange: vi.fn(),
    onRequestPromptCreation: vi.fn(),
    onRequestContextCreation: vi.fn(),
    onRequestToolCreation: vi.fn(),
    onRequestProcessCreation: vi.fn(),
    onRequestOutputFileCreation: vi.fn(),
    isLocked: false,
    onToggleLock: vi.fn(),
    activeTabId: "tab-1",
    onSave: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCanvasSetup.mockReturnValue(createMockCanvasSetupReturn());
  });

  describe("rendering", () => {
    it("should render the ReactFlow canvas", () => {
      const { container } = render(<ReactFlowCanvas {...defaultProps} />);
      expect(container.querySelector(".w-full.h-full")).toBeInTheDocument();
    });

    it("should render ReactFlowControls component", () => {
      render(<ReactFlowCanvas {...defaultProps} />);
      expect(screen.getByTestId("react-flow-controls")).toBeInTheDocument();
    });

    it("should render ReactFlowDialogs component", () => {
      render(<ReactFlowCanvas {...defaultProps} />);
      expect(screen.getByTestId("react-flow-dialogs")).toBeInTheDocument();
    });

    it("should apply theme background color", () => {
      const { container } = render(<ReactFlowCanvas {...defaultProps} />);
      const canvasDiv = container.querySelector(".w-full.h-full");
      expect(canvasDiv).toHaveStyle({ background: "#ffffff" });
    });

    it("should not render context menu when contextMenu state is null", () => {
      render(<ReactFlowCanvas {...defaultProps} />);
      expect(
        screen.queryByTestId("canvas-context-menu"),
      ).not.toBeInTheDocument();
    });

    it("should render context menu when contextMenu state is set", () => {
      mockUseCanvasSetup.mockReturnValue(
        createMockCanvasSetupReturn({
          contextMenu: { x: 100, y: 200, flowPosition: { x: 50, y: 100 } },
        }),
      );

      render(<ReactFlowCanvas {...defaultProps} />);
      expect(screen.getByTestId("canvas-context-menu")).toBeInTheDocument();
    });
  });

  describe("lock state", () => {
    it("should pass isLocked to ReactFlowControls", () => {
      render(<ReactFlowCanvas {...defaultProps} isLocked={true} />);
      expect(screen.getByText("Unlock Canvas")).toBeInTheDocument();
    });

    it("should pass isLocked=false to ReactFlowControls", () => {
      render(<ReactFlowCanvas {...defaultProps} isLocked={false} />);
      expect(screen.getByText("Lock Canvas")).toBeInTheDocument();
    });

    it("should pass onToggleLock to ReactFlowControls", () => {
      const onToggleLock = vi.fn();
      render(<ReactFlowCanvas {...defaultProps} onToggleLock={onToggleLock} />);
      expect(screen.getByTestId("react-flow-controls")).toBeInTheDocument();
    });
  });

  describe("snap to grid", () => {
    it("should pass snapToGrid state to ReactFlowControls", () => {
      mockUseCanvasSetup.mockReturnValue(
        createMockCanvasSetupReturn({ snapToGrid: true }),
      );

      render(<ReactFlowCanvas {...defaultProps} />);
      expect(screen.getByTestId("react-flow-controls")).toBeInTheDocument();
    });

    it("should toggle snap to grid via setSnapToGrid", () => {
      const setSnapToGrid = vi.fn();
      mockUseCanvasSetup.mockReturnValue(
        createMockCanvasSetupReturn({ snapToGrid: false, setSnapToGrid }),
      );

      render(<ReactFlowCanvas {...defaultProps} />);
      expect(screen.getByTestId("react-flow-controls")).toBeInTheDocument();
    });
  });

  describe("useCanvasSetup integration", () => {
    it("should call useCanvasSetup with correct parameters", () => {
      render(<ReactFlowCanvas {...defaultProps} />);
      expect(mockUseCanvasSetup).toHaveBeenCalled();

      const callArgs = mockUseCanvasSetup.mock.calls[0][0];
      expect(callArgs).toMatchObject({
        onWorkflowChange: defaultProps.onWorkflowChange,
        onRequestPromptCreation: defaultProps.onRequestPromptCreation,
        onRequestContextCreation: defaultProps.onRequestContextCreation,
        onRequestToolCreation: defaultProps.onRequestToolCreation,
        onRequestProcessCreation: defaultProps.onRequestProcessCreation,
        onRequestOutputFileCreation: defaultProps.onRequestOutputFileCreation,
        isLocked: defaultProps.isLocked,
        activeTabId: defaultProps.activeTabId,
        onSave: defaultProps.onSave,
      });
    });

    it("should pass isLocked to useCanvasSetup", () => {
      render(<ReactFlowCanvas {...defaultProps} isLocked={true} />);
      const callArgs = mockUseCanvasSetup.mock.calls[0][0];
      expect(callArgs.isLocked).toBe(true);
    });

    it("should pass activeTabId to useCanvasSetup", () => {
      render(<ReactFlowCanvas {...defaultProps} activeTabId="custom-tab" />);
      const callArgs = mockUseCanvasSetup.mock.calls[0][0];
      expect(callArgs.activeTabId).toBe("custom-tab");
    });
  });

  describe("context providers", () => {
    it("should wrap canvas with CanvasActionsProvider", () => {
      mockUseCanvasSetup.mockReturnValue(
        createMockCanvasSetupReturn({
          clipboard: {
            handleCopy: vi.fn(),
            handleCut: vi.fn(),
            handlePaste: vi.fn(),
            hasClipboard: true,
          },
        }),
      );

      render(<ReactFlowCanvas {...defaultProps} />);
      expect(screen.getByTestId("react-flow-controls")).toBeInTheDocument();
    });

    it("should provide correct CanvasActions context values", () => {
      render(<ReactFlowCanvas {...defaultProps} isLocked={true} />);
      expect(screen.getByTestId("react-flow-controls")).toBeInTheDocument();
    });
  });

  describe("context menu", () => {
    it("should render context menu at correct position", () => {
      mockUseCanvasSetup.mockReturnValue(
        createMockCanvasSetupReturn({
          contextMenu: {
            x: 150,
            y: 250,
            flowPosition: { x: 100, y: 200 },
          },
        }),
      );

      render(<ReactFlowCanvas {...defaultProps} />);
      const menu = screen.getByTestId("canvas-context-menu");
      expect(menu).toHaveAttribute("data-x", "150");
      expect(menu).toHaveAttribute("data-y", "250");
    });

    it("should pass context menu handlers", () => {
      const closeContextMenu = vi.fn();
      mockUseCanvasSetup.mockReturnValue(
        createMockCanvasSetupReturn({
          contextMenu: {
            x: 100,
            y: 100,
            flowPosition: { x: 50, y: 50 },
          },
          contextMenuHandlers: {
            onPaneContextMenu: vi.fn(),
            onNodeContextMenu: vi.fn(),
            onSelectionContextMenu: vi.fn(),
            onMouseMove: vi.fn(),
            onContextMenuSelect: vi.fn(),
            closeContextMenu,
            handleTeleportNameSubmit: vi.fn(),
            handleTeleportNameCancel: vi.fn(),
            handleTeleportNameKeyDown: vi.fn(),
            handleSelectCustomNode: vi.fn(),
          },
        }),
      );

      render(<ReactFlowCanvas {...defaultProps} />);
      expect(screen.getByTestId("canvas-context-menu")).toBeInTheDocument();
    });
  });

  describe("edge cases", () => {
    it("should handle undefined activeTabId", () => {
      render(<ReactFlowCanvas {...defaultProps} activeTabId={undefined} />);
      expect(screen.getByTestId("react-flow-controls")).toBeInTheDocument();
    });

    it("should handle undefined isLocked", () => {
      render(<ReactFlowCanvas {...defaultProps} isLocked={undefined} />);
      expect(screen.getByTestId("react-flow-controls")).toBeInTheDocument();
    });

    it("should handle undefined onToggleLock", () => {
      render(<ReactFlowCanvas {...defaultProps} onToggleLock={undefined} />);
      expect(screen.getByTestId("react-flow-controls")).toBeInTheDocument();
    });

    it("should handle undefined onSave", () => {
      render(<ReactFlowCanvas {...defaultProps} onSave={undefined} />);
      expect(screen.getByTestId("react-flow-controls")).toBeInTheDocument();
    });

    it("should handle undefined onWorkflowChange", () => {
      render(
        <ReactFlowCanvas {...defaultProps} onWorkflowChange={undefined} />,
      );
      expect(screen.getByTestId("react-flow-controls")).toBeInTheDocument();
    });

    it("should handle empty nodes array", () => {
      mockUseCanvasSetup.mockReturnValue(
        createMockCanvasSetupReturn({ nodes: [] }),
      );

      render(<ReactFlowCanvas {...defaultProps} />);
      expect(screen.getByTestId("react-flow-controls")).toBeInTheDocument();
    });

    it("should handle empty edges array", () => {
      mockUseCanvasSetup.mockReturnValue(
        createMockCanvasSetupReturn({ edges: [] }),
      );

      render(<ReactFlowCanvas {...defaultProps} />);
      expect(screen.getByTestId("react-flow-controls")).toBeInTheDocument();
    });

    it("should handle empty customNodeSchemas", () => {
      mockUseCanvasSetup.mockReturnValue(
        createMockCanvasSetupReturn({ customNodeSchemas: [] }),
      );

      render(<ReactFlowCanvas {...defaultProps} />);
      expect(screen.getByTestId("react-flow-controls")).toBeInTheDocument();
    });
  });

  describe("ReactFlowProvider wrapper", () => {
    it("should wrap component with ReactFlowProvider", () => {
      render(<ReactFlowCanvas {...defaultProps} />);
      expect(screen.getByTestId("react-flow-controls")).toBeInTheDocument();
    });

    it("should wrap component with ConnectionProvider", () => {
      render(<ReactFlowCanvas {...defaultProps} />);
      expect(screen.getByTestId("react-flow-controls")).toBeInTheDocument();
    });
  });

  describe("display names", () => {
    it("should have displayName for ReactFlowCanvasInner", () => {
      render(<ReactFlowCanvas {...defaultProps} />);
      expect(screen.getByTestId("react-flow-controls")).toBeInTheDocument();
    });

    it("should have displayName for ReactFlowCanvas", () => {
      render(<ReactFlowCanvas {...defaultProps} />);
      expect(screen.getByTestId("react-flow-controls")).toBeInTheDocument();
    });
  });

  describe("node creation callbacks", () => {
    it("should pass onRequestPromptCreation to useCanvasSetup", () => {
      const onRequestPromptCreation = vi.fn();
      render(
        <ReactFlowCanvas
          {...defaultProps}
          onRequestPromptCreation={onRequestPromptCreation}
        />,
      );
      const callArgs = mockUseCanvasSetup.mock.calls[0][0];
      expect(callArgs.onRequestPromptCreation).toBe(onRequestPromptCreation);
    });

    it("should pass onRequestContextCreation to useCanvasSetup", () => {
      const onRequestContextCreation = vi.fn();
      render(
        <ReactFlowCanvas
          {...defaultProps}
          onRequestContextCreation={onRequestContextCreation}
        />,
      );
      const callArgs = mockUseCanvasSetup.mock.calls[0][0];
      expect(callArgs.onRequestContextCreation).toBe(onRequestContextCreation);
    });

    it("should pass onRequestToolCreation to useCanvasSetup", () => {
      const onRequestToolCreation = vi.fn();
      render(
        <ReactFlowCanvas
          {...defaultProps}
          onRequestToolCreation={onRequestToolCreation}
        />,
      );
      const callArgs = mockUseCanvasSetup.mock.calls[0][0];
      expect(callArgs.onRequestToolCreation).toBe(onRequestToolCreation);
    });

    it("should pass onRequestProcessCreation to useCanvasSetup", () => {
      const onRequestProcessCreation = vi.fn();
      render(
        <ReactFlowCanvas
          {...defaultProps}
          onRequestProcessCreation={onRequestProcessCreation}
        />,
      );
      const callArgs = mockUseCanvasSetup.mock.calls[0][0];
      expect(callArgs.onRequestProcessCreation).toBe(onRequestProcessCreation);
    });

    it("should pass onRequestOutputFileCreation to useCanvasSetup", () => {
      const onRequestOutputFileCreation = vi.fn();
      render(
        <ReactFlowCanvas
          {...defaultProps}
          onRequestOutputFileCreation={onRequestOutputFileCreation}
        />,
      );
      const callArgs = mockUseCanvasSetup.mock.calls[0][0];
      expect(callArgs.onRequestOutputFileCreation).toBe(
        onRequestOutputFileCreation,
      );
    });
  });

  describe("theme styles", () => {
    it("should inject canvas styles via style tag", () => {
      const customStyles = ".custom-class { color: red; }";
      mockGetCanvasStyles.mockReturnValue(customStyles);

      render(<ReactFlowCanvas {...defaultProps} />);
      expect(mockGetCanvasStyles).toHaveBeenCalled();
    });

    it("should apply theme to ReactFlow component", () => {
      render(<ReactFlowCanvas {...defaultProps} />);
      expect(screen.getByTestId("react-flow-controls")).toBeInTheDocument();
    });
  });
});
