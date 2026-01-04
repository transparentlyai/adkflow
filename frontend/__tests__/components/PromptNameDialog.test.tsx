import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PromptNameDialog from "@/components/PromptNameDialog";

// Mock FilePicker
vi.mock("@/components/FilePicker", () => ({
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
      <div data-testid="file-picker">
        <button onClick={() => onSelect("/test/file.md")}>Select File</button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    ) : null,
}));

describe("PromptNameDialog", () => {
  const defaultProps = {
    isOpen: true,
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("prompt type (default)", () => {
    it("should render with prompt title", () => {
      render(<PromptNameDialog {...defaultProps} />);
      expect(screen.getByText("Create New Prompt")).toBeInTheDocument();
    });

    it("should show file preview", () => {
      render(<PromptNameDialog {...defaultProps} />);
      expect(screen.getByText(/prompts\//)).toBeInTheDocument();
      expect(screen.getByText(/\.prompt\.md/)).toBeInTheDocument();
    });

    it("should call onSubmit with prompt name", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<PromptNameDialog {...defaultProps} onSubmit={onSubmit} />);

      await user.type(screen.getByRole("textbox"), "My Prompt");
      await user.click(screen.getByText("Create Prompt"));

      expect(onSubmit).toHaveBeenCalledWith("My Prompt");
    });

    it("should show error when name is empty", async () => {
      const user = userEvent.setup();
      render(<PromptNameDialog {...defaultProps} />);

      await user.click(screen.getByText("Create Prompt"));

      expect(
        screen.getByText("Please enter a prompt name"),
      ).toBeInTheDocument();
    });

    it("should call onCancel when cancel clicked", async () => {
      const user = userEvent.setup();
      const onCancel = vi.fn();
      render(<PromptNameDialog {...defaultProps} onCancel={onCancel} />);

      await user.click(screen.getByText("Cancel"));

      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe("context type", () => {
    it("should render with context title", () => {
      render(<PromptNameDialog {...defaultProps} type="context" />);
      expect(screen.getByText("Create New Static Context")).toBeInTheDocument();
    });

    it("should show context file preview", () => {
      render(<PromptNameDialog {...defaultProps} type="context" />);
      expect(screen.getByText(/static\//)).toBeInTheDocument();
      expect(screen.getByText(/\.context\.md/)).toBeInTheDocument();
    });
  });

  describe("tool type", () => {
    it("should render with tool title", () => {
      render(<PromptNameDialog {...defaultProps} type="tool" />);
      expect(screen.getByText("Create New Tool")).toBeInTheDocument();
    });

    it("should show python file preview", () => {
      render(<PromptNameDialog {...defaultProps} type="tool" />);
      expect(screen.getByText(/tools\//)).toBeInTheDocument();
      expect(screen.getByText(/\.py/)).toBeInTheDocument();
    });
  });

  describe("process type", () => {
    it("should render with process title", () => {
      render(<PromptNameDialog {...defaultProps} type="process" />);
      expect(screen.getByText("Create New Process")).toBeInTheDocument();
    });
  });

  describe("outputFile type", () => {
    it("should render with output file title", () => {
      render(<PromptNameDialog {...defaultProps} type="outputFile" />);
      expect(screen.getByText("Create New Output File")).toBeInTheDocument();
    });

    it("should show outputs directory", () => {
      render(<PromptNameDialog {...defaultProps} type="outputFile" />);
      expect(screen.getByText(/outputs\//)).toBeInTheDocument();
    });
  });

  describe("with select existing mode", () => {
    const propsWithExisting = {
      ...defaultProps,
      onSelectExisting: vi.fn(),
      projectPath: "/test/project",
    };

    it("should show mode selection", () => {
      render(<PromptNameDialog {...propsWithExisting} />);
      expect(screen.getByText("Create new file")).toBeInTheDocument();
      expect(screen.getByText("Select existing file")).toBeInTheDocument();
    });

    it("should show file picker when browsing", async () => {
      const user = userEvent.setup();
      render(<PromptNameDialog {...propsWithExisting} />);

      // Switch to existing mode using radio button
      const existingRadio = screen.getByRole("radio", {
        name: /Select existing file/i,
      });
      await user.click(existingRadio);
      // Click browse
      await user.click(screen.getByText("Browse..."));

      expect(screen.getByTestId("file-picker")).toBeInTheDocument();
    });

    it("should call onSelectExisting when file selected", async () => {
      const user = userEvent.setup();
      const onSelectExisting = vi.fn();
      render(
        <PromptNameDialog
          {...propsWithExisting}
          onSelectExisting={onSelectExisting}
        />,
      );

      // Click on the radio button itself
      const existingRadio = screen.getByRole("radio", {
        name: /Select existing file/i,
      });
      await user.click(existingRadio);
      await user.click(screen.getByText("Browse..."));
      // Use fireEvent since the file picker is in a portal with pointer-events
      fireEvent.click(screen.getByText("Select File"));

      expect(onSelectExisting).toHaveBeenCalledWith("/test/file.md");
    });
  });

  describe("when closed", () => {
    it("should not render content when not open", () => {
      render(<PromptNameDialog {...defaultProps} isOpen={false} />);
      expect(screen.queryByText("Create New Prompt")).not.toBeInTheDocument();
    });
  });

  describe("dialog close via onOpenChange", () => {
    it("should call onCancel when dialog is closed via escape key", async () => {
      const user = userEvent.setup();
      const onCancel = vi.fn();
      render(<PromptNameDialog {...defaultProps} onCancel={onCancel} />);

      // Press escape to close dialog which triggers onOpenChange(false)
      await user.keyboard("{Escape}");

      expect(onCancel).toHaveBeenCalled();
    });
  });
});
