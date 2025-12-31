/**
 * Model Schema Types
 *
 * Shared types and constants for model schema definitions.
 */

import type { FieldDefinition } from "@/components/nodes/CustomNode/types";

/**
 * Schema definition for a model's Agent Node fields.
 */
export interface ModelSchema {
  /** Model identifier (used as the value in model select) */
  modelId: string;
  /** Display label shown in UI */
  label: string;
  /** Sort order in the model dropdown (lower = higher in list) */
  order?: number;
  /** Field IDs that are preserved when switching models */
  universalFieldIds: string[];
  /** Tab names for organizing fields */
  tabs: string[];
  /** Field definitions for this model */
  fields: FieldDefinition[];
}

/**
 * Model option for select dropdowns.
 */
export interface ModelOption {
  value: string;
  label: string;
}

/**
 * Universal field IDs that are always preserved when switching models.
 * Note: "location" is not included as it's now a project-level setting.
 */
export const UNIVERSAL_FIELD_IDS = [
  "description",
  "model",
  "custom_model",
  "temperature",
];

/**
 * Default tabs for most models.
 */
export const DEFAULT_TABS = ["General", "Execution", "Flow", "Schema", "Callbacks"];

/**
 * Vertex AI locations/regions for Gemini models.
 * Used by ProjectSettingsDialog for location selection.
 * @see https://cloud.google.com/vertex-ai/generative-ai/docs/learn/locations
 */
export const VERTEX_AI_LOCATIONS = [
  // Global
  { value: "global", label: "Global (Auto)" },
  // United States
  { value: "us-central1", label: "US Central (Iowa)" },
  { value: "us-east1", label: "US East (South Carolina)" },
  { value: "us-east4", label: "US East (N. Virginia)" },
  { value: "us-east5", label: "US East (Ohio)" },
  { value: "us-south1", label: "US South (Texas)" },
  { value: "us-west1", label: "US West (Oregon)" },
  { value: "us-west4", label: "US West (Nevada)" },
  // Canada
  { value: "northamerica-northeast1", label: "Canada (Montréal)" },
  // South America
  { value: "southamerica-east1", label: "South America (São Paulo)" },
  // Europe
  { value: "europe-west1", label: "Europe (Belgium)" },
  { value: "europe-west2", label: "Europe (London)" },
  { value: "europe-west3", label: "Europe (Frankfurt)" },
  { value: "europe-west4", label: "Europe (Netherlands)" },
  { value: "europe-west6", label: "Europe (Zürich)" },
  { value: "europe-west8", label: "Europe (Milan)" },
  { value: "europe-west9", label: "Europe (Paris)" },
  { value: "europe-southwest1", label: "Europe (Madrid)" },
  { value: "europe-north1", label: "Europe (Finland)" },
  { value: "europe-central2", label: "Europe (Warsaw)" },
  // Asia Pacific
  { value: "asia-northeast1", label: "Asia (Tokyo)" },
  { value: "asia-northeast3", label: "Asia (Seoul)" },
  { value: "asia-east1", label: "Asia (Taiwan)" },
  { value: "asia-east2", label: "Asia (Hong Kong)" },
  { value: "asia-south1", label: "Asia (Mumbai)" },
  { value: "asia-southeast1", label: "Asia (Singapore)" },
  { value: "australia-southeast1", label: "Australia (Sydney)" },
  // Middle East
  { value: "me-central1", label: "Middle East (Qatar)" },
  { value: "me-central2", label: "Middle East (Saudi Arabia)" },
  { value: "me-west1", label: "Middle East (Tel Aviv)" },
];
