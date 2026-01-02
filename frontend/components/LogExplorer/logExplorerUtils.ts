/**
 * Utilities and constants for the Log Explorer
 */

import {
  AlertOctagon,
  AlertTriangle,
  Bug,
  Info,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import type { LogEntry, LogEntryException } from "@/lib/api";

/**
 * Log level type
 */
export type LogLevel = "DEBUG" | "INFO" | "WARNING" | "ERROR" | "CRITICAL";

/**
 * All available log levels
 */
export const LOG_LEVELS: LogLevel[] = [
  "DEBUG",
  "INFO",
  "WARNING",
  "ERROR",
  "CRITICAL",
];

/**
 * Tailwind CSS classes for each log level
 */
export const LEVEL_STYLES: Record<LogLevel, string> = {
  DEBUG: "text-gray-500",
  INFO: "text-blue-500",
  WARNING: "text-amber-500",
  ERROR: "text-red-500",
  CRITICAL: "text-red-600 font-bold",
};

/**
 * Background classes for level badges
 */
export const LEVEL_BG_STYLES: Record<LogLevel, string> = {
  DEBUG: "bg-gray-100 text-gray-700",
  INFO: "bg-blue-100 text-blue-700",
  WARNING: "bg-amber-100 text-amber-700",
  ERROR: "bg-red-100 text-red-700",
  CRITICAL: "bg-red-200 text-red-800",
};

/**
 * Icons for each log level
 */
export const LEVEL_ICONS: Record<LogLevel, LucideIcon> = {
  DEBUG: Bug,
  INFO: Info,
  WARNING: AlertTriangle,
  ERROR: XCircle,
  CRITICAL: AlertOctagon,
};

/**
 * Format a timestamp for display
 */
export function formatTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      fractionalSecondDigits: 3,
    });
  } catch {
    return timestamp;
  }
}

/**
 * Format a full timestamp with date
 */
export function formatFullTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch {
    return timestamp;
  }
}

/**
 * Format duration in milliseconds
 */
export function formatDuration(ms: number | null): string {
  if (ms === null) return "";
  if (ms < 1) return "<1ms";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Format file size in bytes
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

/**
 * Escape regex special characters
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Highlight search term in text
 */
export function highlightSearch(
  text: string,
  search: string,
): { text: string; highlighted: boolean }[] {
  if (!search) return [{ text, highlighted: false }];

  const regex = new RegExp(`(${escapeRegex(search)})`, "gi");
  const parts = text.split(regex);

  return parts.map((part) => ({
    text: part,
    highlighted: regex.test(part),
  }));
}

/**
 * Format context object as key=value pairs
 */
export function formatContext(
  context: Record<string, unknown> | null,
): string[] {
  if (!context) return [];

  return Object.entries(context).map(([key, value]) => {
    if (typeof value === "string") {
      return `${key}="${truncateText(value, 50)}"`;
    }
    if (typeof value === "object") {
      return `${key}=${JSON.stringify(value).slice(0, 50)}`;
    }
    return `${key}=${value}`;
  });
}

/**
 * Format exception for display
 */
export function formatException(exception: LogEntryException | null): string {
  if (!exception) return "";
  return `${exception.type}: ${exception.message}`;
}

/**
 * Get unique categories from entries
 */
export function getUniqueCategories(entries: LogEntry[]): string[] {
  const categories = new Set<string>();
  entries.forEach((entry) => {
    if (entry.category) {
      categories.add(entry.category);
    }
  });
  return Array.from(categories).sort();
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Copy log entry as JSON
 */
export async function copyEntryAsJson(entry: LogEntry): Promise<boolean> {
  const json = JSON.stringify(
    {
      timestamp: entry.timestamp,
      level: entry.level,
      category: entry.category,
      message: entry.message,
      context: entry.context,
      duration_ms: entry.durationMs,
      exception: entry.exception,
    },
    null,
    2,
  );
  return copyToClipboard(json);
}

/**
 * Unescape Python-style escape sequences in a string.
 * Converts \\n to actual newlines, \\t to tabs, etc.
 */
function unescapePythonString(str: string): string {
  return str
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\r/g, "\r")
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");
}

/**
 * Check if a string looks like Python repr format.
 * Detects patterns like: Part(...), [Part(...)], name='value', etc.
 */
function isPythonRepr(str: string): boolean {
  // Check for common Python patterns
  const pythonPatterns = [
    /^\w+\(.*\)$/, // Function/class call: Part(...), Config(...)
    /^\[.*\]$/, // List: [...]
    /^\(.*\)$/, // Tuple: (...)
    /\w+\s*=\s*['"\[\{]/, // Keyword arg: name='value', items=[...]
    /\\n/, // Contains escape sequences
    /Part\(/, // Specific pattern from the example
  ];
  return pythonPatterns.some((pattern) => pattern.test(str));
}

/**
 * Format a Python repr string with proper indentation.
 */
function formatPythonRepr(str: string, baseIndent: number): string {
  // First unescape the string
  const formatted = unescapePythonString(str);

  // Add indentation to each line
  const spaces = "  ".repeat(baseIndent);
  const lines = formatted.split("\n");

  if (lines.length === 1) {
    return `"${formatted}"`;
  }

  // Multi-line: format as a block string
  const indentedLines = lines.map((line, i) => {
    if (i === 0) return line;
    return spaces + "  " + line;
  });

  return `"${indentedLines.join("\n")}"`;
}

/**
 * Recursively format JSON, attempting to parse and format nested JSON strings.
 * Also handles Python repr strings by unescaping and formatting them.
 */
export function deepFormatJson(value: unknown, indent = 0): string {
  const spaces = "  ".repeat(indent);
  const childSpaces = "  ".repeat(indent + 1);

  if (value === null) return "null";
  if (value === undefined) return "undefined";

  if (typeof value === "string") {
    // Try to parse as JSON first
    const trimmed = value.trim();
    if (
      (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
      (trimmed.startsWith("[") && trimmed.endsWith("]"))
    ) {
      try {
        const parsed = JSON.parse(trimmed);
        return deepFormatJson(parsed, indent);
      } catch {
        // Not valid JSON, continue to other checks
      }
    }

    // Check if it's a Python repr string
    if (isPythonRepr(value)) {
      return formatPythonRepr(value, indent);
    }

    // Regular string - escape for JSON display
    return JSON.stringify(value);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    const items = value.map((item) => {
      return `${childSpaces}${deepFormatJson(item, indent + 1)}`;
    });
    return `[\n${items.join(",\n")}\n${spaces}]`;
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return "{}";
    const items = entries.map(([key, val]) => {
      return `${childSpaces}${JSON.stringify(key)}: ${deepFormatJson(val, indent + 1)}`;
    });
    return `{\n${items.join(",\n")}\n${spaces}}`;
  }

  return String(value);
}
