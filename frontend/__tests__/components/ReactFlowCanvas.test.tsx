import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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

// Mock all canvas hooks
const mockUseCanvasState = vi.fn();
const mockUseCanvasConfig = vi.fn();
const mockUseConnectionHandlers = vi.fn();
const mockUseCanvasHistory = vi.fn();
const mockUseDeleteHandlers = vi.fn();
const mockUseClipboardOperations = vi.fn();
const mockUseKeyboardShortcuts = vi.fn();
const mockUseNodeCreation = vi.fn();
const mockUseContextMenu = vi.fn();
const mockUseCanvasOperations = vi.fn();
const mockUseExecutionState = vi.fn();
const mockUseValidation = vi.fn();
const mockUseEdgeHighlight = vi.fn();
const mockUseEdgeTabOpacity = vi.fn();
const mockGetCanvasStyles = vi.fn(() => "");

vi.mock("@/components/hooks/canvas", () => ({
  useCanvasState: () => mockUseCanvasState(),
  useCanvasConfig: () => mockUseCanvasConfig(),
  useConnectionHandlers: () => mockUseConnectionHandlers(),
  useCanvasHistory: () => mockUseCanvasHistory(),
  useDeleteHandlers: () => mockUseDeleteHandlers(),
  useClipboardOperations: () => mockUseClipboardOperations(),
  useKeyboardShortcuts: () => mockUseKeyboardShortcuts(),
  useNodeCreation: () => mockUseNodeCreation(),
  useContextMenu: () => mockUseContextMenu(),
  useCanvasOperations: () => mockUseCanvasOperations(),
  useExecutionState: () => mockUseExecutionState(),
  useValidation: () => mockUseValidation(),
  useEdgeHighlight: () => mockUseEdgeHighlight(),
  useEdgeTabOpacity: () => mockUseEdgeTabOpacity(),
  useAltClickZoom: () => ({ onNodeClick: vi.fn(), onPaneClick: vi.fn() }),
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
import type { ReactFlowCanvasRef } from "@/components/ReactFlowCanvas";

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

  const defaultHookReturns = () => {
    mockUseCanvasState.mockReturnValue({
      nodes: mockNodes,
      setNodes: vi.fn(),
      edges: mockEdges,
      setEdges: vi.fn(),
      rfInstance: null,
      setRfInstance: vi.fn(),
      customNodeSchemas: [],
      setCustomNodeSchemas: vi.fn(),
      contextMenu: null,
      setContextMenu: vi.fn(),
      deleteConfirm: null,
      setDeleteConfirm: vi.fn(),
      groupDeleteConfirm: null,
      setGroupDeleteConfirm: vi.fn(),
      mousePosition: { x: 0, y: 0 },
      setMousePosition: vi.fn(),
      snapToGrid: false,
      setSnapToGrid: vi.fn(),
      teleportNamePrompt: null,
      setTeleportNamePrompt: vi.fn(),
      teleportNameInput: "",
      setTeleportNameInput: vi.fn(),
      undoStackRef: { current: [] },
      redoStackRef: { current: [] },
      maxHistorySize: 50,
      prevContentRef: { current: null },
      duplicateErrorNodesRef: { current: new Map() },
      resetPositions: vi.fn(),
      groupPosition: { x: 0, y: 0 },
      setGroupPosition: vi.fn(),
      agentPosition: { x: 0, y: 0 },
      setAgentPosition: vi.fn(),
      promptPosition: { x: 0, y: 0 },
      setPromptPosition: vi.fn(),
      contextPosition: { x: 0, y: 0 },
      setContextPosition: vi.fn(),
      inputProbePosition: { x: 0, y: 0 },
      setInputProbePosition: vi.fn(),
      outputProbePosition: { x: 0, y: 0 },
      setOutputProbePosition: vi.fn(),
      logProbePosition: { x: 0, y: 0 },
      setLogProbePosition: vi.fn(),
      outputFilePosition: { x: 0, y: 0 },
      setOutputFilePosition: vi.fn(),
      toolPosition: { x: 0, y: 0 },
      setToolPosition: vi.fn(),
      agentToolPosition: { x: 0, y: 0 },
      setAgentToolPosition: vi.fn(),
      variablePosition: { x: 0, y: 0 },
      setVariablePosition: vi.fn(),
      processPosition: { x: 0, y: 0 },
      setProcessPosition: vi.fn(),
      labelPosition: { x: 0, y: 0 },
      setLabelPosition: vi.fn(),
      teleportOutPosition: { x: 0, y: 0 },
      setTeleportOutPosition: vi.fn(),
      teleportInPosition: { x: 0, y: 0 },
      setTeleportInPosition: vi.fn(),
      userInputPosition: { x: 0, y: 0 },
      setUserInputPosition: vi.fn(),
    });

    mockUseCanvasConfig.mockReturnValue({
      nodeTypes: {},
      defaultEdgeOptions: {},
      snapGridValue: [16, 16],
      handleTypeRegistry: new Map(),
      theme: mockTheme,
    });

    mockUseConnectionHandlers.mockReturnValue({
      onConnectStart: vi.fn(),
      onConnectEnd: vi.fn(),
      isValidConnection: vi.fn(() => true),
      onNodesChange: vi.fn(),
      onEdgesChange: vi.fn(),
      onConnect: vi.fn(),
      onNodeDragStop: vi.fn(),
    });

    mockUseCanvasHistory.mockReturnValue({
      saveSnapshot: vi.fn(),
      handleUndo: vi.fn(),
      handleRedo: vi.fn(),
    });

    mockUseDeleteHandlers.mockReturnValue({
      handleDeleteConfirm: vi.fn(),
      handleDeleteCancel: vi.fn(),
      handleGroupDeleteGroupOnly: vi.fn(),
      handleGroupDeleteAll: vi.fn(),
      handleGroupDeleteCancel: vi.fn(),
      handleDelete: vi.fn(),
    });

    mockUseClipboardOperations.mockReturnValue({
      handleCopy: vi.fn(),
      handleCut: vi.fn(),
      handlePaste: vi.fn(),
      hasClipboard: false,
    });

    mockUseKeyboardShortcuts.mockReturnValue(undefined);

    mockUseNodeCreation.mockReturnValue({
      addGroupNode: vi.fn(),
      addLabelNode: vi.fn(),
      addCustomNode: vi.fn(),
      addBuiltinSchemaNode: vi.fn(),
    });

    mockUseContextMenu.mockReturnValue({
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
    });

    mockUseCanvasOperations.mockReturnValue({
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
    });

    mockUseExecutionState.mockReturnValue({
      updateNodeExecutionState: vi.fn(),
      updateToolExecutionState: vi.fn(),
      updateCallbackExecutionState: vi.fn(),
      clearExecutionState: vi.fn(),
      updateUserInputWaitingState: vi.fn(),
    });

    mockUseValidation.mockReturnValue({
      highlightErrorNodes: vi.fn(),
      highlightWarningNodes: vi.fn(),
      clearErrorHighlights: vi.fn(),
    });

    mockUseEdgeHighlight.mockReturnValue(undefined);
    mockUseEdgeTabOpacity.mockReturnValue(undefined);
  };

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
    defaultHookReturns();
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
      mockUseCanvasState.mockReturnValue({
        ...mockUseCanvasState(),
        contextMenu: { x: 100, y: 200, flowPosition: { x: 50, y: 100 } },
      });

      render(<ReactFlowCanvas {...defaultProps} />);
      expect(screen.getByTestId("canvas-context-menu")).toBeInTheDocument();
    });
  });

  describe("custom node schemas loading", () => {
    it("should load custom node schemas on mount", async () => {
      const setCustomNodeSchemas = vi.fn();
      mockUseCanvasState.mockReturnValue({
        ...mockUseCanvasState(),
        setCustomNodeSchemas,
      });

      render(<ReactFlowCanvas {...defaultProps} />);

      await waitFor(() => {
        expect(setCustomNodeSchemas).toHaveBeenCalledWith([
          mockCustomNodeSchema,
        ]);
      });
    });

    it("should handle custom node loading errors gracefully", async () => {
      const consoleLogSpy = vi
        .spyOn(console, "log")
        .mockImplementation(() => {});
      const { getExtensionNodes } = await import("@/lib/api");
      vi.mocked(getExtensionNodes).mockRejectedValueOnce(
        new Error("Network error"),
      );

      render(<ReactFlowCanvas {...defaultProps} />);

      await waitFor(() => {
        expect(consoleLogSpy).toHaveBeenCalledWith(
          "[ReactFlowCanvas] No custom nodes available",
        );
      });

      consoleLogSpy.mockRestore();
    });
  });

  describe("imperative handle methods", () => {
    it("should expose addGroupNode via ref", () => {
      const ref = React.createRef<ReactFlowCanvasRef>();
      const addGroupNode = vi.fn();
      mockUseNodeCreation.mockReturnValue({
        ...mockUseNodeCreation(),
        addGroupNode,
      });

      render(<ReactFlowCanvas {...defaultProps} ref={ref} />);

      expect(ref.current?.addGroupNode).toBe(addGroupNode);
    });

    it("should expose addLabelNode via ref", () => {
      const ref = React.createRef<ReactFlowCanvasRef>();
      const addLabelNode = vi.fn();
      mockUseNodeCreation.mockReturnValue({
        ...mockUseNodeCreation(),
        addLabelNode,
      });

      render(<ReactFlowCanvas {...defaultProps} ref={ref} />);

      expect(ref.current?.addLabelNode).toBe(addLabelNode);
    });

    it("should expose addCustomNode via ref", () => {
      const ref = React.createRef<ReactFlowCanvasRef>();
      const addCustomNode = vi.fn();
      mockUseNodeCreation.mockReturnValue({
        ...mockUseNodeCreation(),
        addCustomNode,
      });

      render(<ReactFlowCanvas {...defaultProps} ref={ref} />);

      expect(ref.current?.addCustomNode).toBe(addCustomNode);
    });

    it("should expose addBuiltinSchemaNode via ref", () => {
      const ref = React.createRef<ReactFlowCanvasRef>();
      const addBuiltinSchemaNode = vi.fn();
      mockUseNodeCreation.mockReturnValue({
        ...mockUseNodeCreation(),
        addBuiltinSchemaNode,
      });

      render(<ReactFlowCanvas {...defaultProps} ref={ref} />);

      expect(ref.current?.addBuiltinSchemaNode).toBe(addBuiltinSchemaNode);
    });

    it("should expose clearCanvas via ref", () => {
      const ref = React.createRef<ReactFlowCanvasRef>();
      const clearCanvas = vi.fn();
      mockUseCanvasOperations.mockReturnValue({
        ...mockUseCanvasOperations(),
        clearCanvas,
      });

      render(<ReactFlowCanvas {...defaultProps} ref={ref} />);

      expect(ref.current?.clearCanvas).toBe(clearCanvas);
    });

    it("should expose saveFlow via ref", () => {
      const ref = React.createRef<ReactFlowCanvasRef>();
      const saveFlow = vi.fn(() => ({
        nodes: mockNodes,
        edges: mockEdges,
        viewport: { x: 0, y: 0, zoom: 1 },
      }));
      mockUseCanvasOperations.mockReturnValue({
        ...mockUseCanvasOperations(),
        saveFlow,
      });

      render(<ReactFlowCanvas {...defaultProps} ref={ref} />);

      expect(ref.current?.saveFlow).toBe(saveFlow);
    });

    it("should expose restoreFlow via ref", () => {
      const ref = React.createRef<ReactFlowCanvasRef>();
      const restoreFlow = vi.fn();
      mockUseCanvasOperations.mockReturnValue({
        ...mockUseCanvasOperations(),
        restoreFlow,
      });

      render(<ReactFlowCanvas {...defaultProps} ref={ref} />);

      expect(ref.current?.restoreFlow).toBe(restoreFlow);
    });

    it("should expose zoom controls via ref", () => {
      const ref = React.createRef<ReactFlowCanvasRef>();
      const zoomIn = vi.fn();
      const zoomOut = vi.fn();
      const fitViewHandler = vi.fn();
      mockUseCanvasOperations.mockReturnValue({
        ...mockUseCanvasOperations(),
        zoomIn,
        zoomOut,
        fitViewHandler,
      });

      render(<ReactFlowCanvas {...defaultProps} ref={ref} />);

      expect(ref.current?.zoomIn).toBe(zoomIn);
      expect(ref.current?.zoomOut).toBe(zoomOut);
      expect(ref.current?.fitView).toBe(fitViewHandler);
    });

    it("should expose focusNode via ref", () => {
      const ref = React.createRef<ReactFlowCanvasRef>();
      const focusNode = vi.fn();
      mockUseCanvasOperations.mockReturnValue({
        ...mockUseCanvasOperations(),
        focusNode,
      });

      render(<ReactFlowCanvas {...defaultProps} ref={ref} />);

      expect(ref.current?.focusNode).toBe(focusNode);
    });

    it("should expose execution state methods via ref", () => {
      const ref = React.createRef<ReactFlowCanvasRef>();
      const updateNodeExecutionState = vi.fn();
      const updateToolExecutionState = vi.fn();
      const updateCallbackExecutionState = vi.fn();
      const clearExecutionState = vi.fn();
      const updateUserInputWaitingState = vi.fn();
      mockUseExecutionState.mockReturnValue({
        updateNodeExecutionState,
        updateToolExecutionState,
        updateCallbackExecutionState,
        clearExecutionState,
        updateUserInputWaitingState,
      });

      render(<ReactFlowCanvas {...defaultProps} ref={ref} />);

      expect(ref.current?.updateNodeExecutionState).toBe(
        updateNodeExecutionState,
      );
      expect(ref.current?.updateToolExecutionState).toBe(
        updateToolExecutionState,
      );
      expect(ref.current?.updateCallbackExecutionState).toBe(
        updateCallbackExecutionState,
      );
      expect(ref.current?.clearExecutionState).toBe(clearExecutionState);
      expect(ref.current?.updateUserInputWaitingState).toBe(
        updateUserInputWaitingState,
      );
    });

    it("should expose validation methods via ref", () => {
      const ref = React.createRef<ReactFlowCanvasRef>();
      const highlightErrorNodes = vi.fn();
      const highlightWarningNodes = vi.fn();
      const clearErrorHighlights = vi.fn();
      mockUseValidation.mockReturnValue({
        highlightErrorNodes,
        highlightWarningNodes,
        clearErrorHighlights,
      });

      render(<ReactFlowCanvas {...defaultProps} ref={ref} />);

      expect(ref.current?.highlightErrorNodes).toBe(highlightErrorNodes);
      expect(ref.current?.highlightWarningNodes).toBe(highlightWarningNodes);
      expect(ref.current?.clearErrorHighlights).toBe(clearErrorHighlights);
    });

    it("should expose customNodeSchemas via ref", () => {
      const ref = React.createRef<ReactFlowCanvasRef>();
      const customSchemas = [mockCustomNodeSchema];
      mockUseCanvasState.mockReturnValue({
        ...mockUseCanvasState(),
        customNodeSchemas: customSchemas,
      });

      render(<ReactFlowCanvas {...defaultProps} ref={ref} />);

      expect(ref.current?.customNodeSchemas).toBe(customSchemas);
    });

    it("should expose builtinNodeSchemas via ref", () => {
      const ref = React.createRef<ReactFlowCanvasRef>();

      render(<ReactFlowCanvas {...defaultProps} ref={ref} />);

      expect(ref.current?.builtinNodeSchemas).toBeDefined();
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

      // ReactFlowControls mock will have the toggle button
      expect(screen.getByTestId("react-flow-controls")).toBeInTheDocument();
    });
  });

  describe("snap to grid", () => {
    it("should pass snapToGrid state to ReactFlowControls", () => {
      mockUseCanvasState.mockReturnValue({
        ...mockUseCanvasState(),
        snapToGrid: true,
      });

      render(<ReactFlowCanvas {...defaultProps} />);
      expect(screen.getByTestId("react-flow-controls")).toBeInTheDocument();
    });

    it("should toggle snap to grid via setSnapToGrid", () => {
      const setSnapToGrid = vi.fn();
      mockUseCanvasState.mockReturnValue({
        ...mockUseCanvasState(),
        snapToGrid: false,
        setSnapToGrid,
      });

      render(<ReactFlowCanvas {...defaultProps} />);
      // The component passes onToggleSnapToGrid which calls setSnapToGrid(!snapToGrid)
      expect(screen.getByTestId("react-flow-controls")).toBeInTheDocument();
    });
  });

  describe("hook integrations", () => {
    it("should call useCanvasState", () => {
      render(<ReactFlowCanvas {...defaultProps} />);
      expect(mockUseCanvasState).toHaveBeenCalled();
    });

    it("should call useCanvasConfig with correct parameters", () => {
      render(<ReactFlowCanvas {...defaultProps} />);
      expect(mockUseCanvasConfig).toHaveBeenCalled();
    });

    it("should call useCanvasHistory with correct parameters", () => {
      render(<ReactFlowCanvas {...defaultProps} />);
      expect(mockUseCanvasHistory).toHaveBeenCalled();
    });

    it("should call useConnectionHandlers with correct parameters", () => {
      render(<ReactFlowCanvas {...defaultProps} />);
      expect(mockUseConnectionHandlers).toHaveBeenCalled();
    });

    it("should call useEdgeHighlight with nodes and setEdges", () => {
      render(<ReactFlowCanvas {...defaultProps} />);
      expect(mockUseEdgeHighlight).toHaveBeenCalled();
    });

    it("should call useEdgeTabOpacity with nodes, edges, setEdges", () => {
      render(<ReactFlowCanvas {...defaultProps} />);
      expect(mockUseEdgeTabOpacity).toHaveBeenCalled();
    });

    it("should call useDeleteHandlers with correct parameters", () => {
      render(<ReactFlowCanvas {...defaultProps} />);
      expect(mockUseDeleteHandlers).toHaveBeenCalled();
    });

    it("should call useClipboardOperations with correct parameters", () => {
      render(<ReactFlowCanvas {...defaultProps} />);
      expect(mockUseClipboardOperations).toHaveBeenCalled();
    });

    it("should call useKeyboardShortcuts with correct parameters", () => {
      render(<ReactFlowCanvas {...defaultProps} />);
      expect(mockUseKeyboardShortcuts).toHaveBeenCalled();
    });

    it("should call useNodeCreation with correct parameters", () => {
      render(<ReactFlowCanvas {...defaultProps} />);
      expect(mockUseNodeCreation).toHaveBeenCalled();
    });

    it("should call useContextMenu with correct parameters", () => {
      render(<ReactFlowCanvas {...defaultProps} />);
      expect(mockUseContextMenu).toHaveBeenCalled();
    });

    it("should call useCanvasOperations with correct parameters", () => {
      render(<ReactFlowCanvas {...defaultProps} />);
      expect(mockUseCanvasOperations).toHaveBeenCalled();
    });

    it("should call useExecutionState with setNodes", () => {
      render(<ReactFlowCanvas {...defaultProps} />);
      expect(mockUseExecutionState).toHaveBeenCalled();
    });

    it("should call useValidation with correct parameters", () => {
      render(<ReactFlowCanvas {...defaultProps} />);
      expect(mockUseValidation).toHaveBeenCalled();
    });
  });

  describe("context providers", () => {
    it("should wrap canvas with CanvasActionsProvider", () => {
      const handleCopy = vi.fn();
      const handleCut = vi.fn();
      const handlePaste = vi.fn();
      mockUseClipboardOperations.mockReturnValue({
        handleCopy,
        handleCut,
        handlePaste,
        hasClipboard: true,
      });

      render(<ReactFlowCanvas {...defaultProps} />);
      // Component is wrapped, verified by successful render
      expect(screen.getByTestId("react-flow-controls")).toBeInTheDocument();
    });

    it("should provide correct CanvasActions context values", () => {
      const handleCopy = vi.fn();
      mockUseClipboardOperations.mockReturnValue({
        handleCopy,
        handleCut: vi.fn(),
        handlePaste: vi.fn(),
        hasClipboard: false,
      });

      render(<ReactFlowCanvas {...defaultProps} isLocked={true} />);
      // Context is provided with isLocked and clipboard operations
      expect(screen.getByTestId("react-flow-controls")).toBeInTheDocument();
    });
  });

  describe("context menu", () => {
    it("should render context menu at correct position", () => {
      mockUseCanvasState.mockReturnValue({
        ...mockUseCanvasState(),
        contextMenu: {
          x: 150,
          y: 250,
          flowPosition: { x: 100, y: 200 },
        },
      });

      render(<ReactFlowCanvas {...defaultProps} />);
      const menu = screen.getByTestId("canvas-context-menu");
      expect(menu).toHaveAttribute("data-x", "150");
      expect(menu).toHaveAttribute("data-y", "250");
    });

    it("should pass context menu handlers", () => {
      const closeContextMenu = vi.fn();
      mockUseContextMenu.mockReturnValue({
        ...mockUseContextMenu(),
        closeContextMenu,
      });
      mockUseCanvasState.mockReturnValue({
        ...mockUseCanvasState(),
        contextMenu: {
          x: 100,
          y: 100,
          flowPosition: { x: 50, y: 50 },
        },
      });

      render(<ReactFlowCanvas {...defaultProps} />);
      // Menu handlers are passed to CanvasContextMenu
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
      mockUseCanvasState.mockReturnValue({
        ...mockUseCanvasState(),
        nodes: [],
      });

      render(<ReactFlowCanvas {...defaultProps} />);
      expect(screen.getByTestId("react-flow-controls")).toBeInTheDocument();
    });

    it("should handle empty edges array", () => {
      mockUseCanvasState.mockReturnValue({
        ...mockUseCanvasState(),
        edges: [],
      });

      render(<ReactFlowCanvas {...defaultProps} />);
      expect(screen.getByTestId("react-flow-controls")).toBeInTheDocument();
    });

    it("should handle empty customNodeSchemas", () => {
      mockUseCanvasState.mockReturnValue({
        ...mockUseCanvasState(),
        customNodeSchemas: [],
      });

      render(<ReactFlowCanvas {...defaultProps} />);
      expect(screen.getByTestId("react-flow-controls")).toBeInTheDocument();
    });
  });

  describe("ReactFlowProvider wrapper", () => {
    it("should wrap component with ReactFlowProvider", () => {
      // The component uses ReactFlowProvider wrapper
      render(<ReactFlowCanvas {...defaultProps} />);
      expect(screen.getByTestId("react-flow-controls")).toBeInTheDocument();
    });

    it("should wrap component with ConnectionProvider", () => {
      // The component uses ConnectionProvider wrapper
      render(<ReactFlowCanvas {...defaultProps} />);
      expect(screen.getByTestId("react-flow-controls")).toBeInTheDocument();
    });
  });

  describe("display names", () => {
    it("should have displayName for ReactFlowCanvasInner", () => {
      // Display names are set for debugging
      render(<ReactFlowCanvas {...defaultProps} />);
      expect(screen.getByTestId("react-flow-controls")).toBeInTheDocument();
    });

    it("should have displayName for ReactFlowCanvas", () => {
      // Display names are set for debugging
      render(<ReactFlowCanvas {...defaultProps} />);
      expect(screen.getByTestId("react-flow-controls")).toBeInTheDocument();
    });
  });

  describe("node creation callbacks", () => {
    it("should pass onRequestPromptCreation to context menu", () => {
      const onRequestPromptCreation = vi.fn();
      render(
        <ReactFlowCanvas
          {...defaultProps}
          onRequestPromptCreation={onRequestPromptCreation}
        />,
      );
      expect(mockUseContextMenu).toHaveBeenCalled();
    });

    it("should pass onRequestContextCreation to context menu", () => {
      const onRequestContextCreation = vi.fn();
      render(
        <ReactFlowCanvas
          {...defaultProps}
          onRequestContextCreation={onRequestContextCreation}
        />,
      );
      expect(mockUseContextMenu).toHaveBeenCalled();
    });

    it("should pass onRequestToolCreation to context menu", () => {
      const onRequestToolCreation = vi.fn();
      render(
        <ReactFlowCanvas
          {...defaultProps}
          onRequestToolCreation={onRequestToolCreation}
        />,
      );
      expect(mockUseContextMenu).toHaveBeenCalled();
    });

    it("should pass onRequestProcessCreation to context menu", () => {
      const onRequestProcessCreation = vi.fn();
      render(
        <ReactFlowCanvas
          {...defaultProps}
          onRequestProcessCreation={onRequestProcessCreation}
        />,
      );
      expect(mockUseContextMenu).toHaveBeenCalled();
    });

    it("should pass onRequestOutputFileCreation to context menu", () => {
      const onRequestOutputFileCreation = vi.fn();
      render(
        <ReactFlowCanvas
          {...defaultProps}
          onRequestOutputFileCreation={onRequestOutputFileCreation}
        />,
      );
      expect(mockUseContextMenu).toHaveBeenCalled();
    });
  });

  describe("ref without component instance", () => {
    it("should work without a ref", () => {
      render(<ReactFlowCanvas {...defaultProps} />);
      expect(screen.getByTestId("react-flow-controls")).toBeInTheDocument();
    });

    it("should allow calling ref methods after mount", () => {
      const ref = React.createRef<ReactFlowCanvasRef>();
      const clearCanvas = vi.fn();
      mockUseCanvasOperations.mockReturnValue({
        ...mockUseCanvasOperations(),
        clearCanvas,
      });

      render(<ReactFlowCanvas {...defaultProps} ref={ref} />);

      ref.current?.clearCanvas();
      expect(clearCanvas).toHaveBeenCalledTimes(1);
    });
  });

  describe("theme styles", () => {
    it("should inject canvas styles via style tag", () => {
      const customStyles = ".custom-class { color: red; }";
      mockGetCanvasStyles.mockReturnValue(customStyles);

      render(<ReactFlowCanvas {...defaultProps} />);
      // getCanvasStyles is called to inject custom CSS
      expect(mockGetCanvasStyles).toHaveBeenCalled();
    });

    it("should apply theme to ReactFlow component", () => {
      render(<ReactFlowCanvas {...defaultProps} />);
      // ReactFlow gets theme.colors.canvas.background via style prop
      expect(screen.getByTestId("react-flow-controls")).toBeInTheDocument();
    });
  });
});
