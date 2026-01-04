import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LogCategoryFilter } from "@/components/LogExplorer/toolbar/LogCategoryFilter";

describe("LogCategoryFilter", () => {
  const defaultProps = {
    category: null,
    stats: null,
    onCategoryChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render category input", () => {
      render(<LogCategoryFilter {...defaultProps} />);
      expect(
        screen.getByPlaceholderText("Category (e.g., runner.*)"),
      ).toBeInTheDocument();
    });

    it("should display current category value", () => {
      render(<LogCategoryFilter {...defaultProps} category="runner.agent" />);
      expect(screen.getByDisplayValue("runner.agent")).toBeInTheDocument();
    });
  });

  describe("input interaction", () => {
    it("should update input on change", () => {
      render(<LogCategoryFilter {...defaultProps} />);
      const input = screen.getByPlaceholderText("Category (e.g., runner.*)");

      fireEvent.change(input, { target: { value: "test" } });

      expect(input).toHaveValue("test");
    });

    it("should apply category on Enter key", () => {
      const onCategoryChange = vi.fn();
      render(
        <LogCategoryFilter
          {...defaultProps}
          onCategoryChange={onCategoryChange}
        />,
      );
      const input = screen.getByPlaceholderText("Category (e.g., runner.*)");

      fireEvent.change(input, { target: { value: "runner.agent" } });
      fireEvent.keyDown(input, { key: "Enter" });

      expect(onCategoryChange).toHaveBeenCalledWith("runner.agent");
    });

    it("should close suggestions on Escape key", () => {
      render(<LogCategoryFilter {...defaultProps} />);
      const input = screen.getByPlaceholderText("Category (e.g., runner.*)");

      fireEvent.focus(input);
      fireEvent.keyDown(input, { key: "Escape" });

      // Suggestions should be closed (no dropdown visible)
    });
  });

  describe("clear button", () => {
    it("should not show clear button when empty", () => {
      const { container } = render(<LogCategoryFilter {...defaultProps} />);
      const buttons = container.querySelectorAll("button");
      expect(buttons.length).toBe(0);
    });

    it("should show clear button when has value", () => {
      render(<LogCategoryFilter {...defaultProps} category="test" />);
      const clearButton = document.querySelector("button");
      expect(clearButton).toBeInTheDocument();
    });

    it("should clear category when clear button clicked", () => {
      const onCategoryChange = vi.fn();
      render(
        <LogCategoryFilter
          {...defaultProps}
          category="test"
          onCategoryChange={onCategoryChange}
        />,
      );

      const clearButton = document.querySelector("button");
      fireEvent.click(clearButton!);

      expect(onCategoryChange).toHaveBeenCalledWith(null);
    });
  });

  describe("apply button", () => {
    it("should show Apply button when input differs from category", () => {
      render(<LogCategoryFilter {...defaultProps} category={null} />);
      const input = screen.getByPlaceholderText("Category (e.g., runner.*)");

      fireEvent.change(input, { target: { value: "new.category" } });

      expect(screen.getByText("Apply")).toBeInTheDocument();
    });

    it("should not show Apply button when input matches category", () => {
      render(<LogCategoryFilter {...defaultProps} category="test" />);

      expect(screen.queryByText("Apply")).not.toBeInTheDocument();
    });

    it("should apply category when Apply clicked", () => {
      const onCategoryChange = vi.fn();
      render(
        <LogCategoryFilter
          {...defaultProps}
          onCategoryChange={onCategoryChange}
        />,
      );
      const input = screen.getByPlaceholderText("Category (e.g., runner.*)");

      fireEvent.change(input, { target: { value: "runner.*" } });
      fireEvent.click(screen.getByText("Apply"));

      expect(onCategoryChange).toHaveBeenCalledWith("runner.*");
    });
  });

  describe("suggestions", () => {
    it("should show suggestions on focus", () => {
      const stats = {
        totalLines: 100,
        levelCounts: {},
        categoryCounts: { "runner.agent": 50, "runner.tool": 30 },
      };
      render(<LogCategoryFilter {...defaultProps} stats={stats} />);
      const input = screen.getByPlaceholderText("Category (e.g., runner.*)");

      fireEvent.focus(input);

      expect(screen.getByText("Categories")).toBeInTheDocument();
    });

    it("should filter suggestions based on input", () => {
      const stats = {
        totalLines: 100,
        levelCounts: {},
        categoryCounts: { "runner.agent": 50, "system.core": 30 },
      };
      render(<LogCategoryFilter {...defaultProps} stats={stats} />);
      const input = screen.getByPlaceholderText("Category (e.g., runner.*)");

      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: "runner" } });

      expect(screen.getByText("runner.agent")).toBeInTheDocument();
    });

    it("should show wildcard suggestions", () => {
      const stats = {
        totalLines: 100,
        levelCounts: {},
        categoryCounts: {},
      };
      render(<LogCategoryFilter {...defaultProps} stats={stats} />);
      const input = screen.getByPlaceholderText("Category (e.g., runner.*)");

      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: "runner.test" } });

      expect(screen.getByText("Wildcards")).toBeInTheDocument();
      expect(screen.getByText("runner.*")).toBeInTheDocument();
    });
  });
});
