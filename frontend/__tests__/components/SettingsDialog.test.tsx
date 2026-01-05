import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SettingsDialog from "@/components/SettingsDialog";

// Mock ThemeContext
const mockSetTheme = vi.fn();
const mockRemoveCustomTheme = vi.fn();

vi.mock("@/contexts/ThemeContext", () => ({
  useTheme: () => ({
    theme: {
      id: "dark",
      name: "Dark Theme",
      version: "1.0.0",
      author: "Test Author",
      description: "A dark theme",
    },
    themeId: "dark",
    builtInThemes: [
      { id: "light", name: "Light" },
      { id: "dark", name: "Dark" },
    ],
    customThemes: [
      {
        id: "custom-1",
        name: "Custom Theme",
        description: "A custom theme",
      },
    ],
    setTheme: mockSetTheme,
    removeCustomTheme: mockRemoveCustomTheme,
  }),
}));

describe("SettingsDialog", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render dialog title", () => {
      render(<SettingsDialog {...defaultProps} />);
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    it("should render theme section", () => {
      render(<SettingsDialog {...defaultProps} />);
      expect(screen.getByText("Theme")).toBeInTheDocument();
    });

    it("should render built-in themes", () => {
      render(<SettingsDialog {...defaultProps} />);
      expect(screen.getByText("Light")).toBeInTheDocument();
      expect(screen.getByText("Dark")).toBeInTheDocument();
    });

    it("should render custom themes section", () => {
      render(<SettingsDialog {...defaultProps} />);
      expect(screen.getByText("Custom Themes")).toBeInTheDocument();
      expect(screen.getByText("Custom Theme")).toBeInTheDocument();
    });

    it("should render current theme info", () => {
      render(<SettingsDialog {...defaultProps} />);
      expect(screen.getByText("Current Theme")).toBeInTheDocument();
      expect(screen.getByText("Dark Theme")).toBeInTheDocument();
      expect(screen.getByText("v1.0.0")).toBeInTheDocument();
      expect(screen.getByText("by Test Author")).toBeInTheDocument();
    });
  });

  describe("theme selection", () => {
    it("should call setTheme when light theme clicked", () => {
      render(<SettingsDialog {...defaultProps} />);
      fireEvent.click(screen.getByText("Light"));
      expect(mockSetTheme).toHaveBeenCalledWith("light");
    });

    it("should call setTheme when dark theme clicked", () => {
      render(<SettingsDialog {...defaultProps} />);
      fireEvent.click(screen.getByText("Dark"));
      expect(mockSetTheme).toHaveBeenCalledWith("dark");
    });

    it("should call setTheme when custom theme clicked", () => {
      render(<SettingsDialog {...defaultProps} />);
      fireEvent.click(screen.getByText("Custom Theme"));
      expect(mockSetTheme).toHaveBeenCalledWith("custom-1");
    });
  });

  describe("custom theme removal", () => {
    it("should render delete button for custom themes", () => {
      render(<SettingsDialog {...defaultProps} />);
      const deleteButtons = screen
        .getAllByRole("button")
        .filter((btn) => btn.querySelector("svg.lucide-trash-2"));
      expect(deleteButtons.length).toBeGreaterThan(0);
    });
  });

  describe("when closed", () => {
    it("should not render when not open", () => {
      render(<SettingsDialog {...defaultProps} open={false} />);
      expect(screen.queryByText("Settings")).not.toBeInTheDocument();
    });
  });
});
