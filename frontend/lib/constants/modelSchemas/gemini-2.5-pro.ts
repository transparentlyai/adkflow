/**
 * Gemini 2.5 Pro Model Schema
 *
 * Pro model with thinking_budget for planning.
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
  modelId: "gemini-2.5-pro",
  label: "Gemini 2.5 Pro",
  order: 40,
  universalFieldIds: UNIVERSAL_FIELD_IDS,
  tabs: DEFAULT_TABS,
  fields: [
    ...createGeneralFields(),
    ...createExecutionFieldsWithBudget(),
    ...createGenerationFields(),
    ...createFlowFields(),
  ],
};
