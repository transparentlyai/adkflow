/**
 * Shared model options for Gemini models.
 * Used by AgentNode schema and Project Settings.
 */

export interface ModelOption {
  value: string;
  label: string;
}

/**
 * Available Gemini models for agent configuration.
 * The "custom" option allows users to specify a custom model name.
 */
export const GEMINI_MODELS: ModelOption[] = [
  { value: "gemini-3-flash-preview", label: "Gemini 3 Flash (prev)" },
  { value: "gemini-3-pro-preview", label: "Gemini 3 Pro (prev)" },
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { value: "gemini-2.0-flash-exp", label: "Gemini 2.0 Flash Exp" },
  { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
  { value: "custom", label: "Custom..." },
];

/**
 * Default model for new agents.
 */
export const DEFAULT_MODEL = "gemini-2.5-flash";

/**
 * Get model options excluding "custom" for project settings.
 * Project settings only allow selecting pre-defined models.
 */
export const getProjectSettingsModels = (): ModelOption[] => {
  return GEMINI_MODELS.filter((m) => m.value !== "custom");
};
