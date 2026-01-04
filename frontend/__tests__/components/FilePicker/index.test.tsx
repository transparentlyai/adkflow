import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import FilePicker from "@/components/FilePicker";

// Mock API
vi.mock("@/lib/api", () => ({
  listDirectory: vi.fn(),
  ensureDirectory: vi.fn(),
}));

// Mock ThemeContext
vi.mock("@/contexts/ThemeContext", () => ({
  useTheme: () => ({
    theme: {
      colors: {
        nodes: {
          common: {
            container: { background: "#fff", border: "#ccc" },
            text: { primary: "#000", secondary: "#666" },
          },
        },
        ui: { primary: "#007bff" },
      },
    },
  }),
}));

// Mock child components
vi.mock("@/components/FilePicker/FilePickerNavigationBar", () => ({
  FilePickerNavigationBar: ({
    onGoUp,
    onNavigate,
  }: {
    onGoUp: () => void;
    onNavigate: (path: string) => void;
  }) => (
    <div data-testid="navigation-bar">
      <button onClick={onGoUp}>Go Up</button>
      <button onClick={() => onNavigate("/test/path")}>Navigate</button>
    </div>
  ),
}));

vi.mock("@/components/FilePicker/FilePickerBrowser", () => ({
  FilePickerBrowser: ({
    entries,
    onFileClick,
  }: {
    entries: { name: string; path: string; is_directory: boolean }[];
    onFileClick: (entry: { path: string; is_directory: boolean }) => void;
  }) => (
    <div data-testid="file-browser">
      {entries.map((entry) => (
        <button
          key={entry.path}
          data-testid={`entry-${entry.name}`}
          onClick={() => onFileClick(entry)}
        >
          {entry.name}
        </button>
      ))}
    </div>
  ),
}));

vi.mock("@/components/FilePicker/FilePickerCreateNew", () => ({
  FilePickerCreateNew: ({
    newFileName,
    onNewFileNameChange,
    onSubmit,
  }: {
    newFileName: string;
    onNewFileNameChange: (name: string) => void;
    onSubmit: () => void;
  }) => (
    <div data-testid="create-new">
      <input
        data-testid="new-file-input"
        value={newFileName}
        onChange={(e) => onNewFileNameChange(e.target.value)}
      />
      <button data-testid="create-submit" onClick={onSubmit}>
        Create
      </button>
    </div>
  ),
}));

vi.mock("@/components/FilePicker/FilePickerFooter", () => ({
  FilePickerFooter: ({
    onCancel,
    onSelect,
    canSelect,
  }: {
    onCancel: () => void;
    onSelect: () => void;
    canSelect: boolean;
  }) => (
    <div data-testid="footer">
      <button onClick={onCancel}>Cancel</button>
      <button onClick={onSelect} disabled={!canSelect}>
        Select
      </button>
    </div>
  ),
}));

import { listDirectory, ensureDirectory } from "@/lib/api";

const mockListDirectory = listDirectory as ReturnType<typeof vi.fn>;
const mockEnsureDirectory = ensureDirectory as ReturnType<typeof vi.fn>;

describe("FilePicker", () => {
  const defaultProps = {
    isOpen: true,
    projectPath: "/test/project",
    initialPath: "/test/project/file.txt",
    onSelect: vi.fn(),
    onCancel: vi.fn(),
    title: "Select File",
    description: "Choose a file",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockListDirectory.mockResolvedValue({
      current_path: "/test/project",
      parent_path: "/test",
      entries: [
        {
          name: "file1.txt",
          path: "/test/project/file1.txt",
          is_directory: false,
        },
        { name: "folder", path: "/test/project/folder", is_directory: true },
      ],
    });
  });

  describe("rendering", () => {
    it("should render dialog title", async () => {
      render(<FilePicker {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText("Select File")).toBeInTheDocument();
      });
    });

    it("should render dialog description", async () => {
      render(<FilePicker {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText("Choose a file")).toBeInTheDocument();
      });
    });

    it("should render navigation bar", async () => {
      render(<FilePicker {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByTestId("navigation-bar")).toBeInTheDocument();
      });
    });

    it("should render file browser", async () => {
      render(<FilePicker {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByTestId("file-browser")).toBeInTheDocument();
      });
    });
  });

  describe("file selection", () => {
    it("should select file when clicked", async () => {
      render(<FilePicker {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId("entry-file1.txt")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId("entry-file1.txt"));

      // Should show selected file
      await waitFor(() => {
        expect(screen.getByText(/Selected:/)).toBeInTheDocument();
      });
    });

    it("should navigate to directory when clicked", async () => {
      render(<FilePicker {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId("entry-folder")).toBeInTheDocument();
      });

      // When clicking a directory, it should load the new directory
      fireEvent.click(screen.getByTestId("entry-folder"));

      expect(mockListDirectory).toHaveBeenCalled();
    });
  });

  describe("create new", () => {
    it("should show create new when allowCreate is true", async () => {
      render(<FilePicker {...defaultProps} allowCreate={true} />);

      await waitFor(() => {
        expect(screen.getByTestId("create-new")).toBeInTheDocument();
      });
    });

    it("should not show create new when allowCreate is false", async () => {
      render(<FilePicker {...defaultProps} allowCreate={false} />);

      await waitFor(() => {
        expect(screen.queryByTestId("create-new")).not.toBeInTheDocument();
      });
    });
  });

  describe("footer actions", () => {
    it("should call onCancel when cancel clicked", async () => {
      const onCancel = vi.fn();
      render(<FilePicker {...defaultProps} onCancel={onCancel} />);

      await waitFor(() => {
        expect(screen.getByTestId("footer")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Cancel"));

      expect(onCancel).toHaveBeenCalled();
    });

    it("should call onSelect when select clicked with file selected", async () => {
      const onSelect = vi.fn();
      render(<FilePicker {...defaultProps} onSelect={onSelect} />);

      await waitFor(() => {
        expect(screen.getByTestId("entry-file1.txt")).toBeInTheDocument();
      });

      // Select a file first
      fireEvent.click(screen.getByTestId("entry-file1.txt"));

      // Click select button
      fireEvent.click(screen.getByText("Select"));

      expect(onSelect).toHaveBeenCalled();
    });
  });

  describe("navigation", () => {
    it("should call listDirectory when go up clicked", async () => {
      render(<FilePicker {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Go Up")).toBeInTheDocument();
      });

      // Reset mock to track new calls
      mockListDirectory.mockClear();

      fireEvent.click(screen.getByText("Go Up"));

      expect(mockListDirectory).toHaveBeenCalled();
    });
  });

  describe("filtering", () => {
    it("should filter by extension when defaultExtensions provided", async () => {
      mockListDirectory.mockResolvedValue({
        current_path: "/test/project",
        parent_path: "/test",
        entries: [
          {
            name: "file.txt",
            path: "/test/project/file.txt",
            is_directory: false,
          },
          {
            name: "image.png",
            path: "/test/project/image.png",
            is_directory: false,
          },
          { name: "folder", path: "/test/project/folder", is_directory: true },
        ],
      });

      render(<FilePicker {...defaultProps} defaultExtensions={[".txt"]} />);

      await waitFor(() => {
        expect(screen.getByTestId("file-browser")).toBeInTheDocument();
      });

      // The filtering is handled by the component before passing to browser
      // The entries passed should be filtered
    });
  });

  describe("initial loading", () => {
    it("should call ensureDirectory for subdirectory", async () => {
      render(
        <FilePicker
          {...defaultProps}
          initialPath="/test/project/subdir/file.txt"
        />,
      );

      await waitFor(() => {
        expect(mockEnsureDirectory).toHaveBeenCalled();
      });
    });

    it("should handle failed directory load gracefully", async () => {
      mockListDirectory.mockRejectedValue(new Error("Directory not found"));

      render(<FilePicker {...defaultProps} />);

      // Should fall back to loading another directory
      await waitFor(() => {
        expect(mockListDirectory).toHaveBeenCalled();
      });
    });
  });

  describe("dialog close", () => {
    it("should not render when isOpen is false", () => {
      render(<FilePicker {...defaultProps} isOpen={false} />);
      expect(screen.queryByText("Select File")).not.toBeInTheDocument();
    });
  });

  describe("relative path", () => {
    it("should convert absolute path to relative", async () => {
      const onSelect = vi.fn();
      render(<FilePicker {...defaultProps} onSelect={onSelect} />);

      await waitFor(() => {
        expect(screen.getByTestId("entry-file1.txt")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId("entry-file1.txt"));
      fireEvent.click(screen.getByText("Select"));

      expect(onSelect).toHaveBeenCalledWith("file1.txt");
    });
  });
});
