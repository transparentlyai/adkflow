import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { DebugDialog } from "@/components/DebugDialog";

// Mock the useLoggingConfig hook
const mockUseLoggingConfig = vi.fn();
vi.mock("@/hooks/useLoggingConfig", () => ({
  useLoggingConfig: () => mockUseLoggingConfig(),
}));

// Mock the DebugPanelContent component
vi.mock("@/components/RunPanel/DebugPanelContent", () => ({
  DebugPanelContent: ({
    isLoading,
    error,
    config,
    categories,
    showHeader,
  }: {
    isLoading: boolean;
    error: string | null;
    config: unknown;
    categories: unknown[];
    showHeader: boolean;
    updateConfig: () => void;
    resetConfig: () => void;
  }) => (
    <div data-testid="debug-panel-content">
      <span data-testid="loading-state">
        {isLoading ? "loading" : "loaded"}
      </span>
      <span data-testid="error-state">{error || "no-error"}</span>
      <span data-testid="config-state">
        {config ? "has-config" : "no-config"}
      </span>
      <span data-testid="categories-count">{categories.length}</span>
      <span data-testid="show-header">{showHeader ? "true" : "false"}</span>
    </div>
  ),
}));

describe("DebugDialog", () => {
  const defaultHookReturn = {
    isLoading: false,
    error: null,
    config: { globalLevel: "INFO", categories: {} },
    categories: [],
    updateConfig: vi.fn(),
    resetConfig: vi.fn(),
  };

  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    projectPath: "/path/to/project",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseLoggingConfig.mockReturnValue(defaultHookReturn);
  });

  describe("rendering", () => {
    it("should render dialog when open", () => {
      render(<DebugDialog {...defaultProps} />);

      expect(screen.getByTestId("debug-panel-content")).toBeInTheDocument();
    });

    it("should not render dialog content when closed", () => {
      render(<DebugDialog {...defaultProps} open={false} />);

      expect(
        screen.queryByTestId("debug-panel-content"),
      ).not.toBeInTheDocument();
    });

    it("should have visually hidden title for accessibility", () => {
      render(<DebugDialog {...defaultProps} />);

      // The title exists but is visually hidden
      expect(screen.getByText("Debug Settings")).toBeInTheDocument();
    });
  });

  describe("loading state", () => {
    it("should pass isLoading=true to DebugPanelContent when loading", () => {
      mockUseLoggingConfig.mockReturnValue({
        ...defaultHookReturn,
        isLoading: true,
      });

      render(<DebugDialog {...defaultProps} />);

      expect(screen.getByTestId("loading-state")).toHaveTextContent("loading");
    });

    it("should pass isLoading=false to DebugPanelContent when loaded", () => {
      mockUseLoggingConfig.mockReturnValue({
        ...defaultHookReturn,
        isLoading: false,
      });

      render(<DebugDialog {...defaultProps} />);

      expect(screen.getByTestId("loading-state")).toHaveTextContent("loaded");
    });
  });

  describe("error state", () => {
    it("should pass error to DebugPanelContent when present", () => {
      mockUseLoggingConfig.mockReturnValue({
        ...defaultHookReturn,
        error: "Failed to load config",
      });

      render(<DebugDialog {...defaultProps} />);

      expect(screen.getByTestId("error-state")).toHaveTextContent(
        "Failed to load config",
      );
    });

    it("should pass null error when no error", () => {
      mockUseLoggingConfig.mockReturnValue({
        ...defaultHookReturn,
        error: null,
      });

      render(<DebugDialog {...defaultProps} />);

      expect(screen.getByTestId("error-state")).toHaveTextContent("no-error");
    });
  });

  describe("config and categories", () => {
    it("should pass config to DebugPanelContent", () => {
      mockUseLoggingConfig.mockReturnValue({
        ...defaultHookReturn,
        config: { globalLevel: "DEBUG", categories: { test: "INFO" } },
      });

      render(<DebugDialog {...defaultProps} />);

      expect(screen.getByTestId("config-state")).toHaveTextContent(
        "has-config",
      );
    });

    it("should pass null config when not available", () => {
      mockUseLoggingConfig.mockReturnValue({
        ...defaultHookReturn,
        config: null,
      });

      render(<DebugDialog {...defaultProps} />);

      expect(screen.getByTestId("config-state")).toHaveTextContent("no-config");
    });

    it("should pass categories to DebugPanelContent", () => {
      mockUseLoggingConfig.mockReturnValue({
        ...defaultHookReturn,
        categories: [
          { name: "cat1", description: "Category 1" },
          { name: "cat2", description: "Category 2" },
          { name: "cat3", description: "Category 3" },
        ],
      });

      render(<DebugDialog {...defaultProps} />);

      expect(screen.getByTestId("categories-count")).toHaveTextContent("3");
    });
  });

  describe("showHeader prop", () => {
    it("should pass showHeader=true to DebugPanelContent", () => {
      render(<DebugDialog {...defaultProps} />);

      expect(screen.getByTestId("show-header")).toHaveTextContent("true");
    });
  });

  describe("projectPath handling", () => {
    it("should work with null projectPath", () => {
      render(<DebugDialog {...defaultProps} projectPath={null} />);

      expect(screen.getByTestId("debug-panel-content")).toBeInTheDocument();
    });

    it("should work with undefined projectPath", () => {
      render(<DebugDialog {...defaultProps} projectPath={undefined} />);

      expect(screen.getByTestId("debug-panel-content")).toBeInTheDocument();
    });

    it("should work with valid projectPath", () => {
      render(<DebugDialog {...defaultProps} projectPath="/my/project" />);

      expect(screen.getByTestId("debug-panel-content")).toBeInTheDocument();
    });
  });

  describe("dialog styling", () => {
    it("should render dialog content element", () => {
      render(<DebugDialog {...defaultProps} />);

      // The dialog content should be in the document
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });
});
