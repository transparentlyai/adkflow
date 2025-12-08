import type * as Monaco from "monaco-editor";

export const logLightThemeRules: Monaco.editor.ITokenThemeRule[] = [
  // Log levels
  { token: "log.error", foreground: "DC2626", fontStyle: "bold" }, // Red
  { token: "log.warn", foreground: "D97706", fontStyle: "bold" }, // Amber
  { token: "log.info", foreground: "2563EB" }, // Blue
  { token: "log.debug", foreground: "6B7280" }, // Gray

  // Timestamps
  { token: "log.timestamp", foreground: "059669" }, // Emerald

  // Keys
  { token: "log.key", foreground: "7C3AED" }, // Violet

  // Network
  { token: "log.ip", foreground: "0891B2" }, // Cyan
  { token: "log.url", foreground: "0891B2", fontStyle: "underline" },

  // Identifiers
  { token: "log.uuid", foreground: "EC4899" }, // Pink
  { token: "log.path", foreground: "16A34A" }, // Green
  { token: "log.thread", foreground: "8B5CF6" }, // Purple

  // Exceptions
  { token: "log.exception", foreground: "DC2626", fontStyle: "italic" },

  // Standard tokens
  { token: "string", foreground: "16A34A" },
  { token: "number", foreground: "D97706" },
  { token: "number.hex", foreground: "D97706" },
  { token: "keyword", foreground: "7C3AED" },
  { token: "delimiter", foreground: "6B7280" },
  { token: "delimiter.bracket", foreground: "6B7280" },
  { token: "delimiter.square", foreground: "6B7280" },
  { token: "delimiter.comma", foreground: "6B7280" },
  { token: "delimiter.colon", foreground: "6B7280" },
];

export const logLightTheme: Monaco.editor.IStandaloneThemeData = {
  base: "vs",
  inherit: true,
  rules: logLightThemeRules,
  colors: {},
};
