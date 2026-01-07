/**
 * Gemini 2.0 Flash Exp Model Schema
 *
 * Experimental flash model with thinking_budget for planning.
 */

import type { ModelSchema } from "./types";
import { UNIVERSAL_FIELD_IDS, DEFAULT_TABS } from "./types";
import {
  createGeneralFields,
  createSystemInstructionFields,
  createExecutionFieldsWithBudget,
  createGenerationFields,
  createFlowFields,
  createCallbacksFields,
} from "./fields";

export const schema: ModelSchema = {
  modelId: "gemini-2.0-flash-exp",
  label: "Gemini 2.0 Flash Exp",
  order: 50,
  universalFieldIds: UNIVERSAL_FIELD_IDS,
  tabs: DEFAULT_TABS,
  fields: [
    ...createGeneralFields(),
    ...createSystemInstructionFields(),
    ...createExecutionFieldsWithBudget(),
    ...createGenerationFields(),
    ...createFlowFields(),
    ...createCallbacksFields(),
  ],
};
