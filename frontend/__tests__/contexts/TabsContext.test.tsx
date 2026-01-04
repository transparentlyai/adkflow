import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import React from "react";

// Mock the API module
const mockListTabs = vi.fn();
const mockCreateTab = vi.fn();
const mockLoadTab = vi.fn();
const mockSaveTab = vi.fn();
const mockDeleteTab = vi.fn();
const mockRenameTab = vi.fn();
const mockDuplicateTab = vi.fn();
const mockReorderTabs = vi.fn();

vi.mock("@/lib/api", () => ({
  listTabs: () => mockListTabs(),
  createTab: (...args: unknown[]) => mockCreateTab(...args),
  loadTab: (...args: unknown[]) => mockLoadTab(...args),
  saveTab: (...args: unknown[]) => mockSaveTab(...args),
  deleteTab: (...args: unknown[]) => mockDeleteTab(...args),
  renameTab: (...args: unknown[]) => mockRenameTab(...args),
  duplicateTab: (...args: unknown[]) => mockDuplicateTab(...args),
  reorderTabs: (...args: unknown[]) => mockReorderTabs(...args),
}));

// Import after mocking
import { TabsProvider, useTabs } from "@/contexts/TabsContext";

function TestConsumer({
  onReady,
}: {
  onReady?: (context: ReturnType<typeof useTabs>) => void;
}) {
  const context = useTabs();

  React.useEffect(() => {
    if (onReady) {
      onReady(context);
    }
  }, [context, onReady]);

  return (
    <div>
      <span data-testid="tabCount">{context.tabs.length}</span>
      <span data-testid="activeTabId">{context.activeTabId ?? "null"}</span>
      <span data-testid="hasActiveTab">{context.activeTab ? "yes" : "no"}</span>
      <span data-testid="pendingFocus">
        {context.pendingFocusNodeId ?? "null"}
      </span>
      <button
        data-testid="setActiveTab"
        onClick={() => context.setActiveTabId("tab-1")}
      >
        Set Active
      </button>
      <button
        data-testid="markDirty"
        onClick={() => context.markTabDirty("tab-1")}
      >
        Mark Dirty
      </button>
      <button
        data-testid="markClean"
        onClick={() => context.markTabClean("tab-1")}
      >
        Mark Clean
      </button>
      <button
        data-testid="setLoading"
        onClick={() => context.setTabLoading("tab-1", true)}
      >
        Set Loading
      </button>
      <button
        data-testid="navigateToNode"
        onClick={() => context.navigateToNode("tab-1", "node-1")}
      >
        Navigate
      </button>
      <button data-testid="clearTabs" onClick={() => context.clearTabs()}>
        Clear
      </button>
      <button
        data-testid="setPendingFocus"
        onClick={() => context.setPendingFocusNodeId("node-2")}
      >
        Set Focus
      </button>
    </div>
  );
}

describe("TabsContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListTabs.mockResolvedValue({
      tabs: [
        { id: "tab-1", name: "Tab 1" },
        { id: "tab-2", name: "Tab 2" },
      ],
      name: "Test Project",
    });
    mockCreateTab.mockResolvedValue({
      tab: { id: "new-tab", name: "New Tab" },
    });
    mockLoadTab.mockResolvedValue({
      flow: { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
    });
    mockSaveTab.mockResolvedValue({});
    mockDeleteTab.mockResolvedValue({});
    mockRenameTab.mockResolvedValue({});
    mockDuplicateTab.mockResolvedValue({
      tab: { id: "dup-tab", name: "Duplicated Tab" },
    });
    mockReorderTabs.mockResolvedValue({});
  });

  describe("TabsProvider", () => {
    it("should start with empty tabs", () => {
      render(
        <TabsProvider>
          <TestConsumer />
        </TabsProvider>,
      );

      expect(screen.getByTestId("tabCount")).toHaveTextContent("0");
      expect(screen.getByTestId("activeTabId")).toHaveTextContent("null");
    });

    it("should set active tab", () => {
      render(
        <TabsProvider>
          <TestConsumer />
        </TabsProvider>,
      );

      fireEvent.click(screen.getByTestId("setActiveTab"));

      expect(screen.getByTestId("activeTabId")).toHaveTextContent("tab-1");
    });

    it("should mark tab dirty", async () => {
      let contextRef: ReturnType<typeof useTabs> | null = null;

      render(
        <TabsProvider>
          <TestConsumer onReady={(ctx) => (contextRef = ctx)} />
        </TabsProvider>,
      );

      // Initialize tabs first
      await act(async () => {
        await contextRef?.initializeTabs("/project");
      });

      expect(screen.getByTestId("tabCount")).toHaveTextContent("2");

      fireEvent.click(screen.getByTestId("markDirty"));

      // Tab should be marked dirty
      expect(
        contextRef?.tabs.find((t) => t.id === "tab-1")?.hasUnsavedChanges,
      ).toBe(true);
    });

    it("should mark tab clean", async () => {
      let contextRef: ReturnType<typeof useTabs> | null = null;

      render(
        <TabsProvider>
          <TestConsumer onReady={(ctx) => (contextRef = ctx)} />
        </TabsProvider>,
      );

      await act(async () => {
        await contextRef?.initializeTabs("/project");
      });

      // First mark dirty, then clean
      fireEvent.click(screen.getByTestId("markDirty"));
      fireEvent.click(screen.getByTestId("markClean"));

      expect(
        contextRef?.tabs.find((t) => t.id === "tab-1")?.hasUnsavedChanges,
      ).toBe(false);
    });

    it("should set tab loading", async () => {
      let contextRef: ReturnType<typeof useTabs> | null = null;

      render(
        <TabsProvider>
          <TestConsumer onReady={(ctx) => (contextRef = ctx)} />
        </TabsProvider>,
      );

      await act(async () => {
        await contextRef?.initializeTabs("/project");
      });

      fireEvent.click(screen.getByTestId("setLoading"));

      expect(contextRef?.tabs.find((t) => t.id === "tab-1")?.isLoading).toBe(
        true,
      );
    });

    it("should navigate to node", () => {
      render(
        <TabsProvider>
          <TestConsumer />
        </TabsProvider>,
      );

      fireEvent.click(screen.getByTestId("navigateToNode"));

      expect(screen.getByTestId("activeTabId")).toHaveTextContent("tab-1");
      expect(screen.getByTestId("pendingFocus")).toHaveTextContent("node-1");
    });

    it("should set pending focus node id", () => {
      render(
        <TabsProvider>
          <TestConsumer />
        </TabsProvider>,
      );

      fireEvent.click(screen.getByTestId("setPendingFocus"));

      expect(screen.getByTestId("pendingFocus")).toHaveTextContent("node-2");
    });

    it("should clear tabs", async () => {
      let contextRef: ReturnType<typeof useTabs> | null = null;

      render(
        <TabsProvider>
          <TestConsumer onReady={(ctx) => (contextRef = ctx)} />
        </TabsProvider>,
      );

      await act(async () => {
        await contextRef?.initializeTabs("/project");
      });

      expect(screen.getByTestId("tabCount")).toHaveTextContent("2");

      fireEvent.click(screen.getByTestId("clearTabs"));

      expect(screen.getByTestId("tabCount")).toHaveTextContent("0");
    });

    it("should initialize tabs from project", async () => {
      let contextRef: ReturnType<typeof useTabs> | null = null;

      render(
        <TabsProvider>
          <TestConsumer onReady={(ctx) => (contextRef = ctx)} />
        </TabsProvider>,
      );

      await act(async () => {
        const result = await contextRef?.initializeTabs("/project");
        expect(result?.projectName).toBe("Test Project");
        expect(result?.firstTab?.id).toBe("tab-1");
      });

      expect(screen.getByTestId("tabCount")).toHaveTextContent("2");
      expect(screen.getByTestId("activeTabId")).toHaveTextContent("tab-1");
    });

    it("should create new tab", async () => {
      let contextRef: ReturnType<typeof useTabs> | null = null;

      render(
        <TabsProvider>
          <TestConsumer onReady={(ctx) => (contextRef = ctx)} />
        </TabsProvider>,
      );

      await act(async () => {
        const tab = await contextRef?.createNewTab("/project", "New Tab");
        expect(tab?.id).toBe("new-tab");
      });

      expect(screen.getByTestId("tabCount")).toHaveTextContent("1");
    });

    it("should load tab flow", async () => {
      let contextRef: ReturnType<typeof useTabs> | null = null;

      render(
        <TabsProvider>
          <TestConsumer onReady={(ctx) => (contextRef = ctx)} />
        </TabsProvider>,
      );

      await act(async () => {
        await contextRef?.initializeTabs("/project");
      });

      await act(async () => {
        const flow = await contextRef?.loadTabFlow("/project", "tab-1");
        expect(flow).toBeDefined();
        expect(flow?.nodes).toEqual([]);
      });
    });

    it("should save tab flow", async () => {
      let contextRef: ReturnType<typeof useTabs> | null = null;

      render(
        <TabsProvider>
          <TestConsumer onReady={(ctx) => (contextRef = ctx)} />
        </TabsProvider>,
      );

      await act(async () => {
        await contextRef?.initializeTabs("/project");
      });

      await act(async () => {
        const result = await contextRef?.saveTabFlow("/project", "tab-1", {
          nodes: [],
          edges: [],
          viewport: { x: 0, y: 0, zoom: 1 },
        });
        expect(result).toBe(true);
      });
    });

    it("should delete tab", async () => {
      let contextRef: ReturnType<typeof useTabs> | null = null;

      render(
        <TabsProvider>
          <TestConsumer onReady={(ctx) => (contextRef = ctx)} />
        </TabsProvider>,
      );

      await act(async () => {
        await contextRef?.initializeTabs("/project");
      });

      expect(screen.getByTestId("tabCount")).toHaveTextContent("2");

      await act(async () => {
        const result = await contextRef?.deleteTabById("/project", "tab-1");
        expect(result).toBe(true);
      });

      expect(screen.getByTestId("tabCount")).toHaveTextContent("1");
    });

    it("should rename tab", async () => {
      let contextRef: ReturnType<typeof useTabs> | null = null;

      render(
        <TabsProvider>
          <TestConsumer onReady={(ctx) => (contextRef = ctx)} />
        </TabsProvider>,
      );

      await act(async () => {
        await contextRef?.initializeTabs("/project");
      });

      await act(async () => {
        const result = await contextRef?.renameTabById(
          "/project",
          "tab-1",
          "Renamed Tab",
        );
        expect(result).toBe(true);
      });

      expect(contextRef?.tabs.find((t) => t.id === "tab-1")?.name).toBe(
        "Renamed Tab",
      );
    });

    it("should duplicate tab", async () => {
      let contextRef: ReturnType<typeof useTabs> | null = null;

      render(
        <TabsProvider>
          <TestConsumer onReady={(ctx) => (contextRef = ctx)} />
        </TabsProvider>,
      );

      await act(async () => {
        await contextRef?.initializeTabs("/project");
      });

      expect(screen.getByTestId("tabCount")).toHaveTextContent("2");

      await act(async () => {
        const tab = await contextRef?.duplicateTabById("/project", "tab-1");
        expect(tab?.id).toBe("dup-tab");
      });

      expect(screen.getByTestId("tabCount")).toHaveTextContent("3");
    });

    it("should reorder tabs", async () => {
      let contextRef: ReturnType<typeof useTabs> | null = null;

      render(
        <TabsProvider>
          <TestConsumer onReady={(ctx) => (contextRef = ctx)} />
        </TabsProvider>,
      );

      await act(async () => {
        await contextRef?.initializeTabs("/project");
      });

      await act(async () => {
        const result = await contextRef?.reorderTabsById("/project", [
          "tab-2",
          "tab-1",
        ]);
        expect(result).toBe(true);
      });

      // Tabs should be reordered
      expect(contextRef?.tabs[0].id).toBe("tab-2");
      expect(contextRef?.tabs[1].id).toBe("tab-1");
    });

    it("should handle API errors on save", async () => {
      mockSaveTab.mockRejectedValueOnce(new Error("Save failed"));
      let contextRef: ReturnType<typeof useTabs> | null = null;

      render(
        <TabsProvider>
          <TestConsumer onReady={(ctx) => (contextRef = ctx)} />
        </TabsProvider>,
      );

      await act(async () => {
        await contextRef?.initializeTabs("/project");
      });

      await act(async () => {
        const result = await contextRef?.saveTabFlow("/project", "tab-1", {
          nodes: [],
          edges: [],
          viewport: { x: 0, y: 0, zoom: 1 },
        });
        expect(result).toBe(false);
      });
    });

    it("should handle API errors on delete", async () => {
      mockDeleteTab.mockRejectedValueOnce(new Error("Delete failed"));
      let contextRef: ReturnType<typeof useTabs> | null = null;

      render(
        <TabsProvider>
          <TestConsumer onReady={(ctx) => (contextRef = ctx)} />
        </TabsProvider>,
      );

      await act(async () => {
        await contextRef?.initializeTabs("/project");
      });

      await act(async () => {
        const result = await contextRef?.deleteTabById("/project", "tab-1");
        expect(result).toBe(false);
      });

      // Tab should still be there
      expect(screen.getByTestId("tabCount")).toHaveTextContent("2");
    });

    it("should handle API errors on create", async () => {
      mockCreateTab.mockRejectedValueOnce(new Error("Create failed"));
      let contextRef: ReturnType<typeof useTabs> | null = null;

      render(
        <TabsProvider>
          <TestConsumer onReady={(ctx) => (contextRef = ctx)} />
        </TabsProvider>,
      );

      await act(async () => {
        const tab = await contextRef?.createNewTab("/project", "New Tab");
        expect(tab).toBe(null);
      });

      expect(screen.getByTestId("tabCount")).toHaveTextContent("0");
    });

    it("should handle API errors on load", async () => {
      mockLoadTab.mockRejectedValueOnce(new Error("Load failed"));
      let contextRef: ReturnType<typeof useTabs> | null = null;

      render(
        <TabsProvider>
          <TestConsumer onReady={(ctx) => (contextRef = ctx)} />
        </TabsProvider>,
      );

      await act(async () => {
        await contextRef?.initializeTabs("/project");
      });

      await act(async () => {
        const flow = await contextRef?.loadTabFlow("/project", "tab-1");
        expect(flow).toBe(null);
      });
    });
  });

  describe("useTabs", () => {
    it("should throw error when used outside provider", () => {
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      expect(() => {
        render(<TestConsumer />);
      }).toThrow("useTabs must be used within TabsProvider");

      consoleError.mockRestore();
    });
  });
});
