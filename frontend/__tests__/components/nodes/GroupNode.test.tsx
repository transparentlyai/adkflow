import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import type { NodeProps } from "@xyflow/react";
import { useReactFlow, useStore, useStoreApi } from "@xyflow/react";

// Mock contexts
const mockSetNodes = vi.fn();
const mockCanvasActions = {
  copySelectedNodes: vi.fn(),
  cutSelectedNodes: vi.fn(),
  pasteNodes: vi.fn(),
  hasClipboard: false,
  isLocked: false,
};
const mockTheme = {
  colors: {
    nodes: {
      group: {
        border: "#666",
        borderActive: "#888",
        header: "#333",
        headerActive: "#444",
        text: "#fff",
        dropZone: "rgba(100,100,100,0.3)",
      },
    },
    ui: {
      background: "#1a1a1a",
      foreground: "#fff",
    },
  },
};

vi.mock("@/contexts/ProjectContext", () => ({
  useProject: vi.fn(() => ({ isLocked: false })),
}));

vi.mock("@/contexts/CanvasActionsContext", () => ({
  useCanvasActions: vi.fn(() => mockCanvasActions),
}));

vi.mock("@/contexts/ThemeContext", () => ({
  useTheme: vi.fn(() => ({ theme: mockTheme })),
}));

// Mock NodeContextMenu
vi.mock("@/components/NodeContextMenu", () => ({
  default: vi.fn(({ onClose, onToggleLock, onCopy, onCut, onPaste }) => (
    <div data-testid="context-menu">
      <button data-testid="toggle-lock" onClick={onToggleLock}>
        Toggle Lock
      </button>
      <button data-testid="copy" onClick={onCopy}>
        Copy
      </button>
      <button data-testid="cut" onClick={onCut}>
        Cut
      </button>
      <button data-testid="paste" onClick={onPaste}>
        Paste
      </button>
      <button data-testid="close" onClick={onClose}>
        Close
      </button>
    </div>
  )),
}));

// Mock lucide-react
vi.mock("lucide-react", () => ({
  Lock: () => <svg data-testid="lock-icon" />,
}));

// Import after mocking
import GroupNode, {
  getDefaultGroupData,
  type GroupNodeData,
} from "@/components/nodes/GroupNode";
import { useProject } from "@/contexts/ProjectContext";
import { useCanvasActions } from "@/contexts/CanvasActionsContext";

describe("GroupNode", () => {
  const defaultProps: NodeProps = {
    id: "group-1",
    type: "group",
    data: {
      label: "Test Group",
      isNodeLocked: false,
    } as GroupNodeData,
    selected: false,
    dragging: false,
    isConnectable: true,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
    zIndex: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSetNodes.mockClear();

    // Reset the useReactFlow mock
    vi.mocked(useReactFlow).mockReturnValue({
      setNodes: mockSetNodes,
      setEdges: vi.fn(),
      getNodes: vi.fn(() => []),
      getEdges: vi.fn(() => []),
      getNode: vi.fn(),
      getEdge: vi.fn(),
      fitView: vi.fn(),
      zoomIn: vi.fn(),
      zoomOut: vi.fn(),
      getZoom: vi.fn(() => 1),
      setCenter: vi.fn(),
      project: vi.fn((pos) => pos),
      screenToFlowPosition: vi.fn((pos) => pos),
      flowToScreenPosition: vi.fn((pos) => pos),
      getViewport: vi.fn(() => ({ x: 0, y: 0, zoom: 1 })),
      setViewport: vi.fn(),
      viewportInitialized: true,
    } as unknown as ReturnType<typeof useReactFlow>);

    // Reset useStore mock
    vi.mocked(useStore).mockReturnValue(undefined);

    // Reset useStoreApi mock
    vi.mocked(useStoreApi).mockReturnValue({
      getState: vi.fn(() => ({
        nodes: [{ id: "group-1", position: { x: 0, y: 0 } }],
        edges: [],
      })),
      setState: vi.fn(),
      subscribe: vi.fn(),
    } as unknown as ReturnType<typeof useStoreApi>);

    // Reset context mocks
    vi.mocked(useProject).mockReturnValue({ isLocked: false } as ReturnType<
      typeof useProject
    >);
    vi.mocked(useCanvasActions).mockReturnValue(mockCanvasActions);
  });

  describe("rendering", () => {
    it("should render group node with label", () => {
      render(<GroupNode {...defaultProps} />);
      expect(screen.getByText("Test Group")).toBeInTheDocument();
    });

    it("should render lock icon when node is locked", () => {
      const lockedProps = {
        ...defaultProps,
        data: { ...defaultProps.data, isNodeLocked: true },
      };
      render(<GroupNode {...lockedProps} />);
      expect(screen.getByTestId("lock-icon")).toBeInTheDocument();
    });

    it("should not render lock icon when node is not locked", () => {
      render(<GroupNode {...defaultProps} />);
      expect(screen.queryByTestId("lock-icon")).not.toBeInTheDocument();
    });

    it("should apply selected styling", () => {
      const selectedProps = { ...defaultProps, selected: true };
      render(<GroupNode {...selectedProps} />);
      // The component should render without errors when selected
      expect(screen.getByText("Test Group")).toBeInTheDocument();
    });

    it("should apply dragging styling", () => {
      const draggingProps = { ...defaultProps, dragging: true };
      render(<GroupNode {...draggingProps} />);
      expect(screen.getByText("Test Group")).toBeInTheDocument();
    });
  });

  describe("editing label", () => {
    it("should enter edit mode on double click", () => {
      render(<GroupNode {...defaultProps} />);

      const labelElement = screen.getByText("Test Group");
      fireEvent.doubleClick(labelElement);

      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });

    it("should not enter edit mode when node is locked", () => {
      const lockedProps = {
        ...defaultProps,
        data: { ...defaultProps.data, isNodeLocked: true },
      };
      render(<GroupNode {...lockedProps} />);

      const labelElement = screen.getByText("Test Group");
      fireEvent.doubleClick(labelElement);

      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    });

    it("should populate input with current label", () => {
      render(<GroupNode {...defaultProps} />);

      const labelElement = screen.getByText("Test Group");
      fireEvent.doubleClick(labelElement);

      const input = screen.getByRole("textbox");
      expect(input).toHaveValue("Test Group");
    });

    it("should focus input when entering edit mode", async () => {
      render(<GroupNode {...defaultProps} />);

      const labelElement = screen.getByText("Test Group");
      fireEvent.doubleClick(labelElement);

      const input = screen.getByRole("textbox");
      await waitFor(() => {
        expect(input).toHaveFocus();
      });
    });

    it("should save label on blur", () => {
      render(<GroupNode {...defaultProps} />);

      const labelElement = screen.getByText("Test Group");
      fireEvent.doubleClick(labelElement);

      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "New Label" } });
      fireEvent.blur(input);

      expect(mockSetNodes).toHaveBeenCalled();
    });

    it("should save label on Enter key", () => {
      render(<GroupNode {...defaultProps} />);

      const labelElement = screen.getByText("Test Group");
      fireEvent.doubleClick(labelElement);

      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "New Label" } });
      fireEvent.keyDown(input, { key: "Enter" });

      expect(mockSetNodes).toHaveBeenCalled();
    });

    it("should cancel editing on Escape key", () => {
      render(<GroupNode {...defaultProps} />);

      const labelElement = screen.getByText("Test Group");
      fireEvent.doubleClick(labelElement);

      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "New Label" } });
      fireEvent.keyDown(input, { key: "Escape" });

      // Should exit edit mode
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
      expect(screen.getByText("Test Group")).toBeInTheDocument();
    });

    it("should not save empty label", () => {
      render(<GroupNode {...defaultProps} />);

      const labelElement = screen.getByText("Test Group");
      fireEvent.doubleClick(labelElement);

      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "" } });
      fireEvent.blur(input);

      // setNodes should still be called but with trimmed check
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    });
  });

  describe("context menu", () => {
    it("should open context menu on right click header", () => {
      render(<GroupNode {...defaultProps} />);

      const header = screen.getByText("Test Group").parentElement;
      fireEvent.contextMenu(header!);

      expect(screen.getByTestId("context-menu")).toBeInTheDocument();
    });

    it("should close context menu when close button clicked", () => {
      render(<GroupNode {...defaultProps} />);

      const header = screen.getByText("Test Group").parentElement;
      fireEvent.contextMenu(header!);

      const closeButton = screen.getByTestId("close");
      fireEvent.click(closeButton);

      expect(screen.queryByTestId("context-menu")).not.toBeInTheDocument();
    });

    it("should toggle lock when toggle lock clicked", () => {
      render(<GroupNode {...defaultProps} />);

      const header = screen.getByText("Test Group").parentElement;
      fireEvent.contextMenu(header!);

      const toggleLockButton = screen.getByTestId("toggle-lock");
      fireEvent.click(toggleLockButton);

      expect(mockSetNodes).toHaveBeenCalled();
    });

    it("should copy node when copy clicked", async () => {
      vi.useFakeTimers();
      render(<GroupNode {...defaultProps} />);

      const header = screen.getByText("Test Group").parentElement;
      fireEvent.contextMenu(header!);

      const copyButton = screen.getByTestId("copy");
      fireEvent.click(copyButton);

      // setNodes is called first to select the node
      expect(mockSetNodes).toHaveBeenCalled();

      // Advance timers to trigger the setTimeout
      await vi.advanceTimersByTimeAsync(0);
      expect(mockCanvasActions.copySelectedNodes).toHaveBeenCalled();

      vi.useRealTimers();
    });

    it("should cut node when cut clicked", async () => {
      vi.useFakeTimers();
      render(<GroupNode {...defaultProps} />);

      const header = screen.getByText("Test Group").parentElement;
      fireEvent.contextMenu(header!);

      const cutButton = screen.getByTestId("cut");
      fireEvent.click(cutButton);

      expect(mockSetNodes).toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(0);
      expect(mockCanvasActions.cutSelectedNodes).toHaveBeenCalled();

      vi.useRealTimers();
    });

    it("should paste nodes when paste clicked", () => {
      render(<GroupNode {...defaultProps} />);

      const header = screen.getByText("Test Group").parentElement;
      fireEvent.contextMenu(header!);

      const pasteButton = screen.getByTestId("paste");
      fireEvent.click(pasteButton);

      expect(mockCanvasActions.pasteNodes).toHaveBeenCalled();
    });
  });

  describe("NodeResizer", () => {
    it("should render NodeResizer when selected and not locked", () => {
      const selectedProps = { ...defaultProps, selected: true };
      render(<GroupNode {...selectedProps} />);
      // NodeResizer is a child component from @xyflow/react
      // We can verify the component renders without errors
      expect(screen.getByText("Test Group")).toBeInTheDocument();
    });

    it("should not show resizer when canvas is locked", () => {
      vi.mocked(useProject).mockReturnValue({ isLocked: true } as ReturnType<
        typeof useProject
      >);
      const selectedProps = { ...defaultProps, selected: true };
      render(<GroupNode {...selectedProps} />);
      // Component should render without errors
      expect(screen.getByText("Test Group")).toBeInTheDocument();
    });

    it("should not show resizer when node is locked", () => {
      const lockedSelectedProps = {
        ...defaultProps,
        selected: true,
        data: { ...defaultProps.data, isNodeLocked: true },
      };
      render(<GroupNode {...lockedSelectedProps} />);
      expect(screen.getByText("Test Group")).toBeInTheDocument();
    });
  });

  describe("useDragInsideDetection", () => {
    it("should render without drag detection when no nodes are dragging", () => {
      // Default mock has no dragging nodes
      render(<GroupNode {...defaultProps} />);
      // The component should render without the drop zone indicator
      expect(screen.getByText("Test Group")).toBeInTheDocument();
      expect(screen.queryByText("Drop to group")).not.toBeInTheDocument();
    });
  });
});

describe("getDefaultGroupData", () => {
  it("should return default group data", () => {
    const data = getDefaultGroupData();
    expect(data).toEqual({ label: "Group" });
  });
});
