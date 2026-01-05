import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import RecentProjectsList from "@/components/RecentProjectsList";
import type { RecentProject } from "@/lib/recentProjects";

// Mock lucide-react
vi.mock("lucide-react", () => ({
  FolderOpen: () => <svg data-testid="folder-open-icon" />,
  X: () => <svg data-testid="x-icon" />,
  Clock: () => <svg data-testid="clock-icon" />,
  FolderX: () => <svg data-testid="folder-x-icon" />,
}));

// Mock recentProjects lib
vi.mock("@/lib/recentProjects", () => ({
  formatRelativeTime: (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes} minutes ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hours ago`;
    const days = Math.floor(hours / 24);
    return `${days} days ago`;
  },
}));

describe("RecentProjectsList", () => {
  const now = Date.now();

  const mockProjects: RecentProject[] = [
    { path: "/home/user/project1", name: "Project 1", lastOpened: now },
    {
      path: "/home/user/project2",
      name: "Project 2",
      lastOpened: now - 3600000,
    }, // 1 hour ago
    {
      path: "/home/user/project3",
      name: "Project 3",
      lastOpened: now - 86400000,
    }, // 1 day ago
  ];

  const defaultProps = {
    projects: mockProjects,
    onSelect: vi.fn(),
    onRemove: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering with projects", () => {
    it("should render all projects", () => {
      render(<RecentProjectsList {...defaultProps} />);

      expect(screen.getByText("Project 1")).toBeInTheDocument();
      expect(screen.getByText("Project 2")).toBeInTheDocument();
      expect(screen.getByText("Project 3")).toBeInTheDocument();
    });

    it("should render project paths", () => {
      render(<RecentProjectsList {...defaultProps} />);

      expect(screen.getByText("/home/user/project1")).toBeInTheDocument();
      expect(screen.getByText("/home/user/project2")).toBeInTheDocument();
      expect(screen.getByText("/home/user/project3")).toBeInTheDocument();
    });

    it("should render folder icons for each project", () => {
      render(<RecentProjectsList {...defaultProps} />);

      const folderIcons = screen.getAllByTestId("folder-open-icon");
      expect(folderIcons).toHaveLength(3);
    });

    it("should render clock icons for each project", () => {
      render(<RecentProjectsList {...defaultProps} />);

      const clockIcons = screen.getAllByTestId("clock-icon");
      expect(clockIcons).toHaveLength(3);
    });

    it("should render relative time for each project", () => {
      render(<RecentProjectsList {...defaultProps} />);

      expect(screen.getByText("just now")).toBeInTheDocument();
      expect(screen.getByText("1 hours ago")).toBeInTheDocument();
      expect(screen.getByText("1 days ago")).toBeInTheDocument();
    });

    it("should have title attribute on path for tooltip", () => {
      render(<RecentProjectsList {...defaultProps} />);

      const pathElements = screen.getAllByTitle("/home/user/project1");
      expect(pathElements.length).toBeGreaterThan(0);
    });
  });

  describe("empty state", () => {
    it("should render empty state when no projects", () => {
      render(<RecentProjectsList {...defaultProps} projects={[]} />);

      expect(screen.getByTestId("folder-x-icon")).toBeInTheDocument();
    });

    it("should render default empty message", () => {
      render(<RecentProjectsList {...defaultProps} projects={[]} />);

      expect(screen.getByText("No recent projects")).toBeInTheDocument();
    });

    it("should render custom empty message", () => {
      render(
        <RecentProjectsList
          {...defaultProps}
          projects={[]}
          emptyMessage="Custom empty message"
        />,
      );

      expect(screen.getByText("Custom empty message")).toBeInTheDocument();
    });

    it("should render suggestion text", () => {
      render(<RecentProjectsList {...defaultProps} projects={[]} />);

      expect(
        screen.getByText("Create a new project to get started"),
      ).toBeInTheDocument();
    });

    it("should apply compact styling when compact prop is true", () => {
      const { container } = render(
        <RecentProjectsList {...defaultProps} projects={[]} compact />,
      );

      const emptyContainer = container.querySelector(".py-6");
      expect(emptyContainer).toBeInTheDocument();
    });

    it("should apply non-compact styling by default", () => {
      const { container } = render(
        <RecentProjectsList {...defaultProps} projects={[]} />,
      );

      const emptyContainer = container.querySelector(".py-12");
      expect(emptyContainer).toBeInTheDocument();
    });
  });

  describe("maxDisplay", () => {
    it("should limit displayed projects when maxDisplay is set", () => {
      render(<RecentProjectsList {...defaultProps} maxDisplay={2} />);

      expect(screen.getByText("Project 1")).toBeInTheDocument();
      expect(screen.getByText("Project 2")).toBeInTheDocument();
      expect(screen.queryByText("Project 3")).not.toBeInTheDocument();
    });

    it("should show all projects when maxDisplay is not set", () => {
      render(<RecentProjectsList {...defaultProps} />);

      expect(screen.getByText("Project 1")).toBeInTheDocument();
      expect(screen.getByText("Project 2")).toBeInTheDocument();
      expect(screen.getByText("Project 3")).toBeInTheDocument();
    });

    it("should handle maxDisplay larger than project count", () => {
      render(<RecentProjectsList {...defaultProps} maxDisplay={10} />);

      expect(screen.getByText("Project 1")).toBeInTheDocument();
      expect(screen.getByText("Project 2")).toBeInTheDocument();
      expect(screen.getByText("Project 3")).toBeInTheDocument();
    });

    it("should handle maxDisplay of 1", () => {
      render(<RecentProjectsList {...defaultProps} maxDisplay={1} />);

      // maxDisplay=1 should show only 1 project
      expect(screen.getByText("Project 1")).toBeInTheDocument();
      expect(screen.queryByText("Project 2")).not.toBeInTheDocument();
    });
  });

  describe("onSelect", () => {
    it("should call onSelect when project row is clicked", () => {
      const onSelect = vi.fn();
      render(<RecentProjectsList {...defaultProps} onSelect={onSelect} />);

      fireEvent.click(
        screen.getByText("Project 1").closest("div[class*='cursor-pointer']")!,
      );

      expect(onSelect).toHaveBeenCalledWith(mockProjects[0]);
    });

    it("should call onSelect with correct project data", () => {
      const onSelect = vi.fn();
      render(<RecentProjectsList {...defaultProps} onSelect={onSelect} />);

      fireEvent.click(
        screen.getByText("Project 2").closest("div[class*='cursor-pointer']")!,
      );

      expect(onSelect).toHaveBeenCalledWith({
        path: "/home/user/project2",
        name: "Project 2",
        lastOpened: now - 3600000,
      });
    });
  });

  describe("onRemove", () => {
    it("should render remove buttons when onRemove is provided", () => {
      render(<RecentProjectsList {...defaultProps} />);

      const xIcons = screen.getAllByTestId("x-icon");
      expect(xIcons).toHaveLength(3);
    });

    it("should not render remove buttons when onRemove is not provided", () => {
      render(<RecentProjectsList {...defaultProps} onRemove={undefined} />);

      expect(screen.queryByTestId("x-icon")).not.toBeInTheDocument();
    });

    it("should call onRemove when remove button is clicked", () => {
      const onRemove = vi.fn();
      render(<RecentProjectsList {...defaultProps} onRemove={onRemove} />);

      const removeButtons = screen.getAllByTestId("x-icon");
      fireEvent.click(removeButtons[0].closest("button")!);

      expect(onRemove).toHaveBeenCalledWith("/home/user/project1");
    });

    it("should stop propagation when remove button is clicked", () => {
      const onSelect = vi.fn();
      const onRemove = vi.fn();
      render(
        <RecentProjectsList
          {...defaultProps}
          onSelect={onSelect}
          onRemove={onRemove}
        />,
      );

      const removeButtons = screen.getAllByTestId("x-icon");
      fireEvent.click(removeButtons[0].closest("button")!);

      // onRemove should be called, but onSelect should not
      expect(onRemove).toHaveBeenCalledWith("/home/user/project1");
      expect(onSelect).not.toHaveBeenCalled();
    });

    it("should have proper title on remove button", () => {
      render(<RecentProjectsList {...defaultProps} />);

      const removeButtons = screen.getAllByTitle("Remove from recent");
      expect(removeButtons).toHaveLength(3);
    });
  });

  describe("styling", () => {
    it("should have divide-y class on container", () => {
      const { container } = render(<RecentProjectsList {...defaultProps} />);

      expect(container.firstChild).toHaveClass("divide-y");
      expect(container.firstChild).toHaveClass("divide-border");
    });

    it("should have hover styles on project rows", () => {
      render(<RecentProjectsList {...defaultProps} />);

      const projectRow = screen
        .getByText("Project 1")
        .closest("div[class*='cursor-pointer']");
      expect(projectRow).toHaveClass("hover:bg-accent");
    });

    it("should have cursor-pointer on project rows", () => {
      render(<RecentProjectsList {...defaultProps} />);

      const projectRow = screen
        .getByText("Project 1")
        .closest("div[class*='cursor-pointer']");
      expect(projectRow).toHaveClass("cursor-pointer");
    });

    it("should have transition-colors on project rows", () => {
      render(<RecentProjectsList {...defaultProps} />);

      const projectRow = screen
        .getByText("Project 1")
        .closest("div[class*='cursor-pointer']");
      expect(projectRow).toHaveClass("transition-colors");
    });

    it("should have group class for hover effects", () => {
      render(<RecentProjectsList {...defaultProps} />);

      const projectRow = screen
        .getByText("Project 1")
        .closest("div[class*='cursor-pointer']");
      expect(projectRow).toHaveClass("group");
    });
  });

  describe("compact mode", () => {
    it("should render empty state in compact mode", () => {
      render(<RecentProjectsList {...defaultProps} projects={[]} compact />);

      // In compact mode, the empty state should still render
      expect(screen.getByTestId("folder-x-icon")).toBeInTheDocument();
      expect(screen.getByText("No recent projects")).toBeInTheDocument();
    });

    it("should render empty state in non-compact mode", () => {
      render(
        <RecentProjectsList {...defaultProps} projects={[]} compact={false} />,
      );

      // In non-compact mode, the empty state should still render
      expect(screen.getByTestId("folder-x-icon")).toBeInTheDocument();
      expect(screen.getByText("No recent projects")).toBeInTheDocument();
    });
  });

  describe("edge cases", () => {
    it("should handle project with long name", () => {
      const longName = "A".repeat(100);
      const projects = [{ path: "/path", name: longName, lastOpened: now }];

      render(<RecentProjectsList {...defaultProps} projects={projects} />);

      expect(screen.getByText(longName)).toBeInTheDocument();
    });

    it("should handle project with long path", () => {
      const longPath = "/home/user/" + "a/".repeat(50) + "project";
      const projects = [{ path: longPath, name: "Project", lastOpened: now }];

      render(<RecentProjectsList {...defaultProps} projects={projects} />);

      expect(screen.getByText(longPath)).toBeInTheDocument();
    });

    it("should handle project with special characters", () => {
      const projects = [
        { path: "/path/<special>", name: "Project <Test>", lastOpened: now },
      ];

      render(<RecentProjectsList {...defaultProps} projects={projects} />);

      expect(screen.getByText("Project <Test>")).toBeInTheDocument();
      expect(screen.getByText("/path/<special>")).toBeInTheDocument();
    });

    it("should handle project with empty name", () => {
      const projects = [{ path: "/path", name: "", lastOpened: now }];

      render(<RecentProjectsList {...defaultProps} projects={projects} />);

      // Row should still render
      expect(screen.getByTestId("folder-open-icon")).toBeInTheDocument();
    });

    it("should handle single project", () => {
      const projects = [mockProjects[0]];

      render(<RecentProjectsList {...defaultProps} projects={projects} />);

      expect(screen.getByText("Project 1")).toBeInTheDocument();
      expect(screen.queryByText("Project 2")).not.toBeInTheDocument();
    });

    it("should truncate long names with CSS", () => {
      render(<RecentProjectsList {...defaultProps} />);

      const nameElement = screen.getByText("Project 1");
      expect(nameElement).toHaveClass("truncate");
    });

    it("should truncate long paths with CSS", () => {
      render(<RecentProjectsList {...defaultProps} />);

      const pathElement = screen.getByText("/home/user/project1");
      expect(pathElement).toHaveClass("truncate");
    });
  });
});
