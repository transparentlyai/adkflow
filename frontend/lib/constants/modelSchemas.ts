/**
 * Model Schema Definitions
 *
 * Re-exports from modelSchemas/ for backward compatibility.
 * All model schemas are now defined in individual files in modelSchemas/
 *
 * To add a new model:
 * 1. Create a new file in modelSchemas/ (e.g., my-model.ts)
 * 2. Export a `schema` object conforming to ModelSchema
 * 3. Import and add it to ALL_SCHEMAS in modelSchemas/index.ts
 */

export type { ModelSchema, ModelOption } from "./modelSchemas/types";
export {
  // Constants
  UNIVERSAL_FIELD_IDS,
  DEFAULT_TABS,
  VERTEX_AI_LOCATIONS,
  DEFAULT_MODEL,
  MODEL_SCHEMAS,
  GEMINI_MODELS,
  // Functions
  getModelSchema,
  getModelFields,
  getModelTabs,
  getModelDefaults,
  getProjectSettingsModels,
} from "./modelSchemas/index";
