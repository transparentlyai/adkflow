import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import EditorMenuBar from "@/components/EditorMenuBar";

// Mock ThemeContext
vi.mock("@/contexts/ThemeContext", () => ({
  useTheme: () => ({
    theme: {
      colors: {
        nodes: {
          common: {
            container: { border: "#000" },
            footer: { background: "#fff" },
          },
        },
      },
    },
  }),
}));

describe("EditorMenuBar", () => {
  it("should render with File menu", () => {
    render(<EditorMenuBar />);
    expect(screen.getByText("File")).toBeInTheDocument();
  });

  it("should render with onChangeFile handler", () => {
    const onChangeFile = vi.fn();
    render(<EditorMenuBar onChangeFile={onChangeFile} />);

    // Verify component renders with handler
    expect(screen.getByText("File")).toBeInTheDocument();
  });

  it("should show Save button when onSave is provided", () => {
    const onSave = vi.fn();
    render(<EditorMenuBar onSave={onSave} />);

    // Should show Save button
    const saveButtons = screen.getAllByText("Save");
    expect(saveButtons.length).toBeGreaterThan(0);
  });

  it("should call onSave when clicking Save button", () => {
    const onSave = vi.fn();
    render(<EditorMenuBar onSave={onSave} />);

    // Click the Save button (in the toolbar, not menu)
    const saveButton = screen.getByRole("button", { name: /save/i });
    fireEvent.click(saveButton);

    expect(onSave).toHaveBeenCalled();
  });

  it("should show Saving... when isSaving is true", () => {
    const onSave = vi.fn();
    render(<EditorMenuBar onSave={onSave} isSaving={true} />);

    expect(screen.getByText("Saving...")).toBeInTheDocument();
  });

  it("should disable Save button when isSaving is true", () => {
    const onSave = vi.fn();
    render(<EditorMenuBar onSave={onSave} isSaving={true} />);

    const saveButton = screen.getByRole("button", { name: /saving/i });
    expect(saveButton).toBeDisabled();
  });

  it("should apply orange styling when isDirty is true", () => {
    const onSave = vi.fn();
    render(<EditorMenuBar onSave={onSave} isDirty={true} />);

    const saveButton = screen.getByRole("button", { name: /save/i });
    expect(saveButton).toHaveClass("text-orange-500");
  });

  it("should render File trigger for file operations", () => {
    render(<EditorMenuBar filePath="/path/to/file.py" />);

    const fileTrigger = screen.getByText("File");
    expect(fileTrigger).toBeInTheDocument();
  });

  it("should apply custom className", () => {
    const { container } = render(<EditorMenuBar className="custom-class" />);

    expect(container.firstChild).toHaveClass("custom-class");
  });

  it("should not show Save button when onSave is not provided", () => {
    render(<EditorMenuBar />);

    const saveButton = screen.queryByRole("button", { name: /save/i });
    expect(saveButton).not.toBeInTheDocument();
  });
});
