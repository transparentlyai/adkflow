import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import HomeScreen from "@/components/HomeScreen";
import type { RecentProject } from "@/lib/recentProjects";

// Mock dependencies
vi.mock("@/components/InlinePathPicker", () => ({
  default: ({
    currentPath,
    onPathChange,
    onSelect,
    onCancel,
  }: {
    currentPath: string;
    onPathChange: (path: string) => void;
    onSelect: (path: string) => void;
    onCancel: () => void;
  }) => (
    <div data-testid="inline-path-picker">
      <span data-testid="path-picker-current">{currentPath}</span>
      <button
        data-testid="path-picker-select"
        onClick={() => onSelect("/home/user/projects")}
      >
        Select
      </button>
      <button
        data-testid="path-picker-select-root"
        onClick={() => onSelect("/")}
      >
        Select Root
      </button>
      <button data-testid="path-picker-cancel" onClick={onCancel}>
        Cancel
      </button>
    </div>
  ),
}));

vi.mock("@/components/RecentProjectsList", () => ({
  default: ({
    projects,
    onSelect,
    onRemove,
    emptyMessage,
  }: {
    projects: RecentProject[];
    onSelect: (project: RecentProject) => void;
    onRemove?: (path: string) => void;
    emptyMessage?: string;
  }) => (
    <div data-testid="recent-projects-list">
      {projects.length === 0 ? (
        <p data-testid="empty-message">{emptyMessage}</p>
      ) : (
        projects.map((p) => (
          <div key={p.path} data-testid="recent-project">
            <span>{p.name}</span>
            <button onClick={() => onSelect(p)}>Open</button>
            {onRemove && (
              <button onClick={() => onRemove(p.path)}>Remove</button>
            )}
          </div>
        ))
      )}
    </div>
  ),
}));

vi.mock("@/lib/recentProjects", () => ({
  getLastUsedDirectory: vi.fn(() => "/home/user/projects"),
  sanitizeProjectName: vi.fn((name: string) =>
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, ""),
  ),
}));

vi.mock("lucide-react", () => ({
  FolderPlus: () => <svg data-testid="folder-plus-icon" />,
  FolderOpen: () => <svg data-testid="folder-open-icon" />,
  ChevronDown: () => <svg data-testid="chevron-down-icon" />,
  ChevronUp: () => <svg data-testid="chevron-up-icon" />,
}));

describe("HomeScreen", () => {
  const mockRecentProjects: RecentProject[] = [
    { path: "/home/user/project1", name: "Project 1", lastOpened: Date.now() },
    {
      path: "/home/user/project2",
      name: "Project 2",
      lastOpened: Date.now() - 86400000,
    },
  ];

  const defaultProps = {
    recentProjects: mockRecentProjects,
    onCreateProject: vi.fn(),
    onLoadProject: vi.fn(),
    onRemoveRecent: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render the home screen with branding", () => {
      render(<HomeScreen {...defaultProps} />);
      expect(screen.getByText("ADKFlow")).toBeInTheDocument();
      expect(
        screen.getByText("Visual Agent Workflow Designer"),
      ).toBeInTheDocument();
    });

    it("should render create new project card", () => {
      render(<HomeScreen {...defaultProps} />);
      expect(screen.getByText("Create New Project")).toBeInTheDocument();
      expect(
        screen.getByText("Start a new workflow from scratch"),
      ).toBeInTheDocument();
    });

    it("should render recent projects card", () => {
      render(<HomeScreen {...defaultProps} />);
      expect(screen.getByText("Recent Projects")).toBeInTheDocument();
      expect(
        screen.getByText("Continue where you left off"),
      ).toBeInTheDocument();
    });

    it("should render project name input with default value", () => {
      render(<HomeScreen {...defaultProps} />);
      const input = screen.getByPlaceholderText("my-workflow");
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue("my-workflow");
    });

    it("should render create project button", () => {
      render(<HomeScreen {...defaultProps} />);
      expect(screen.getByText("Create Project")).toBeInTheDocument();
    });

    it("should render browse section button", () => {
      render(<HomeScreen {...defaultProps} />);
      expect(
        screen.getByText("Or browse for an existing project..."),
      ).toBeInTheDocument();
    });

    it("should render icons", () => {
      render(<HomeScreen {...defaultProps} />);
      expect(screen.getByTestId("folder-plus-icon")).toBeInTheDocument();
      expect(screen.getByTestId("folder-open-icon")).toBeInTheDocument();
    });
  });

  describe("project name input", () => {
    it("should update project name on input change", () => {
      render(<HomeScreen {...defaultProps} />);
      const input = screen.getByPlaceholderText("my-workflow");

      fireEvent.change(input, { target: { value: "new-project" } });

      expect(input).toHaveValue("new-project");
    });

    it("should clear error when project name changes", () => {
      render(<HomeScreen {...defaultProps} />);

      // First clear the name and try to create - should show error
      const input = screen.getByPlaceholderText("my-workflow");
      fireEvent.change(input, { target: { value: "" } });
      fireEvent.click(screen.getByText("Create Project"));

      expect(
        screen.getByText("Please enter a valid project name"),
      ).toBeInTheDocument();

      // Now type something - error should clear
      fireEvent.change(input, { target: { value: "a" } });
      expect(
        screen.queryByText("Please enter a valid project name"),
      ).not.toBeInTheDocument();
    });
  });

  describe("create project", () => {
    it("should call onCreateProject with correct path when create button is clicked", () => {
      const onCreateProject = vi.fn();
      render(
        <HomeScreen {...defaultProps} onCreateProject={onCreateProject} />,
      );

      const input = screen.getByPlaceholderText("my-workflow");
      fireEvent.change(input, { target: { value: "test-project" } });
      fireEvent.click(screen.getByText("Create Project"));

      expect(onCreateProject).toHaveBeenCalledWith(
        "/home/user/projects/test-project",
        "test-project",
      );
    });

    it("should show error for empty project name", () => {
      render(<HomeScreen {...defaultProps} />);

      const input = screen.getByPlaceholderText("my-workflow");
      fireEvent.change(input, { target: { value: "" } });
      fireEvent.click(screen.getByText("Create Project"));

      expect(
        screen.getByText("Please enter a valid project name"),
      ).toBeInTheDocument();
      expect(defaultProps.onCreateProject).not.toHaveBeenCalled();
    });

    it("should show error for project name with only special characters", () => {
      render(<HomeScreen {...defaultProps} />);

      const input = screen.getByPlaceholderText("my-workflow");
      fireEvent.change(input, { target: { value: "!!!" } });
      fireEvent.click(screen.getByText("Create Project"));

      expect(
        screen.getByText("Please enter a valid project name"),
      ).toBeInTheDocument();
    });

    it("should sanitize project name before creating", () => {
      const onCreateProject = vi.fn();
      render(
        <HomeScreen {...defaultProps} onCreateProject={onCreateProject} />,
      );

      const input = screen.getByPlaceholderText("my-workflow");
      fireEvent.change(input, { target: { value: "My Test Project!" } });
      fireEvent.click(screen.getByText("Create Project"));

      // Sanitized name should be "my-test-project"
      expect(onCreateProject).toHaveBeenCalledWith(
        "/home/user/projects/my-test-project",
        "My Test Project!",
      );
    });
  });

  describe("location picker", () => {
    it("should show path picker when Change button is clicked", () => {
      render(<HomeScreen {...defaultProps} />);

      fireEvent.click(screen.getByText("Change"));

      expect(screen.getByTestId("inline-path-picker")).toBeInTheDocument();
    });

    it("should hide path picker when path is selected", () => {
      render(<HomeScreen {...defaultProps} />);

      fireEvent.click(screen.getByText("Change"));
      expect(screen.getByTestId("inline-path-picker")).toBeInTheDocument();

      fireEvent.click(screen.getByTestId("path-picker-select"));

      expect(
        screen.queryByTestId("inline-path-picker"),
      ).not.toBeInTheDocument();
    });

    it("should hide path picker when cancelled", () => {
      render(<HomeScreen {...defaultProps} />);

      fireEvent.click(screen.getByText("Change"));
      expect(screen.getByTestId("inline-path-picker")).toBeInTheDocument();

      fireEvent.click(screen.getByTestId("path-picker-cancel"));

      expect(
        screen.queryByTestId("inline-path-picker"),
      ).not.toBeInTheDocument();
    });
  });

  describe("recent projects", () => {
    it("should render recent projects list", () => {
      render(<HomeScreen {...defaultProps} />);
      expect(screen.getByTestId("recent-projects-list")).toBeInTheDocument();
    });

    it("should call onLoadProject when a recent project is selected", () => {
      const onLoadProject = vi.fn();
      render(<HomeScreen {...defaultProps} onLoadProject={onLoadProject} />);

      const openButtons = screen.getAllByText("Open");
      fireEvent.click(openButtons[0]);

      expect(onLoadProject).toHaveBeenCalledWith("/home/user/project1");
    });

    it("should call onRemoveRecent when remove is clicked", () => {
      const onRemoveRecent = vi.fn();
      render(<HomeScreen {...defaultProps} onRemoveRecent={onRemoveRecent} />);

      const removeButtons = screen.getAllByText("Remove");
      fireEvent.click(removeButtons[0]);

      expect(onRemoveRecent).toHaveBeenCalledWith("/home/user/project1");
    });

    it("should render empty message when no recent projects", () => {
      render(<HomeScreen {...defaultProps} recentProjects={[]} />);

      expect(screen.getByTestId("empty-message")).toHaveTextContent(
        "No recent projects yet",
      );
    });
  });

  describe("browse section", () => {
    it("should toggle browse section when clicked", () => {
      render(<HomeScreen {...defaultProps} />);

      // Initially no browse path picker
      expect(screen.queryAllByTestId("inline-path-picker")).toHaveLength(0);

      // Click to show
      fireEvent.click(screen.getByText("Or browse for an existing project..."));

      // Now should show the path picker for browse
      expect(screen.getByTestId("inline-path-picker")).toBeInTheDocument();

      // Click to hide
      fireEvent.click(screen.getByText("Or browse for an existing project..."));

      expect(
        screen.queryByTestId("inline-path-picker"),
      ).not.toBeInTheDocument();
    });

    it("should call onLoadProject when browse path is selected", () => {
      const onLoadProject = vi.fn();
      render(<HomeScreen {...defaultProps} onLoadProject={onLoadProject} />);

      fireEvent.click(screen.getByText("Or browse for an existing project..."));
      fireEvent.click(screen.getByTestId("path-picker-select"));

      expect(onLoadProject).toHaveBeenCalledWith("/home/user/projects");
    });

    it("should close browse section when cancelled", () => {
      render(<HomeScreen {...defaultProps} />);

      fireEvent.click(screen.getByText("Or browse for an existing project..."));
      expect(screen.getByTestId("inline-path-picker")).toBeInTheDocument();

      fireEvent.click(screen.getByTestId("path-picker-cancel"));

      expect(
        screen.queryByTestId("inline-path-picker"),
      ).not.toBeInTheDocument();
    });
  });

  describe("styling", () => {
    it("should have min-h-screen class on container", () => {
      const { container } = render(<HomeScreen {...defaultProps} />);
      expect(container.firstChild).toHaveClass("min-h-screen");
    });

    it("should have centered flex layout", () => {
      const { container } = render(<HomeScreen {...defaultProps} />);
      expect(container.firstChild).toHaveClass("flex");
      expect(container.firstChild).toHaveClass("flex-col");
      expect(container.firstChild).toHaveClass("items-center");
      expect(container.firstChild).toHaveClass("justify-center");
    });
  });

  describe("edge cases", () => {
    it("should handle project name with leading/trailing spaces", () => {
      const onCreateProject = vi.fn();
      render(
        <HomeScreen {...defaultProps} onCreateProject={onCreateProject} />,
      );

      const input = screen.getByPlaceholderText("my-workflow");
      fireEvent.change(input, { target: { value: "  test  " } });
      fireEvent.click(screen.getByText("Create Project"));

      // The component trims the project name before passing to callback
      expect(onCreateProject).toHaveBeenCalledWith(
        "/home/user/projects/test",
        "test",
      );
    });

    it("should handle optional onRemoveRecent prop", () => {
      render(<HomeScreen {...defaultProps} onRemoveRecent={undefined} />);
      expect(screen.getByTestId("recent-projects-list")).toBeInTheDocument();
    });

    it("should handle root location path correctly", async () => {
      // This tests the path construction logic for edge case
      const onCreateProject = vi.fn();

      // Mock to return root path
      vi.mocked(
        await import("@/lib/recentProjects"),
      ).getLastUsedDirectory.mockReturnValue(null);

      render(
        <HomeScreen {...defaultProps} onCreateProject={onCreateProject} />,
      );

      // The component will fall back to "~" when no last directory
      const input = screen.getByPlaceholderText("my-workflow");
      fireEvent.change(input, { target: { value: "test" } });
      fireEvent.click(screen.getByText("Create Project"));

      expect(onCreateProject).toHaveBeenCalled();
    });

    it("should create project at root when location is /", () => {
      const onCreateProject = vi.fn();
      render(
        <HomeScreen {...defaultProps} onCreateProject={onCreateProject} />,
      );

      // Open path picker and select root
      fireEvent.click(screen.getByText("Change"));
      fireEvent.click(screen.getByTestId("path-picker-select-root"));

      // Create project with root location
      const input = screen.getByPlaceholderText("my-workflow");
      fireEvent.change(input, { target: { value: "test" } });
      fireEvent.click(screen.getByText("Create Project"));

      // When location is "/" the path should be "/test" not "//test"
      expect(onCreateProject).toHaveBeenCalledWith("/test", "test");
    });
  });
});
