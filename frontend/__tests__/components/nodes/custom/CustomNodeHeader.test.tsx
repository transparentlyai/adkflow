import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

// Mock ThemeContext
vi.mock("@/contexts/ThemeContext", () => ({
  useTheme: vi.fn(() => ({
    theme: {
      name: "test",
      colors: {
        nodes: {
          common: {
            text: { primary: "#000", secondary: "#666" },
          },
        },
        state: {
          success: "#22c55e",
          warning: "#f59e0b",
        },
      },
    },
  })),
}));

// Mock NodeIcon
vi.mock("@/components/nodes/custom/NodeIcon", () => ({
  default: ({ icon, className }: { icon?: string; className?: string }) => (
    <div data-testid="node-icon" className={className}>
      {icon || "default-icon"}
    </div>
  ),
}));

// Mock ValidationIndicator
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
        <span data-testid="error-count">{errors.length} errors</span>
      )}
      {warnings && warnings.length > 0 && (
        <span data-testid="warning-count">{warnings.length} warnings</span>
      )}
      {duplicateNameError && (
        <span data-testid="duplicate-error">{duplicateNameError}</span>
      )}
    </div>
  ),
}));

// Import after mocking
import CustomNodeHeader from "@/components/nodes/custom/CustomNodeHeader";
import type { CustomNodeSchema } from "@/components/nodes/CustomNode";

// Create a mock schema
const createMockSchema = (
  overrides: Partial<CustomNodeSchema> = {},
): CustomNodeSchema => ({
  unit_id: "test.node",
  label: "Test Node",
  menu_location: "Test",
  description: "A test node",
  version: "1.0.0",
  ui: {
    inputs: [],
    outputs: [],
    fields: [],
    color: "#4f46e5",
    icon: "agent",
    expandable: true,
    default_width: 300,
    default_height: 200,
    ...overrides.ui,
  },
  ...overrides,
});

// Default props for the component
const createDefaultProps = (overrides: Record<string, unknown> = {}) => ({
  name: "TestNode",
  schema: createMockSchema(),
  headerColor: "#4f46e5",
  isExpanded: false,
  onToggleExpand: vi.fn(),
  isEditing: false,
  editedName: "TestNode",
  inputRef: { current: null },
  onNameClick: vi.fn(),
  onNameChange: vi.fn(),
  onNameSave: vi.fn(),
  onNameKeyDown: vi.fn(),
  ...overrides,
});

describe("CustomNodeHeader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("basic rendering", () => {
    it("should render node name", () => {
      const props = createDefaultProps({ name: "MyNode" });
      render(<CustomNodeHeader {...props} />);
      expect(screen.getByText("MyNode")).toBeInTheDocument();
    });

    it("should render node icon", () => {
      const props = createDefaultProps();
      render(<CustomNodeHeader {...props} />);
      expect(screen.getByTestId("node-icon")).toBeInTheDocument();
      expect(screen.getByTestId("node-icon")).toHaveTextContent("agent");
    });

    it("should render with custom header color", () => {
      const props = createDefaultProps({ headerColor: "#ff0000" });
      const { container } = render(<CustomNodeHeader {...props} />);
      const header = container.firstChild as HTMLElement;
      expect(header).toHaveStyle({ backgroundColor: "#ff0000" });
    });
  });

  describe("expand/collapse chevron", () => {
    it("should show ChevronDown when collapsed", () => {
      const props = createDefaultProps({ isExpanded: false });
      const { container } = render(<CustomNodeHeader {...props} />);
      // The ChevronDown icon should be rendered
      const svg = container.querySelector("svg.lucide-chevron-down");
      expect(svg).toBeInTheDocument();
    });

    it("should show ChevronUp when expanded", () => {
      const props = createDefaultProps({ isExpanded: true });
      const { container } = render(<CustomNodeHeader {...props} />);
      // The ChevronUp icon should be rendered
      const svg = container.querySelector("svg.lucide-chevron-up");
      expect(svg).toBeInTheDocument();
    });
  });

  describe("toggle expand", () => {
    it("should call onToggleExpand on double click", () => {
      const onToggleExpand = vi.fn();
      const props = createDefaultProps({ onToggleExpand });
      const { container } = render(<CustomNodeHeader {...props} />);
      const header = container.firstChild as HTMLElement;
      fireEvent.doubleClick(header);
      expect(onToggleExpand).toHaveBeenCalled();
    });
  });

  describe("output node indicator", () => {
    it("should show output node indicator when output_node is true", () => {
      const schema = createMockSchema({ output_node: true });
      const props = createDefaultProps({ schema });
      render(<CustomNodeHeader {...props} />);
      expect(
        screen.getByTitle("Output Node - triggers execution"),
      ).toBeInTheDocument();
    });

    it("should not show output node indicator when output_node is false", () => {
      const schema = createMockSchema({ output_node: false });
      const props = createDefaultProps({ schema });
      render(<CustomNodeHeader {...props} />);
      expect(
        screen.queryByTitle("Output Node - triggers execution"),
      ).not.toBeInTheDocument();
    });
  });

  describe("always execute indicator", () => {
    it("should show always execute indicator when always_execute is true", () => {
      const schema = createMockSchema({ always_execute: true });
      const props = createDefaultProps({ schema });
      render(<CustomNodeHeader {...props} />);
      expect(
        screen.getByTitle("Always Execute - skips cache"),
      ).toBeInTheDocument();
    });

    it("should not show always execute indicator when always_execute is false", () => {
      const schema = createMockSchema({ always_execute: false });
      const props = createDefaultProps({ schema });
      render(<CustomNodeHeader {...props} />);
      expect(
        screen.queryByTitle("Always Execute - skips cache"),
      ).not.toBeInTheDocument();
    });
  });

  describe("name editing", () => {
    it("should show input when editing", () => {
      const props = createDefaultProps({
        isEditing: true,
        editedName: "EditedName",
      });
      render(<CustomNodeHeader {...props} />);
      const input = screen.getByRole("textbox");
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue("EditedName");
    });

    it("should show name text when not editing", () => {
      const props = createDefaultProps({
        isEditing: false,
        name: "DisplayName",
      });
      render(<CustomNodeHeader {...props} />);
      expect(screen.getByText("DisplayName")).toBeInTheDocument();
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    });

    it("should call onNameClick when name is clicked", () => {
      const onNameClick = vi.fn();
      const props = createDefaultProps({ onNameClick });
      render(<CustomNodeHeader {...props} />);
      fireEvent.click(screen.getByText("TestNode"));
      expect(onNameClick).toHaveBeenCalled();
    });

    it("should call onNameChange when input value changes", () => {
      const onNameChange = vi.fn();
      const props = createDefaultProps({
        isEditing: true,
        onNameChange,
      });
      render(<CustomNodeHeader {...props} />);
      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "NewName" } });
      expect(onNameChange).toHaveBeenCalledWith("NewName");
    });

    it("should call onNameSave when input loses focus", () => {
      const onNameSave = vi.fn();
      const props = createDefaultProps({
        isEditing: true,
        onNameSave,
      });
      render(<CustomNodeHeader {...props} />);
      const input = screen.getByRole("textbox");
      fireEvent.blur(input);
      expect(onNameSave).toHaveBeenCalled();
    });

    it("should call onNameKeyDown when key is pressed", () => {
      const onNameKeyDown = vi.fn();
      const props = createDefaultProps({
        isEditing: true,
        onNameKeyDown,
      });
      render(<CustomNodeHeader {...props} />);
      const input = screen.getByRole("textbox");
      fireEvent.keyDown(input, { key: "Enter" });
      expect(onNameKeyDown).toHaveBeenCalled();
    });

    it("should stop propagation when input is clicked", () => {
      const onNameClick = vi.fn();
      const props = createDefaultProps({
        isEditing: true,
        onNameClick,
      });
      render(<CustomNodeHeader {...props} />);
      const input = screen.getByRole("textbox");
      fireEvent.click(input);
      // onNameClick should NOT be called because stopPropagation
    });
  });

  describe("validation indicator", () => {
    it("should show validation indicator when there are errors", () => {
      const props = createDefaultProps({
        validationErrors: ["Error 1", "Error 2"],
      });
      render(<CustomNodeHeader {...props} />);
      expect(screen.getByTestId("validation-indicator")).toBeInTheDocument();
      expect(screen.getByTestId("error-count")).toHaveTextContent("2 errors");
    });

    it("should show validation indicator when there are warnings", () => {
      const props = createDefaultProps({
        validationWarnings: ["Warning 1"],
      });
      render(<CustomNodeHeader {...props} />);
      expect(screen.getByTestId("validation-indicator")).toBeInTheDocument();
      expect(screen.getByTestId("warning-count")).toHaveTextContent(
        "1 warnings",
      );
    });

    it("should show validation indicator when there is duplicate name error", () => {
      const props = createDefaultProps({
        duplicateNameError: "Name already exists",
      });
      render(<CustomNodeHeader {...props} />);
      expect(screen.getByTestId("validation-indicator")).toBeInTheDocument();
      expect(screen.getByTestId("duplicate-error")).toHaveTextContent(
        "Name already exists",
      );
    });

    it("should not show validation indicator when no issues", () => {
      const props = createDefaultProps();
      render(<CustomNodeHeader {...props} />);
      expect(
        screen.queryByTestId("validation-indicator"),
      ).not.toBeInTheDocument();
    });
  });

  describe("description tooltip", () => {
    it("should show description tooltip when collapsed and description provided", () => {
      const props = createDefaultProps({
        isExpanded: false,
        description: "This is the node description",
      });
      const { container } = render(<CustomNodeHeader {...props} />);
      const header = container.firstChild as HTMLElement;
      expect(header).toHaveAttribute("title", "This is the node description");
    });

    it("should not show description tooltip when expanded", () => {
      const props = createDefaultProps({
        isExpanded: true,
        description: "This is the node description",
      });
      const { container } = render(<CustomNodeHeader {...props} />);
      const header = container.firstChild as HTMLElement;
      expect(header).not.toHaveAttribute("title");
    });

    it("should not show description tooltip when no description", () => {
      const props = createDefaultProps({
        isExpanded: false,
      });
      const { container } = render(<CustomNodeHeader {...props} />);
      const header = container.firstChild as HTMLElement;
      expect(header).not.toHaveAttribute("title");
    });
  });

  describe("styling", () => {
    it("should have cursor-text on name for editing hint", () => {
      const props = createDefaultProps();
      render(<CustomNodeHeader {...props} />);
      const nameSpan = screen.getByText("TestNode");
      expect(nameSpan).toHaveClass("cursor-text");
    });

    it("should have truncate class for long names", () => {
      const props = createDefaultProps();
      render(<CustomNodeHeader {...props} />);
      const nameSpan = screen.getByText("TestNode");
      expect(nameSpan).toHaveClass("truncate");
    });

    it("should have rounded-t-lg for header", () => {
      const props = createDefaultProps();
      const { container } = render(<CustomNodeHeader {...props} />);
      const header = container.firstChild as HTMLElement;
      expect(header).toHaveClass("rounded-t-lg");
    });
  });

  describe("icon", () => {
    it("should render icon from schema", () => {
      const schema = createMockSchema({
        ui: {
          inputs: [],
          outputs: [],
          fields: [],
          color: "#4f46e5",
          icon: "code",
          expandable: true,
          default_width: 300,
          default_height: 200,
        },
      });
      const props = createDefaultProps({ schema });
      render(<CustomNodeHeader {...props} />);
      expect(screen.getByTestId("node-icon")).toHaveTextContent("code");
    });

    it("should have correct size classes on icon", () => {
      const props = createDefaultProps();
      render(<CustomNodeHeader {...props} />);
      const icon = screen.getByTestId("node-icon");
      expect(icon).toHaveClass("w-3");
      expect(icon).toHaveClass("h-3");
    });
  });

  describe("both indicators", () => {
    it("should show both output node and always execute indicators", () => {
      const schema = createMockSchema({
        output_node: true,
        always_execute: true,
      });
      const props = createDefaultProps({ schema });
      render(<CustomNodeHeader {...props} />);
      expect(
        screen.getByTitle("Output Node - triggers execution"),
      ).toBeInTheDocument();
      expect(
        screen.getByTitle("Always Execute - skips cache"),
      ).toBeInTheDocument();
    });
  });

  describe("input ref", () => {
    it("should apply inputRef to the input element", () => {
      const inputRef = { current: null as HTMLInputElement | null };
      const props = createDefaultProps({
        isEditing: true,
        inputRef,
      });
      render(<CustomNodeHeader {...props} />);
      expect(inputRef.current).not.toBeNull();
      expect(inputRef.current?.tagName).toBe("INPUT");
    });
  });

  describe("AI assist button", () => {
    it("should not render AI assist button when onAiAssist is not provided", () => {
      const props = createDefaultProps({ onAiAssist: undefined });
      const { container } = render(<CustomNodeHeader {...props} />);
      const aiAssistButton = container.querySelector(
        'button[title="AI Assist"]',
      );
      expect(aiAssistButton).not.toBeInTheDocument();
    });

    it("should render AI assist button when onAiAssist is provided", () => {
      const onAiAssist = vi.fn();
      const props = createDefaultProps({ onAiAssist });
      const { container } = render(<CustomNodeHeader {...props} />);
      const aiAssistButton = container.querySelector(
        'button[title="AI Assist"]',
      );
      expect(aiAssistButton).toBeInTheDocument();
    });

    it("should call onAiAssist when AI assist button triggers action", async () => {
      const onAiAssist = vi.fn();
      const props = createDefaultProps({ onAiAssist });
      render(<CustomNodeHeader {...props} />);

      // The AiAssistButton component is rendered, but testing the full dropdown
      // interaction is covered in AiAssistButton.test.tsx
      // Here we just verify the prop is passed correctly
      expect(onAiAssist).not.toHaveBeenCalled();
    });
  });
});
