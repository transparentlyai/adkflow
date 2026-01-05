import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LogToolbarActions } from "@/components/LogExplorer/toolbar/LogToolbarActions";

describe("LogToolbarActions", () => {
  const defaultProps = {
    formatJson: false,
    hasActiveFilters: false,
    onFormatJsonChange: vi.fn(),
    onResetFilters: vi.fn(),
  };

  describe("format json button", () => {
    it("should render Format JSON button", () => {
      render(<LogToolbarActions {...defaultProps} />);
      expect(screen.getByText("Format JSON")).toBeInTheDocument();
    });

    it("should toggle formatJson when clicked", () => {
      const onFormatJsonChange = vi.fn();
      render(
        <LogToolbarActions
          {...defaultProps}
          formatJson={false}
          onFormatJsonChange={onFormatJsonChange}
        />,
      );

      fireEvent.click(screen.getByText("Format JSON"));

      expect(onFormatJsonChange).toHaveBeenCalledWith(true);
    });

    it("should toggle off when formatJson is true", () => {
      const onFormatJsonChange = vi.fn();
      render(
        <LogToolbarActions
          {...defaultProps}
          formatJson={true}
          onFormatJsonChange={onFormatJsonChange}
        />,
      );

      fireEvent.click(screen.getByText("Format JSON"));

      expect(onFormatJsonChange).toHaveBeenCalledWith(false);
    });
  });

  describe("clear filters button", () => {
    it("should not show Clear filters when no active filters", () => {
      render(<LogToolbarActions {...defaultProps} />);
      expect(screen.queryByText("Clear filters")).not.toBeInTheDocument();
    });

    it("should show Clear filters when hasActiveFilters is true", () => {
      render(<LogToolbarActions {...defaultProps} hasActiveFilters={true} />);
      expect(screen.getByText("Clear filters")).toBeInTheDocument();
    });

    it("should call onResetFilters when Clear filters clicked", () => {
      const onResetFilters = vi.fn();
      render(
        <LogToolbarActions
          {...defaultProps}
          hasActiveFilters={true}
          onResetFilters={onResetFilters}
        />,
      );

      fireEvent.click(screen.getByText("Clear filters"));

      expect(onResetFilters).toHaveBeenCalled();
    });
  });
});
