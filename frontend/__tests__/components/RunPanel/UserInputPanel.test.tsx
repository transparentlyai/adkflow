import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import UserInputPanel from "@/components/RunPanel/UserInputPanel";
import type { UserInputRequest } from "@/lib/types";

// Mock the isMacOS utility
vi.mock("@/lib/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/utils")>();
  return {
    ...actual,
    isMacOS: vi.fn(() => false),
  };
});

describe("UserInputPanel", () => {
  const mockPendingInput: UserInputRequest = {
    node_name: "TestAgent",
    variable_name: "user_response",
    previous_output: null,
  };

  const defaultProps = {
    pendingInput: mockPendingInput,
    userInputValue: "",
    setUserInputValue: vi.fn(),
    isSubmittingInput: false,
    onSubmit: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render the node name", () => {
      render(<UserInputPanel {...defaultProps} />);
      expect(screen.getByText("TestAgent")).toBeInTheDocument();
    });

    it("should render the variable name", () => {
      render(<UserInputPanel {...defaultProps} />);
      expect(screen.getByText("Variable: {user_response}")).toBeInTheDocument();
    });

    it("should render the textarea with placeholder", () => {
      render(<UserInputPanel {...defaultProps} />);
      expect(
        screen.getByPlaceholderText("Enter your response..."),
      ).toBeInTheDocument();
    });

    it("should render the submit button", () => {
      render(<UserInputPanel {...defaultProps} />);
      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    it("should show keyboard shortcut hint", () => {
      render(<UserInputPanel {...defaultProps} />);
      expect(screen.getByText(/Enter to submit/)).toBeInTheDocument();
    });
  });

  describe("previous output", () => {
    it("should not show previous output section when null", () => {
      render(<UserInputPanel {...defaultProps} />);
      expect(screen.queryByText("Previous output:")).not.toBeInTheDocument();
    });

    it("should show previous output when present", () => {
      const pendingInput = {
        ...mockPendingInput,
        previous_output: "Previous result text",
      };
      render(<UserInputPanel {...defaultProps} pendingInput={pendingInput} />);
      expect(screen.getByText("Previous output:")).toBeInTheDocument();
      expect(screen.getByText("Previous result text")).toBeInTheDocument();
    });

    it("should truncate long previous output", () => {
      const longOutput = "a".repeat(600);
      const pendingInput = {
        ...mockPendingInput,
        previous_output: longOutput,
      };
      render(<UserInputPanel {...defaultProps} pendingInput={pendingInput} />);
      expect(screen.getByText(/\.\.\.$/)).toBeInTheDocument();
    });
  });

  describe("input interaction", () => {
    it("should call setUserInputValue when typing", () => {
      const setUserInputValue = vi.fn();
      render(
        <UserInputPanel
          {...defaultProps}
          setUserInputValue={setUserInputValue}
        />,
      );

      fireEvent.change(screen.getByPlaceholderText("Enter your response..."), {
        target: { value: "test input" },
      });

      expect(setUserInputValue).toHaveBeenCalledWith("test input");
    });

    it("should display the current user input value", () => {
      render(
        <UserInputPanel {...defaultProps} userInputValue="current value" />,
      );
      expect(screen.getByDisplayValue("current value")).toBeInTheDocument();
    });
  });

  describe("submit button", () => {
    it("should be disabled when input is empty", () => {
      render(<UserInputPanel {...defaultProps} userInputValue="" />);
      expect(screen.getByRole("button")).toBeDisabled();
    });

    it("should be disabled when input is only whitespace", () => {
      render(<UserInputPanel {...defaultProps} userInputValue="   " />);
      expect(screen.getByRole("button")).toBeDisabled();
    });

    it("should be enabled when input has value", () => {
      render(<UserInputPanel {...defaultProps} userInputValue="valid input" />);
      expect(screen.getByRole("button")).not.toBeDisabled();
    });

    it("should be disabled when submitting", () => {
      render(
        <UserInputPanel
          {...defaultProps}
          userInputValue="valid input"
          isSubmittingInput={true}
        />,
      );
      expect(screen.getByRole("button")).toBeDisabled();
    });

    it("should call onSubmit when clicked", () => {
      const onSubmit = vi.fn();
      render(
        <UserInputPanel
          {...defaultProps}
          userInputValue="valid input"
          onSubmit={onSubmit}
        />,
      );

      fireEvent.click(screen.getByRole("button"));
      expect(onSubmit).toHaveBeenCalled();
    });
  });

  describe("keyboard shortcuts", () => {
    it("should call onSubmit on Ctrl+Enter", () => {
      const onSubmit = vi.fn();
      render(
        <UserInputPanel
          {...defaultProps}
          userInputValue="valid input"
          onSubmit={onSubmit}
        />,
      );

      fireEvent.keyDown(screen.getByPlaceholderText("Enter your response..."), {
        key: "Enter",
        ctrlKey: true,
      });

      expect(onSubmit).toHaveBeenCalled();
    });

    it("should call onSubmit on Meta+Enter (Mac)", () => {
      const onSubmit = vi.fn();
      render(
        <UserInputPanel
          {...defaultProps}
          userInputValue="valid input"
          onSubmit={onSubmit}
        />,
      );

      fireEvent.keyDown(screen.getByPlaceholderText("Enter your response..."), {
        key: "Enter",
        metaKey: true,
      });

      expect(onSubmit).toHaveBeenCalled();
    });

    it("should not call onSubmit on Enter alone", () => {
      const onSubmit = vi.fn();
      render(
        <UserInputPanel
          {...defaultProps}
          userInputValue="valid input"
          onSubmit={onSubmit}
        />,
      );

      fireEvent.keyDown(screen.getByPlaceholderText("Enter your response..."), {
        key: "Enter",
      });

      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe("disabled state", () => {
    it("should disable textarea when submitting", () => {
      render(<UserInputPanel {...defaultProps} isSubmittingInput={true} />);
      expect(
        screen.getByPlaceholderText("Enter your response..."),
      ).toBeDisabled();
    });
  });
});
