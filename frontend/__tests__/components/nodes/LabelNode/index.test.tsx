import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";

// Mock ReactFlow hooks and components
const mockSetNodes = vi.fn();
const mockUseStore = vi.fn();

vi.mock("@xyflow/react", () => ({
  useReactFlow: vi.fn(() => ({
    setNodes: mockSetNodes,
  })),
  useStore: (selector: (state: unknown) => unknown) => mockUseStore(selector),
  NodeResizer: ({
    isVisible,
    onResizeEnd,
  }: {
    isVisible: boolean;
    onResizeEnd: () => void;
  }) => (
    <div
      data-testid="node-resizer"
      data-visible={isVisible}
      onClick={() => onResizeEnd?.()}
    />
  ),
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

// Import after mocking
import LabelNode from "@/components/nodes/LabelNode";
import { useProject } from "@/contexts/ProjectContext";

const defaultNodeData = {
  label: "Test Label",
  fontFamily: "sans-serif",
  fontWeight: "normal",
  fontStyle: "normal",
  textAlign: "left" as const,
  color: "#374151",
};

const createMockStore = (
  overrides: {
    parentId?: string;
    width?: number;
  } = {},
) => {
  return (
    selector: (state: {
      nodes: {
        id: string;
        parentId?: string;
        measured?: { width: number };
        style?: { width: number };
      }[];
    }) => unknown,
  ) => {
    const state = {
      nodes: [
        {
          id: "node-1",
          parentId: overrides.parentId,
          measured: overrides.width ? { width: overrides.width } : undefined,
          style: {},
        },
      ],
    };
    return selector(state);
  };
};

describe("LabelNode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseStore.mockImplementation(createMockStore());
  });

  describe("basic rendering", () => {
    it("should render the label text", () => {
      render(
        <LabelNode
          id="node-1"
          data={defaultNodeData}
          selected={false}
          type="label"
          zIndex={1}
          isConnectable={true}
          positionAbsoluteX={0}
          positionAbsoluteY={0}
          dragging={false}
        />,
      );

      expect(screen.getByText("Test Label")).toBeInTheDocument();
    });

    it("should render with custom label", () => {
      const customData = { ...defaultNodeData, label: "My Custom Label" };
      render(
        <LabelNode
          id="node-1"
          data={customData}
          selected={false}
          type="label"
          zIndex={1}
          isConnectable={true}
          positionAbsoluteX={0}
          positionAbsoluteY={0}
          dragging={false}
        />,
      );

      expect(screen.getByText("My Custom Label")).toBeInTheDocument();
    });

    it("should render the NodeResizer when selected", () => {
      render(
        <LabelNode
          id="node-1"
          data={defaultNodeData}
          selected={true}
          type="label"
          zIndex={1}
          isConnectable={true}
          positionAbsoluteX={0}
          positionAbsoluteY={0}
          dragging={false}
        />,
      );

      const resizer = screen.getByTestId("node-resizer");
      expect(resizer).toBeInTheDocument();
      expect(resizer).toHaveAttribute("data-visible", "true");
    });

    it("should hide NodeResizer when not selected", () => {
      render(
        <LabelNode
          id="node-1"
          data={defaultNodeData}
          selected={false}
          type="label"
          zIndex={1}
          isConnectable={true}
          positionAbsoluteX={0}
          positionAbsoluteY={0}
          dragging={false}
        />,
      );

      const resizer = screen.getByTestId("node-resizer");
      expect(resizer).toHaveAttribute("data-visible", "false");
    });
  });

  describe("text styling", () => {
    it("should apply custom font family", () => {
      const styledData = { ...defaultNodeData, fontFamily: "serif" };
      render(
        <LabelNode
          id="node-1"
          data={styledData}
          selected={false}
          type="label"
          zIndex={1}
          isConnectable={true}
          positionAbsoluteX={0}
          positionAbsoluteY={0}
          dragging={false}
        />,
      );

      const container = screen.getByText("Test Label").parentElement;
      expect(container).toHaveStyle({ fontFamily: "serif" });
    });

    it("should apply bold font weight", () => {
      const styledData = { ...defaultNodeData, fontWeight: "bold" };
      render(
        <LabelNode
          id="node-1"
          data={styledData}
          selected={false}
          type="label"
          zIndex={1}
          isConnectable={true}
          positionAbsoluteX={0}
          positionAbsoluteY={0}
          dragging={false}
        />,
      );

      const container = screen.getByText("Test Label").parentElement;
      expect(container).toHaveStyle({ fontWeight: "bold" });
    });

    it("should apply italic font style", () => {
      const styledData = { ...defaultNodeData, fontStyle: "italic" };
      render(
        <LabelNode
          id="node-1"
          data={styledData}
          selected={false}
          type="label"
          zIndex={1}
          isConnectable={true}
          positionAbsoluteX={0}
          positionAbsoluteY={0}
          dragging={false}
        />,
      );

      const container = screen.getByText("Test Label").parentElement;
      expect(container).toHaveStyle({ fontStyle: "italic" });
    });

    it("should apply custom text color", () => {
      const styledData = { ...defaultNodeData, color: "#ff0000" };
      render(
        <LabelNode
          id="node-1"
          data={styledData}
          selected={false}
          type="label"
          zIndex={1}
          isConnectable={true}
          positionAbsoluteX={0}
          positionAbsoluteY={0}
          dragging={false}
        />,
      );

      const labelSpan = screen.getByText("Test Label");
      expect(labelSpan).toHaveStyle({ color: "#ff0000" });
    });

    it("should apply center text alignment", () => {
      const styledData = { ...defaultNodeData, textAlign: "center" as const };
      render(
        <LabelNode
          id="node-1"
          data={styledData}
          selected={false}
          type="label"
          zIndex={1}
          isConnectable={true}
          positionAbsoluteX={0}
          positionAbsoluteY={0}
          dragging={false}
        />,
      );

      const container = screen.getByText("Test Label").parentElement;
      expect(container).toHaveStyle({ justifyContent: "center" });
    });

    it("should apply right text alignment", () => {
      const styledData = { ...defaultNodeData, textAlign: "right" as const };
      render(
        <LabelNode
          id="node-1"
          data={styledData}
          selected={false}
          type="label"
          zIndex={1}
          isConnectable={true}
          positionAbsoluteX={0}
          positionAbsoluteY={0}
          dragging={false}
        />,
      );

      const container = screen.getByText("Test Label").parentElement;
      expect(container).toHaveStyle({ justifyContent: "flex-end" });
    });
  });

  describe("editing mode", () => {
    it("should enter editing mode on double click", () => {
      render(
        <LabelNode
          id="node-1"
          data={defaultNodeData}
          selected={false}
          type="label"
          zIndex={1}
          isConnectable={true}
          positionAbsoluteX={0}
          positionAbsoluteY={0}
          dragging={false}
        />,
      );

      const labelContainer = screen.getByText("Test Label").parentElement!;
      fireEvent.doubleClick(labelContainer);

      // Should show input field instead of span
      const input = screen.getByRole("textbox");
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue("Test Label");
    });

    it("should update edited label on input change", () => {
      render(
        <LabelNode
          id="node-1"
          data={defaultNodeData}
          selected={false}
          type="label"
          zIndex={1}
          isConnectable={true}
          positionAbsoluteX={0}
          positionAbsoluteY={0}
          dragging={false}
        />,
      );

      const labelContainer = screen.getByText("Test Label").parentElement!;
      fireEvent.doubleClick(labelContainer);

      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "New Label Text" } });

      expect(input).toHaveValue("New Label Text");
    });

    it("should save label on Enter key", async () => {
      render(
        <LabelNode
          id="node-1"
          data={defaultNodeData}
          selected={false}
          type="label"
          zIndex={1}
          isConnectable={true}
          positionAbsoluteX={0}
          positionAbsoluteY={0}
          dragging={false}
        />,
      );

      const labelContainer = screen.getByText("Test Label").parentElement!;
      fireEvent.doubleClick(labelContainer);

      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "New Label" } });
      fireEvent.keyDown(input, { key: "Enter" });

      await waitFor(() => {
        expect(mockSetNodes).toHaveBeenCalled();
      });

      // Should exit editing mode
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    });

    it("should cancel editing on Escape key", () => {
      render(
        <LabelNode
          id="node-1"
          data={defaultNodeData}
          selected={false}
          type="label"
          zIndex={1}
          isConnectable={true}
          positionAbsoluteX={0}
          positionAbsoluteY={0}
          dragging={false}
        />,
      );

      const labelContainer = screen.getByText("Test Label").parentElement!;
      fireEvent.doubleClick(labelContainer);

      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "New Label" } });
      fireEvent.keyDown(input, { key: "Escape" });

      // Should exit editing mode and not save
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
      expect(screen.getByText("Test Label")).toBeInTheDocument();
    });

    it("should save label on blur", async () => {
      render(
        <LabelNode
          id="node-1"
          data={defaultNodeData}
          selected={false}
          type="label"
          zIndex={1}
          isConnectable={true}
          positionAbsoluteX={0}
          positionAbsoluteY={0}
          dragging={false}
        />,
      );

      const labelContainer = screen.getByText("Test Label").parentElement!;
      fireEvent.doubleClick(labelContainer);

      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "Blurred Label" } });
      fireEvent.blur(input);

      await waitFor(() => {
        expect(mockSetNodes).toHaveBeenCalled();
      });
    });

    it("should not save empty label", async () => {
      render(
        <LabelNode
          id="node-1"
          data={defaultNodeData}
          selected={false}
          type="label"
          zIndex={1}
          isConnectable={true}
          positionAbsoluteX={0}
          positionAbsoluteY={0}
          dragging={false}
        />,
      );

      const labelContainer = screen.getByText("Test Label").parentElement!;
      fireEvent.doubleClick(labelContainer);

      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "   " } });
      fireEvent.keyDown(input, { key: "Enter" });

      // Should not call setNodes with empty label
      await waitFor(() => {
        const calls = mockSetNodes.mock.calls;
        // If called, the callback should not update with empty label
        if (calls.length > 0) {
          const updateFn = calls[0][0];
          const result = updateFn([
            { id: "node-1", data: { label: "Test Label" } },
          ]);
          // The label should remain unchanged when trimmed value is empty
          expect(result[0].data.label).toBe("Test Label");
        }
      });
    });
  });

  describe("locked state", () => {
    it("should not enter editing mode when project is locked", () => {
      vi.mocked(useProject).mockReturnValue({ isLocked: true } as ReturnType<
        typeof useProject
      >);

      render(
        <LabelNode
          id="node-1"
          data={defaultNodeData}
          selected={false}
          type="label"
          zIndex={1}
          isConnectable={true}
          positionAbsoluteX={0}
          positionAbsoluteY={0}
          dragging={false}
        />,
      );

      const labelContainer = screen.getByText("Test Label").parentElement!;
      fireEvent.doubleClick(labelContainer);

      // Should NOT show input field
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
      expect(screen.getByText("Test Label")).toBeInTheDocument();
    });

    it("should hide NodeResizer when project is locked", () => {
      vi.mocked(useProject).mockReturnValue({ isLocked: true } as ReturnType<
        typeof useProject
      >);

      render(
        <LabelNode
          id="node-1"
          data={defaultNodeData}
          selected={true}
          type="label"
          zIndex={1}
          isConnectable={true}
          positionAbsoluteX={0}
          positionAbsoluteY={0}
          dragging={false}
        />,
      );

      const resizer = screen.getByTestId("node-resizer");
      expect(resizer).toHaveAttribute("data-visible", "false");
    });
  });

  describe("context menu", () => {
    it("should show context menu on right click", () => {
      render(
        <LabelNode
          id="node-1"
          data={defaultNodeData}
          selected={false}
          type="label"
          zIndex={1}
          isConnectable={true}
          positionAbsoluteX={0}
          positionAbsoluteY={0}
          dragging={false}
        />,
      );

      const labelContainer = screen.getByText("Test Label").parentElement!;
      fireEvent.contextMenu(labelContainer, { clientX: 100, clientY: 100 });

      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    it("should show Detach option when node has parent", () => {
      mockUseStore.mockImplementation(
        createMockStore({ parentId: "parent-1" }),
      );

      render(
        <LabelNode
          id="node-1"
          data={defaultNodeData}
          selected={false}
          type="label"
          zIndex={1}
          isConnectable={true}
          positionAbsoluteX={0}
          positionAbsoluteY={0}
          dragging={false}
        />,
      );

      const labelContainer = screen.getByText("Test Label").parentElement!;
      fireEvent.contextMenu(labelContainer, { clientX: 100, clientY: 100 });

      expect(screen.getByText("Detach from Group")).toBeInTheDocument();
    });

    it("should not show Detach option when node has no parent", () => {
      mockUseStore.mockImplementation(createMockStore({ parentId: undefined }));

      render(
        <LabelNode
          id="node-1"
          data={defaultNodeData}
          selected={false}
          type="label"
          zIndex={1}
          isConnectable={true}
          positionAbsoluteX={0}
          positionAbsoluteY={0}
          dragging={false}
        />,
      );

      const labelContainer = screen.getByText("Test Label").parentElement!;
      fireEvent.contextMenu(labelContainer, { clientX: 100, clientY: 100 });

      expect(screen.queryByText("Detach from Group")).not.toBeInTheDocument();
    });

    it("should close context menu on backdrop click", () => {
      render(
        <LabelNode
          id="node-1"
          data={defaultNodeData}
          selected={false}
          type="label"
          zIndex={1}
          isConnectable={true}
          positionAbsoluteX={0}
          positionAbsoluteY={0}
          dragging={false}
        />,
      );

      const labelContainer = screen.getByText("Test Label").parentElement!;
      fireEvent.contextMenu(labelContainer, { clientX: 100, clientY: 100 });

      expect(screen.getByText("Settings")).toBeInTheDocument();

      // Click the backdrop overlay
      const backdrop = document.querySelector(".fixed.inset-0");
      fireEvent.click(backdrop!);

      expect(screen.queryByText("Settings")).not.toBeInTheDocument();
    });

    it("should expand node when Settings is clicked", () => {
      render(
        <LabelNode
          id="node-1"
          data={defaultNodeData}
          selected={false}
          type="label"
          zIndex={1}
          isConnectable={true}
          positionAbsoluteX={0}
          positionAbsoluteY={0}
          dragging={false}
        />,
      );

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
      render(
        <LabelNode
          id="node-1"
          data={expandedData}
          selected={false}
          type="label"
          zIndex={1}
          isConnectable={true}
          positionAbsoluteX={0}
          positionAbsoluteY={0}
          dragging={false}
        />,
      );

      expect(screen.getByTestId("label-node-expanded")).toBeInTheDocument();
    });

    it("should close expanded view when close button is clicked", async () => {
      const expandedData = { ...defaultNodeData, isExpanded: true };
      render(
        <LabelNode
          id="node-1"
          data={expandedData}
          selected={false}
          type="label"
          zIndex={1}
          isConnectable={true}
          positionAbsoluteX={0}
          positionAbsoluteY={0}
          dragging={false}
        />,
      );

      fireEvent.click(screen.getByTestId("close-expanded"));

      await waitFor(() => {
        expect(mockSetNodes).toHaveBeenCalled();
      });
    });

    it("should not enter editing mode when expanded", () => {
      render(
        <LabelNode
          id="node-1"
          data={defaultNodeData}
          selected={false}
          type="label"
          zIndex={1}
          isConnectable={true}
          positionAbsoluteX={0}
          positionAbsoluteY={0}
          dragging={false}
        />,
      );

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

  describe("selection state", () => {
    it("should pass selected prop to NodeResizer", () => {
      vi.mocked(useProject).mockReturnValue({ isLocked: false } as ReturnType<
        typeof useProject
      >);

      render(
        <LabelNode
          id="node-1"
          data={defaultNodeData}
          selected={true}
          type="label"
          zIndex={1}
          isConnectable={true}
          positionAbsoluteX={0}
          positionAbsoluteY={0}
          dragging={false}
        />,
      );

      // The label text should be rendered
      expect(screen.getByText("Test Label")).toBeInTheDocument();
      // NodeResizer should be present
      expect(screen.getByTestId("node-resizer")).toBeInTheDocument();
    });

    it("should render when not selected", () => {
      render(
        <LabelNode
          id="node-1"
          data={defaultNodeData}
          selected={false}
          type="label"
          zIndex={1}
          isConnectable={true}
          positionAbsoluteX={0}
          positionAbsoluteY={0}
          dragging={false}
        />,
      );

      // Label should still render
      expect(screen.getByText("Test Label")).toBeInTheDocument();
    });
  });

  describe("default values", () => {
    it("should use default values when not provided", () => {
      const minimalData = { label: "Minimal Label" };
      render(
        <LabelNode
          id="node-1"
          data={minimalData}
          selected={false}
          type="label"
          zIndex={1}
          isConnectable={true}
          positionAbsoluteX={0}
          positionAbsoluteY={0}
          dragging={false}
        />,
      );

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

      render(
        <LabelNode
          id="node-1"
          data={defaultNodeData}
          selected={false}
          type="label"
          zIndex={1}
          isConnectable={true}
          positionAbsoluteX={0}
          positionAbsoluteY={0}
          dragging={false}
        />,
      );

      const container = screen.getByText("Test Label").parentElement;
      // With width 200 and default 100, fontSize should be (200/100) * 14 = 28
      expect(container).toHaveStyle({ fontSize: "28px" });
    });
  });
});
