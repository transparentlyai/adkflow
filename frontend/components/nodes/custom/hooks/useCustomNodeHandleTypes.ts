"use client";

import { useMemo } from "react";
import type {
  CustomNodeSchema,
  DynamicInputConfig,
} from "@/components/nodes/CustomNode";

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
 * Supports additional_handles from handle_layout for link-top/link-bottom handles.
 * Supports dynamic inputs of type 'node' which create runtime handles.
 */
export function useCustomNodeHandleTypes(
  schema: CustomNodeSchema,
  dynamicInputs?: DynamicInputConfig[],
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

    // Add dynamic inputs (all types create handles)
    if (schema.ui.dynamic_inputs && dynamicInputs) {
      dynamicInputs.forEach((di) => {
        // Determine accepted types based on input type
        // file, directory, url accept str (paths/urls)
        // node accepts dict (variables from other nodes)
        const acceptedSources = ["*"];
        const acceptedTypes = di.inputType === "node" ? ["dict"] : ["str"];

        acceptedSources.forEach((s) => allAcceptedSources.add(s));
        acceptedTypes.forEach((t) => allAcceptedTypes.add(t));

        types[di.id] = {
          acceptedSources,
          acceptedTypes,
        };
      });
    }

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

    // Add type info for additional handles from handle_layout
    // These are used for link-top/link-bottom and other positioned handles
    const additionalHandles = schema.ui.handle_layout?.additional_handles || [];
    additionalHandles.forEach((handle) => {
      // Try to find matching input or output definition
      const matchingInput = schema.ui.inputs.find((i) => i.id === handle.id);
      const matchingOutput = schema.ui.outputs.find((o) => o.id === handle.id);

      if (matchingInput) {
        // Already added from inputs loop
        return;
      }
      if (matchingOutput) {
        // Already added from outputs loop
        return;
      }

      // Add default type info for handles not in inputs/outputs
      // These are typically link handles for chaining
      if (handle.type === "source") {
        types[handle.id] = {
          outputSource: schema.unit_id.split(".")[1] || "custom",
          outputType: "link",
        };
      } else {
        types[handle.id] = {
          acceptedSources: ["*"],
          acceptedTypes: ["link"],
        };
      }
    });

    return types;
  }, [schema, dynamicInputs]);
}
