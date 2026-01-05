import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

// Mutable mock state that can be changed between tests
let mockStoreState = { edges: [] as unknown[], nodes: [] as unknown[] };

// Mocks must be in the test file for vi.mock hoisting to work
vi.mock("@/contexts/ThemeContext", () => ({
  useTheme: vi.fn(() => ({
    theme: {
      name: "test",
      colors: {
        nodes: {
          common: {
            container: { background: "#fff", border: "#ccc" },
            header: { background: "#f0f0f0", border: "#ddd" },
            footer: { background: "#f9f9f9", border: "#eee", text: "#333" },
            text: { primary: "#000", secondary: "#666", muted: "#999" },
          },
          agent: {
            header: "#4f46e5",
            accent: "#6366f1",
            text: "#fff",
            ring: "#4f46e5",
          },
          prompt: {
            header: "#8b5cf6",
            accent: "#a78bfa",
            text: "#fff",
            ring: "#8b5cf6",
          },
          tool: {
            header: "#f97316",
            accent: "#fb923c",
            text: "#fff",
            ring: "#f97316",
          },
        },
        handles: {
          border: "#ccc",
          background: "#fff",
          connected: "#4f46e5",
          input: "#22c55e",
          output: "#3b82f6",
          link: "#a855f7",
        },
        state: {
          running: { ring: "#3b82f6", glow: "rgba(59, 130, 246, 0.4)" },
          completed: { ring: "#22c55e", glow: "rgba(34, 197, 94, 0.3)" },
          error: { ring: "#ef4444", glow: "rgba(239, 68, 68, 0.4)" },
          invalid: { ring: "#ef4444", glow: "rgba(239, 68, 68, 0.4)" },
        },
        validation: { error: "#ef4444", warning: "#f59e0b" },
        execution: {
          running: "#22c55e",
          completed: "#10b981",
          error: "#ef4444",
        },
      },
    },
  })),
}));

vi.mock("@/components/DraggableHandle", () => ({
  default: ({
    handleId,
    type,
    title,
  }: {
    handleId: string;
    type: string;
    title?: string;
  }) => (
    <div data-testid={`draggable-handle-${type}-${handleId}`} title={title}>
      Handle {handleId}
    </div>
  ),
}));

vi.mock("@/components/nodes/ValidationIndicator", () => ({
  default: ({
    errors,
    warnings,
    duplicateNameError,
  }: {
    errors?: string[];
    warnings?: string[];
    duplicateNameError?: string;
  }) => (
    <div data-testid="validation-indicator">
      {errors && errors.length > 0 && (
        <span data-testid="has-errors">Errors: {errors.length}</span>
      )}
      {warnings && warnings.length > 0 && (
        <span data-testid="has-warnings">Warnings: {warnings.length}</span>
      )}
      {duplicateNameError && (
        <span data-testid="has-duplicate">{duplicateNameError}</span>
      )}
    </div>
  ),
}));

vi.mock("@/components/nodes/custom/NodeIcon", () => ({
  default: ({ icon, className }: { icon?: string; className?: string }) => (
    <div data-testid={`node-icon-${icon || "default"}`} className={className}>
      Icon: {icon}
    </div>
  ),
}));

vi.mock("@xyflow/react", () => ({
  Handle: ({
    id,
    type,
    position,
  }: {
    id: string;
    type: string;
    position: string;
  }) => (
    <div data-testid={`xyflow-handle-${type}-${id}`} data-position={position}>
      XYFlow Handle {id}
    </div>
  ),
  Position: { Top: "top", Bottom: "bottom", Left: "left", Right: "right" },
  useStore: vi.fn((selector: (state: typeof mockStoreState) => unknown) =>
    selector(mockStoreState),
  ),
}));

import FullCollapsedLayout from "@/components/nodes/custom/layouts/FullCollapsedLayout";
import { createBaseProps } from "./FullCollapsedLayout.testUtils";

describe("FullCollapsedLayout Interaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock state to empty before each test
    mockStoreState = { edges: [], nodes: [] };
  });

  describe("interactions", () => {
    it("should call onToggleExpand on double-click", () => {
      const onToggleExpand = vi.fn();
      const { container } = render(
        <FullCollapsedLayout {...createBaseProps({ onToggleExpand })} />,
      );
      const nodeContainer = container.querySelector(".rounded-lg");
      if (nodeContainer) fireEvent.doubleClick(nodeContainer);
      expect(onToggleExpand).toHaveBeenCalledTimes(1);
    });

    it("should call onNameClick when name is clicked", () => {
      const onNameClick = vi.fn();
      render(<FullCollapsedLayout {...createBaseProps({ onNameClick })} />);
      const nameElement = screen.getByText("My Agent");
      fireEvent.click(nameElement);
      expect(onNameClick).toHaveBeenCalledTimes(1);
    });
  });

  describe("name editing", () => {
    it("should render input when in editing mode", () => {
      const props = createBaseProps({
        isEditing: true,
        editedName: "New Agent Name",
      });
      render(<FullCollapsedLayout {...props} />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveValue("New Agent Name");
    });

    it("should call onNameChange when input changes", () => {
      const onNameChange = vi.fn();
      const props = createBaseProps({
        isEditing: true,
        editedName: "My Agent",
        onNameChange,
      });
      render(<FullCollapsedLayout {...props} />);
      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "Updated" } });
      expect(onNameChange).toHaveBeenCalledWith("Updated");
    });

    it("should call onNameSave on blur", () => {
      const onNameSave = vi.fn();
      const props = createBaseProps({
        isEditing: true,
        editedName: "My Agent",
        onNameSave,
      });
      render(<FullCollapsedLayout {...props} />);
      const input = screen.getByRole("textbox");
      fireEvent.blur(input);
      expect(onNameSave).toHaveBeenCalledTimes(1);
    });

    it("should call onNameKeyDown on key press", () => {
      const onNameKeyDown = vi.fn();
      const props = createBaseProps({
        isEditing: true,
        editedName: "My Agent",
        onNameKeyDown,
      });
      render(<FullCollapsedLayout {...props} />);
      const input = screen.getByRole("textbox");
      fireEvent.keyDown(input, { key: "Enter" });
      expect(onNameKeyDown).toHaveBeenCalled();
    });

    it("should stop propagation on click when editing", () => {
      const props = createBaseProps({
        isEditing: true,
        editedName: "My Agent",
      });
      render(<FullCollapsedLayout {...props} />);
      const input = screen.getByRole("textbox");
      fireEvent.click(input);
      expect(input).toBeInTheDocument();
    });

    it("should stop propagation on double-click when editing", () => {
      const onToggleExpand = vi.fn();
      const props = createBaseProps({
        isEditing: true,
        editedName: "My Agent",
        onToggleExpand,
      });
      render(<FullCollapsedLayout {...props} />);
      const input = screen.getByRole("textbox");
      fireEvent.doubleClick(input);
      expect(onToggleExpand).not.toHaveBeenCalled();
    });
  });
});

describe("FullCollapsedLayout with connected nodes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock state to empty before each test
    mockStoreState = { edges: [], nodes: [] };
  });

  it("should display connected prompt name from store", () => {
    mockStoreState = {
      edges: [
        {
          id: "edge-1",
          source: "prompt_1",
          target: "agent-1",
          targetHandle: "prompt-input",
        },
      ],
      nodes: [
        {
          id: "prompt_1",
          type: "custom",
          position: { x: 0, y: 0 },
          data: { prompt: { name: "System Prompt" } },
        },
      ],
    };
    render(<FullCollapsedLayout {...createBaseProps()} />);
    expect(screen.getByText("System Prompt")).toBeInTheDocument();
  });

  it("should display connected tool names from store", () => {
    mockStoreState = {
      edges: [
        {
          id: "edge-1",
          source: "tool_1",
          target: "agent-1",
          targetHandle: "tools-input",
        },
        {
          id: "edge-2",
          source: "tool_2",
          target: "agent-1",
          targetHandle: "tools-input",
        },
      ],
      nodes: [
        {
          id: "tool_1",
          type: "custom",
          position: { x: 0, y: 0 },
          data: { name: "Search Tool" },
        },
        {
          id: "tool_2",
          type: "custom",
          position: { x: 0, y: 100 },
          data: { name: "Calculator Tool" },
        },
      ],
    };
    render(<FullCollapsedLayout {...createBaseProps()} />);
    expect(
      screen.getByText("Search Tool, Calculator Tool"),
    ).toBeInTheDocument();
  });

  it("should display connected AgentTool names", () => {
    mockStoreState = {
      edges: [
        {
          id: "edge-1",
          source: "agentTool_1",
          target: "agent-1",
          targetHandle: "tools-input",
        },
      ],
      nodes: [
        {
          id: "agentTool_1",
          type: "custom",
          position: { x: 0, y: 0 },
          data: { name: "Sub Agent" },
        },
      ],
    };
    render(<FullCollapsedLayout {...createBaseProps()} />);
    expect(screen.getByText("Sub Agent")).toBeInTheDocument();
  });

  it("should use default 'Prompt' when prompt name not found", () => {
    mockStoreState = {
      edges: [
        {
          id: "edge-1",
          source: "prompt_1",
          target: "agent-1",
          targetHandle: "prompt-input",
        },
      ],
      nodes: [
        {
          id: "prompt_1",
          type: "custom",
          position: { x: 0, y: 0 },
          data: { prompt: {} },
        },
      ],
    };
    render(<FullCollapsedLayout {...createBaseProps()} />);
    expect(screen.getByText("Prompt")).toBeInTheDocument();
  });
});
