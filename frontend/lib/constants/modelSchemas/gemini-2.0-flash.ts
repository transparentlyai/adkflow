/**
 * Gemini 2.0 Flash Model Schema
 *
 * Legacy flash model with thinking_budget for planning.
 */

import type { ModelSchema } from "./types";
import { UNIVERSAL_FIELD_IDS, DEFAULT_TABS } from "./types";
import {
  createGeneralFields,
  createExecutionFieldsWithBudget,
  createGenerationFields,
  createFlowFields,
} from "./fields";

export const schema: ModelSchema = {
  modelId: "gemini-2.0-flash",
  label: "Gemini 2.0 Flash",
  order: 60,
  universalFieldIds: UNIVERSAL_FIELD_IDS,
  tabs: DEFAULT_TABS,
  fields: [
    ...createGeneralFields(),
    ...createExecutionFieldsWithBudget(),
    ...createGenerationFields(),
    ...createFlowFields(),
  ],
};
