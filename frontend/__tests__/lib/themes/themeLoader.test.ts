import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  builtInThemes,
  getBuiltInTheme,
  getAllThemes,
  getCustomThemes,
  saveCustomThemes,
  addCustomTheme,
  removeCustomTheme,
  getCurrentThemeId,
  saveCurrentThemeId,
  applyTheme,
  validateTheme,
  exportTheme,
  importTheme,
} from "@/lib/themes/themeLoader";
import type { Theme } from "@/lib/themes/types";

describe("themeLoader", () => {
  const mockLocalStorage: Record<string, string> = {};

  beforeEach(() => {
    Object.keys(mockLocalStorage).forEach(
      (key) => delete mockLocalStorage[key],
    );

    vi.stubGlobal("localStorage", {
      getItem: vi.fn((key: string) => mockLocalStorage[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        mockLocalStorage[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete mockLocalStorage[key];
      }),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("builtInThemes", () => {
    it("should have light and dark themes", () => {
      expect(builtInThemes.length).toBeGreaterThanOrEqual(2);
      const ids = builtInThemes.map((t) => t.id);
      expect(ids).toContain("light");
      expect(ids).toContain("dark");
    });
  });

  describe("getBuiltInTheme", () => {
    it("should return light theme", () => {
      const theme = getBuiltInTheme("light");
      expect(theme).toBeDefined();
      expect(theme?.id).toBe("light");
    });

    it("should return dark theme", () => {
      const theme = getBuiltInTheme("dark");
      expect(theme).toBeDefined();
      expect(theme?.id).toBe("dark");
    });

    it("should return undefined for unknown theme", () => {
      expect(getBuiltInTheme("unknown")).toBeUndefined();
    });
  });

  describe("getCustomThemes", () => {
    it("should return empty array when no custom themes", () => {
      const themes = getCustomThemes();
      expect(themes).toEqual([]);
    });

    it("should return custom themes from localStorage", () => {
      const customTheme = { id: "custom", name: "Custom" };
      mockLocalStorage["adkflow-custom-themes"] = JSON.stringify([customTheme]);

      const themes = getCustomThemes();
      expect(themes).toHaveLength(1);
      expect(themes[0].id).toBe("custom");
    });

    it("should return empty array for invalid JSON", () => {
      mockLocalStorage["adkflow-custom-themes"] = "invalid";
      const themes = getCustomThemes();
      expect(themes).toEqual([]);
    });
  });

  describe("saveCustomThemes", () => {
    it("should save themes to localStorage", () => {
      const themes = [{ id: "custom", name: "Custom" }] as Theme[];
      saveCustomThemes(themes);

      expect(localStorage.setItem).toHaveBeenCalledWith(
        "adkflow-custom-themes",
        JSON.stringify(themes),
      );
    });
  });

  describe("addCustomTheme", () => {
    it("should add new theme", () => {
      const theme = { id: "new", name: "New" } as Theme;
      addCustomTheme(theme);

      const saved = JSON.parse(mockLocalStorage["adkflow-custom-themes"]);
      expect(saved).toHaveLength(1);
      expect(saved[0].id).toBe("new");
    });

    it("should update existing theme", () => {
      const existing = [{ id: "custom", name: "Old" }];
      mockLocalStorage["adkflow-custom-themes"] = JSON.stringify(existing);

      addCustomTheme({ id: "custom", name: "Updated" } as Theme);

      const saved = JSON.parse(mockLocalStorage["adkflow-custom-themes"]);
      expect(saved).toHaveLength(1);
      expect(saved[0].name).toBe("Updated");
    });
  });

  describe("removeCustomTheme", () => {
    it("should remove theme by id", () => {
      const existing = [
        { id: "theme1", name: "Theme 1" },
        { id: "theme2", name: "Theme 2" },
      ];
      mockLocalStorage["adkflow-custom-themes"] = JSON.stringify(existing);

      removeCustomTheme("theme1");

      const saved = JSON.parse(mockLocalStorage["adkflow-custom-themes"]);
      expect(saved).toHaveLength(1);
      expect(saved[0].id).toBe("theme2");
    });
  });

  describe("getCurrentThemeId", () => {
    it("should return light as default", () => {
      expect(getCurrentThemeId()).toBe("light");
    });

    it("should return stored theme id", () => {
      mockLocalStorage["adkflow-theme-id"] = "dark";
      expect(getCurrentThemeId()).toBe("dark");
    });
  });

  describe("saveCurrentThemeId", () => {
    it("should save theme id to localStorage", () => {
      saveCurrentThemeId("dark");
      expect(localStorage.setItem).toHaveBeenCalledWith(
        "adkflow-theme-id",
        "dark",
      );
    });
  });

  describe("getAllThemes", () => {
    it("should return built-in themes when no custom themes", () => {
      const themes = getAllThemes();
      expect(themes.length).toBe(builtInThemes.length);
    });

    it("should return built-in and custom themes", () => {
      mockLocalStorage["adkflow-custom-themes"] = JSON.stringify([
        { id: "custom", name: "Custom" },
      ]);

      const themes = getAllThemes();
      expect(themes.length).toBe(builtInThemes.length + 1);
    });
  });

  describe("applyTheme", () => {
    let mockRoot: { style: { setProperty: ReturnType<typeof vi.fn> } };

    beforeEach(() => {
      mockRoot = { style: { setProperty: vi.fn() } };
      vi.stubGlobal("document", {
        documentElement: mockRoot,
      });
    });

    it("should apply theme CSS properties", () => {
      const theme = builtInThemes[0];
      applyTheme(theme);

      expect(mockRoot.style.setProperty).toHaveBeenCalled();
      expect(mockRoot.style.setProperty).toHaveBeenCalledWith(
        "--canvas-bg",
        expect.any(String),
      );
    });
  });

  describe("validateTheme", () => {
    it("should return false for null", () => {
      expect(validateTheme(null)).toBe(false);
    });

    it("should return false for non-object", () => {
      expect(validateTheme("string")).toBe(false);
      expect(validateTheme(123)).toBe(false);
    });

    it("should return false for missing id", () => {
      expect(validateTheme({ name: "test", version: "1.0", colors: {} })).toBe(
        false,
      );
    });

    it("should return false for missing name", () => {
      expect(validateTheme({ id: "test", version: "1.0", colors: {} })).toBe(
        false,
      );
    });

    it("should return false for missing version", () => {
      expect(validateTheme({ id: "test", name: "Test", colors: {} })).toBe(
        false,
      );
    });

    it("should return false for missing colors", () => {
      expect(validateTheme({ id: "test", name: "Test", version: "1.0" })).toBe(
        false,
      );
    });

    it("should return false for invalid monaco value", () => {
      expect(
        validateTheme({
          id: "test",
          name: "Test",
          version: "1.0",
          colors: {
            canvas: {},
            nodes: {},
            handles: {},
            edges: {},
            ui: {},
            form: {},
            monaco: "invalid",
          },
        }),
      ).toBe(false);
    });

    it("should return true for valid theme", () => {
      expect(validateTheme(builtInThemes[0])).toBe(true);
    });
  });

  describe("exportTheme", () => {
    it("should export theme as JSON string", () => {
      const theme = builtInThemes[0];
      const exported = exportTheme(theme);

      expect(typeof exported).toBe("string");
      const parsed = JSON.parse(exported);
      expect(parsed.id).toBe(theme.id);
    });
  });

  describe("importTheme", () => {
    it("should import valid theme JSON", () => {
      const theme = builtInThemes[0];
      const json = JSON.stringify(theme);

      const imported = importTheme(json);
      expect(imported).not.toBeNull();
      expect(imported?.id).toBe(theme.id);
    });

    it("should return null for invalid JSON", () => {
      expect(importTheme("invalid")).toBeNull();
    });

    it("should return null for invalid theme", () => {
      expect(importTheme('{"id": "test"}')).toBeNull();
    });
  });
});
