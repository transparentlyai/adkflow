/**
 * Gemini 2.5 Flash Model Schema
 *
 * Default model with thinking_budget for planning.
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
  modelId: "gemini-2.5-flash",
  label: "Gemini 2.5 Flash",
  order: 30,
  universalFieldIds: UNIVERSAL_FIELD_IDS,
  tabs: DEFAULT_TABS,
  fields: [
    ...createGeneralFields(),
    ...createExecutionFieldsWithBudget(),
    ...createGenerationFields(),
    ...createFlowFields(),
  ],
};
