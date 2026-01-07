import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { HomeLayout } from "@/components/home/HomeLayout";
import type { TabState } from "@/lib/types";

// Mock child components
vi.mock("@/components/ReactFlowCanvas", () => ({
  default: vi.fn(() => <div data-testid="react-flow-canvas">Canvas</div>),
}));

vi.mock("@/components/TabBar", () => ({
  default: ({
    tabs,
    activeTabId,
  }: {
    tabs: TabState[];
    activeTabId: string | null;
  }) => (
    <div data-testid="tab-bar">
      <span>Tabs: {tabs.length}</span>
      <span>Active: {activeTabId}</span>
    </div>
  ),
}));

vi.mock("@/components/ProjectSwitcher", () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="project-switcher">Switcher</div> : null,
}));

vi.mock("@/contexts/ProjectContext", () => ({
  ProjectProvider: ({ children, defaultModel }: { children: React.ReactNode; defaultModel?: string }) => (
    <div data-testid="project-provider" data-default-model={defaultModel}>
      {children}
    </div>
  ),
}));

vi.mock("@/contexts/RunWorkflowContext", () => ({
  RunWorkflowProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="run-workflow-provider">{children}</div>
  ),
}));

const createMockTab = (id: string): TabState => ({
  id,
  name: `Tab ${id}`,
  nodes: [],
  edges: [],
});

describe("HomeLayout", () => {
  const defaultProps = {
    canvasRef: { current: null },
    currentProjectPath: "/test/project",
    tabs: [createMockTab("1"), createMockTab("2")],
    activeTabId: "1",
    isCanvasLocked: false,
    isRunning: false,
    onTabClick: vi.fn(),
    onTabDelete: vi.fn(),
    onTabRename: vi.fn(),
    onTabReorder: vi.fn(),
    onAddTab: vi.fn(),
    onDuplicateTab: vi.fn(),
    onWorkflowChange: vi.fn(),
    onRequestPromptCreation: vi.fn(),
    onRequestContextCreation: vi.fn(),
    onRequestToolCreation: vi.fn(),
    onRequestProcessCreation: vi.fn(),
    onRequestOutputFileCreation: vi.fn(),
    onToggleLock: vi.fn(),
    onSave: vi.fn(),
    onSaveFile: vi.fn(),
    onRequestFilePicker: vi.fn(),
    onRunWorkflow: vi.fn(),
    isProjectSwitcherOpen: false,
    projectSwitcherMode: "create" as const,
    recentProjects: [],
    onCloseProjectSwitcher: vi.fn(),
    onCreateProject: vi.fn(),
    onLoadProject: vi.fn(),
    onRemoveRecent: vi.fn(),
  };

  describe("TabBar", () => {
    it("should render TabBar when project path and tabs exist", () => {
      render(<HomeLayout {...defaultProps} />);
      expect(screen.getByTestId("tab-bar")).toBeInTheDocument();
    });

    it("should show correct tab count", () => {
      render(<HomeLayout {...defaultProps} />);
      expect(screen.getByText("Tabs: 2")).toBeInTheDocument();
    });

    it("should show active tab id", () => {
      render(<HomeLayout {...defaultProps} />);
      expect(screen.getByText("Active: 1")).toBeInTheDocument();
    });

    it("should not render TabBar when no project path", () => {
      render(<HomeLayout {...defaultProps} currentProjectPath={null} />);
      expect(screen.queryByTestId("tab-bar")).not.toBeInTheDocument();
    });

    it("should not render TabBar when no tabs", () => {
      render(<HomeLayout {...defaultProps} tabs={[]} />);
      expect(screen.queryByTestId("tab-bar")).not.toBeInTheDocument();
    });
  });

  describe("Canvas", () => {
    it("should render ReactFlowCanvas", () => {
      render(<HomeLayout {...defaultProps} />);
      expect(screen.getByTestId("react-flow-canvas")).toBeInTheDocument();
    });

    it("should wrap canvas in ProjectProvider", () => {
      render(<HomeLayout {...defaultProps} />);
      expect(screen.getByTestId("project-provider")).toBeInTheDocument();
    });

    it("should wrap canvas in RunWorkflowProvider", () => {
      render(<HomeLayout {...defaultProps} />);
      expect(screen.getByTestId("run-workflow-provider")).toBeInTheDocument();
    });
  });

  describe("ProjectSwitcher", () => {
    it("should not show ProjectSwitcher when closed", () => {
      render(<HomeLayout {...defaultProps} />);
      expect(screen.queryByTestId("project-switcher")).not.toBeInTheDocument();
    });

    it("should show ProjectSwitcher when open", () => {
      render(<HomeLayout {...defaultProps} isProjectSwitcherOpen={true} />);
      expect(screen.getByTestId("project-switcher")).toBeInTheDocument();
    });
  });

  describe("defaultModel prop", () => {
    it("should pass defaultModel to ProjectProvider", () => {
      render(<HomeLayout {...defaultProps} defaultModel="gemini-2.0-flash" />);
      const provider = screen.getByTestId("project-provider");
      expect(provider).toHaveAttribute("data-default-model", "gemini-2.0-flash");
    });

    it("should handle undefined defaultModel", () => {
      render(<HomeLayout {...defaultProps} />);
      const provider = screen.getByTestId("project-provider");
      expect(provider).not.toHaveAttribute("data-default-model");
    });
  });
});
