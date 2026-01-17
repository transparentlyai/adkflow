/**
 * Custom Model Schema
 *
 * Allows users to specify a custom model name.
 * Uses same fields as Gemini 2.5 Flash (full feature set).
 */

import type { ModelSchema } from "./types";
import { UNIVERSAL_FIELD_IDS, DEFAULT_TABS } from "./types";
import {
  createGeneralFields,
  createSystemInstructionFields,
  createExecutionFieldsWithBudget,
  createGenerationFields,
  createFlowFields,
} from "./fields";

export const schema: ModelSchema = {
  modelId: "custom",
  label: "Custom...",
  order: 100,
  universalFieldIds: UNIVERSAL_FIELD_IDS,
  tabs: DEFAULT_TABS,
  fields: [
    ...createGeneralFields(),
    ...createSystemInstructionFields(),
    ...createExecutionFieldsWithBudget(),
    ...createGenerationFields(),
    ...createFlowFields(),
  ],
};
