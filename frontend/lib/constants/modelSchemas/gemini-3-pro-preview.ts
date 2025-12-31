/**
 * Gemini 3 Pro Preview Model Schema
 *
 * Pro preview model with thinking_level for planning.
 * Uses temperature default of 1.0 (recommended for Gemini 3).
 */

import type { ModelSchema } from "./types";
import { UNIVERSAL_FIELD_IDS, DEFAULT_TABS } from "./types";
import {
  createGeneralFields,
  createExecutionFieldsWithLevel,
  createFlowFields,
  createSchemaFields,
  createCallbacksFields,
} from "./fields";

export const schema: ModelSchema = {
  modelId: "gemini-3-pro-preview",
  label: "Gemini 3 Pro (prev)",
  order: 20,
  universalFieldIds: UNIVERSAL_FIELD_IDS,
  tabs: DEFAULT_TABS,
  fields: [
    ...createGeneralFields({
      temperature: 1,
      temperatureHelpText:
        "Controls randomness in responses (0 = deterministic, 2 = creative). Note: For Gemini 3 models, temperatures below 1 are not recommended and may cause unexpected behavior.",
    }),
    ...createExecutionFieldsWithLevel(),
    ...createFlowFields(),
    ...createSchemaFields(),
    ...createCallbacksFields(),
  ],
};
