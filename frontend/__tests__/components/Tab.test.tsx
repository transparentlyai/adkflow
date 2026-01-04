import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import type { TabState } from "@/lib/types";

// Mock @dnd-kit/sortable
vi.mock("@dnd-kit/sortable", () => ({
  useSortable: vi.fn(() => ({
    attributes: { "data-sortable": "true" },
    listeners: { onMouseDown: vi.fn() },
    setNodeRef: vi.fn(),
    transform: null,
    transition: undefined,
    isDragging: false,
  })),
}));

// Mock @dnd-kit/utilities
vi.mock("@dnd-kit/utilities", () => ({
  CSS: {
    Transform: {
      toString: vi.fn((transform) => (transform ? "transform" : undefined)),
    },
  },
}));

// Import after mocking
import Tab from "@/components/Tab";
import { useSortable } from "@dnd-kit/sortable";

describe("Tab", () => {
  const createTab = (overrides: Partial<TabState> = {}): TabState => ({
    id: "tab-1",
    name: "Test Tab",
    order: 0,
    viewport: { x: 0, y: 0, zoom: 1 },
    hasUnsavedChanges: false,
    isLoading: false,
    ...overrides,
  });

  const defaultProps = {
    tab: createTab(),
    isActive: false,
    onClick: vi.fn(),
    onRename: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSortable).mockReturnValue({
      attributes: { "data-sortable": "true" } as unknown as ReturnType<
        typeof useSortable
      >["attributes"],
      listeners: { onMouseDown: vi.fn() } as unknown as ReturnType<
        typeof useSortable
      >["listeners"],
      setNodeRef: vi.fn(),
      transform: null,
      transition: undefined,
      isDragging: false,
      setActivatorNodeRef: vi.fn(),
      over: null,
      active: null,
      activeIndex: -1,
      overIndex: -1,
      index: 0,
      isSorting: false,
      isOver: false,
      rect: { current: null },
      newIndex: 0,
      items: [],
      data: { current: { sortable: { index: 0, containerId: "test" } } },
    });
  });

  describe("rendering", () => {
    it("should render tab name", () => {
      render(<Tab {...defaultProps} />);
      expect(screen.getByText("Test Tab")).toBeInTheDocument();
    });

    it("should render inactive tab styling", () => {
      render(<Tab {...defaultProps} isActive={false} />);
      const tab = screen.getByText("Test Tab").parentElement;
      expect(tab).toHaveClass("border-transparent");
      expect(tab).toHaveClass("text-muted-foreground");
    });

    it("should render active tab styling", () => {
      render(<Tab {...defaultProps} isActive={true} />);
      const tab = screen.getByText("Test Tab").parentElement;
      expect(tab).toHaveClass("border-primary");
      expect(tab).toHaveClass("text-foreground");
    });

    it("should render unsaved indicator when hasUnsavedChanges is true", () => {
      const tab = createTab({ hasUnsavedChanges: true });
      render(<Tab {...defaultProps} tab={tab} />);
      const indicator = screen
        .getByText("Test Tab")
        .parentElement?.querySelector(".bg-orange-500");
      expect(indicator).toBeInTheDocument();
    });

    it("should not render unsaved indicator when hasUnsavedChanges is false", () => {
      const tab = createTab({ hasUnsavedChanges: false });
      render(<Tab {...defaultProps} tab={tab} />);
      const indicator = screen
        .getByText("Test Tab")
        .parentElement?.querySelector(".bg-orange-500");
      expect(indicator).not.toBeInTheDocument();
    });

    it("should render loading indicator when isLoading is true", () => {
      const tab = createTab({ isLoading: true });
      render(<Tab {...defaultProps} tab={tab} />);
      const spinner = screen
        .getByText("Test Tab")
        .parentElement?.querySelector(".animate-spin");
      expect(spinner).toBeInTheDocument();
    });

    it("should not render loading indicator when isLoading is false", () => {
      const tab = createTab({ isLoading: false });
      render(<Tab {...defaultProps} tab={tab} />);
      const spinner = screen
        .getByText("Test Tab")
        .parentElement?.querySelector(".animate-spin");
      expect(spinner).not.toBeInTheDocument();
    });

    it("should truncate long tab names", () => {
      const tab = createTab({
        name: "Very Long Tab Name That Should Be Truncated",
      });
      render(<Tab {...defaultProps} tab={tab} />);
      const nameElement = screen.getByText(
        "Very Long Tab Name That Should Be Truncated",
      );
      expect(nameElement).toHaveClass("truncate");
      expect(nameElement).toHaveClass("max-w-[120px]");
    });
  });

  describe("click handling", () => {
    it("should call onClick when tab is clicked", () => {
      const onClick = vi.fn();
      render(<Tab {...defaultProps} onClick={onClick} />);

      fireEvent.click(screen.getByText("Test Tab").parentElement!);

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("should not call onClick when in editing mode", () => {
      const onClick = vi.fn();
      render(<Tab {...defaultProps} onClick={onClick} />);

      // Double click to enter edit mode
      fireEvent.doubleClick(screen.getByText("Test Tab").parentElement!);

      // Clear mock from initial render
      onClick.mockClear();

      // Find the input that should now be rendered
      const input = screen.getByRole("textbox");
      fireEvent.click(input.parentElement!);

      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe("double-click to edit", () => {
    it("should enter edit mode on double click", () => {
      render(<Tab {...defaultProps} />);

      fireEvent.doubleClick(screen.getByText("Test Tab").parentElement!);

      expect(screen.getByRole("textbox")).toBeInTheDocument();
      expect(screen.queryByText("Test Tab")).not.toBeInTheDocument();
    });

    it("should focus input when entering edit mode", async () => {
      render(<Tab {...defaultProps} />);

      fireEvent.doubleClick(screen.getByText("Test Tab").parentElement!);

      const input = screen.getByRole("textbox");
      await waitFor(() => {
        expect(input).toHaveFocus();
      });
    });

    it("should populate input with current tab name", () => {
      const tab = createTab({ name: "Current Name" });
      render(<Tab {...defaultProps} tab={tab} />);

      fireEvent.doubleClick(screen.getByText("Current Name").parentElement!);

      expect(screen.getByRole("textbox")).toHaveValue("Current Name");
    });
  });

  describe("renaming", () => {
    it("should call onRename with new name on blur", () => {
      const onRename = vi.fn();
      render(<Tab {...defaultProps} onRename={onRename} />);

      // Enter edit mode
      fireEvent.doubleClick(screen.getByText("Test Tab").parentElement!);

      // Change the value
      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "New Name" } });

      // Blur to save
      fireEvent.blur(input);

      expect(onRename).toHaveBeenCalledWith("New Name");
    });

    it("should call onRename with trimmed name", () => {
      const onRename = vi.fn();
      render(<Tab {...defaultProps} onRename={onRename} />);

      fireEvent.doubleClick(screen.getByText("Test Tab").parentElement!);

      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "  Trimmed Name  " } });
      fireEvent.blur(input);

      expect(onRename).toHaveBeenCalledWith("Trimmed Name");
    });

    it("should not call onRename if name is empty", () => {
      const onRename = vi.fn();
      render(<Tab {...defaultProps} onRename={onRename} />);

      fireEvent.doubleClick(screen.getByText("Test Tab").parentElement!);

      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "   " } });
      fireEvent.blur(input);

      expect(onRename).not.toHaveBeenCalled();
    });

    it("should not call onRename if name is unchanged", () => {
      const onRename = vi.fn();
      render(<Tab {...defaultProps} onRename={onRename} />);

      fireEvent.doubleClick(screen.getByText("Test Tab").parentElement!);

      const input = screen.getByRole("textbox");
      // Don't change the value
      fireEvent.blur(input);

      expect(onRename).not.toHaveBeenCalled();
    });

    it("should save on Enter key", () => {
      const onRename = vi.fn();
      render(<Tab {...defaultProps} onRename={onRename} />);

      fireEvent.doubleClick(screen.getByText("Test Tab").parentElement!);

      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "New Name" } });
      fireEvent.keyDown(input, { key: "Enter" });

      expect(onRename).toHaveBeenCalledWith("New Name");
    });

    it("should cancel editing on Escape key", () => {
      const onRename = vi.fn();
      render(<Tab {...defaultProps} onRename={onRename} />);

      fireEvent.doubleClick(screen.getByText("Test Tab").parentElement!);

      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "New Name" } });
      fireEvent.keyDown(input, { key: "Escape" });

      // Should exit edit mode without saving
      expect(onRename).not.toHaveBeenCalled();
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
      expect(screen.getByText("Test Tab")).toBeInTheDocument();
    });

    it("should stop propagation on input key events", () => {
      render(<Tab {...defaultProps} />);

      fireEvent.doubleClick(screen.getByText("Test Tab").parentElement!);

      const input = screen.getByRole("textbox");
      const keyDownEvent = new KeyboardEvent("keydown", {
        key: "a",
        bubbles: true,
      });
      const stopPropagationSpy = vi.spyOn(keyDownEvent, "stopPropagation");

      input.dispatchEvent(keyDownEvent);

      expect(stopPropagationSpy).toHaveBeenCalled();
    });

    it("should stop propagation on input click", () => {
      render(<Tab {...defaultProps} />);

      fireEvent.doubleClick(screen.getByText("Test Tab").parentElement!);

      const input = screen.getByRole("textbox");
      const clickEvent = new MouseEvent("click", { bubbles: true });
      const stopPropagationSpy = vi.spyOn(clickEvent, "stopPropagation");

      input.dispatchEvent(clickEvent);

      expect(stopPropagationSpy).toHaveBeenCalled();
    });
  });

  describe("dragging", () => {
    it("should apply opacity when dragging", () => {
      vi.mocked(useSortable).mockReturnValue({
        attributes: {} as unknown as ReturnType<
          typeof useSortable
        >["attributes"],
        listeners: {} as unknown as ReturnType<typeof useSortable>["listeners"],
        setNodeRef: vi.fn(),
        transform: null,
        transition: undefined,
        isDragging: true,
        setActivatorNodeRef: vi.fn(),
        over: null,
        active: null,
        activeIndex: -1,
        overIndex: -1,
        index: 0,
        isSorting: false,
        isOver: false,
        rect: { current: null },
        newIndex: 0,
        items: [],
        data: { current: { sortable: { index: 0, containerId: "test" } } },
      });

      render(<Tab {...defaultProps} />);

      const tab = screen.getByText("Test Tab").parentElement;
      expect(tab).toHaveClass("opacity-50");
    });

    it("should disable sorting when editing", () => {
      render(<Tab {...defaultProps} />);

      // Enter edit mode
      fireEvent.doubleClick(screen.getByText("Test Tab").parentElement!);

      // Check that useSortable was called with disabled: true
      expect(useSortable).toHaveBeenCalledWith(
        expect.objectContaining({ disabled: true }),
      );
    });

    it("should not attach drag listeners when editing", () => {
      render(<Tab {...defaultProps} />);

      // Enter edit mode
      fireEvent.doubleClick(screen.getByText("Test Tab").parentElement!);

      // The tab container should not have the sortable attributes
      const tabContainer = screen.getByRole("textbox").parentElement;
      expect(tabContainer).not.toHaveAttribute("data-sortable");
    });
  });

  describe("accessibility", () => {
    it("should have cursor pointer style", () => {
      render(<Tab {...defaultProps} />);
      const tab = screen.getByText("Test Tab").parentElement;
      expect(tab).toHaveClass("cursor-pointer");
    });

    it("should have appropriate text size", () => {
      render(<Tab {...defaultProps} />);
      const tab = screen.getByText("Test Tab").parentElement;
      expect(tab).toHaveClass("text-sm");
    });
  });
});
