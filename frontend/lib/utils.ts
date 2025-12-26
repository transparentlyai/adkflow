import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Detect if the user is on macOS.
 * Returns false during SSR (server-side rendering).
 */
export function isMacOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return navigator.platform.toUpperCase().indexOf("MAC") >= 0;
}

/**
 * Get the modifier key symbol for the current platform.
 * Returns ⌘ on macOS, Ctrl on Windows/Linux.
 */
export function getModifierKey(): string {
  return isMacOS() ? "⌘" : "Ctrl+";
}

/**
 * Format a keyboard shortcut for display.
 * @param key - The key (e.g., "S", "Z", "C")
 * @param shift - Whether Shift is required
 * @returns Formatted shortcut (e.g., "⌘S" on Mac, "Ctrl+S" on Windows)
 */
export function formatShortcut(key: string, shift = false): string {
  const mod = getModifierKey();
  const shiftSymbol = isMacOS() ? "⇧" : "Shift+";
  return shift ? `${shiftSymbol}${mod}${key}` : `${mod}${key}`;
}

/**
 * Sanitize agent name to match backend's Python identifier format.
 * ADK requires agent names to be valid Python identifiers.
 */
export function sanitizeAgentName(name: string): string {
  // Replace spaces and hyphens with underscores
  let sanitized = name.replace(/[\s-]+/g, "_");
  // Remove any other invalid characters
  sanitized = sanitized.replace(/[^a-zA-Z0-9_]/g, "");
  // Ensure it starts with letter or underscore
  if (sanitized && !/^[a-zA-Z_]/.test(sanitized)) {
    sanitized = "_" + sanitized;
  }
  // Default if empty
  return sanitized || "agent";
}
