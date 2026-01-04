import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProjectDialog from "@/components/ProjectDialog";

// Mock PathPicker
vi.mock("@/components/PathPicker", () => ({
  default: ({
    isOpen,
    onSelect,
    onCancel,
  }: {
    isOpen: boolean;
    onSelect: (path: string) => void;
    onCancel: () => void;
  }) =>
    isOpen ? (
      <div data-testid="path-picker">
        <button onClick={() => onSelect("/selected/path")}>Select Path</button>
        <button onClick={onCancel}>Cancel Picker</button>
      </div>
    ) : null,
}));

describe("ProjectDialog", () => {
  const defaultProps = {
    isOpen: true,
    onCreateNew: vi.fn(),
    onLoadExisting: vi.fn(),
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render dialog title", () => {
      render(<ProjectDialog {...defaultProps} />);
      expect(screen.getByText("Welcome to ADKFlow")).toBeInTheDocument();
    });

    it("should render mode tabs", () => {
      render(<ProjectDialog {...defaultProps} />);
      expect(screen.getByText("Create New Workflow")).toBeInTheDocument();
      expect(screen.getByText("Load Existing Workflow")).toBeInTheDocument();
    });

    it("should render project path button", () => {
      render(<ProjectDialog {...defaultProps} />);
      expect(screen.getByText("Click to browse...")).toBeInTheDocument();
    });
  });

  describe("create mode (default)", () => {
    it("should show create button", () => {
      render(<ProjectDialog {...defaultProps} />);
      expect(screen.getByText("Create Project")).toBeInTheDocument();
    });

    it("should show create instructions", () => {
      render(<ProjectDialog {...defaultProps} />);
      expect(screen.getByText("What happens next:")).toBeInTheDocument();
      expect(
        screen.getByText(/Start with a blank workflow/),
      ).toBeInTheDocument();
    });

    it("should call onCreateNew when submitted with path", async () => {
      const user = userEvent.setup();
      const onCreateNew = vi.fn();
      render(<ProjectDialog {...defaultProps} onCreateNew={onCreateNew} />);

      // Open path picker
      await user.click(screen.getByText("Click to browse..."));
      // Select a path
      fireEvent.click(screen.getByText("Select Path"));
      // Submit
      await user.click(screen.getByText("Create Project"));

      expect(onCreateNew).toHaveBeenCalledWith("/selected/path");
    });
  });

  describe("load mode", () => {
    it("should switch to load mode when tab clicked", async () => {
      const user = userEvent.setup();
      render(<ProjectDialog {...defaultProps} />);

      await user.click(screen.getByText("Load Existing Workflow"));

      expect(screen.getByText("Load Project")).toBeInTheDocument();
    });

    it("should start in load mode when initialMode is load", () => {
      render(<ProjectDialog {...defaultProps} initialMode="load" />);
      expect(screen.getByText("Load Project")).toBeInTheDocument();
    });

    it("should show load instructions", async () => {
      const user = userEvent.setup();
      render(<ProjectDialog {...defaultProps} />);

      await user.click(screen.getByText("Load Existing Workflow"));

      expect(screen.getByText("What will happen:")).toBeInTheDocument();
      expect(
        screen.getByText(/Load project from the selected path/),
      ).toBeInTheDocument();
    });

    it("should call onLoadExisting when submitted", async () => {
      const user = userEvent.setup();
      const onLoadExisting = vi.fn();
      render(
        <ProjectDialog {...defaultProps} onLoadExisting={onLoadExisting} />,
      );

      await user.click(screen.getByText("Load Existing Workflow"));
      await user.click(screen.getByText("Click to browse..."));
      fireEvent.click(screen.getByText("Select Path"));
      await user.click(screen.getByText("Load Project"));

      expect(onLoadExisting).toHaveBeenCalledWith("/selected/path");
    });
  });

  describe("validation", () => {
    it("should show error when no path selected", async () => {
      const user = userEvent.setup();
      render(<ProjectDialog {...defaultProps} />);

      await user.click(screen.getByText("Create Project"));

      expect(
        screen.getByText("Please select a project path"),
      ).toBeInTheDocument();
    });
  });

  describe("path picker", () => {
    it("should open path picker when button clicked", async () => {
      const user = userEvent.setup();
      render(<ProjectDialog {...defaultProps} />);

      await user.click(screen.getByText("Click to browse..."));

      expect(screen.getByTestId("path-picker")).toBeInTheDocument();
    });

    it("should update path when selected", async () => {
      const user = userEvent.setup();
      render(<ProjectDialog {...defaultProps} />);

      await user.click(screen.getByText("Click to browse..."));
      fireEvent.click(screen.getByText("Select Path"));

      expect(screen.getByText("/selected/path")).toBeInTheDocument();
    });

    it("should close path picker on cancel", async () => {
      const user = userEvent.setup();
      render(<ProjectDialog {...defaultProps} />);

      await user.click(screen.getByText("Click to browse..."));
      expect(screen.getByTestId("path-picker")).toBeInTheDocument();

      fireEvent.click(screen.getByText("Cancel Picker"));
      expect(screen.queryByTestId("path-picker")).not.toBeInTheDocument();
    });
  });

  describe("cancel button", () => {
    it("should call onClose when cancel clicked", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<ProjectDialog {...defaultProps} onClose={onClose} />);

      await user.click(screen.getByText("Cancel"));

      expect(onClose).toHaveBeenCalled();
    });

    it("should not render cancel when no onClose", () => {
      render(<ProjectDialog {...defaultProps} onClose={undefined} />);
      expect(screen.queryByText("Cancel")).not.toBeInTheDocument();
    });
  });

  describe("when closed", () => {
    it("should not render when not open", () => {
      render(<ProjectDialog {...defaultProps} isOpen={false} />);
      expect(screen.queryByText("Welcome to ADKFlow")).not.toBeInTheDocument();
    });
  });
});
