import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import LocationBadge from "@/components/LocationBadge";

// Mock lucide-react
vi.mock("lucide-react", () => ({
  MapPin: () => <svg data-testid="map-pin-icon" />,
}));

// Mock the API
const mockLoadProjectSettings = vi.fn();
vi.mock("@/lib/api", () => ({
  loadProjectSettings: (...args: unknown[]) => mockLoadProjectSettings(...args),
}));

// Mock the constants
vi.mock("@/lib/constants/modelSchemas", () => ({
  VERTEX_AI_LOCATIONS: [
    { value: "us-central1", label: "US Central (Iowa)" },
    { value: "europe-west1", label: "Europe (Belgium)" },
    { value: "asia-northeast1", label: "Asia (Tokyo)" },
    { value: "global", label: "Global (Auto)" },
  ],
}));

describe("LocationBadge", () => {
  const defaultProps = {
    projectPath: "/home/user/project",
    onOpenSettings: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadProjectSettings.mockResolvedValue({
      env: {
        googleCloudLocation: "us-central1",
      },
    });
  });

  describe("rendering", () => {
    it("should render nothing when projectPath is null", () => {
      const { container } = render(
        <LocationBadge {...defaultProps} projectPath={null} />,
      );
      expect(container.firstChild).toBeNull();
    });

    it("should render the badge when projectPath is provided", async () => {
      render(<LocationBadge {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId("map-pin-icon")).toBeInTheDocument();
      });
    });

    it("should render loading state initially", async () => {
      // Make API slow
      mockLoadProjectSettings.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000)),
      );

      render(<LocationBadge {...defaultProps} />);

      expect(screen.getByText("...")).toBeInTheDocument();
    });

    it("should display abbreviated location name", async () => {
      render(<LocationBadge {...defaultProps} />);

      await waitFor(() => {
        // Should show "US Central" not "US Central (Iowa)"
        expect(screen.getByText("US Central")).toBeInTheDocument();
      });
    });

    it("should display full location in tooltip", async () => {
      render(<LocationBadge {...defaultProps} />);

      await waitFor(() => {
        const button = screen.getByRole("button");
        expect(button).toHaveAttribute(
          "title",
          "Location: US Central (Iowa) (click to change)",
        );
      });
    });
  });

  describe("location loading", () => {
    it("should load location from project settings", async () => {
      render(<LocationBadge {...defaultProps} />);

      await waitFor(() => {
        expect(mockLoadProjectSettings).toHaveBeenCalledWith(
          "/home/user/project",
        );
      });
    });

    it("should display loaded location", async () => {
      mockLoadProjectSettings.mockResolvedValue({
        env: {
          googleCloudLocation: "europe-west1",
        },
      });

      render(<LocationBadge {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Europe")).toBeInTheDocument();
      });
    });

    it("should fall back to us-central1 when location is not set", async () => {
      mockLoadProjectSettings.mockResolvedValue({
        env: {
          googleCloudLocation: undefined,
        },
      });

      render(<LocationBadge {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("US Central")).toBeInTheDocument();
      });
    });

    it("should fall back to us-central1 on API error", async () => {
      mockLoadProjectSettings.mockRejectedValue(new Error("API Error"));

      render(<LocationBadge {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("US Central")).toBeInTheDocument();
      });
    });

    it("should reload when projectPath changes", async () => {
      const { rerender } = render(<LocationBadge {...defaultProps} />);

      await waitFor(() => {
        expect(mockLoadProjectSettings).toHaveBeenCalledWith(
          "/home/user/project",
        );
      });

      mockLoadProjectSettings.mockResolvedValue({
        env: {
          googleCloudLocation: "asia-northeast1",
        },
      });

      rerender(
        <LocationBadge {...defaultProps} projectPath="/home/user/project2" />,
      );

      await waitFor(() => {
        expect(mockLoadProjectSettings).toHaveBeenCalledWith(
          "/home/user/project2",
        );
        expect(screen.getByText("Asia")).toBeInTheDocument();
      });
    });

    it("should reload when refreshKey changes", async () => {
      const { rerender } = render(
        <LocationBadge {...defaultProps} refreshKey={0} />,
      );

      await waitFor(() => {
        expect(mockLoadProjectSettings).toHaveBeenCalledTimes(1);
      });

      rerender(<LocationBadge {...defaultProps} refreshKey={1} />);

      await waitFor(() => {
        expect(mockLoadProjectSettings).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe("click behavior", () => {
    it("should call onOpenSettings when clicked", async () => {
      const onOpenSettings = vi.fn();
      render(
        <LocationBadge {...defaultProps} onOpenSettings={onOpenSettings} />,
      );

      await waitFor(() => {
        expect(screen.getByText("US Central")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button"));

      expect(onOpenSettings).toHaveBeenCalledTimes(1);
    });
  });

  describe("location display", () => {
    it("should show raw location value for unknown locations", async () => {
      mockLoadProjectSettings.mockResolvedValue({
        env: {
          googleCloudLocation: "unknown-region",
        },
      });

      render(<LocationBadge {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("unknown-region")).toBeInTheDocument();
      });
    });

    it("should abbreviate location labels correctly", async () => {
      mockLoadProjectSettings.mockResolvedValue({
        env: {
          googleCloudLocation: "asia-northeast1",
        },
      });

      render(<LocationBadge {...defaultProps} />);

      await waitFor(() => {
        // "Asia (Tokyo)" should become "Asia"
        expect(screen.getByText("Asia")).toBeInTheDocument();
      });
    });

    it("should handle locations without parentheses", async () => {
      mockLoadProjectSettings.mockResolvedValue({
        env: {
          googleCloudLocation: "global",
        },
      });

      render(<LocationBadge {...defaultProps} />);

      await waitFor(() => {
        // "Global (Auto)" should become "Global"
        expect(screen.getByText("Global")).toBeInTheDocument();
      });
    });
  });

  describe("styling", () => {
    it("should have proper styling classes", async () => {
      render(<LocationBadge {...defaultProps} />);

      await waitFor(() => {
        const button = screen.getByRole("button");
        expect(button).toHaveClass("flex");
        expect(button).toHaveClass("items-center");
        expect(button).toHaveClass("gap-1.5");
        expect(button).toHaveClass("text-xs");
      });
    });

    it("should have hover styles", async () => {
      render(<LocationBadge {...defaultProps} />);

      await waitFor(() => {
        const button = screen.getByRole("button");
        expect(button).toHaveClass("hover:text-foreground");
        expect(button).toHaveClass("hover:bg-accent/50");
      });
    });
  });

  describe("cleanup", () => {
    it("should cancel pending API call on unmount", async () => {
      let resolvePromise: (value: unknown) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockLoadProjectSettings.mockReturnValue(pendingPromise);

      const { unmount } = render(<LocationBadge {...defaultProps} />);

      unmount();

      // Resolve after unmount - should not cause state update
      resolvePromise!({
        env: { googleCloudLocation: "europe-west1" },
      });

      // No error should be thrown
    });

    it("should cancel pending API call when projectPath changes", async () => {
      let resolveFirst: (value: unknown) => void;
      const firstPromise = new Promise((resolve) => {
        resolveFirst = resolve;
      });
      mockLoadProjectSettings.mockReturnValueOnce(firstPromise);

      const { rerender } = render(<LocationBadge {...defaultProps} />);

      // Change project path before first request resolves
      mockLoadProjectSettings.mockResolvedValue({
        env: { googleCloudLocation: "asia-northeast1" },
      });

      rerender(<LocationBadge {...defaultProps} projectPath="/new/path" />);

      await waitFor(() => {
        expect(screen.getByText("Asia")).toBeInTheDocument();
      });

      // Resolve first promise after second - should be ignored
      resolveFirst!({
        env: { googleCloudLocation: "europe-west1" },
      });

      // Should still show Asia, not Europe
      expect(screen.getByText("Asia")).toBeInTheDocument();
    });
  });

  describe("edge cases", () => {
    it("should handle empty string projectPath", () => {
      // Empty string is falsy, should not render
      const { container } = render(
        <LocationBadge {...defaultProps} projectPath="" />,
      );

      // Component checks for truthy projectPath
      expect(mockLoadProjectSettings).not.toHaveBeenCalled();
    });

    it("should handle missing env in response", async () => {
      mockLoadProjectSettings.mockResolvedValue({
        env: {},
      });

      render(<LocationBadge {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("US Central")).toBeInTheDocument();
      });
    });
  });
});
