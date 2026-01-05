import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";

// Mock the themeLoader module
const mockApplyTheme = vi.fn();
const mockGetCurrentThemeId = vi.fn();
const mockSaveCurrentThemeId = vi.fn();
const mockGetCustomThemes = vi.fn();
const mockAddCustomTheme = vi.fn();
const mockRemoveCustomTheme = vi.fn();
const mockGetAllThemes = vi.fn();
const mockValidateTheme = vi.fn();
const mockExportTheme = vi.fn();
const mockImportTheme = vi.fn();

vi.mock("@/lib/themes/themeLoader", () => ({
  builtInThemes: [
    { id: "light", name: "Light", version: "1.0.0", colors: {} },
    { id: "dark", name: "Dark", version: "1.0.0", colors: {} },
  ],
  applyTheme: (...args: unknown[]) => mockApplyTheme(...args),
  getCurrentThemeId: () => mockGetCurrentThemeId(),
  saveCurrentThemeId: (...args: unknown[]) => mockSaveCurrentThemeId(...args),
  getCustomThemes: () => mockGetCustomThemes(),
  addCustomTheme: (...args: unknown[]) => mockAddCustomTheme(...args),
  removeCustomTheme: (...args: unknown[]) => mockRemoveCustomTheme(...args),
  getAllThemes: () => mockGetAllThemes(),
  validateTheme: (...args: unknown[]) => mockValidateTheme(...args),
  exportTheme: (...args: unknown[]) => mockExportTheme(...args),
  importTheme: (...args: unknown[]) => mockImportTheme(...args),
}));

// Import after mocking
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";

function TestConsumer() {
  const context = useTheme();
  return (
    <div>
      <span data-testid="themeId">{context.themeId}</span>
      <span data-testid="themeName">{context.theme.name}</span>
      <span data-testid="isReady">{context.isReady ? "yes" : "no"}</span>
      <span data-testid="builtInCount">{context.builtInThemes.length}</span>
      <span data-testid="customCount">{context.customThemes.length}</span>
      <span data-testid="allCount">{context.allThemes.length}</span>
      <button data-testid="setDark" onClick={() => context.setTheme("dark")}>
        Set Dark
      </button>
      <button data-testid="toggle" onClick={() => context.toggleTheme()}>
        Toggle
      </button>
      <button
        data-testid="addCustom"
        onClick={() =>
          context.addCustomTheme({
            id: "custom1",
            name: "Custom",
            version: "1.0.0",
            colors: {},
          } as any)
        }
      >
        Add Custom
      </button>
      <button
        data-testid="removeCustom"
        onClick={() => context.removeCustomTheme("custom1")}
      >
        Remove Custom
      </button>
      <button data-testid="export" onClick={() => context.exportCurrentTheme()}>
        Export
      </button>
      <button
        data-testid="import"
        onClick={() => context.importTheme('{"id":"imported"}')}
      >
        Import
      </button>
    </div>
  );
}

describe("ThemeContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentThemeId.mockReturnValue("dark");
    mockGetCustomThemes.mockReturnValue([]);
    mockGetAllThemes.mockReturnValue([
      { id: "light", name: "Light", version: "1.0.0", colors: {} },
      { id: "dark", name: "Dark", version: "1.0.0", colors: {} },
    ]);
    mockValidateTheme.mockReturnValue(true);
    mockExportTheme.mockReturnValue('{"id":"dark"}');
    mockImportTheme.mockReturnValue({ id: "imported", name: "Imported" });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("ThemeProvider", () => {
    it("should provide theme context", async () => {
      render(
        <ThemeProvider>
          <TestConsumer />
        </ThemeProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("isReady")).toHaveTextContent("yes");
      });

      expect(screen.getByTestId("builtInCount")).toHaveTextContent("2");
    });

    it("should set theme by id", async () => {
      render(
        <ThemeProvider>
          <TestConsumer />
        </ThemeProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("isReady")).toHaveTextContent("yes");
      });

      fireEvent.click(screen.getByTestId("setDark"));

      expect(mockSaveCurrentThemeId).toHaveBeenCalledWith("dark");
      expect(mockApplyTheme).toHaveBeenCalled();
    });

    it("should toggle theme", async () => {
      render(
        <ThemeProvider>
          <TestConsumer />
        </ThemeProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("isReady")).toHaveTextContent("yes");
      });

      fireEvent.click(screen.getByTestId("toggle"));

      expect(mockSaveCurrentThemeId).toHaveBeenCalled();
      expect(mockApplyTheme).toHaveBeenCalled();
    });

    it("should add custom theme", async () => {
      mockGetCustomThemes
        .mockReturnValueOnce([])
        .mockReturnValueOnce([{ id: "custom1", name: "Custom" }]);

      render(
        <ThemeProvider>
          <TestConsumer />
        </ThemeProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("isReady")).toHaveTextContent("yes");
      });

      fireEvent.click(screen.getByTestId("addCustom"));

      expect(mockAddCustomTheme).toHaveBeenCalled();
    });

    it("should remove custom theme", async () => {
      mockGetCustomThemes.mockReturnValue([{ id: "custom1", name: "Custom" }]);

      render(
        <ThemeProvider>
          <TestConsumer />
        </ThemeProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("isReady")).toHaveTextContent("yes");
      });

      fireEvent.click(screen.getByTestId("removeCustom"));

      expect(mockRemoveCustomTheme).toHaveBeenCalledWith("custom1");
    });

    it("should switch to dark theme when removing current theme", async () => {
      // Setup: current theme is "custom1"
      mockGetCurrentThemeId.mockReturnValue("custom1");
      mockGetCustomThemes.mockReturnValue([
        { id: "custom1", name: "Custom", version: "1.0.0", colors: {} },
      ]);
      mockGetAllThemes.mockReturnValue([
        { id: "light", name: "Light", version: "1.0.0", colors: {} },
        { id: "dark", name: "Dark", version: "1.0.0", colors: {} },
        { id: "custom1", name: "Custom", version: "1.0.0", colors: {} },
      ]);

      render(
        <ThemeProvider>
          <TestConsumer />
        </ThemeProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("isReady")).toHaveTextContent("yes");
      });

      // Remove the currently active theme
      fireEvent.click(screen.getByTestId("removeCustom"));

      // Should switch to dark theme
      expect(mockSaveCurrentThemeId).toHaveBeenCalledWith("dark");
    });

    it("should export current theme", async () => {
      render(
        <ThemeProvider>
          <TestConsumer />
        </ThemeProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("isReady")).toHaveTextContent("yes");
      });

      fireEvent.click(screen.getByTestId("export"));

      expect(mockExportTheme).toHaveBeenCalled();
    });

    it("should import theme", async () => {
      render(
        <ThemeProvider>
          <TestConsumer />
        </ThemeProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("isReady")).toHaveTextContent("yes");
      });

      fireEvent.click(screen.getByTestId("import"));

      expect(mockImportTheme).toHaveBeenCalled();
    });

    it("should return null for invalid theme import", async () => {
      // Make validateTheme return false
      mockValidateTheme.mockReturnValue(false);
      mockImportTheme.mockReturnValue({ id: "invalid", name: "Invalid" });

      render(
        <ThemeProvider>
          <TestConsumer />
        </ThemeProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("isReady")).toHaveTextContent("yes");
      });

      fireEvent.click(screen.getByTestId("import"));

      // addCustomTheme should not be called for invalid theme
      expect(mockAddCustomTheme).not.toHaveBeenCalled();
    });

    it("should return null when imported theme is null", async () => {
      // Make importTheme return null
      mockImportTheme.mockReturnValue(null);

      render(
        <ThemeProvider>
          <TestConsumer />
        </ThemeProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("isReady")).toHaveTextContent("yes");
      });

      fireEvent.click(screen.getByTestId("import"));

      // addCustomTheme should not be called when import returns null
      expect(mockAddCustomTheme).not.toHaveBeenCalled();
    });

    it("should fallback to dark theme when saved theme id not found", async () => {
      // Saved theme ID doesn't exist in the theme list
      mockGetCurrentThemeId.mockReturnValue("nonexistent");

      render(
        <ThemeProvider>
          <TestConsumer />
        </ThemeProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("isReady")).toHaveTextContent("yes");
      });

      // Should apply dark theme (builtInThemes[1]) as fallback
      expect(mockApplyTheme).toHaveBeenCalled();
    });
  });

  describe("useTheme", () => {
    it("should throw error when used outside provider", () => {
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      expect(() => {
        render(<TestConsumer />);
      }).toThrow("useTheme must be used within a ThemeProvider");

      consoleError.mockRestore();
    });
  });
});
