import type * as Monaco from "monaco-editor";

export const logLanguageConfig: Monaco.languages.LanguageConfiguration = {
  comments: {
    lineComment: "#",
  },
  brackets: [
    ["{", "}"],
    ["[", "]"],
    ["(", ")"],
  ],
  autoClosingPairs: [
    { open: "{", close: "}" },
    { open: "[", close: "]" },
    { open: "(", close: ")" },
    { open: '"', close: '"' },
    { open: "'", close: "'" },
  ],
  surroundingPairs: [
    { open: "{", close: "}" },
    { open: "[", close: "]" },
    { open: "(", close: ")" },
    { open: '"', close: '"' },
    { open: "'", close: "'" },
  ],
  folding: {
    markers: {
      start: /^\s*\{/,
      end: /^\s*\}/,
    },
  },
};

export const logLanguageDefinition: Monaco.languages.IMonarchLanguage = {
  defaultToken: "",
  tokenPostfix: ".log",

  tokenizer: {
    root: [
      // Log levels - highest priority
      [/\b(ERROR|FATAL|CRITICAL)\b/, "log.error"],
      [/\b(WARN|WARNING)\b/, "log.warn"],
      [/\bINFO\b/, "log.info"],
      [/\b(DEBUG|TRACE)\b/, "log.debug"],

      // ISO 8601 timestamps: 2024-01-15T10:30:45.123Z or with timezone
      [
        /\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:?\d{2})?/,
        "log.timestamp",
      ],
      // Common log timestamp: 15/Jan/2024:10:30:45
      [/\d{2}\/\w{3}\/\d{4}:\d{2}:\d{2}:\d{2}/, "log.timestamp"],
      // Simple timestamp: 10:30:45.123
      [/\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?/, "log.timestamp"],

      // UUIDs
      [
        /\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/,
        "log.uuid",
      ],

      // IPv4 addresses
      [
        /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/,
        "log.ip",
      ],

      // URLs
      [/https?:\/\/[^\s"'<>\]]+/, "log.url"],

      // File paths (Unix)
      [/(?:\/[\w.-]+)+(?:\.[a-zA-Z]+)?(?::\d+)?(?::\d+)?/, "log.path"],
      // File paths (Windows)
      [/[a-zA-Z]:\\(?:[\w.-]+\\)*[\w.-]+/, "log.path"],

      // Exception/Error keywords in stack traces
      [/\b(Exception|Error|Traceback|at)\b/, "log.exception"],
      [/\b(caused by|Caused by)\b/i, "log.exception"],

      // Thread/process identifiers in brackets
      [/\[[\w\-.:]+\]/, "log.thread"],
      [/<[\w\-.:]+>/, "log.thread"],

      // JSON detection - switch to JSON state
      [/\{/, { token: "delimiter.bracket", next: "@jsonObject" }],
      [/\[/, { token: "delimiter.square", next: "@jsonArray" }],

      // Key=value pairs
      [/([a-zA-Z_][\w_]*)(\s*=\s*)/, ["log.key", "delimiter"]],
      // Key:value pairs (not in timestamp context)
      [/([a-zA-Z_][\w_]*)(\s*:\s*)(?=[^\d])/, ["log.key", "delimiter"]],

      // Quoted strings
      [/"[^"]*"/, "string"],
      [/'[^']*'/, "string"],

      // Hex numbers
      [/\b0x[0-9a-fA-F]+\b/, "number.hex"],
      // Regular numbers
      [/\b-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b/, "number"],

      // Whitespace
      [/\s+/, "white"],
    ],

    // JSON object state
    jsonObject: [
      [/\}/, { token: "delimiter.bracket", next: "@pop" }],
      [/,/, "delimiter.comma"],
      [/:/, "delimiter.colon"],
      [/"([^"]*)"/, "string"],
      [/'([^']*)'/, "string"],
      [/\{/, { token: "delimiter.bracket", next: "@push" }],
      [/\[/, { token: "delimiter.square", next: "@jsonArray" }],
      [/\b(true|false)\b/, "keyword"],
      [/\bnull\b/, "keyword"],
      [/-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/, "number"],
      [/\s+/, "white"],
    ],

    // JSON array state
    jsonArray: [
      [/\]/, { token: "delimiter.square", next: "@pop" }],
      [/,/, "delimiter.comma"],
      [/"([^"]*)"/, "string"],
      [/'([^']*)'/, "string"],
      [/\{/, { token: "delimiter.bracket", next: "@jsonObject" }],
      [/\[/, { token: "delimiter.square", next: "@push" }],
      [/\b(true|false)\b/, "keyword"],
      [/\bnull\b/, "keyword"],
      [/-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/, "number"],
      [/\s+/, "white"],
    ],
  },
};
