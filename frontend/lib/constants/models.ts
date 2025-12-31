/**
 * Shared model options for Gemini models.
 *
 * Re-exports from modelSchemas for backward compatibility.
 * All model data is now defined in modelSchemas/
 */

export type { ModelOption } from "./modelSchemas";
export {
  GEMINI_MODELS,
  DEFAULT_MODEL,
  getProjectSettingsModels,
} from "./modelSchemas";
