import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import React from "react";
import GlobalSearch from "@/components/GlobalSearch";
import type { TabState } from "@/lib/types";

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  Search: () => <svg data-testid="search-icon" />,
  X: () => <svg data-testid="x-icon" />,
}));

// Mock the search utils
const mockBuildEntriesFromNodes = vi.fn();
const mockSearchIndex = vi.fn();

vi.mock("@/lib/searchUtils", () => ({
  buildEntriesFromNodes: (...args: unknown[]) =>
    mockBuildEntriesFromNodes(...args),
  searchIndex: (...args: unknown[]) => mockSearchIndex(...args),
}));

describe("GlobalSearch", () => {
  const mockTabs: TabState[] = [
    {
      id: "tab-1",
      name: "Tab 1",
      order: 0,
      viewport: { x: 0, y: 0, zoom: 1 },
      hasUnsavedChanges: false,
      isLoading: false,
    },
    {
      id: "tab-2",
      name: "Tab 2",
      order: 1,
      viewport: { x: 0, y: 0, zoom: 1 },
      hasUnsavedChanges: false,
      isLoading: false,
    },
  ];

  const mockCanvasRef = {
    current: {
      saveFlow: vi.fn(() => ({
        nodes: [
          {
            id: "node-1",
            type: "agent",
            data: { label: "Agent Node" },
            position: { x: 0, y: 0 },
          },
        ],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      })),
    },
  };

  const defaultProps = {
    projectPath: "/home/user/project",
    tabs: mockTabs,
    activeTabId: "tab-1",
    loadTabFlow: vi.fn().mockResolvedValue({
      nodes: [
        {
          id: "node-2",
          type: "prompt",
          data: { label: "Prompt Node" },
          position: { x: 0, y: 0 },
        },
      ],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    }),
    navigateToNode: vi.fn(),
    canvasRef: mockCanvasRef as React.RefObject<{
      saveFlow: () => {
        nodes: unknown[];
        edges: unknown[];
        viewport: { x: number; y: number; zoom: number };
      };
    }>,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockBuildEntriesFromNodes.mockReturnValue([
      {
        nodeId: "node-1",
        nodeName: "Agent Node",
        nodeType: "agent",
        nodeTypeLabel: "Agent",
        tabId: "tab-1",
        tabName: "Tab 1",
        searchableText: "agent node tab 1",
      },
    ]);
    mockSearchIndex.mockReturnValue([
      {
        nodeId: "node-1",
        nodeName: "Agent Node",
        nodeType: "agent",
        nodeTypeLabel: "Agent",
        tabId: "tab-1",
        tabName: "Tab 1",
      },
    ]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("rendering", () => {
    it("should render search input", () => {
      render(<GlobalSearch {...defaultProps} />);
      expect(
        screen.getByPlaceholderText("Search nodes..."),
      ).toBeInTheDocument();
    });

    it("should render search icon", () => {
      render(<GlobalSearch {...defaultProps} />);
      expect(screen.getByTestId("search-icon")).toBeInTheDocument();
    });

    it("should not show clear button when query is empty", () => {
      render(<GlobalSearch {...defaultProps} />);
      expect(screen.queryByTestId("x-icon")).not.toBeInTheDocument();
    });

    it("should show clear button when query has text", () => {
      render(<GlobalSearch {...defaultProps} />);
      const input = screen.getByPlaceholderText("Search nodes...");

      fireEvent.change(input, { target: { value: "test" } });

      expect(screen.getByTestId("x-icon")).toBeInTheDocument();
    });
  });

  describe("search input behavior", () => {
    it("should update query on input change", () => {
      render(<GlobalSearch {...defaultProps} />);
      const input = screen.getByPlaceholderText("Search nodes...");

      fireEvent.change(input, { target: { value: "agent" } });

      expect(input).toHaveValue("agent");
    });

    it("should clear query when clear button is clicked", () => {
      render(<GlobalSearch {...defaultProps} />);
      const input = screen.getByPlaceholderText("Search nodes...");

      fireEvent.change(input, { target: { value: "test" } });
      expect(input).toHaveValue("test");

      fireEvent.click(screen.getByTestId("x-icon").parentElement!);

      expect(input).toHaveValue("");
    });

    it("should focus input after clearing", async () => {
      render(<GlobalSearch {...defaultProps} />);
      const input = screen.getByPlaceholderText("Search nodes...");

      fireEvent.change(input, { target: { value: "test" } });
      fireEvent.click(screen.getByTestId("x-icon").parentElement!);

      await waitFor(() => {
        expect(document.activeElement).toBe(input);
      });
    });
  });

  describe("dropdown behavior", () => {
    it("should show dropdown on focus when building index", async () => {
      render(<GlobalSearch {...defaultProps} />);
      const input = screen.getByPlaceholderText("Search nodes...");

      fireEvent.focus(input);

      await waitFor(() => {
        expect(
          screen.getByText("Building search index..."),
        ).toBeInTheDocument();
      });
    });

    it("should show no matches message when no results", async () => {
      mockSearchIndex.mockReturnValue([]);

      render(<GlobalSearch {...defaultProps} />);
      const input = screen.getByPlaceholderText("Search nodes...");

      fireEvent.focus(input);
      await waitFor(() => {
        // Wait for index building to complete
      });

      fireEvent.change(input, { target: { value: "nonexistent" } });

      await waitFor(() => {
        expect(screen.getByText("No matches found")).toBeInTheDocument();
      });
    });

    it("should show search results", async () => {
      render(<GlobalSearch {...defaultProps} />);
      const input = screen.getByPlaceholderText("Search nodes...");

      fireEvent.focus(input);
      await act(async () => {
        await new Promise((r) => setTimeout(r, 100));
      });

      fireEvent.change(input, { target: { value: "agent" } });

      await waitFor(() => {
        expect(screen.getByText("Agent Node")).toBeInTheDocument();
        expect(screen.getByText("Tab 1")).toBeInTheDocument();
        expect(screen.getByText("Agent")).toBeInTheDocument();
      });
    });

    it("should close dropdown on blur", async () => {
      render(<GlobalSearch {...defaultProps} />);
      const input = screen.getByPlaceholderText("Search nodes...");

      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: "agent" } });

      await waitFor(() => {
        expect(screen.getByText("Agent Node")).toBeInTheDocument();
      });

      fireEvent.blur(input);

      await waitFor(() => {
        expect(screen.queryByText("Agent Node")).not.toBeInTheDocument();
      });
    });
  });

  describe("keyboard navigation", () => {
    it("should navigate down with arrow key", async () => {
      mockSearchIndex.mockReturnValue([
        {
          nodeId: "node-1",
          nodeName: "Node 1",
          nodeType: "agent",
          nodeTypeLabel: "Agent",
          tabId: "tab-1",
          tabName: "Tab 1",
        },
        {
          nodeId: "node-2",
          nodeName: "Node 2",
          nodeType: "prompt",
          nodeTypeLabel: "Prompt",
          tabId: "tab-1",
          tabName: "Tab 1",
        },
      ]);

      render(<GlobalSearch {...defaultProps} />);
      const input = screen.getByPlaceholderText("Search nodes...");

      fireEvent.focus(input);
      await act(async () => {
        await new Promise((r) => setTimeout(r, 100));
      });
      fireEvent.change(input, { target: { value: "node" } });

      await waitFor(() => {
        expect(screen.getByText("Node 1")).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.keyDown(input, { key: "ArrowDown" });
      });

      // The second item should now be selected (highlighted)
      const items = screen.getAllByRole("listitem");
      expect(items[1]).toHaveClass("bg-accent");
    });

    it("should navigate up with arrow key", async () => {
      mockSearchIndex.mockReturnValue([
        {
          nodeId: "node-1",
          nodeName: "Node 1",
          nodeType: "agent",
          nodeTypeLabel: "Agent",
          tabId: "tab-1",
          tabName: "Tab 1",
        },
        {
          nodeId: "node-2",
          nodeName: "Node 2",
          nodeType: "prompt",
          nodeTypeLabel: "Prompt",
          tabId: "tab-1",
          tabName: "Tab 1",
        },
      ]);

      render(<GlobalSearch {...defaultProps} />);
      const input = screen.getByPlaceholderText("Search nodes...");

      fireEvent.focus(input);
      await act(async () => {
        await new Promise((r) => setTimeout(r, 100));
      });
      fireEvent.change(input, { target: { value: "node" } });

      await waitFor(() => {
        expect(screen.getByText("Node 1")).toBeInTheDocument();
      });

      // Go down first
      await act(async () => {
        fireEvent.keyDown(input, { key: "ArrowDown" });
      });
      // Then go back up
      await act(async () => {
        fireEvent.keyDown(input, { key: "ArrowUp" });
      });

      const items = screen.getAllByRole("listitem");
      expect(items[0]).toHaveClass("bg-accent");
    });

    it("should select item with Enter key", async () => {
      const navigateToNode = vi.fn();
      render(
        <GlobalSearch {...defaultProps} navigateToNode={navigateToNode} />,
      );
      const input = screen.getByPlaceholderText("Search nodes...");

      fireEvent.focus(input);
      await act(async () => {
        await new Promise((r) => setTimeout(r, 100));
      });
      fireEvent.change(input, { target: { value: "agent" } });

      await waitFor(() => {
        expect(screen.getByText("Agent Node")).toBeInTheDocument();
      });

      fireEvent.keyDown(input, { key: "Enter" });

      expect(navigateToNode).toHaveBeenCalledWith("tab-1", "node-1");
    });

    it("should close dropdown with Escape key", async () => {
      render(<GlobalSearch {...defaultProps} />);
      const input = screen.getByPlaceholderText("Search nodes...");

      fireEvent.focus(input);
      await act(async () => {
        await new Promise((r) => setTimeout(r, 100));
      });
      fireEvent.change(input, { target: { value: "agent" } });

      await waitFor(() => {
        expect(screen.getByText("Agent Node")).toBeInTheDocument();
      });

      fireEvent.keyDown(input, { key: "Escape" });

      expect(screen.queryByText("Agent Node")).not.toBeInTheDocument();
    });
  });

  describe("result selection", () => {
    it("should call navigateToNode when result is clicked", async () => {
      const navigateToNode = vi.fn();
      render(
        <GlobalSearch {...defaultProps} navigateToNode={navigateToNode} />,
      );
      const input = screen.getByPlaceholderText("Search nodes...");

      fireEvent.focus(input);
      await act(async () => {
        await new Promise((r) => setTimeout(r, 100));
      });
      fireEvent.change(input, { target: { value: "agent" } });

      await waitFor(() => {
        expect(screen.getByText("Agent Node")).toBeInTheDocument();
      });

      fireEvent.mouseDown(screen.getByText("Agent Node"));

      expect(navigateToNode).toHaveBeenCalledWith("tab-1", "node-1");
    });

    it("should clear query and close dropdown after selection", async () => {
      render(<GlobalSearch {...defaultProps} />);
      const input = screen.getByPlaceholderText("Search nodes...");

      fireEvent.focus(input);
      await act(async () => {
        await new Promise((r) => setTimeout(r, 100));
      });
      fireEvent.change(input, { target: { value: "agent" } });

      await waitFor(() => {
        expect(screen.getByText("Agent Node")).toBeInTheDocument();
      });

      fireEvent.mouseDown(screen.getByText("Agent Node"));

      expect(input).toHaveValue("");
      expect(screen.queryByText("Agent Node")).not.toBeInTheDocument();
    });

    it("should highlight result on hover", async () => {
      mockSearchIndex.mockReturnValue([
        {
          nodeId: "node-1",
          nodeName: "Node 1",
          nodeType: "agent",
          nodeTypeLabel: "Agent",
          tabId: "tab-1",
          tabName: "Tab 1",
        },
        {
          nodeId: "node-2",
          nodeName: "Node 2",
          nodeType: "prompt",
          nodeTypeLabel: "Prompt",
          tabId: "tab-1",
          tabName: "Tab 1",
        },
      ]);

      render(<GlobalSearch {...defaultProps} />);
      const input = screen.getByPlaceholderText("Search nodes...");

      fireEvent.focus(input);
      await act(async () => {
        await new Promise((r) => setTimeout(r, 100));
      });
      fireEvent.change(input, { target: { value: "node" } });

      await waitFor(() => {
        expect(screen.getByText("Node 1")).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.mouseEnter(screen.getByText("Node 2").closest("li")!);
      });

      const items = screen.getAllByRole("listitem");
      expect(items[1]).toHaveClass("bg-accent");
    });
  });

  describe("search index building", () => {
    it("should use canvas ref for active tab", async () => {
      render(<GlobalSearch {...defaultProps} />);
      const input = screen.getByPlaceholderText("Search nodes...");

      fireEvent.focus(input);

      await waitFor(() => {
        expect(mockCanvasRef.current!.saveFlow).toHaveBeenCalled();
      });
    });

    it("should load tab flow for inactive tabs", async () => {
      const loadTabFlow = vi.fn().mockResolvedValue({
        nodes: [
          { id: "node-2", type: "prompt", data: {}, position: { x: 0, y: 0 } },
        ],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      });

      render(<GlobalSearch {...defaultProps} loadTabFlow={loadTabFlow} />);
      const input = screen.getByPlaceholderText("Search nodes...");

      fireEvent.focus(input);

      await waitFor(() => {
        expect(loadTabFlow).toHaveBeenCalledWith("/home/user/project", "tab-2");
      });
    });
  });

  describe("global keyboard shortcut", () => {
    it("should focus input on Ctrl+K", () => {
      render(<GlobalSearch {...defaultProps} />);
      const input = screen.getByPlaceholderText("Search nodes...");

      fireEvent.keyDown(window, { key: "k", ctrlKey: true });

      expect(document.activeElement).toBe(input);
    });

    it("should focus input on Cmd+K (Mac)", () => {
      render(<GlobalSearch {...defaultProps} />);
      const input = screen.getByPlaceholderText("Search nodes...");

      fireEvent.keyDown(window, { key: "k", metaKey: true });

      expect(document.activeElement).toBe(input);
    });
  });

  describe("styling", () => {
    it("should have correct input width", () => {
      render(<GlobalSearch {...defaultProps} />);
      const input = screen.getByPlaceholderText("Search nodes...");

      expect(input).toHaveClass("w-[200px]");
    });

    it("should render search icon in input container", () => {
      render(<GlobalSearch {...defaultProps} />);
      expect(screen.getByTestId("search-icon")).toBeInTheDocument();
    });
  });

  describe("edge cases", () => {
    it("should handle empty tabs array", async () => {
      mockSearchIndex.mockReturnValue([]);

      render(<GlobalSearch {...defaultProps} tabs={[]} />);
      const input = screen.getByPlaceholderText("Search nodes...");

      fireEvent.focus(input);
      await act(async () => {
        await new Promise((r) => setTimeout(r, 100));
      });
      fireEvent.change(input, { target: { value: "test" } });

      await waitFor(() => {
        expect(screen.getByText("No matches found")).toBeInTheDocument();
      });
    });

    it("should handle null activeTabId", async () => {
      render(<GlobalSearch {...defaultProps} activeTabId={null} />);
      const input = screen.getByPlaceholderText("Search nodes...");

      fireEvent.focus(input);

      // Should still work, loading all tabs from disk
      await waitFor(() => {
        expect(defaultProps.loadTabFlow).toHaveBeenCalled();
      });
    });

    it("should handle loadTabFlow returning null", async () => {
      const loadTabFlow = vi.fn().mockResolvedValue(null);

      render(<GlobalSearch {...defaultProps} loadTabFlow={loadTabFlow} />);
      const input = screen.getByPlaceholderText("Search nodes...");

      fireEvent.focus(input);

      // Should not crash
      await waitFor(() => {
        expect(loadTabFlow).toHaveBeenCalled();
      });
    });

    it("should limit results to 20", async () => {
      const manyResults = Array.from({ length: 25 }, (_, i) => ({
        nodeId: `node-${i}`,
        nodeName: `Node ${i}`,
        nodeType: "agent",
        nodeTypeLabel: "Agent",
        tabId: "tab-1",
        tabName: "Tab 1",
      }));
      mockSearchIndex.mockReturnValue(manyResults);

      render(<GlobalSearch {...defaultProps} />);
      const input = screen.getByPlaceholderText("Search nodes...");

      fireEvent.focus(input);
      await act(async () => {
        await new Promise((r) => setTimeout(r, 100));
      });
      fireEvent.change(input, { target: { value: "node" } });

      await waitFor(() => {
        const items = screen.getAllByRole("listitem");
        expect(items.length).toBe(20);
      });
    });

    it("should not navigate on arrow keys when dropdown is closed", () => {
      const navigateToNode = vi.fn();
      render(
        <GlobalSearch {...defaultProps} navigateToNode={navigateToNode} />,
      );
      const input = screen.getByPlaceholderText("Search nodes...");

      fireEvent.keyDown(input, { key: "ArrowDown" });
      fireEvent.keyDown(input, { key: "Enter" });

      expect(navigateToNode).not.toHaveBeenCalled();
    });
  });
});
