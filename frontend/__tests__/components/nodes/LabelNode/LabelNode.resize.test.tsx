import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";

// Mock ReactFlow hooks and components - must be in test file for hoisting
const mockSetNodes = vi.fn();
const mockUseStore = vi.fn();

vi.mock("@xyflow/react", () => ({
  useReactFlow: vi.fn(() => ({
    setNodes: mockSetNodes,
  })),
  useStore: (selector: (state: unknown) => unknown) => mockUseStore(selector),
  NodeResizeControl: ({
    position,
    variant,
    onResizeEnd,
  }: {
    position: string;
    variant: string;
    onResizeEnd?: (
      event: unknown,
      params: { width: number; height: number },
    ) => void;
  }) => (
    <div
      data-testid={`resize-control-${position}`}
      data-variant={variant}
      onClick={() => onResizeEnd?.(null, { width: 200, height: 100 })}
    />
  ),
  ResizeControlVariant: {
    Handle: "handle",
    Line: "line",
  },
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
            text: { primary: "#000", secondary: "#666", muted: "#999" },
          },
          label: { header: "#6b7280", text: "#fff", ring: "#3b82f6" },
        },
        ui: {
          background: "#ffffff",
          foreground: "#000000",
          border: "#e5e7eb",
          muted: "#f3f4f6",
        },
      },
    },
  })),
}));

// Mock ProjectContext
vi.mock("@/contexts/ProjectContext", () => ({
  useProject: vi.fn(() => ({
    isLocked: false,
  })),
}));

// Mock LabelNodeExpanded component
vi.mock("@/components/nodes/LabelNode/LabelNodeExpanded", () => ({
  default: ({
    data,
    onClose,
    onUpdate,
    onResize,
    onResizeEnd,
  }: {
    data: { label: string };
    onClose: () => void;
    onUpdate: (updates: Record<string, unknown>) => void;
    onResize: (deltaWidth: number, deltaHeight: number) => void;
    onResizeEnd: () => void;
  }) => (
    <div data-testid="label-node-expanded">
      <span data-testid="expanded-label">{data.label}</span>
      <button data-testid="close-expanded" onClick={onClose}>
        Close
      </button>
      <button
        data-testid="update-expanded"
        onClick={() => onUpdate({ label: "Updated Label" })}
      >
        Update
      </button>
      <button
        data-testid="resize-expanded"
        onClick={() => {
          onResize(10, 20);
          onResizeEnd();
        }}
      >
        Resize
      </button>
    </div>
  ),
}));

// Mock createPortal
vi.mock("react-dom", async () => {
  const actual = await vi.importActual("react-dom");
  return {
    ...actual,
    createPortal: (children: React.ReactNode) => children,
  };
});

import LabelNode from "@/components/nodes/LabelNode";
import {
  defaultNodeData,
  defaultNodeProps,
  createMockStore,
} from "./LabelNode.testUtils";

describe("LabelNode Resize and Transform", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseStore.mockImplementation(createMockStore());
  });

  describe("corner resize (scale font and box)", () => {
    it("should handle corner resize and update fontScaleWidth", () => {
      render(<LabelNode {...defaultNodeProps} selected={true} />);

      const cornerHandle = screen.getByTestId("resize-control-top-left");
      fireEvent.click(cornerHandle);

      expect(mockSetNodes).toHaveBeenCalled();
      const updateFn = mockSetNodes.mock.calls[0][0];
      const result = updateFn([
        {
          id: "node-1",
          data: defaultNodeData,
          style: { width: 100, height: 50 },
        },
      ]);

      expect(result[0].style.width).toBe(200);
      expect(result[0].style.height).toBe(100);
      expect(result[0].data.fontScaleWidth).toBe(200);
      expect(result[0].data.manuallyResized).toBe(true);
    });

    it("should handle all four corner resize controls", () => {
      render(<LabelNode {...defaultNodeProps} selected={true} />);

      const corners = ["top-left", "top-right", "bottom-left", "bottom-right"];
      corners.forEach((corner) => {
        vi.clearAllMocks();
        const handle = screen.getByTestId(`resize-control-${corner}`);
        fireEvent.click(handle);
        expect(mockSetNodes).toHaveBeenCalled();
      });
    });
  });

  describe("edge resize (resize box only)", () => {
    it("should handle edge resize without changing fontScaleWidth", () => {
      render(<LabelNode {...defaultNodeProps} selected={true} />);

      const edgeHandle = screen.getByTestId("resize-control-top");
      fireEvent.click(edgeHandle);

      expect(mockSetNodes).toHaveBeenCalled();
      const updateFn = mockSetNodes.mock.calls[0][0];
      const result = updateFn([
        {
          id: "node-1",
          data: defaultNodeData,
          style: { width: 100, height: 50 },
        },
      ]);

      expect(result[0].style.width).toBe(200);
      expect(result[0].style.height).toBe(100);
      expect(result[0].data.fontScaleWidth).toBeUndefined();
      expect(result[0].data.manuallyResized).toBe(true);
    });

    it("should handle all four edge resize controls", () => {
      render(<LabelNode {...defaultNodeProps} selected={true} />);

      const edges = ["top", "right", "bottom", "left"];
      edges.forEach((edge) => {
        vi.clearAllMocks();
        const handle = screen.getByTestId(`resize-control-${edge}`);
        fireEvent.click(handle);
        expect(mockSetNodes).toHaveBeenCalled();
      });
    });
  });

  describe("detach from parent", () => {
    it("should detach node from parent group", () => {
      mockUseStore.mockImplementation(
        createMockStore({ parentId: "parent-1" }),
      );

      render(<LabelNode {...defaultNodeProps} />);

      // Open context menu
      const labelContainer = screen.getByText("Test Label").parentElement!;
      fireEvent.contextMenu(labelContainer, { clientX: 100, clientY: 100 });

      // Click detach button
      fireEvent.click(screen.getByText("Detach from Group"));

      expect(mockSetNodes).toHaveBeenCalled();
      const updateFn = mockSetNodes.mock.calls[0][0];
      const result = updateFn([
        {
          id: "node-1",
          parentId: "parent-1",
          position: { x: 50, y: 100 },
        },
        {
          id: "parent-1",
          position: { x: 200, y: 300 },
        },
      ]);

      // Should remove parentId and convert position to absolute
      const detachedNode = result.find(
        (n: { id: string }) => n.id === "node-1",
      );
      expect(detachedNode.parentId).toBeUndefined();
      expect(detachedNode.position).toEqual({ x: 250, y: 400 });
    });

    it("should handle detach when parent node exists", () => {
      mockUseStore.mockImplementation(
        createMockStore({ parentId: "parent-1" }),
      );

      render(<LabelNode {...defaultNodeProps} />);

      const labelContainer = screen.getByText("Test Label").parentElement!;
      fireEvent.contextMenu(labelContainer);
      fireEvent.click(screen.getByText("Detach from Group"));

      expect(mockSetNodes).toHaveBeenCalled();
    });
  });

  describe("expand/contract toggle", () => {
    it("should expand node and save contracted position", () => {
      render(<LabelNode {...defaultNodeProps} />);

      // Open context menu and click Settings to expand
      const labelContainer = screen.getByText("Test Label").parentElement!;
      fireEvent.contextMenu(labelContainer);
      fireEvent.click(screen.getByText("Settings"));

      expect(mockSetNodes).toHaveBeenCalled();
      const updateFn = mockSetNodes.mock.calls[0][0];
      const result = updateFn([
        {
          id: "node-1",
          data: defaultNodeData,
          position: { x: 100, y: 200 },
          parentId: "parent-1",
        },
      ]);

      expect(result[0].data.isExpanded).toBe(true);
      expect(result[0].data.contractedPosition).toEqual({ x: 100, y: 200 });
      expect(result[0].extent).toBeUndefined();
    });

    it("should contract node and restore contracted position", () => {
      const expandedData = {
        ...defaultNodeData,
        isExpanded: true,
        contractedPosition: { x: 50, y: 75 },
        expandedPosition: { x: 200, y: 300 },
      };

      render(<LabelNode {...defaultNodeProps} data={expandedData} />);

      // Click close button
      fireEvent.click(screen.getByTestId("close-expanded"));

      expect(mockSetNodes).toHaveBeenCalled();
      const updateFn = mockSetNodes.mock.calls[0][0];
      const result = updateFn([
        {
          id: "node-1",
          data: expandedData,
          position: { x: 200, y: 300 },
        },
      ]);

      expect(result[0].data.isExpanded).toBe(false);
      expect(result[0].position).toEqual({ x: 50, y: 75 });
    });

    it("should use current position if no contracted position saved", () => {
      const expandedData = {
        ...defaultNodeData,
        isExpanded: true,
      };

      render(<LabelNode {...defaultNodeProps} data={expandedData} />);

      fireEvent.click(screen.getByTestId("close-expanded"));

      expect(mockSetNodes).toHaveBeenCalled();
      const updateFn = mockSetNodes.mock.calls[0][0];
      const result = updateFn([
        {
          id: "node-1",
          data: expandedData,
          position: { x: 150, y: 250 },
        },
      ]);

      // Should use current position when no contractedPosition exists
      expect(result[0].position).toEqual({ x: 150, y: 250 });
    });

    it("should set extent to parent when contracting with parentId", () => {
      const expandedData = {
        ...defaultNodeData,
        isExpanded: true,
        contractedPosition: { x: 50, y: 75 },
      };

      render(<LabelNode {...defaultNodeProps} data={expandedData} />);

      fireEvent.click(screen.getByTestId("close-expanded"));

      expect(mockSetNodes).toHaveBeenCalled();
      const updateFn = mockSetNodes.mock.calls[0][0];
      const result = updateFn([
        {
          id: "node-1",
          data: expandedData,
          position: { x: 200, y: 300 },
          parentId: "parent-1",
        },
      ]);

      expect(result[0].extent).toBe("parent");
    });
  });

  describe("expanded mode resize", () => {
    it("should update size state when resizing in expanded mode", () => {
      const expandedData = {
        ...defaultNodeData,
        isExpanded: true,
        expandedSize: { width: 280, height: 320 },
      };

      render(<LabelNode {...defaultNodeProps} data={expandedData} />);

      // Trigger resize in expanded mode
      fireEvent.click(screen.getByTestId("resize-expanded"));

      // The resize should call setNodes to save expandedSize
      expect(mockSetNodes).toHaveBeenCalled();
    });

    it("should save expandedSize when resize ends", () => {
      const expandedData = {
        ...defaultNodeData,
        isExpanded: true,
      };

      render(<LabelNode {...defaultNodeProps} data={expandedData} />);

      // Click resize button which calls onResize and onResizeEnd
      fireEvent.click(screen.getByTestId("resize-expanded"));

      // Should eventually call setNodes to save expandedSize
      expect(mockSetNodes).toHaveBeenCalled();
    });
  });

  describe("auto-resize on label save", () => {
    it("should auto-resize when label changes and not manually resized", async () => {
      render(<LabelNode {...defaultNodeProps} />);

      const labelContainer = screen.getByText("Test Label").parentElement!;
      fireEvent.doubleClick(labelContainer);

      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "Longer label text here" } });
      fireEvent.keyDown(input, { key: "Enter", ctrlKey: true });

      await waitFor(() => {
        expect(mockSetNodes).toHaveBeenCalled();
      });

      const updateFn = mockSetNodes.mock.calls[0][0];
      const result = updateFn([
        {
          id: "node-1",
          data: { ...defaultNodeData, manuallyResized: false },
          style: { width: 100, height: 50 },
        },
      ]);

      // Should update style dimensions (auto-resize)
      expect(result[0].style).toBeDefined();
      expect(result[0].data.label).toBe("Longer label text here");
    });

    it("should not auto-resize when manually resized", async () => {
      const manuallyResizedData = {
        ...defaultNodeData,
        manuallyResized: true,
      };

      render(<LabelNode {...defaultNodeProps} data={manuallyResizedData} />);

      const labelContainer = screen.getByText("Test Label").parentElement!;
      fireEvent.doubleClick(labelContainer);

      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "New text" } });
      fireEvent.keyDown(input, { key: "Enter", ctrlKey: true });

      await waitFor(() => {
        expect(mockSetNodes).toHaveBeenCalled();
      });

      const updateFn = mockSetNodes.mock.calls[0][0];
      const result = updateFn([
        {
          id: "node-1",
          data: manuallyResizedData,
          style: { width: 150, height: 75 },
        },
      ]);

      // Should update label but not dimensions
      expect(result[0].data.label).toBe("New text");
      // Style should remain unchanged when manually resized
      expect(result[0].style).toEqual({ width: 150, height: 75 });
    });
  });

  describe("updateData callback", () => {
    it("should update node data via expanded mode", () => {
      const expandedData = {
        ...defaultNodeData,
        isExpanded: true,
      };

      render(<LabelNode {...defaultNodeProps} data={expandedData} />);

      // Click update button in expanded mode
      fireEvent.click(screen.getByTestId("update-expanded"));

      expect(mockSetNodes).toHaveBeenCalled();
      const updateFn = mockSetNodes.mock.calls[0][0];
      const result = updateFn([
        {
          id: "node-1",
          data: expandedData,
        },
      ]);

      expect(result[0].data.label).toBe("Updated Label");
    });
  });

  describe("context menu position", () => {
    it("should position context menu at cursor location", () => {
      render(<LabelNode {...defaultNodeProps} />);

      const labelContainer = screen.getByText("Test Label").parentElement!;
      fireEvent.contextMenu(labelContainer, { clientX: 150, clientY: 250 });

      const contextMenu = screen.getByText("Settings").parentElement;
      expect(contextMenu).toHaveStyle({
        left: "150px",
        top: "250px",
      });
    });

    it("should adjust context menu position near screen edges", () => {
      // Mock window dimensions
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 500,
      });
      Object.defineProperty(window, "innerHeight", {
        writable: true,
        configurable: true,
        value: 600,
      });

      render(<LabelNode {...defaultNodeProps} />);

      const labelContainer = screen.getByText("Test Label").parentElement!;
      // Click near right edge
      fireEvent.contextMenu(labelContainer, { clientX: 490, clientY: 590 });

      const contextMenu = screen.getByText("Settings").parentElement;
      // Should be adjusted to fit on screen (500 - 160 = 340, 600 - 100 = 500)
      expect(contextMenu).toHaveStyle({
        left: "340px",
        top: "500px",
      });
    });

    it("should close context menu on backdrop right-click", () => {
      render(<LabelNode {...defaultNodeProps} />);

      const labelContainer = screen.getByText("Test Label").parentElement!;
      fireEvent.contextMenu(labelContainer);

      expect(screen.getByText("Settings")).toBeInTheDocument();

      // Right-click the backdrop
      const backdrop = document.querySelector(".fixed.inset-0");
      fireEvent.contextMenu(backdrop!);

      expect(screen.queryByText("Settings")).not.toBeInTheDocument();
    });
  });

  describe("size initialization from data", () => {
    it("should initialize size from expandedSize in data", () => {
      const dataWithSize = {
        ...defaultNodeData,
        isExpanded: true,
        expandedSize: { width: 400, height: 500 },
      };

      render(<LabelNode {...defaultNodeProps} data={dataWithSize} />);

      // The expanded view should be rendered with the custom size
      expect(screen.getByTestId("label-node-expanded")).toBeInTheDocument();
    });
  });
});
