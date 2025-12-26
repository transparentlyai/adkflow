"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { Theme } from "@/lib/themes/types";
import {
  builtInThemes,
  getCustomThemes,
  addCustomTheme as addCustomThemeToStorage,
  removeCustomTheme as removeCustomThemeFromStorage,
  getCurrentThemeId,
  saveCurrentThemeId,
  applyTheme,
  validateTheme,
  exportTheme as exportThemeToJson,
  importTheme as importThemeFromJson,
  getAllThemes,
} from "@/lib/themes/themeLoader";

interface ThemeContextValue {
  /** Current active theme */
  theme: Theme;
  /** Current theme ID */
  themeId: string;
  /** Built-in themes (light, dark) */
  builtInThemes: Theme[];
  /** User-added custom themes */
  customThemes: Theme[];
  /** All available themes */
  allThemes: Theme[];
  /** Switch to a different theme by ID */
  setTheme: (id: string) => void;
  /** Toggle between light and dark */
  toggleTheme: () => void;
  /** Add a custom theme */
  addCustomTheme: (theme: Theme) => void;
  /** Remove a custom theme by ID */
  removeCustomTheme: (id: string) => void;
  /** Export current theme as JSON string */
  exportCurrentTheme: () => string;
  /** Import a theme from JSON string, returns theme ID if successful */
  importTheme: (json: string) => string | null;
  /** Whether system is ready (hydrated) */
  isReady: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(builtInThemes[1]);
  const [customThemes, setCustomThemes] = useState<Theme[]>([]);
  const [isReady, setIsReady] = useState(false);

  // Load theme from localStorage on mount
  useEffect(() => {
    const storedId = getCurrentThemeId();
    const customs = getCustomThemes();
    setCustomThemes(customs);

    const allAvailable = [...builtInThemes, ...customs];
    const found = allAvailable.find((t) => t.id === storedId);

    if (found) {
      setThemeState(found);
      applyTheme(found);
    } else {
      // Fallback to dark theme
      applyTheme(builtInThemes[1]);
    }

    setIsReady(true);
  }, []);

  const setTheme = useCallback((id: string) => {
    const allAvailable = getAllThemes();
    const found = allAvailable.find((t) => t.id === id);

    if (found) {
      setThemeState(found);
      saveCurrentThemeId(id);
      applyTheme(found);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const newTheme = current.id === "light" ? builtInThemes[1] : builtInThemes[0];
      saveCurrentThemeId(newTheme.id);
      applyTheme(newTheme);
      return newTheme;
    });
  }, []);

  const addCustomTheme = useCallback((newTheme: Theme) => {
    addCustomThemeToStorage(newTheme);
    setCustomThemes(getCustomThemes());
  }, []);

  const removeCustomTheme = useCallback(
    (id: string) => {
      removeCustomThemeFromStorage(id);
      setCustomThemes(getCustomThemes());

      // If currently using this theme, switch to dark
      if (theme.id === id) {
        setTheme("dark");
      }
    },
    [theme.id, setTheme]
  );

  const exportCurrentTheme = useCallback(() => {
    return exportThemeToJson(theme);
  }, [theme]);

  const importTheme = useCallback(
    (json: string): string | null => {
      const imported = importThemeFromJson(json);
      if (imported && validateTheme(imported)) {
        addCustomTheme(imported);
        return imported.id;
      }
      return null;
    },
    [addCustomTheme]
  );

  const allThemes = [...builtInThemes, ...customThemes];

  return (
    <ThemeContext.Provider
      value={{
        theme,
        themeId: theme.id,
        builtInThemes,
        customThemes,
        allThemes,
        setTheme,
        toggleTheme,
        addCustomTheme,
        removeCustomTheme,
        exportCurrentTheme,
        importTheme,
        isReady,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
