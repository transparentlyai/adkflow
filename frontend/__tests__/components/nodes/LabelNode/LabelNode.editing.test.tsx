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

import LabelNode from "@/components/nodes/LabelNode";
import { defaultNodeProps, createMockStore } from "./LabelNode.testUtils";

describe("LabelNode Editing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseStore.mockImplementation(createMockStore());
  });

  describe("editing mode", () => {
    it("should enter editing mode on double click", () => {
      render(<LabelNode {...defaultNodeProps} />);

      const labelContainer = screen.getByText("Test Label").parentElement!;
      fireEvent.doubleClick(labelContainer);

      // Should show input field instead of span
      const input = screen.getByRole("textbox");
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue("Test Label");
    });

    it("should update edited label on input change", () => {
      render(<LabelNode {...defaultNodeProps} />);

      const labelContainer = screen.getByText("Test Label").parentElement!;
      fireEvent.doubleClick(labelContainer);

      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "New Label Text" } });

      expect(input).toHaveValue("New Label Text");
    });

    it("should save label on Ctrl+Enter key", async () => {
      render(<LabelNode {...defaultNodeProps} />);

      const labelContainer = screen.getByText("Test Label").parentElement!;
      fireEvent.doubleClick(labelContainer);

      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "New Label" } });
      fireEvent.keyDown(input, { key: "Enter", ctrlKey: true });

      await waitFor(() => {
        expect(mockSetNodes).toHaveBeenCalled();
      });

      // Should exit editing mode
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    });

    it("should save label on Cmd+Enter key", async () => {
      render(<LabelNode {...defaultNodeProps} />);

      const labelContainer = screen.getByText("Test Label").parentElement!;
      fireEvent.doubleClick(labelContainer);

      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "New Label" } });
      fireEvent.keyDown(input, { key: "Enter", metaKey: true });

      await waitFor(() => {
        expect(mockSetNodes).toHaveBeenCalled();
      });

      // Should exit editing mode
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    });

    it("should allow new lines with Enter key alone", () => {
      render(<LabelNode {...defaultNodeProps} />);

      const labelContainer = screen.getByText("Test Label").parentElement!;
      fireEvent.doubleClick(labelContainer);

      const input = screen.getByRole("textbox");
      fireEvent.keyDown(input, { key: "Enter" });

      // Should remain in editing mode (Enter alone doesn't save)
      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });

    it("should cancel editing on Escape key", () => {
      render(<LabelNode {...defaultNodeProps} />);

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
      render(<LabelNode {...defaultNodeProps} />);

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
      render(<LabelNode {...defaultNodeProps} />);

      const labelContainer = screen.getByText("Test Label").parentElement!;
      fireEvent.doubleClick(labelContainer);

      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "   " } });
      fireEvent.keyDown(input, { key: "Enter", ctrlKey: true });

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
});
