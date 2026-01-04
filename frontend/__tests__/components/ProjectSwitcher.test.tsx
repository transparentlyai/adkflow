import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProjectSwitcher from "@/components/ProjectSwitcher";
import type { RecentProject } from "@/lib/recentProjects";

// Mock child components
vi.mock("@/components/InlinePathPicker", () => ({
  default: ({
    currentPath,
    onSelect,
    onCancel,
  }: {
    currentPath: string;
    onSelect: (path: string) => void;
    onCancel: () => void;
  }) => (
    <div data-testid="inline-path-picker">
      <span>Current: {currentPath}</span>
      <button onClick={() => onSelect("/selected/path")}>Select Path</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

vi.mock("@/components/RecentProjectsList", () => ({
  default: ({
    projects,
    onSelect,
    onRemove,
  }: {
    projects: RecentProject[];
    onSelect: (project: RecentProject) => void;
    onRemove?: (path: string) => void;
  }) => (
    <div data-testid="recent-projects-list">
      {projects.map((project) => (
        <button
          key={project.path}
          onClick={() => onSelect(project)}
          data-testid={`project-${project.path}`}
        >
          {project.name}
        </button>
      ))}
    </div>
  ),
}));

// Mock lib functions
vi.mock("@/lib/recentProjects", () => ({
  getLastUsedDirectory: vi.fn().mockReturnValue("/home/user"),
  sanitizeProjectName: vi.fn((name: string) =>
    name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, ""),
  ),
}));

describe("ProjectSwitcher", () => {
  const recentProjects: RecentProject[] = [
    { name: "Project 1", path: "/path/to/project1", lastOpened: "2024-01-01" },
    { name: "Project 2", path: "/path/to/project2", lastOpened: "2024-01-02" },
  ];

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onCreateProject: vi.fn(),
    onLoadProject: vi.fn(),
    recentProjects,
    onRemoveRecent: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("recent mode (default)", () => {
    it("should render open project title", () => {
      render(<ProjectSwitcher {...defaultProps} />);
      expect(screen.getByText("Open Project")).toBeInTheDocument();
    });

    it("should render recent projects list", () => {
      render(<ProjectSwitcher {...defaultProps} />);
      expect(screen.getByTestId("recent-projects-list")).toBeInTheDocument();
    });

    it("should render create new button", () => {
      render(<ProjectSwitcher {...defaultProps} />);
      expect(screen.getByText("Create New")).toBeInTheDocument();
    });

    it("should render browse button", () => {
      render(<ProjectSwitcher {...defaultProps} />);
      expect(screen.getByText("Browse...")).toBeInTheDocument();
    });

    it("should call onLoadProject when project selected", () => {
      const onLoadProject = vi.fn();
      const onClose = vi.fn();
      render(
        <ProjectSwitcher
          {...defaultProps}
          onLoadProject={onLoadProject}
          onClose={onClose}
        />,
      );

      fireEvent.click(screen.getByTestId("project-/path/to/project1"));

      expect(onLoadProject).toHaveBeenCalledWith("/path/to/project1");
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe("create mode", () => {
    it("should show create mode when create button clicked", async () => {
      const user = userEvent.setup();
      render(<ProjectSwitcher {...defaultProps} />);

      await user.click(screen.getByText("Create New"));

      expect(screen.getByText("Create New Project")).toBeInTheDocument();
    });

    it("should start in create mode when mode prop is create", () => {
      render(<ProjectSwitcher {...defaultProps} mode="create" />);
      expect(screen.getByText("Create New Project")).toBeInTheDocument();
    });

    it("should render project name input", async () => {
      const user = userEvent.setup();
      render(<ProjectSwitcher {...defaultProps} />);

      await user.click(screen.getByText("Create New"));

      expect(screen.getByPlaceholderText("my-workflow")).toBeInTheDocument();
    });

    it("should call onCreateProject when create clicked", async () => {
      const user = userEvent.setup();
      const onCreateProject = vi.fn();
      const onClose = vi.fn();
      render(
        <ProjectSwitcher
          {...defaultProps}
          onCreateProject={onCreateProject}
          onClose={onClose}
        />,
      );

      await user.click(screen.getByText("Create New"));
      await user.click(screen.getByText("Create Project"));

      expect(onCreateProject).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });

    it("should show error for empty project name", async () => {
      const user = userEvent.setup();
      render(<ProjectSwitcher {...defaultProps} />);

      await user.click(screen.getByText("Create New"));
      // Clear the default name
      const input = screen.getByPlaceholderText("my-workflow");
      await user.clear(input);
      await user.click(screen.getByText("Create Project"));

      expect(
        screen.getByText("Please enter a valid project name"),
      ).toBeInTheDocument();
    });

    it("should go back to recent mode", async () => {
      const user = userEvent.setup();
      render(<ProjectSwitcher {...defaultProps} />);

      await user.click(screen.getByText("Create New"));
      expect(screen.getByText("Create New Project")).toBeInTheDocument();

      await user.click(screen.getByText("Back"));
      expect(screen.getByText("Open Project")).toBeInTheDocument();
    });
  });

  describe("browse mode", () => {
    it("should show browse mode when browse clicked", async () => {
      const user = userEvent.setup();
      render(<ProjectSwitcher {...defaultProps} />);

      await user.click(screen.getByText("Browse..."));

      expect(screen.getByText("Browse for Project")).toBeInTheDocument();
      expect(screen.getByTestId("inline-path-picker")).toBeInTheDocument();
    });

    it("should call onLoadProject when path selected", async () => {
      const user = userEvent.setup();
      const onLoadProject = vi.fn();
      const onClose = vi.fn();
      render(
        <ProjectSwitcher
          {...defaultProps}
          onLoadProject={onLoadProject}
          onClose={onClose}
        />,
      );

      await user.click(screen.getByText("Browse..."));
      fireEvent.click(screen.getByText("Select Path"));

      expect(onLoadProject).toHaveBeenCalledWith("/selected/path");
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe("when closed", () => {
    it("should not render when not open", () => {
      render(<ProjectSwitcher {...defaultProps} isOpen={false} />);
      expect(screen.queryByText("Open Project")).not.toBeInTheDocument();
    });
  });
});
