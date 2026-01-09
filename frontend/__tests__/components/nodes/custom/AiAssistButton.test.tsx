import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import AiAssistButton from "@/components/nodes/custom/AiAssistButton";

describe("AiAssistButton", () => {
  const mockOnSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render the button with sparkles icon", () => {
      render(<AiAssistButton onSelect={mockOnSelect} />);
      const button = screen.getByRole("button", { name: /AI Assist/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute("title", "AI Assist");
    });

    it("should not render dropdown menu initially", () => {
      render(<AiAssistButton onSelect={mockOnSelect} />);
      expect(
        screen.queryByText("Help me create a prompt"),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText("Help me fix this prompt"),
      ).not.toBeInTheDocument();
    });
  });

  describe("dropdown interaction", () => {
    it("should open dropdown menu when button is clicked", async () => {
      const user = userEvent.setup();
      render(<AiAssistButton onSelect={mockOnSelect} />);
      const button = screen.getByRole("button", { name: /AI Assist/i });

      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText("Help me create a prompt")).toBeInTheDocument();
        expect(screen.getByText("Help me fix this prompt")).toBeInTheDocument();
      });
    });

    it("should call onSelect with 'create' when create option is clicked", async () => {
      const user = userEvent.setup();
      render(<AiAssistButton onSelect={mockOnSelect} />);
      const button = screen.getByRole("button", { name: /AI Assist/i });

      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText("Help me create a prompt")).toBeInTheDocument();
      });

      const createOption = screen.getByText("Help me create a prompt");
      await user.click(createOption);

      expect(mockOnSelect).toHaveBeenCalledWith("create");
      expect(mockOnSelect).toHaveBeenCalledTimes(1);
    });

    it("should call onSelect with 'fix' when fix option is clicked", async () => {
      const user = userEvent.setup();
      render(<AiAssistButton onSelect={mockOnSelect} />);
      const button = screen.getByRole("button", { name: /AI Assist/i });

      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText("Help me fix this prompt")).toBeInTheDocument();
      });

      const fixOption = screen.getByText("Help me fix this prompt");
      await user.click(fixOption);

      expect(mockOnSelect).toHaveBeenCalledWith("fix");
      expect(mockOnSelect).toHaveBeenCalledTimes(1);
    });

    it("should close dropdown after selecting an option", async () => {
      const user = userEvent.setup();
      render(<AiAssistButton onSelect={mockOnSelect} />);
      const button = screen.getByRole("button", { name: /AI Assist/i });

      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText("Help me create a prompt")).toBeInTheDocument();
      });

      const createOption = screen.getByText("Help me create a prompt");
      await user.click(createOption);

      await waitFor(() => {
        expect(
          screen.queryByText("Help me create a prompt"),
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("event propagation", () => {
    it("should stop propagation when button is clicked", () => {
      const parentClick = vi.fn();
      const { container } = render(
        <div onClick={parentClick}>
          <AiAssistButton onSelect={mockOnSelect} />
        </div>,
      );

      const button = screen.getByRole("button", { name: /AI Assist/i });
      fireEvent.click(button);

      expect(parentClick).not.toHaveBeenCalled();
    });

    it("should stop propagation when dropdown content is clicked", async () => {
      const user = userEvent.setup();
      const parentClick = vi.fn();
      render(
        <div onClick={parentClick}>
          <AiAssistButton onSelect={mockOnSelect} />
        </div>,
      );

      const button = screen.getByRole("button", { name: /AI Assist/i });
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText("Help me create a prompt")).toBeInTheDocument();
      });

      // Click on the dropdown content area (not a menu item)
      const dropdownContent = screen
        .getByText("Help me create a prompt")
        .closest('[role="menu"]');
      if (dropdownContent) {
        fireEvent.click(dropdownContent);
      }

      expect(parentClick).not.toHaveBeenCalled();
    });
  });

  describe("styling", () => {
    it("should have correct button styling classes", () => {
      render(<AiAssistButton onSelect={mockOnSelect} />);
      const button = screen.getByRole("button", { name: /AI Assist/i });

      expect(button).toHaveClass("flex");
      expect(button).toHaveClass("items-center");
      expect(button).toHaveClass("justify-center");
      expect(button).toHaveClass("rounded");
      expect(button).toHaveClass("hover:bg-white/20");
      expect(button).toHaveClass("transition-colors");
    });

    it("should render sparkles icon with correct size", () => {
      const { container } = render(
        <AiAssistButton onSelect={mockOnSelect} />,
      );
      const sparklesIcon = container.querySelector(".lucide-sparkles");
      expect(sparklesIcon).toBeInTheDocument();
      expect(sparklesIcon).toHaveClass("w-3");
      expect(sparklesIcon).toHaveClass("h-3");
      expect(sparklesIcon).toHaveClass("text-white");
    });

    it("should render dropdown with correct alignment", async () => {
      const user = userEvent.setup();
      render(<AiAssistButton onSelect={mockOnSelect} />);
      const button = screen.getByRole("button", { name: /AI Assist/i });

      await user.click(button);

      await waitFor(() => {
        const dropdown = screen
          .getByText("Help me create a prompt")
          .closest('[role="menu"]');
        expect(dropdown).toBeInTheDocument();
        expect(dropdown).toHaveClass("min-w-[200px]");
      });
    });
  });

  describe("accessibility", () => {
    it("should have accessible button with title", () => {
      render(<AiAssistButton onSelect={mockOnSelect} />);
      const button = screen.getByRole("button", { name: /AI Assist/i });
      expect(button).toHaveAttribute("title", "AI Assist");
    });

    it("should render menu items with sparkles icons", async () => {
      const user = userEvent.setup();
      render(<AiAssistButton onSelect={mockOnSelect} />);
      const button = screen.getByRole("button", { name: /AI Assist/i });

      await user.click(button);

      await waitFor(() => {
        // Menu items are rendered in a portal, so query the entire document
        const sparklesIcons =
          document.querySelectorAll(".lucide-sparkles");
        // 1 in button + 2 in menu items
        expect(sparklesIcons.length).toBeGreaterThanOrEqual(3);
      });
    });
  });
});
