import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LogSearchInput } from "@/components/LogExplorer/toolbar/LogSearchInput";

describe("LogSearchInput", () => {
  const defaultProps = {
    search: "",
    onSearchChange: vi.fn(),
  };

  describe("rendering", () => {
    it("should render search input", () => {
      render(<LogSearchInput {...defaultProps} />);
      expect(
        screen.getByPlaceholderText("Search messages..."),
      ).toBeInTheDocument();
    });

    it("should display search value", () => {
      render(<LogSearchInput {...defaultProps} search="test query" />);
      expect(screen.getByPlaceholderText("Search messages...")).toHaveValue(
        "test query",
      );
    });
  });

  describe("interaction", () => {
    it("should call onSearchChange when typing", () => {
      const onSearchChange = vi.fn();
      render(
        <LogSearchInput {...defaultProps} onSearchChange={onSearchChange} />,
      );

      fireEvent.change(screen.getByPlaceholderText("Search messages..."), {
        target: { value: "new search" },
      });

      expect(onSearchChange).toHaveBeenCalledWith("new search");
    });
  });

  describe("clear button", () => {
    it("should not show clear button when search is empty", () => {
      const { container } = render(<LogSearchInput {...defaultProps} />);
      // The clear button should not be present
      const buttons = container.querySelectorAll("button");
      expect(buttons.length).toBe(0);
    });

    it("should show clear button when search has value", () => {
      const { container } = render(
        <LogSearchInput {...defaultProps} search="test" />,
      );
      const buttons = container.querySelectorAll("button");
      expect(buttons.length).toBe(1);
    });

    it("should clear search when clear button clicked", () => {
      const onSearchChange = vi.fn();
      const { container } = render(
        <LogSearchInput
          {...defaultProps}
          search="test"
          onSearchChange={onSearchChange}
        />,
      );

      const clearButton = container.querySelector("button");
      fireEvent.click(clearButton!);

      expect(onSearchChange).toHaveBeenCalledWith("");
    });
  });
});
