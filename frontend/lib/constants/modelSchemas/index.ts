/**
 * Model Schemas Index
 *
 * Auto-discovery of model schemas. To add a new model:
 * 1. Create a new file in this directory (e.g., my-model.ts)
 * 2. Export a `schema` object conforming to ModelSchema
 * 3. Import and add it to the ALL_SCHEMAS array below
 *
 * The model will be automatically available in the UI.
 */

import type { FieldDefinition } from "@/components/nodes/CustomNode/types";
import type { ModelSchema, ModelOption } from "./types";
import { UNIVERSAL_FIELD_IDS, DEFAULT_TABS, VERTEX_AI_LOCATIONS } from "./types";

// Import all model schemas
import { schema as gemini3FlashPreview } from "./gemini-3-flash-preview";
import { schema as gemini3ProPreview } from "./gemini-3-pro-preview";
import { schema as gemini25Flash } from "./gemini-2.5-flash";
import { schema as gemini25Pro } from "./gemini-2.5-pro";
import { schema as gemini20FlashExp } from "./gemini-2.0-flash-exp";
import { schema as gemini20Flash } from "./gemini-2.0-flash";
import { schema as customModel } from "./custom";

/**
 * All model schemas.
 * To add a new model, import it above and add to this array.
 */
const ALL_SCHEMAS: ModelSchema[] = [
  gemini3FlashPreview,
  gemini3ProPreview,
  gemini25Flash,
  gemini25Pro,
  gemini20FlashExp,
  gemini20Flash,
  customModel,
];

/**
 * Default model ID.
 */
export const DEFAULT_MODEL = "gemini-2.5-flash";

/**
 * Registry of all model schemas by modelId.
 */
export const MODEL_SCHEMAS: Record<string, ModelSchema> = Object.fromEntries(
  ALL_SCHEMAS.map((schema) => [schema.modelId, schema])
);

/**
 * Default schema used for unknown models.
 */
const DEFAULT_SCHEMA = MODEL_SCHEMAS[DEFAULT_MODEL];

/**
 * Available Gemini models for agent configuration.
 * Derived from model schemas, sorted by order.
 */
export const GEMINI_MODELS: ModelOption[] = ALL_SCHEMAS
  .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
  .map((schema) => ({
    value: schema.modelId,
    label: schema.label,
  }));

/**
 * Get the schema for a specific model.
 * Falls back to default schema for unknown models.
 */
export function getModelSchema(modelId: string): ModelSchema {
  return MODEL_SCHEMAS[modelId] || DEFAULT_SCHEMA;
}

/**
 * Get the list of universal field IDs.
 */
export function getUniversalFieldIds(): string[] {
  return UNIVERSAL_FIELD_IDS;
}

/**
 * Get fields for a specific model.
 */
export function getModelFields(modelId: string): FieldDefinition[] {
  return getModelSchema(modelId).fields;
}

/**
 * Get tabs for a specific model.
 */
export function getModelTabs(modelId: string): string[] {
  return getModelSchema(modelId).tabs;
}

/**
 * Build default config values for a model.
 */
export function getModelDefaults(modelId: string): Record<string, unknown> {
  const schema = getModelSchema(modelId);
  const defaults: Record<string, unknown> = {};

  for (const field of schema.fields) {
    if (field.default !== undefined) {
      defaults[field.id] = field.default;
    }
  }

  return defaults;
}

/**
 * Get model options excluding "custom" for project settings.
 * Project settings only allow selecting pre-defined models.
 */
export function getProjectSettingsModels(): ModelOption[] {
  return GEMINI_MODELS.filter((m) => m.value !== "custom");
}

// Re-export types and constants
export type { ModelSchema, ModelOption } from "./types";
export { UNIVERSAL_FIELD_IDS, DEFAULT_TABS, VERTEX_AI_LOCATIONS } from "./types";
