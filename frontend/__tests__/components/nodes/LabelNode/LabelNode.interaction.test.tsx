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
    onResizeEnd?: () => void;
  }) => (
    <div
      data-testid={`resize-control-${position}`}
      data-variant={variant}
      onClick={() => onResizeEnd?.()}
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

// Mock ProjectContext - use vi.fn() so we can change the return value
const mockUseProject = vi.fn(() => ({ isLocked: false }));
vi.mock("@/contexts/ProjectContext", () => ({
  useProject: () => mockUseProject(),
}));

// Mock LabelNodeExpanded component
vi.mock("@/components/nodes/LabelNode/LabelNodeExpanded", () => ({
  default: ({
    data,
    onClose,
    onUpdate,
  }: {
    data: { label: string };
    onClose: () => void;
    onUpdate: (updates: Record<string, unknown>) => void;
  }) => (
    <div data-testid="label-node-expanded">
      <span data-testid="expanded-label">{data.label}</span>
      <button data-testid="close-expanded" onClick={onClose}>
        Close
      </button>
      <button
        data-testid="update-label"
        onClick={() => onUpdate({ label: "Updated Label" })}
      >
        Update
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

describe("LabelNode Interaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseStore.mockImplementation(createMockStore());
    mockUseProject.mockReturnValue({ isLocked: false });
  });

  describe("locked state", () => {
    it("should not enter editing mode when project is locked", () => {
      mockUseProject.mockReturnValue({ isLocked: true });

      render(<LabelNode {...defaultNodeProps} />);

      const labelContainer = screen.getByText("Test Label").parentElement!;
      fireEvent.doubleClick(labelContainer);

      // Should NOT show input field
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
      expect(screen.getByText("Test Label")).toBeInTheDocument();
    });

    it("should hide resize controls when project is locked", () => {
      mockUseProject.mockReturnValue({ isLocked: true });

      render(<LabelNode {...defaultNodeProps} selected={true} />);

      // Resize controls should not be rendered when locked
      expect(
        screen.queryByTestId("resize-control-top-left"),
      ).not.toBeInTheDocument();
    });
  });

  describe("context menu", () => {
    it("should show context menu on right click", () => {
      render(<LabelNode {...defaultNodeProps} />);

      const labelContainer = screen.getByText("Test Label").parentElement!;
      fireEvent.contextMenu(labelContainer, { clientX: 100, clientY: 100 });

      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    it("should show Detach option when node has parent", () => {
      mockUseStore.mockImplementation(
        createMockStore({ parentId: "parent-1" }),
      );

      render(<LabelNode {...defaultNodeProps} />);

      const labelContainer = screen.getByText("Test Label").parentElement!;
      fireEvent.contextMenu(labelContainer, { clientX: 100, clientY: 100 });

      expect(screen.getByText("Detach from Group")).toBeInTheDocument();
    });

    it("should not show Detach option when node has no parent", () => {
      mockUseStore.mockImplementation(createMockStore({ parentId: undefined }));

      render(<LabelNode {...defaultNodeProps} />);

      const labelContainer = screen.getByText("Test Label").parentElement!;
      fireEvent.contextMenu(labelContainer, { clientX: 100, clientY: 100 });

      expect(screen.queryByText("Detach from Group")).not.toBeInTheDocument();
    });

    it("should close context menu on backdrop click", () => {
      render(<LabelNode {...defaultNodeProps} />);

      const labelContainer = screen.getByText("Test Label").parentElement!;
      fireEvent.contextMenu(labelContainer, { clientX: 100, clientY: 100 });

      expect(screen.getByText("Settings")).toBeInTheDocument();

      // Click the backdrop overlay
      const backdrop = document.querySelector(".fixed.inset-0");
      fireEvent.click(backdrop!);

      expect(screen.queryByText("Settings")).not.toBeInTheDocument();
    });

    it("should expand node when Settings is clicked", () => {
      render(<LabelNode {...defaultNodeProps} />);

      const labelContainer = screen.getByText("Test Label").parentElement!;
      fireEvent.contextMenu(labelContainer, { clientX: 100, clientY: 100 });

      fireEvent.click(screen.getByText("Settings"));

      // Should render expanded view
      expect(screen.getByTestId("label-node-expanded")).toBeInTheDocument();
    });
  });

  describe("expanded mode", () => {
    it("should render expanded view when isExpanded is true in data", () => {
      const expandedData = { ...defaultNodeData, isExpanded: true };
      render(<LabelNode {...defaultNodeProps} data={expandedData} />);

      expect(screen.getByTestId("label-node-expanded")).toBeInTheDocument();
    });

    it("should close expanded view when close button is clicked", async () => {
      const expandedData = { ...defaultNodeData, isExpanded: true };
      render(<LabelNode {...defaultNodeProps} data={expandedData} />);

      fireEvent.click(screen.getByTestId("close-expanded"));

      await waitFor(() => {
        expect(mockSetNodes).toHaveBeenCalled();
      });
    });

    it("should not enter editing mode when expanded", () => {
      render(<LabelNode {...defaultNodeProps} />);

      // First expand the node
      const labelContainer = screen.getByText("Test Label").parentElement!;
      fireEvent.contextMenu(labelContainer, { clientX: 100, clientY: 100 });
      fireEvent.click(screen.getByText("Settings"));

      // Now it's expanded - try double clicking
      const expanded = screen.getByTestId("label-node-expanded");
      fireEvent.doubleClick(expanded);

      // Should not show editing input (expanded has its own input)
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    });
  });
});
