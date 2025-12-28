"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import type { TeleporterEntry, TeleporterDirection } from "@/lib/types";
import type { Node } from "@xyflow/react";

// Color palette for teleporter matching
const TELEPORTER_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#14b8a6", // teal
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#84cc16", // lime
  "#f43f5e", // rose
  "#6366f1", // indigo
];

interface TeleporterContextValue {
  // Registry state
  teleporters: TeleporterEntry[];

  // Registry operations
  registerTeleporter: (entry: Omit<TeleporterEntry, "color">) => void;
  unregisterTeleporter: (id: string) => void;
  updateTeleporterName: (id: string, newName: string) => void;

  // Sync teleporters from nodes (for cross-tab support)
  syncTeleportersForTab: (
    tabId: string,
    tabName: string,
    nodes: Node[],
  ) => void;
  updateTabName: (tabId: string, newTabName: string) => void;

  // Query helpers
  getTeleportersByName: (name: string) => TeleporterEntry[];
  getInputTeleportersByName: (name: string) => TeleporterEntry[];
  getOutputTeleportersByName: (name: string) => TeleporterEntry[];
  getAllInputTeleporters: () => TeleporterEntry[];
  getAllOutputTeleporters: () => TeleporterEntry[];
  getColorForName: (name: string) => string;

  // Utility
  clearTeleporters: () => void;
  clearTeleportersForTab: (tabId: string) => void;
}

const TeleporterContext = createContext<TeleporterContextValue | null>(null);

export function TeleporterProvider({ children }: { children: ReactNode }) {
  const [teleporters, setTeleporters] = useState<TeleporterEntry[]>([]);
  // Use ref for colorMap to avoid setState during render
  const colorMapRef = useRef<Record<string, string>>({});

  // Get or assign a color for a name (no setState - uses ref)
  const getColorForName = useCallback((name: string): string => {
    if (colorMapRef.current[name]) {
      return colorMapRef.current[name];
    }
    // Assign a new color based on number of unique names
    const usedColors = new Set(Object.values(colorMapRef.current));
    const availableColor =
      TELEPORTER_COLORS.find((c) => !usedColors.has(c)) ||
      TELEPORTER_COLORS[
        Object.keys(colorMapRef.current).length % TELEPORTER_COLORS.length
      ];
    colorMapRef.current[name] = availableColor;
    return availableColor;
  }, []);

  // Register a new teleporter
  const registerTeleporter = useCallback(
    (entry: Omit<TeleporterEntry, "color">) => {
      const color = getColorForName(entry.name);
      const fullEntry: TeleporterEntry = { ...entry, color };

      setTeleporters((prev) => {
        // Check if already registered (update if exists)
        const existing = prev.find((t) => t.id === entry.id);
        if (existing) {
          return prev.map((t) => (t.id === entry.id ? fullEntry : t));
        }
        return [...prev, fullEntry];
      });
    },
    [getColorForName],
  );

  // Unregister a teleporter
  const unregisterTeleporter = useCallback((id: string) => {
    setTeleporters((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Update a teleporter's name
  const updateTeleporterName = useCallback(
    (id: string, newName: string) => {
      const color = getColorForName(newName);
      setTeleporters((prev) =>
        prev.map((t) => (t.id === id ? { ...t, name: newName, color } : t)),
      );
    },
    [getColorForName],
  );

  // Sync teleporters from nodes for a tab (for cross-tab support)
  const syncTeleportersForTab = useCallback(
    (tabId: string, tabName: string, nodes: Node[]) => {
      // Extract teleporter nodes
      const teleporterNodes = nodes.filter(
        (n) => n.type === "teleportOut" || n.type === "teleportIn",
      );

      // Build new entries for this tab
      const newEntries: TeleporterEntry[] = teleporterNodes.map((n) => {
        const nodeData = n.data as { config?: { name?: string } };
        const name = nodeData.config?.name || "Unnamed";
        const direction: TeleporterDirection =
          n.type === "teleportOut" ? "output" : "input";
        const color = getColorForName(name);
        return {
          id: n.id,
          name,
          direction,
          tabId,
          tabName,
          color,
        };
      });

      setTeleporters((prev) => {
        // Remove old entries for this tab, add new ones
        const otherTabs = prev.filter((t) => t.tabId !== tabId);
        const combined = [...otherTabs, ...newEntries];
        // Deduplicate by ID just in case
        const seen = new Set<string>();
        return combined.filter((t) => {
          if (seen.has(t.id)) return false;
          seen.add(t.id);
          return true;
        });
      });
    },
    [getColorForName],
  );

  // Update tab name for all teleporters in a tab (when tab is renamed)
  const updateTabName = useCallback((tabId: string, newTabName: string) => {
    setTeleporters((prev) =>
      prev.map((t) => (t.tabId === tabId ? { ...t, tabName: newTabName } : t)),
    );
  }, []);

  // Query teleporters by name
  const getTeleportersByName = useCallback(
    (name: string): TeleporterEntry[] => {
      return teleporters.filter((t) => t.name === name);
    },
    [teleporters],
  );

  // Get input teleporters by name
  const getInputTeleportersByName = useCallback(
    (name: string): TeleporterEntry[] => {
      return teleporters.filter(
        (t) => t.name === name && t.direction === "input",
      );
    },
    [teleporters],
  );

  // Get output teleporters by name
  const getOutputTeleportersByName = useCallback(
    (name: string): TeleporterEntry[] => {
      return teleporters.filter(
        (t) => t.name === name && t.direction === "output",
      );
    },
    [teleporters],
  );

  // Get all input teleporters
  const getAllInputTeleporters = useCallback((): TeleporterEntry[] => {
    return teleporters.filter((t) => t.direction === "input");
  }, [teleporters]);

  // Get all output teleporters
  const getAllOutputTeleporters = useCallback((): TeleporterEntry[] => {
    return teleporters.filter((t) => t.direction === "output");
  }, [teleporters]);

  // Clear all teleporters
  const clearTeleporters = useCallback(() => {
    setTeleporters([]);
    colorMapRef.current = {};
  }, []);

  // Clear teleporters for a specific tab
  const clearTeleportersForTab = useCallback((tabId: string) => {
    setTeleporters((prev) => prev.filter((t) => t.tabId !== tabId));
  }, []);

  const value: TeleporterContextValue = {
    teleporters,
    registerTeleporter,
    unregisterTeleporter,
    updateTeleporterName,
    syncTeleportersForTab,
    updateTabName,
    getTeleportersByName,
    getInputTeleportersByName,
    getOutputTeleportersByName,
    getAllInputTeleporters,
    getAllOutputTeleporters,
    getColorForName,
    clearTeleporters,
    clearTeleportersForTab,
  };

  return (
    <TeleporterContext.Provider value={value}>
      {children}
    </TeleporterContext.Provider>
  );
}

export function useTeleporter() {
  const context = useContext(TeleporterContext);
  if (!context) {
    throw new Error("useTeleporter must be used within a TeleporterProvider");
  }
  return context;
}
