import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
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

describe("LabelNode Rendering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseStore.mockImplementation(createMockStore());
  });

  describe("basic rendering", () => {
    it("should render the label text", () => {
      render(<LabelNode {...defaultNodeProps} />);
      expect(screen.getByText("Test Label")).toBeInTheDocument();
    });

    it("should render with custom label", () => {
      const customData = { ...defaultNodeData, label: "My Custom Label" };
      render(<LabelNode {...defaultNodeProps} data={customData} />);
      expect(screen.getByText("My Custom Label")).toBeInTheDocument();
    });

    it("should render corner resize controls when selected", () => {
      render(<LabelNode {...defaultNodeProps} selected={true} />);
      // Should render 4 corner handles
      expect(screen.getByTestId("resize-control-top-left")).toBeInTheDocument();
      expect(
        screen.getByTestId("resize-control-top-right"),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId("resize-control-bottom-left"),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId("resize-control-bottom-right"),
      ).toBeInTheDocument();
    });

    it("should not render resize controls when not selected", () => {
      render(<LabelNode {...defaultNodeProps} selected={false} />);
      expect(
        screen.queryByTestId("resize-control-top-left"),
      ).not.toBeInTheDocument();
    });
  });

  describe("text styling", () => {
    it("should apply custom font family", () => {
      const styledData = { ...defaultNodeData, fontFamily: "serif" };
      render(<LabelNode {...defaultNodeProps} data={styledData} />);
      const container = screen.getByText("Test Label").parentElement;
      expect(container).toHaveStyle({ fontFamily: "serif" });
    });

    it("should apply bold font weight", () => {
      const styledData = { ...defaultNodeData, fontWeight: "bold" };
      render(<LabelNode {...defaultNodeProps} data={styledData} />);
      const container = screen.getByText("Test Label").parentElement;
      expect(container).toHaveStyle({ fontWeight: "bold" });
    });

    it("should apply italic font style", () => {
      const styledData = { ...defaultNodeData, fontStyle: "italic" };
      render(<LabelNode {...defaultNodeProps} data={styledData} />);
      const container = screen.getByText("Test Label").parentElement;
      expect(container).toHaveStyle({ fontStyle: "italic" });
    });

    it("should apply custom text color", () => {
      const styledData = { ...defaultNodeData, color: "#ff0000" };
      render(<LabelNode {...defaultNodeProps} data={styledData} />);
      const labelSpan = screen.getByText("Test Label");
      expect(labelSpan).toHaveStyle({ color: "#ff0000" });
    });

    it("should apply center text alignment", () => {
      const styledData = { ...defaultNodeData, textAlign: "center" as const };
      render(<LabelNode {...defaultNodeProps} data={styledData} />);
      const container = screen.getByText("Test Label").parentElement;
      expect(container).toHaveStyle({ justifyContent: "center" });
    });

    it("should apply right text alignment", () => {
      const styledData = { ...defaultNodeData, textAlign: "right" as const };
      render(<LabelNode {...defaultNodeProps} data={styledData} />);
      const container = screen.getByText("Test Label").parentElement;
      expect(container).toHaveStyle({ justifyContent: "flex-end" });
    });
  });

  describe("selection state", () => {
    it("should render resize controls when selected", () => {
      render(<LabelNode {...defaultNodeProps} selected={true} />);
      expect(screen.getByText("Test Label")).toBeInTheDocument();
      expect(screen.getByTestId("resize-control-top-left")).toBeInTheDocument();
    });

    it("should render when not selected", () => {
      render(<LabelNode {...defaultNodeProps} selected={false} />);
      expect(screen.getByText("Test Label")).toBeInTheDocument();
    });
  });

  describe("default values", () => {
    it("should use default values when not provided", () => {
      const minimalData = { label: "Minimal Label" };
      render(<LabelNode {...defaultNodeProps} data={minimalData} />);

      const labelSpan = screen.getByText("Minimal Label");
      expect(labelSpan).toBeInTheDocument();

      // Check default color is applied
      expect(labelSpan).toHaveStyle({ color: "#374151" });

      // Check container has default font settings
      const container = labelSpan.parentElement;
      expect(container).toHaveStyle({
        fontFamily: "sans-serif",
        fontWeight: "normal",
        fontStyle: "normal",
      });
    });
  });

  describe("font size scaling", () => {
    it("should scale font size based on node width", () => {
      mockUseStore.mockImplementation(createMockStore({ width: 200 }));

      render(<LabelNode {...defaultNodeProps} />);

      const container = screen.getByText("Test Label").parentElement;
      // With width 200 and default 100, fontSize should be (200/100) * 14 = 28
      expect(container).toHaveStyle({ fontSize: "28px" });
    });
  });
});
