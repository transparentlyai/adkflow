import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PathPicker from "@/components/PathPicker";

// Mock the API
vi.mock("@/lib/api", () => ({
  listDirectory: vi.fn().mockResolvedValue({
    current_path: "/home/user",
    parent_path: "/home",
    entries: [],
  }),
  createDirectory: vi.fn().mockResolvedValue({ path: "/home/user/newdir" }),
}));

// Mock ThemeContext
vi.mock("@/contexts/ThemeContext", () => ({
  useTheme: () => ({
    theme: {
      colors: {
        nodes: {
          common: {
            container: { background: "#fff", border: "#ccc" },
            text: { primary: "#000", secondary: "#666", muted: "#999" },
            footer: { background: "#f5f5f5" },
          },
        },
        ui: { muted: "#eee", border: "#ddd", accent: "#e0e0e0" },
      },
    },
  }),
}));

const { listDirectory, createDirectory } = await import("@/lib/api");
const mockListDirectory = listDirectory as ReturnType<typeof vi.fn>;
const mockCreateDirectory = createDirectory as ReturnType<typeof vi.fn>;

describe("PathPicker", () => {
  const defaultProps = {
    isOpen: true,
    onSelect: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockListDirectory.mockResolvedValue({
      current_path: "/home/user",
      parent_path: "/home",
      entries: [],
    });
  });

  describe("when closed", () => {
    it("should not render when isOpen is false", () => {
      render(<PathPicker {...defaultProps} isOpen={false} />);
      expect(screen.queryByText("Select Directory")).not.toBeInTheDocument();
    });
  });

  describe("header", () => {
    it("should render default title", async () => {
      render(<PathPicker {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText("Select Directory")).toBeInTheDocument();
      });
    });

    it("should render custom title", async () => {
      render(<PathPicker {...defaultProps} title="Choose Folder" />);
      await waitFor(() => {
        expect(screen.getByText("Choose Folder")).toBeInTheDocument();
      });
    });

    it("should render default description", async () => {
      render(<PathPicker {...defaultProps} />);
      await waitFor(() => {
        expect(
          screen.getByText("Choose a directory for your project"),
        ).toBeInTheDocument();
      });
    });

    it("should render custom description", async () => {
      render(<PathPicker {...defaultProps} description="Pick a location" />);
      await waitFor(() => {
        expect(screen.getByText("Pick a location")).toBeInTheDocument();
      });
    });
  });

  describe("navigation", () => {
    it("should show up button", async () => {
      render(<PathPicker {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText("↑ Up")).toBeInTheDocument();
      });
    });

    it("should call listDirectory with parent when up clicked", async () => {
      render(<PathPicker {...defaultProps} />);
      await waitFor(() => {
        expect(mockListDirectory).toHaveBeenCalled();
      });

      fireEvent.click(screen.getByText("↑ Up"));
      await waitFor(() => {
        expect(mockListDirectory).toHaveBeenCalledWith("/home");
      });
    });

    it("should show current path", async () => {
      render(<PathPicker {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText("Current: /home/user")).toBeInTheDocument();
      });
    });

    it("should navigate when Go button clicked", async () => {
      render(<PathPicker {...defaultProps} />);
      await waitFor(() => {
        expect(mockListDirectory).toHaveBeenCalled();
      });

      const input = screen.getByPlaceholderText("/path/to/directory");
      fireEvent.change(input, { target: { value: "/tmp" } });
      fireEvent.click(screen.getByText("Go"));

      await waitFor(() => {
        expect(mockListDirectory).toHaveBeenCalledWith("/tmp");
      });
    });

    it("should navigate on Enter key", async () => {
      render(<PathPicker {...defaultProps} />);
      await waitFor(() => {
        expect(mockListDirectory).toHaveBeenCalled();
      });

      const input = screen.getByPlaceholderText("/path/to/directory");
      fireEvent.change(input, { target: { value: "/var" } });
      fireEvent.keyDown(input, { key: "Enter" });

      await waitFor(() => {
        expect(mockListDirectory).toHaveBeenCalledWith("/var");
      });
    });
  });

  describe("directory listing", () => {
    it("should show empty directory message", async () => {
      render(<PathPicker {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText("Empty directory")).toBeInTheDocument();
      });
    });

    it("should show directory entries", async () => {
      mockListDirectory.mockResolvedValue({
        current_path: "/home/user",
        parent_path: "/home",
        entries: [
          {
            name: "Documents",
            path: "/home/user/Documents",
            is_directory: true,
          },
          {
            name: "file.txt",
            path: "/home/user/file.txt",
            is_directory: false,
          },
        ],
      });

      render(<PathPicker {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText("Documents")).toBeInTheDocument();
        expect(screen.getByText("file.txt")).toBeInTheDocument();
      });
    });

    it("should navigate to directory when clicked", async () => {
      mockListDirectory.mockResolvedValue({
        current_path: "/home/user",
        parent_path: "/home",
        entries: [
          {
            name: "Documents",
            path: "/home/user/Documents",
            is_directory: true,
          },
        ],
      });

      render(<PathPicker {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText("Documents")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Documents"));
      await waitFor(() => {
        expect(mockListDirectory).toHaveBeenCalledWith("/home/user/Documents");
      });
    });

    it("should show folder count in footer", async () => {
      mockListDirectory.mockResolvedValue({
        current_path: "/home/user",
        parent_path: "/home",
        entries: [
          {
            name: "Documents",
            path: "/home/user/Documents",
            is_directory: true,
          },
          {
            name: "Downloads",
            path: "/home/user/Downloads",
            is_directory: true,
          },
        ],
      });

      render(<PathPicker {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText("2 folders")).toBeInTheDocument();
      });
    });
  });

  describe("new folder", () => {
    it("should show new folder button", async () => {
      render(<PathPicker {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText("+ New Folder")).toBeInTheDocument();
      });
    });

    it("should show input when new folder clicked", async () => {
      render(<PathPicker {...defaultProps} />);
      await waitFor(() => {
        expect(mockListDirectory).toHaveBeenCalled();
      });

      fireEvent.click(screen.getByText("+ New Folder"));
      expect(screen.getByPlaceholderText("Folder name")).toBeInTheDocument();
    });

    it("should create folder when Create clicked", async () => {
      render(<PathPicker {...defaultProps} />);
      await waitFor(() => {
        expect(mockListDirectory).toHaveBeenCalled();
      });

      fireEvent.click(screen.getByText("+ New Folder"));
      const input = screen.getByPlaceholderText("Folder name");
      fireEvent.change(input, { target: { value: "newdir" } });
      fireEvent.click(screen.getByText("Create"));

      await waitFor(() => {
        expect(mockCreateDirectory).toHaveBeenCalledWith(
          "/home/user",
          "newdir",
        );
      });
    });

    it("should show error for empty folder name", async () => {
      render(<PathPicker {...defaultProps} />);
      await waitFor(() => {
        expect(mockListDirectory).toHaveBeenCalled();
      });

      fireEvent.click(screen.getByText("+ New Folder"));
      fireEvent.click(screen.getByText("Create"));

      await waitFor(() => {
        expect(
          screen.getByText("Please enter a folder name"),
        ).toBeInTheDocument();
      });
    });
  });

  describe("actions", () => {
    it("should call onCancel when Cancel clicked", async () => {
      const onCancel = vi.fn();
      render(<PathPicker {...defaultProps} onCancel={onCancel} />);
      await waitFor(() => {
        expect(mockListDirectory).toHaveBeenCalled();
      });

      fireEvent.click(screen.getByText("Cancel"));
      expect(onCancel).toHaveBeenCalled();
    });

    it("should call onSelect with current path when Select clicked", async () => {
      const onSelect = vi.fn();
      render(<PathPicker {...defaultProps} onSelect={onSelect} />);
      await waitFor(() => {
        expect(mockListDirectory).toHaveBeenCalled();
      });

      fireEvent.click(screen.getByText("Select This Directory"));
      expect(onSelect).toHaveBeenCalledWith("/home/user");
    });
  });

  describe("error handling", () => {
    it("should show error message on API failure", async () => {
      mockListDirectory.mockRejectedValueOnce(new Error("Permission denied"));
      render(<PathPicker {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Permission denied")).toBeInTheDocument();
      });
    });
  });

  describe("loading state", () => {
    it("should show loading indicator", async () => {
      mockListDirectory.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000)),
      );
      render(<PathPicker {...defaultProps} />);
      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });
  });
});
