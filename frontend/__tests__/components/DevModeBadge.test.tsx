import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import DevModeBadge from "@/components/DevModeBadge";

// Mock lucide-react
vi.mock("lucide-react", () => ({
  GitBranch: () => <svg data-testid="git-branch-icon" />,
}));

// Mock getDevInfo API
const mockGetDevInfo = vi.fn();

vi.mock("@/lib/api", () => ({
  getDevInfo: () => mockGetDevInfo(),
}));

describe("DevModeBadge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("dev mode enabled", () => {
    it("should render badge when dev mode is enabled", async () => {
      mockGetDevInfo.mockResolvedValueOnce({
        devMode: true,
        branch: "main",
      });

      render(<DevModeBadge />);

      await waitFor(() => {
        expect(screen.getByText("Dev")).toBeInTheDocument();
      });
    });

    it("should display branch name when available", async () => {
      mockGetDevInfo.mockResolvedValueOnce({
        devMode: true,
        branch: "feature-branch",
      });

      render(<DevModeBadge />);

      await waitFor(() => {
        expect(screen.getByText("feature-branch")).toBeInTheDocument();
      });
    });

    it("should render git branch icon when branch is available", async () => {
      mockGetDevInfo.mockResolvedValueOnce({
        devMode: true,
        branch: "main",
      });

      render(<DevModeBadge />);

      await waitFor(() => {
        expect(screen.getByTestId("git-branch-icon")).toBeInTheDocument();
      });
    });

    it("should not display branch info when branch is null", async () => {
      mockGetDevInfo.mockResolvedValueOnce({
        devMode: true,
        branch: null,
      });

      render(<DevModeBadge />);

      await waitFor(() => {
        expect(screen.getByText("Dev")).toBeInTheDocument();
      });

      expect(screen.queryByTestId("git-branch-icon")).not.toBeInTheDocument();
    });

    it("should render with correct styling classes", async () => {
      mockGetDevInfo.mockResolvedValueOnce({
        devMode: true,
        branch: "main",
      });

      const { container } = render(<DevModeBadge />);

      await waitFor(() => {
        expect(screen.getByText("Dev")).toBeInTheDocument();
      });

      const badge = container.querySelector(".bg-amber-500");
      expect(badge).toBeInTheDocument();
    });

    it("should be positioned at top center", async () => {
      mockGetDevInfo.mockResolvedValueOnce({
        devMode: true,
        branch: "main",
      });

      const { container } = render(<DevModeBadge />);

      await waitFor(() => {
        expect(screen.getByText("Dev")).toBeInTheDocument();
      });

      const wrapper = container.querySelector(".fixed.top-3");
      expect(wrapper).toBeInTheDocument();
    });
  });

  describe("dev mode disabled", () => {
    it("should not render when dev mode is disabled", async () => {
      mockGetDevInfo.mockResolvedValueOnce({
        devMode: false,
        branch: null,
      });

      const { container } = render(<DevModeBadge />);

      await waitFor(() => {
        expect(mockGetDevInfo).toHaveBeenCalled();
      });

      expect(container.firstChild).toBeNull();
    });

    it("should not render when dev mode is false with branch", async () => {
      mockGetDevInfo.mockResolvedValueOnce({
        devMode: false,
        branch: "main",
      });

      const { container } = render(<DevModeBadge />);

      await waitFor(() => {
        expect(mockGetDevInfo).toHaveBeenCalled();
      });

      expect(container.firstChild).toBeNull();
    });
  });

  describe("error handling", () => {
    it("should silently fail and not render on error", async () => {
      mockGetDevInfo.mockRejectedValueOnce(new Error("Network error"));

      const { container } = render(<DevModeBadge />);

      await waitFor(() => {
        expect(mockGetDevInfo).toHaveBeenCalled();
      });

      expect(container.firstChild).toBeNull();
    });

    it("should not render on API timeout", async () => {
      mockGetDevInfo.mockRejectedValueOnce(new Error("Timeout"));

      const { container } = render(<DevModeBadge />);

      await waitFor(() => {
        expect(mockGetDevInfo).toHaveBeenCalled();
      });

      expect(container.firstChild).toBeNull();
    });
  });

  describe("component lifecycle", () => {
    it("should fetch dev info on mount", async () => {
      mockGetDevInfo.mockResolvedValueOnce({
        devMode: true,
        branch: "main",
      });

      render(<DevModeBadge />);

      await waitFor(() => {
        expect(mockGetDevInfo).toHaveBeenCalledTimes(1);
      });
    });

    it("should handle cleanup on unmount", async () => {
      mockGetDevInfo.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(
              () =>
                resolve({
                  devMode: true,
                  branch: "main",
                }),
              100,
            );
          }),
      );

      const { unmount } = render(<DevModeBadge />);

      // Unmount before promise resolves
      unmount();

      // Should not cause any errors
      await new Promise((resolve) => setTimeout(resolve, 150));
    });
  });

  describe("branch display variations", () => {
    it("should display long branch names", async () => {
      const longBranch = "feature/very-long-branch-name-with-many-parts";
      mockGetDevInfo.mockResolvedValueOnce({
        devMode: true,
        branch: longBranch,
      });

      render(<DevModeBadge />);

      await waitFor(() => {
        expect(screen.getByText(longBranch)).toBeInTheDocument();
      });
    });

    it("should display branch names with special characters", async () => {
      mockGetDevInfo.mockResolvedValueOnce({
        devMode: true,
        branch: "fix/issue-#123",
      });

      render(<DevModeBadge />);

      await waitFor(() => {
        expect(screen.getByText("fix/issue-#123")).toBeInTheDocument();
      });
    });

    it("should display empty string branch as no branch", async () => {
      mockGetDevInfo.mockResolvedValueOnce({
        devMode: true,
        branch: "",
      });

      render(<DevModeBadge />);

      await waitFor(() => {
        expect(screen.getByText("Dev")).toBeInTheDocument();
      });

      // Empty string is falsy, should not show branch
      expect(screen.queryByTestId("git-branch-icon")).not.toBeInTheDocument();
    });
  });
});
