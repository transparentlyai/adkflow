import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
