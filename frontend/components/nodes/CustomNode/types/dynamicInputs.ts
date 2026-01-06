/**
 * Dynamic Input Types
 *
 * Type definitions for nodes that support runtime-configurable inputs.
 * Used by ContextAggregator and similar nodes that need per-instance
 * input configuration.
 */

/**
 * Types of dynamic inputs supported.
 */
export type DynamicInputType = "file" | "directory" | "url" | "node";

/**
 * Node-level aggregation mode for combining all inputs.
 */
export type NodeAggregationMode = "pass" | "concatenate";

/**
 * Directory-level aggregation mode for combining files within a directory.
 */
export type DirectoryAggregationMode = "pass" | "concatenate";

/**
 * Naming pattern types for pass-through directory aggregation.
 */
export type NamingPatternType = "file_name" | "number" | "custom";

/**
 * Configuration for a single dynamic input.
 *
 * Stored in node.data.config.dynamicInputs array.
 */
export interface DynamicInputConfig {
  /** Unique identifier for this input (used as handle ID for 'node' type) */
  id: string;
  /** Display label shown in the UI */
  label: string;
  /** Variable name for template substitution (e.g., "my_context") */
  variableName: string;
  /** Type of input source */
  inputType: DynamicInputType;

  // File type configuration
  /** For 'file' type: relative path to the file */
  filePath?: string;

  // Directory type configuration
  /** For 'directory' type: relative path to the directory */
  directoryPath?: string;
  /** For 'directory' type: glob pattern to match files (e.g., "**\/*.md") */
  globPattern?: string;
  /** For 'directory' type: how to aggregate matched files */
  directoryAggregation?: DirectoryAggregationMode;
  /** For 'directory' type with 'pass': how to name output variables */
  namingPattern?: NamingPatternType;
  /**
   * For 'directory' type with 'pass' and 'custom' naming:
   * Pattern string with placeholders like {file_name}, {number}, {base}
   */
  customPattern?: string;
  /** For 'directory' type with 'concatenate': separator between files */
  directorySeparator?: string;
  /** For 'directory' type: enable recursive scanning of subdirectories */
  recursive?: boolean;
  /** For 'directory' type with recursive: patterns to exclude (e.g., ".git", "node_modules") */
  excludePatterns?: string[];
  /** For 'directory' type: maximum number of files to include */
  maxFiles?: number;
  /** For 'directory' type: maximum size per file in bytes */
  maxFileSize?: number;

  // URL type configuration
  /** For 'url' type: URL to fetch */
  url?: string;

  // Node type has no additional configuration - just shows a handle
}

/**
 * Default values for creating a new dynamic input.
 */
export const DEFAULT_DYNAMIC_INPUT: Omit<DynamicInputConfig, "id"> = {
  label: "New Input",
  variableName: "new_input",
  inputType: "file",
  filePath: "",
  globPattern: "*",
  directoryAggregation: "concatenate",
  namingPattern: "file_name",
  directorySeparator: "\n\n",
  recursive: false,
  excludePatterns: [
    ".git",
    "node_modules",
    "__pycache__",
    ".venv",
    "venv",
    ".mypy_cache",
  ],
  maxFiles: 100,
  maxFileSize: 1048576,
};

/**
 * Generate a unique ID for a new dynamic input.
 */
export function generateDynamicInputId(): string {
  return `input_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Create a new dynamic input with defaults.
 */
export function createDynamicInput(
  overrides?: Partial<DynamicInputConfig>,
): DynamicInputConfig {
  return {
    id: generateDynamicInputId(),
    ...DEFAULT_DYNAMIC_INPUT,
    ...overrides,
  };
}

/**
 * Available meta variables for directory naming patterns.
 */
export const NAMING_PATTERN_VARIABLES = [
  { name: "{file_name}", description: "File name without extension" },
  { name: "{file_ext}", description: "File extension" },
  { name: "{number}", description: "Zero-based index" },
  { name: "{base}", description: "Base variable name" },
  {
    name: "{relative_path}",
    description: "Path relative to directory (sanitized)",
  },
] as const;

// -----------------------------------------------------------------------------
// Preview Display Configuration
// -----------------------------------------------------------------------------

/**
 * Display hint for a property in the preview panel.
 *
 * Used by GenericPropertyDisplay to customize how properties are rendered.
 * This enables schema-driven preview rendering without hardcoding field names.
 */
export interface PreviewDisplayHint {
  /** Override display label (defaults to property key with spaces) */
  label?: string;
  /** How to format the value */
  displayAs?: "text" | "path" | "code" | "list" | "boolean" | "number";
  /** Whether to hide this property from preview display */
  hidden?: boolean;
}

/**
 * Preview display hints for DynamicInputConfig properties.
 *
 * Properties not listed here will be displayed with their key as the label.
 * This allows new properties to automatically appear in the preview without
 * code changes, while still providing customization for known properties.
 *
 * @example
 * ```typescript
 * // Adding hints for a new property:
 * PREVIEW_DISPLAY_HINTS["myNewProperty"] = {
 *   label: "My New Property",
 *   displayAs: "text",
 * };
 * ```
 */
export const PREVIEW_DISPLAY_HINTS: Record<string, PreviewDisplayHint> = {
  // Hidden properties (internal IDs)
  id: { hidden: true },
  inputType: { hidden: true },

  // Common properties
  label: { label: "Label" },
  variableName: { label: "Variable", displayAs: "code" },

  // File properties
  filePath: { label: "File Path", displayAs: "path" },

  // Directory properties
  directoryPath: { label: "Directory", displayAs: "path" },
  globPattern: { label: "Pattern", displayAs: "code" },
  directoryAggregation: { label: "Aggregation" },
  namingPattern: { label: "Naming" },
  customPattern: { label: "Custom Pattern", displayAs: "code" },
  directorySeparator: { label: "Separator", displayAs: "code" },
  recursive: { label: "Recursive", displayAs: "boolean" },
  excludePatterns: { label: "Exclude", displayAs: "list" },
  maxFiles: { label: "Max Files", displayAs: "number" },
  maxFileSize: { label: "Max Size", displayAs: "number" },

  // URL properties
  url: { label: "URL" },
};
