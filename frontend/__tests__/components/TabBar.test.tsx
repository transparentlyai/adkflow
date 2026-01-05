import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import React from "react";
import type { TabState } from "@/lib/types";

// Store mock functions to be accessible in tests
const mockDndContextOnDragEnd = vi.fn();

// Mock @dnd-kit/core
vi.mock("@dnd-kit/core", () => ({
  DndContext: ({
    children,
    onDragEnd,
  }: {
    children: React.ReactNode;
    onDragEnd: (event: {
      active: { id: string };
      over: { id: string } | null;
    }) => void;
  }) => {
    // Store the onDragEnd handler for testing
    mockDndContextOnDragEnd.mockImplementation(onDragEnd);
    return <div data-testid="dnd-context">{children}</div>;
  },
  closestCenter: vi.fn(),
  KeyboardSensor: vi.fn(),
  PointerSensor: vi.fn(),
  useSensor: vi.fn(),
  useSensors: vi.fn(() => []),
}));

// Mock @dnd-kit/sortable
vi.mock("@dnd-kit/sortable", () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sortable-context">{children}</div>
  ),
  sortableKeyboardCoordinates: vi.fn(),
  horizontalListSortingStrategy: {},
  useSortable: vi.fn(() => ({
    attributes: {},
    listeners: {},
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

// Mock lucide-react
vi.mock("lucide-react", () => ({
  Plus: () => <svg data-testid="plus-icon" />,
}));

// Mock context menu components
vi.mock("@/components/ui/context-menu", () => ({
  ContextMenu: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="context-menu">{children}</div>
  ),
  ContextMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="context-menu-content">{children}</div>
  ),
  ContextMenuItem: ({
    children,
    onClick,
    disabled,
    className,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
  }) => (
    <button
      data-testid="context-menu-item"
      onClick={onClick}
      disabled={disabled}
      className={className}
    >
      {children}
    </button>
  ),
  ContextMenuSeparator: () => <hr data-testid="context-menu-separator" />,
  ContextMenuTrigger: ({
    children,
    asChild,
  }: {
    children: React.ReactNode;
    asChild?: boolean;
  }) => <div data-testid="context-menu-trigger">{children}</div>,
}));

// Import after mocking
import TabBar from "@/components/TabBar";

describe("TabBar", () => {
  const createTab = (overrides: Partial<TabState> = {}): TabState => ({
    id: "tab-1",
    name: "Tab 1",
    order: 0,
    viewport: { x: 0, y: 0, zoom: 1 },
    hasUnsavedChanges: false,
    isLoading: false,
    ...overrides,
  });

  const defaultProps = {
    tabs: [createTab()],
    activeTabId: "tab-1",
    onTabClick: vi.fn(),
    onTabDelete: vi.fn(),
    onTabRename: vi.fn(),
    onTabReorder: vi.fn(),
    onAddTab: vi.fn(),
    onDuplicateTab: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockDndContextOnDragEnd.mockReset();
  });

  describe("rendering", () => {
    it("should render tab bar container", () => {
      render(<TabBar {...defaultProps} />);
      expect(screen.getByTestId("dnd-context")).toBeInTheDocument();
    });

    it("should render single tab", () => {
      render(<TabBar {...defaultProps} />);
      expect(screen.getByText("Tab 1")).toBeInTheDocument();
    });

    it("should render multiple tabs", () => {
      const tabs = [
        createTab({ id: "tab-1", name: "Tab 1", order: 0 }),
        createTab({ id: "tab-2", name: "Tab 2", order: 1 }),
        createTab({ id: "tab-3", name: "Tab 3", order: 2 }),
      ];
      render(<TabBar {...defaultProps} tabs={tabs} />);

      expect(screen.getByText("Tab 1")).toBeInTheDocument();
      expect(screen.getByText("Tab 2")).toBeInTheDocument();
      expect(screen.getByText("Tab 3")).toBeInTheDocument();
    });

    it("should render tabs in order", () => {
      const tabs = [
        createTab({ id: "tab-3", name: "Tab 3", order: 2 }),
        createTab({ id: "tab-1", name: "Tab 1", order: 0 }),
        createTab({ id: "tab-2", name: "Tab 2", order: 1 }),
      ];
      render(<TabBar {...defaultProps} tabs={tabs} />);

      const tabElements = screen.getAllByText(/Tab \d/);
      expect(tabElements[0]).toHaveTextContent("Tab 1");
      expect(tabElements[1]).toHaveTextContent("Tab 2");
      expect(tabElements[2]).toHaveTextContent("Tab 3");
    });

    it("should render empty tab bar", () => {
      render(<TabBar {...defaultProps} tabs={[]} />);
      expect(screen.getByTestId("sortable-context")).toBeInTheDocument();
      expect(screen.queryByText("Tab 1")).not.toBeInTheDocument();
    });

    it("should render add tab button", () => {
      render(<TabBar {...defaultProps} />);
      expect(screen.getByTitle("Add new tab")).toBeInTheDocument();
      expect(screen.getByTestId("plus-icon")).toBeInTheDocument();
    });

    it("should mark active tab", () => {
      const tabs = [
        createTab({ id: "tab-1", name: "Tab 1", order: 0 }),
        createTab({ id: "tab-2", name: "Tab 2", order: 1 }),
      ];
      render(<TabBar {...defaultProps} tabs={tabs} activeTabId="tab-2" />);

      // The active tab should have the active styling
      const tab2 = screen.getByText("Tab 2").parentElement;
      expect(tab2).toHaveClass("border-primary");
    });

    it("should handle null activeTabId", () => {
      render(<TabBar {...defaultProps} activeTabId={null} />);
      // All tabs should be inactive
      const tab = screen.getByText("Tab 1").parentElement;
      expect(tab).toHaveClass("border-transparent");
    });
  });

  describe("tab click handling", () => {
    it("should call onTabClick when tab is clicked", () => {
      const onTabClick = vi.fn();
      render(<TabBar {...defaultProps} onTabClick={onTabClick} />);

      fireEvent.click(screen.getByText("Tab 1").parentElement!);

      expect(onTabClick).toHaveBeenCalledWith("tab-1");
    });

    it("should call onTabClick with correct tab id for multiple tabs", () => {
      const onTabClick = vi.fn();
      const tabs = [
        createTab({ id: "tab-1", name: "Tab 1", order: 0 }),
        createTab({ id: "tab-2", name: "Tab 2", order: 1 }),
      ];
      render(<TabBar {...defaultProps} tabs={tabs} onTabClick={onTabClick} />);

      fireEvent.click(screen.getByText("Tab 2").parentElement!);

      expect(onTabClick).toHaveBeenCalledWith("tab-2");
    });
  });

  describe("add tab button", () => {
    it("should call onAddTab when add button is clicked", () => {
      const onAddTab = vi.fn();
      render(<TabBar {...defaultProps} onAddTab={onAddTab} />);

      fireEvent.click(screen.getByTitle("Add new tab"));

      expect(onAddTab).toHaveBeenCalledTimes(1);
    });
  });

  describe("context menu", () => {
    it("should render context menu for each tab", () => {
      const tabs = [
        createTab({ id: "tab-1", name: "Tab 1", order: 0 }),
        createTab({ id: "tab-2", name: "Tab 2", order: 1 }),
      ];
      render(<TabBar {...defaultProps} tabs={tabs} />);

      const contextMenus = screen.getAllByTestId("context-menu");
      expect(contextMenus).toHaveLength(2);
    });

    it("should render rename menu item", () => {
      render(<TabBar {...defaultProps} />);
      const menuItems = screen.getAllByTestId("context-menu-item");
      expect(
        menuItems.find((item) => item.textContent === "Rename"),
      ).toBeInTheDocument();
    });

    it("should render duplicate menu item", () => {
      render(<TabBar {...defaultProps} />);
      const menuItems = screen.getAllByTestId("context-menu-item");
      expect(
        menuItems.find((item) => item.textContent === "Duplicate"),
      ).toBeInTheDocument();
    });

    it("should render delete menu item", () => {
      render(<TabBar {...defaultProps} />);
      const menuItems = screen.getAllByTestId("context-menu-item");
      expect(
        menuItems.find((item) => item.textContent === "Delete"),
      ).toBeInTheDocument();
    });

    it("should call onTabRename when rename is clicked", () => {
      const onTabRename = vi.fn();
      render(<TabBar {...defaultProps} onTabRename={onTabRename} />);

      const renameButton = screen
        .getAllByTestId("context-menu-item")
        .find((item) => item.textContent === "Rename");
      fireEvent.click(renameButton!);

      expect(onTabRename).toHaveBeenCalledWith("tab-1", "Tab 1");
    });

    it("should call onDuplicateTab when duplicate is clicked", () => {
      const onDuplicateTab = vi.fn();
      render(<TabBar {...defaultProps} onDuplicateTab={onDuplicateTab} />);

      const duplicateButton = screen
        .getAllByTestId("context-menu-item")
        .find((item) => item.textContent === "Duplicate");
      fireEvent.click(duplicateButton!);

      expect(onDuplicateTab).toHaveBeenCalledWith("tab-1");
    });

    it("should call onTabDelete when delete is clicked", () => {
      const onTabDelete = vi.fn();
      const tabs = [
        createTab({ id: "tab-1", name: "Tab 1", order: 0 }),
        createTab({ id: "tab-2", name: "Tab 2", order: 1 }),
      ];
      render(
        <TabBar {...defaultProps} tabs={tabs} onTabDelete={onTabDelete} />,
      );

      // Find delete buttons (there should be two now)
      const deleteButtons = screen
        .getAllByTestId("context-menu-item")
        .filter((item) => item.textContent === "Delete");
      fireEvent.click(deleteButtons[0]);

      expect(onTabDelete).toHaveBeenCalledWith("tab-1");
    });

    it("should disable delete when only one tab exists", () => {
      render(<TabBar {...defaultProps} tabs={[createTab()]} />);

      const deleteButton = screen
        .getAllByTestId("context-menu-item")
        .find((item) => item.textContent === "Delete");

      expect(deleteButton).toBeDisabled();
    });

    it("should enable delete when multiple tabs exist", () => {
      const tabs = [
        createTab({ id: "tab-1", name: "Tab 1", order: 0 }),
        createTab({ id: "tab-2", name: "Tab 2", order: 1 }),
      ];
      render(<TabBar {...defaultProps} tabs={tabs} />);

      const deleteButtons = screen
        .getAllByTestId("context-menu-item")
        .filter((item) => item.textContent === "Delete");

      deleteButtons.forEach((button) => {
        expect(button).not.toBeDisabled();
      });
    });

    it("should apply destructive class to delete button", () => {
      render(<TabBar {...defaultProps} />);

      const deleteButton = screen
        .getAllByTestId("context-menu-item")
        .find((item) => item.textContent === "Delete");

      expect(deleteButton).toHaveClass("text-destructive");
    });
  });

  describe("drag and drop", () => {
    it("should render DndContext", () => {
      render(<TabBar {...defaultProps} />);
      expect(screen.getByTestId("dnd-context")).toBeInTheDocument();
    });

    it("should render SortableContext", () => {
      render(<TabBar {...defaultProps} />);
      expect(screen.getByTestId("sortable-context")).toBeInTheDocument();
    });

    it("should call onTabReorder when tabs are reordered", () => {
      const onTabReorder = vi.fn();
      const tabs = [
        createTab({ id: "tab-1", name: "Tab 1", order: 0 }),
        createTab({ id: "tab-2", name: "Tab 2", order: 1 }),
        createTab({ id: "tab-3", name: "Tab 3", order: 2 }),
      ];
      render(
        <TabBar {...defaultProps} tabs={tabs} onTabReorder={onTabReorder} />,
      );

      // Simulate drag end event
      const dragEndEvent = {
        active: { id: "tab-1" },
        over: { id: "tab-3" },
      };

      // Call the stored onDragEnd handler
      mockDndContextOnDragEnd(dragEndEvent);

      expect(onTabReorder).toHaveBeenCalledWith(["tab-2", "tab-3", "tab-1"]);
    });

    it("should not call onTabReorder when dropped on same position", () => {
      const onTabReorder = vi.fn();
      const tabs = [
        createTab({ id: "tab-1", name: "Tab 1", order: 0 }),
        createTab({ id: "tab-2", name: "Tab 2", order: 1 }),
      ];
      render(
        <TabBar {...defaultProps} tabs={tabs} onTabReorder={onTabReorder} />,
      );

      // Simulate drag end on same position
      const dragEndEvent = {
        active: { id: "tab-1" },
        over: { id: "tab-1" },
      };

      mockDndContextOnDragEnd(dragEndEvent);

      expect(onTabReorder).not.toHaveBeenCalled();
    });

    it("should not call onTabReorder when dropped outside", () => {
      const onTabReorder = vi.fn();
      const tabs = [
        createTab({ id: "tab-1", name: "Tab 1", order: 0 }),
        createTab({ id: "tab-2", name: "Tab 2", order: 1 }),
      ];
      render(
        <TabBar {...defaultProps} tabs={tabs} onTabReorder={onTabReorder} />,
      );

      // Simulate drag end without over target
      const dragEndEvent = {
        active: { id: "tab-1" },
        over: null,
      };

      mockDndContextOnDragEnd(dragEndEvent);

      expect(onTabReorder).not.toHaveBeenCalled();
    });

    it("should reorder from beginning to end", () => {
      const onTabReorder = vi.fn();
      const tabs = [
        createTab({ id: "tab-1", name: "Tab 1", order: 0 }),
        createTab({ id: "tab-2", name: "Tab 2", order: 1 }),
        createTab({ id: "tab-3", name: "Tab 3", order: 2 }),
      ];
      render(
        <TabBar {...defaultProps} tabs={tabs} onTabReorder={onTabReorder} />,
      );

      mockDndContextOnDragEnd({
        active: { id: "tab-1" },
        over: { id: "tab-3" },
      });

      expect(onTabReorder).toHaveBeenCalledWith(["tab-2", "tab-3", "tab-1"]);
    });

    it("should reorder from end to beginning", () => {
      const onTabReorder = vi.fn();
      const tabs = [
        createTab({ id: "tab-1", name: "Tab 1", order: 0 }),
        createTab({ id: "tab-2", name: "Tab 2", order: 1 }),
        createTab({ id: "tab-3", name: "Tab 3", order: 2 }),
      ];
      render(
        <TabBar {...defaultProps} tabs={tabs} onTabReorder={onTabReorder} />,
      );

      mockDndContextOnDragEnd({
        active: { id: "tab-3" },
        over: { id: "tab-1" },
      });

      expect(onTabReorder).toHaveBeenCalledWith(["tab-3", "tab-1", "tab-2"]);
    });

    it("should reorder adjacent tabs", () => {
      const onTabReorder = vi.fn();
      const tabs = [
        createTab({ id: "tab-1", name: "Tab 1", order: 0 }),
        createTab({ id: "tab-2", name: "Tab 2", order: 1 }),
        createTab({ id: "tab-3", name: "Tab 3", order: 2 }),
      ];
      render(
        <TabBar {...defaultProps} tabs={tabs} onTabReorder={onTabReorder} />,
      );

      mockDndContextOnDragEnd({
        active: { id: "tab-1" },
        over: { id: "tab-2" },
      });

      expect(onTabReorder).toHaveBeenCalledWith(["tab-2", "tab-1", "tab-3"]);
    });
  });

  describe("tab rename callback", () => {
    it("should call onTabRename when Tab component triggers rename", () => {
      const onTabRename = vi.fn();
      render(<TabBar {...defaultProps} onTabRename={onTabRename} />);

      // The Tab component has its own rename mechanism via double-click
      // Here we test the callback is wired correctly by simulating Tab's onRename
      // Since Tab is rendered within TabBar, we verify the integration

      // Double-click to edit
      const tabElement = screen.getByText("Tab 1").parentElement!;
      fireEvent.doubleClick(tabElement);

      // Change value and blur
      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "Renamed Tab" } });
      fireEvent.blur(input);

      expect(onTabRename).toHaveBeenCalledWith("tab-1", "Renamed Tab");
    });
  });

  describe("styling", () => {
    it("should have border-b class on container", () => {
      const { container } = render(<TabBar {...defaultProps} />);
      const tabBar = container.firstChild;
      expect(tabBar).toHaveClass("border-b");
    });

    it("should have flex layout", () => {
      const { container } = render(<TabBar {...defaultProps} />);
      const tabBar = container.firstChild;
      expect(tabBar).toHaveClass("flex");
      expect(tabBar).toHaveClass("items-center");
    });

    it("should have overflow handling for tabs", () => {
      render(<TabBar {...defaultProps} />);
      const sortableContext = screen.getByTestId("sortable-context");
      const tabsContainer = sortableContext.firstChild;
      expect(tabsContainer).toHaveClass("overflow-x-auto");
      expect(tabsContainer).toHaveClass("overflow-y-hidden");
    });
  });

  describe("edge cases", () => {
    it("should handle tabs with same name", () => {
      const tabs = [
        createTab({ id: "tab-1", name: "Same Name", order: 0 }),
        createTab({ id: "tab-2", name: "Same Name", order: 1 }),
      ];
      render(<TabBar {...defaultProps} tabs={tabs} />);

      const sameName = screen.getAllByText("Same Name");
      expect(sameName).toHaveLength(2);
    });

    it("should handle tabs with special characters in name", () => {
      const tab = createTab({ name: "Tab <>&\"'" });
      render(<TabBar {...defaultProps} tabs={[tab]} />);
      expect(screen.getByText("Tab <>&\"'")).toBeInTheDocument();
    });

    it("should handle tabs with empty name", () => {
      const tab = createTab({ name: "" });
      render(<TabBar {...defaultProps} tabs={[tab]} />);
      // Tab should still render, just with empty name
      const contextMenu = screen.getByTestId("context-menu");
      expect(contextMenu).toBeInTheDocument();
    });

    it("should handle very long tab names", () => {
      const longName = "A".repeat(100);
      const tab = createTab({ name: longName });
      render(<TabBar {...defaultProps} tabs={[tab]} />);
      expect(screen.getByText(longName)).toBeInTheDocument();
    });

    it("should handle many tabs", () => {
      const tabs = Array.from({ length: 20 }, (_, i) =>
        createTab({ id: `tab-${i}`, name: `Tab ${i}`, order: i }),
      );
      render(<TabBar {...defaultProps} tabs={tabs} />);

      const tabElements = screen.getAllByText(/Tab \d+/);
      expect(tabElements).toHaveLength(20);
    });
  });
});
