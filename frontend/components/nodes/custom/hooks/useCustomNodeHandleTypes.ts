"use client";

import { useMemo } from "react";
import type { CustomNodeSchema } from "@/components/nodes/CustomNode";

export interface HandleTypeInfo {
  outputSource?: string;
  outputType?: string;
  acceptedSources?: string[];
  acceptedTypes?: string[];
}

export type HandleTypes = Record<string, HandleTypeInfo>;

/**
 * Hook to build handle types map from a CustomNode schema.
 * Creates type information for each input/output handle for connection validation.
 * Also creates a combined "input" entry with all accepted sources/types.
 */
export function useCustomNodeHandleTypes(
  schema: CustomNodeSchema,
): HandleTypes {
  return useMemo(() => {
    const types: HandleTypes = {};

    const allAcceptedSources = new Set<string>();
    const allAcceptedTypes = new Set<string>();

    schema.ui.inputs.forEach((input) => {
      (input.accepted_sources || [input.source_type]).forEach((s) =>
        allAcceptedSources.add(s),
      );
      (input.accepted_types || [input.data_type]).forEach((t) =>
        allAcceptedTypes.add(t),
      );
      types[input.id] = {
        acceptedSources: input.accepted_sources || [input.source_type],
        acceptedTypes: input.accepted_types || [input.data_type],
      };
    });

    // Combined entry for collapsed view's main input handle
    types["input"] = {
      acceptedSources: Array.from(allAcceptedSources),
      acceptedTypes: Array.from(allAcceptedTypes),
    };

    schema.ui.outputs.forEach((output) => {
      types[output.id] = {
        outputSource: output.source_type,
        outputType: output.data_type,
      };
    });

    return types;
  }, [schema]);
}
