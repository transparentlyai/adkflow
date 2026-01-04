import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

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
          process: {
            header: "#10b981",
            accent: "#34d399",
            text: "#fff",
            ring: "#10b981",
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
        execution: { running: "#22c55e", completed: "#10b981", error: "#ef4444" },
      },
    },
  })),
}));

vi.mock("@/components/DraggableHandle", () => ({
  default: ({ handleId, type, title }: { handleId: string; type: string; title?: string }) => (
    <div data-testid={`draggable-handle-${type}-${handleId}`} title={title}>Handle {handleId}</div>
  ),
}));

vi.mock("@/components/nodes/ValidationIndicator", () => ({
  default: ({ errors, warnings, duplicateNameError }: { errors?: string[]; warnings?: string[]; duplicateNameError?: string }) => (
    <div data-testid="validation-indicator">
      {errors && errors.length > 0 && <span data-testid="has-errors">Errors: {errors.length}</span>}
      {warnings && warnings.length > 0 && <span data-testid="has-warnings">Warnings: {warnings.length}</span>}
      {duplicateNameError && <span data-testid="has-duplicate">{duplicateNameError}</span>}
    </div>
  ),
}));

vi.mock("@/components/nodes/custom/NodeIcon", () => ({
  default: ({ icon, className }: { icon?: string; className?: string }) => (
    <div data-testid={`node-icon-${icon || "default"}`} className={className}>Icon: {icon}</div>
  ),
}));

import PillBodyLayout from "@/components/nodes/custom/layouts/PillBodyLayout";
import { createBaseProps, createProcessSchema } from "./PillBodyLayout.testUtils";

describe("PillBodyLayout Interaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("handles", () => {
    it("should render main input handle", () => {
      render(<PillBodyLayout {...createBaseProps()} />);
      expect(screen.getByTestId("draggable-handle-target-input")).toBeInTheDocument();
    });

    it("should render output handles", () => {
      render(<PillBodyLayout {...createBaseProps()} />);
      expect(screen.getByTestId("draggable-handle-source-output")).toBeInTheDocument();
    });

    it("should render additional handles from handle_layout", () => {
      const props = createBaseProps({
        schema: createProcessSchema({
          ui: {
            handle_layout: {
              input_position: "left",
              output_position: "right",
              additional_handles: [
                { id: "data-in", type: "target", position: "top", label: "Data" },
              ],
            },
            inputs: [
              { id: "input", label: "Input", source_type: "flow", data_type: "any" },
              { id: "data-in", label: "Data", source_type: "data", data_type: "dict", handle_color: "#a855f7" },
            ],
          },
        }),
        handleTypes: {
          input: { acceptedSources: ["flow"], acceptedTypes: ["any"] },
          output: { outputSource: "process", outputType: "any" },
          "data-in": { acceptedSources: ["data"], acceptedTypes: ["dict"] },
        },
      });
      render(<PillBodyLayout {...props} />);
      expect(screen.getByTestId("draggable-handle-target-data-in")).toBeInTheDocument();
    });

    it("should not render left-positioned additional handles as draggable", () => {
      const props = createBaseProps({
        schema: createProcessSchema({
          ui: {
            handle_layout: {
              input_position: "left",
              output_position: "right",
              additional_handles: [
                { id: "data-in", type: "target", position: "left", label: "Data" },
              ],
            },
            inputs: [
              { id: "input", label: "Input", source_type: "flow", data_type: "any" },
              { id: "data-in", label: "Data", source_type: "data", data_type: "dict" },
            ],
          },
        }),
      });
      render(<PillBodyLayout {...props} />);
      expect(screen.queryByTestId("draggable-handle-target-data-in")).not.toBeInTheDocument();
    });
  });

  describe("interactions", () => {
    it("should call onToggleExpand when header is double-clicked", () => {
      const onToggleExpand = vi.fn();
      const { container } = render(
        <PillBodyLayout {...createBaseProps({ onToggleExpand })} />,
      );
      const header = container.querySelector(".rounded-t-lg");
      if (header) fireEvent.doubleClick(header);
      expect(onToggleExpand).toHaveBeenCalledTimes(1);
    });

    it("should call onToggleExpand when body is double-clicked", () => {
      const onToggleExpand = vi.fn();
      const { container } = render(
        <PillBodyLayout {...createBaseProps({ onToggleExpand })} />,
      );
      const body = container.querySelector(".rounded-b-lg");
      if (body) fireEvent.doubleClick(body);
      expect(onToggleExpand).toHaveBeenCalledTimes(1);
    });

    it("should call onToggleExpand when expand button is clicked", () => {
      const onToggleExpand = vi.fn();
      render(<PillBodyLayout {...createBaseProps({ onToggleExpand })} />);
      const expandButton = screen.getByRole("button", { name: /expand/i });
      fireEvent.click(expandButton);
      expect(onToggleExpand).toHaveBeenCalledTimes(1);
    });

    it("should call onNameClick when name is clicked", () => {
      const onNameClick = vi.fn();
      render(<PillBodyLayout {...createBaseProps({ onNameClick })} />);
      const nameElement = screen.getByText("My Process");
      fireEvent.click(nameElement);
      expect(onNameClick).toHaveBeenCalledTimes(1);
    });
  });

  describe("name editing", () => {
    it("should render input when in editing mode", () => {
      const props = createBaseProps({ isEditing: true, editedName: "New Process Name" });
      render(<PillBodyLayout {...props} />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveValue("New Process Name");
    });

    it("should call onNameChange when input changes", () => {
      const onNameChange = vi.fn();
      const props = createBaseProps({ isEditing: true, editedName: "My Process", onNameChange });
      render(<PillBodyLayout {...props} />);
      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "Updated" } });
      expect(onNameChange).toHaveBeenCalledWith("Updated");
    });

    it("should call onNameSave on blur", () => {
      const onNameSave = vi.fn();
      const props = createBaseProps({ isEditing: true, editedName: "My Process", onNameSave });
      render(<PillBodyLayout {...props} />);
      const input = screen.getByRole("textbox");
      fireEvent.blur(input);
      expect(onNameSave).toHaveBeenCalledTimes(1);
    });

    it("should call onNameKeyDown on key press", () => {
      const onNameKeyDown = vi.fn();
      const props = createBaseProps({ isEditing: true, editedName: "My Process", onNameKeyDown });
      render(<PillBodyLayout {...props} />);
      const input = screen.getByRole("textbox");
      fireEvent.keyDown(input, { key: "Enter" });
      expect(onNameKeyDown).toHaveBeenCalled();
    });

    it("should stop propagation on click when editing", () => {
      const props = createBaseProps({ isEditing: true, editedName: "My Process" });
      render(<PillBodyLayout {...props} />);
      const input = screen.getByRole("textbox");
      expect(input).toBeInTheDocument();
    });
  });
});
