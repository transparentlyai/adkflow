import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useCustomNodeHandleTypes } from "@/components/nodes/custom/hooks/useCustomNodeHandleTypes";
import type {
  CustomNodeSchema,
  DynamicInputConfig,
} from "@/components/nodes/CustomNode";

describe("useCustomNodeHandleTypes", () => {
  const baseSchema: CustomNodeSchema = {
    unit_id: "agent.test",
    label: "Test Agent",
    node_type: "agent",
    ui: {
      inputs: [
        {
          id: "input_1",
          label: "Input 1",
          source_type: "agent",
          data_type: "string",
        },
        {
          id: "input_2",
          label: "Input 2",
          source_type: "prompt",
          data_type: "string",
          accepted_sources: ["prompt", "agent"],
          accepted_types: ["string", "dict"],
        },
      ],
      outputs: [
        {
          id: "output_1",
          label: "Output 1",
          source_type: "agent",
          data_type: "string",
        },
      ],
      fields: [],
      layout: { type: "default" },
    },
  } as unknown as CustomNodeSchema;

  describe("input handle types", () => {
    it("should create handle types for all inputs", () => {
      const { result } = renderHook(() => useCustomNodeHandleTypes(baseSchema));

      expect(result.current["input_1"]).toEqual({
        acceptedSources: ["agent"],
        acceptedTypes: ["string"],
      });
    });

    it("should use accepted_sources when provided", () => {
      const { result } = renderHook(() => useCustomNodeHandleTypes(baseSchema));

      expect(result.current["input_2"]).toEqual({
        acceptedSources: ["prompt", "agent"],
        acceptedTypes: ["string", "dict"],
      });
    });

    it("should fall back to source_type when accepted_sources not provided", () => {
      const { result } = renderHook(() => useCustomNodeHandleTypes(baseSchema));

      expect(result.current["input_1"]).toEqual({
        acceptedSources: ["agent"],
        acceptedTypes: ["string"],
      });
    });
  });

  describe("output handle types", () => {
    it("should create handle types for all outputs", () => {
      const { result } = renderHook(() => useCustomNodeHandleTypes(baseSchema));

      expect(result.current["output_1"]).toEqual({
        outputSource: "agent",
        outputType: "string",
      });
    });

    it("should create multiple output handle types", () => {
      const schemaWithMultipleOutputs: CustomNodeSchema = {
        ...baseSchema,
        ui: {
          ...baseSchema.ui,
          outputs: [
            {
              id: "output_1",
              label: "Output 1",
              source_type: "agent",
              data_type: "string",
              required: false,
              multiple: true,
            },
            {
              id: "output_2",
              label: "Output 2",
              source_type: "prompt",
              data_type: "dict",
              required: false,
              multiple: true,
            },
          ],
        },
      } as unknown as CustomNodeSchema;

      const { result } = renderHook(() =>
        useCustomNodeHandleTypes(schemaWithMultipleOutputs),
      );

      expect(result.current["output_1"]).toEqual({
        outputSource: "agent",
        outputType: "string",
      });
      expect(result.current["output_2"]).toEqual({
        outputSource: "prompt",
        outputType: "dict",
      });
    });
  });

  describe("combined input handle", () => {
    it("should create combined input handle with all accepted sources and types", () => {
      const { result } = renderHook(() => useCustomNodeHandleTypes(baseSchema));

      expect(result.current["input"]).toEqual({
        acceptedSources: ["agent", "prompt"],
        acceptedTypes: ["string", "dict"],
      });
    });

    it("should deduplicate sources and types", () => {
      const schemaWithDuplicates: CustomNodeSchema = {
        ...baseSchema,
        ui: {
          ...baseSchema.ui,
          inputs: [
            {
              id: "input_1",
              label: "Input 1",
              source_type: "agent",
              data_type: "string",
              required: false,
              multiple: true,
            },
            {
              id: "input_2",
              label: "Input 2",
              source_type: "agent",
              data_type: "string",
              required: false,
              multiple: true,
            },
          ],
        },
      } as unknown as CustomNodeSchema;

      const { result } = renderHook(() =>
        useCustomNodeHandleTypes(schemaWithDuplicates),
      );

      expect(result.current["input"]).toEqual({
        acceptedSources: ["agent"],
        acceptedTypes: ["string"],
      });
    });
  });

  describe("combined output handle", () => {
    it("should create combined output handle with single source/type when only one output", () => {
      const { result } = renderHook(() => useCustomNodeHandleTypes(baseSchema));

      expect(result.current["output"]).toEqual({
        outputSource: "agent",
        outputType: "string",
      });
    });

    it("should use wildcard when multiple sources or types", () => {
      const schemaWithMultipleOutputs: CustomNodeSchema = {
        ...baseSchema,
        ui: {
          ...baseSchema.ui,
          outputs: [
            {
              id: "output_1",
              label: "Output 1",
              source_type: "agent",
              data_type: "string",
              required: false,
              multiple: true,
            },
            {
              id: "output_2",
              label: "Output 2",
              source_type: "prompt",
              data_type: "dict",
              required: false,
              multiple: true,
            },
          ],
        },
      } as unknown as CustomNodeSchema;

      const { result } = renderHook(() =>
        useCustomNodeHandleTypes(schemaWithMultipleOutputs),
      );

      expect(result.current["output"]).toEqual({
        outputSource: "*",
        outputType: "*",
      });
    });

    it("should use specific source when all outputs have same source", () => {
      const schemaSameSource: CustomNodeSchema = {
        ...baseSchema,
        ui: {
          ...baseSchema.ui,
          outputs: [
            {
              id: "output_1",
              label: "Output 1",
              source_type: "agent",
              data_type: "string",
              required: false,
              multiple: true,
            },
            {
              id: "output_2",
              label: "Output 2",
              source_type: "agent",
              data_type: "dict",
              required: false,
              multiple: true,
            },
          ],
        },
      } as unknown as CustomNodeSchema;

      const { result } = renderHook(() =>
        useCustomNodeHandleTypes(schemaSameSource),
      );

      expect(result.current["output"]).toEqual({
        outputSource: "agent",
        outputType: "*",
      });
    });
  });

  describe("dynamic inputs", () => {
    const schemaWithDynamicInputs: CustomNodeSchema = {
      ...baseSchema,
      ui: {
        ...baseSchema.ui,
        dynamic_inputs: true,
      },
    };

    it("should handle node type dynamic inputs with dict type", () => {
      const dynamicInputs: DynamicInputConfig[] = [
        {
          id: "dynamic_1",
          inputType: "node",
          label: "Dynamic Node Input",
        } as DynamicInputConfig,
      ];

      const { result } = renderHook(() =>
        useCustomNodeHandleTypes(schemaWithDynamicInputs, dynamicInputs),
      );

      expect(result.current["dynamic_1"]).toEqual({
        acceptedSources: ["*"],
        acceptedTypes: ["dict"],
      });
    });

    it("should handle file type dynamic inputs with str type", () => {
      const dynamicInputs: DynamicInputConfig[] = [
        {
          id: "dynamic_2",
          inputType: "file",
          label: "Dynamic File Input",
        } as DynamicInputConfig,
      ];

      const { result } = renderHook(() =>
        useCustomNodeHandleTypes(schemaWithDynamicInputs, dynamicInputs),
      );

      expect(result.current["dynamic_2"]).toEqual({
        acceptedSources: ["*"],
        acceptedTypes: ["str"],
      });
    });

    it("should handle directory type dynamic inputs with str type", () => {
      const dynamicInputs: DynamicInputConfig[] = [
        {
          id: "dynamic_3",
          inputType: "directory",
          label: "Dynamic Directory Input",
        } as DynamicInputConfig,
      ];

      const { result } = renderHook(() =>
        useCustomNodeHandleTypes(schemaWithDynamicInputs, dynamicInputs),
      );

      expect(result.current["dynamic_3"]).toEqual({
        acceptedSources: ["*"],
        acceptedTypes: ["str"],
      });
    });

    it("should handle url type dynamic inputs with str type", () => {
      const dynamicInputs: DynamicInputConfig[] = [
        {
          id: "dynamic_4",
          inputType: "url",
          label: "Dynamic URL Input",
        } as DynamicInputConfig,
      ];

      const { result } = renderHook(() =>
        useCustomNodeHandleTypes(schemaWithDynamicInputs, dynamicInputs),
      );

      expect(result.current["dynamic_4"]).toEqual({
        acceptedSources: ["*"],
        acceptedTypes: ["str"],
      });
    });

    it("should include dynamic inputs in combined input handle", () => {
      const dynamicInputs: DynamicInputConfig[] = [
        {
          id: "dynamic_1",
          inputType: "node",
          label: "Dynamic Node Input",
        } as DynamicInputConfig,
      ];

      const { result } = renderHook(() =>
        useCustomNodeHandleTypes(schemaWithDynamicInputs, dynamicInputs),
      );

      expect(result.current["input"].acceptedSources).toContain("*");
      expect(result.current["input"].acceptedTypes).toContain("dict");
    });

    it("should handle empty dynamic inputs array", () => {
      const { result } = renderHook(() =>
        useCustomNodeHandleTypes(schemaWithDynamicInputs, []),
      );

      // Should only have static inputs
      expect(result.current["input_1"]).toBeDefined();
      expect(result.current["input"]).toBeDefined();
    });

    it("should handle undefined dynamic inputs when schema does not support them", () => {
      const { result } = renderHook(() =>
        useCustomNodeHandleTypes(baseSchema, undefined),
      );

      expect(result.current["input_1"]).toBeDefined();
      expect(result.current["output_1"]).toBeDefined();
    });
  });

  describe("additional handles from handle_layout", () => {
    it("should create type info for additional source handles", () => {
      const schemaWithAdditionalHandles: CustomNodeSchema = {
        ...baseSchema,
        ui: {
          ...baseSchema.ui,
          handle_layout: {
            additional_handles: [
              {
                id: "link_top",
                type: "source",
                position: "top",
              },
            ],
          },
        },
      };

      const { result } = renderHook(() =>
        useCustomNodeHandleTypes(schemaWithAdditionalHandles),
      );

      expect(result.current["link_top"]).toEqual({
        outputSource: "test",
        outputType: "link",
      });
    });

    it("should create type info for additional target handles", () => {
      const schemaWithAdditionalHandles: CustomNodeSchema = {
        ...baseSchema,
        ui: {
          ...baseSchema.ui,
          handle_layout: {
            additional_handles: [
              {
                id: "link_bottom",
                type: "target",
                position: "bottom",
              },
            ],
          },
        },
      };

      const { result } = renderHook(() =>
        useCustomNodeHandleTypes(schemaWithAdditionalHandles),
      );

      expect(result.current["link_bottom"]).toEqual({
        acceptedSources: ["*"],
        acceptedTypes: ["link"],
      });
    });

    it("should not override existing input/output handles", () => {
      const schemaWithAdditionalHandles: CustomNodeSchema = {
        ...baseSchema,
        ui: {
          ...baseSchema.ui,
          handle_layout: {
            additional_handles: [
              {
                id: "input_1",
                type: "target",
                position: "left",
              },
            ],
          },
        },
      };

      const { result } = renderHook(() =>
        useCustomNodeHandleTypes(schemaWithAdditionalHandles),
      );

      // Should use the input definition, not additional handle
      expect(result.current["input_1"]).toEqual({
        acceptedSources: ["agent"],
        acceptedTypes: ["string"],
      });
    });

    it("should handle schema without handle_layout", () => {
      const { result } = renderHook(() => useCustomNodeHandleTypes(baseSchema));

      expect(result.current["input_1"]).toBeDefined();
      expect(result.current["output_1"]).toBeDefined();
    });
  });

  describe("memoization", () => {
    it("should return same object when schema and dynamicInputs have not changed", () => {
      const { result, rerender } = renderHook(
        ({ schema, dynamicInputs }) =>
          useCustomNodeHandleTypes(schema, dynamicInputs),
        {
          initialProps: { schema: baseSchema, dynamicInputs: undefined },
        },
      );

      const firstResult = result.current;
      rerender({ schema: baseSchema, dynamicInputs: undefined });
      const secondResult = result.current;

      expect(firstResult).toBe(secondResult);
    });

    it("should return new object when schema changes", () => {
      const { result, rerender } = renderHook(
        ({ schema }) => useCustomNodeHandleTypes(schema),
        {
          initialProps: { schema: baseSchema },
        },
      );

      const firstResult = result.current;

      const modifiedSchema = {
        ...baseSchema,
        ui: {
          ...baseSchema.ui,
          inputs: [
            ...baseSchema.ui.inputs,
            {
              id: "input_3",
              label: "Input 3",
              source_type: "tool",
              data_type: "dict",
              required: false,
              multiple: true,
            },
          ],
        },
      } as unknown as CustomNodeSchema;

      rerender({ schema: modifiedSchema });
      const secondResult = result.current;

      expect(firstResult).not.toBe(secondResult);
      expect(secondResult["input_3"]).toBeDefined();
    });

    it("should return new object when dynamicInputs changes", () => {
      const schemaWithDynamicInputs: CustomNodeSchema = {
        ...baseSchema,
        ui: {
          ...baseSchema.ui,
          dynamic_inputs: true,
        },
      };

      const { result, rerender } = renderHook(
        ({ dynamicInputs }) =>
          useCustomNodeHandleTypes(schemaWithDynamicInputs, dynamicInputs),
        {
          initialProps: {
            dynamicInputs: undefined as DynamicInputConfig[] | undefined,
          },
        },
      );

      const firstResult = result.current;

      const newDynamicInputs: DynamicInputConfig[] = [
        {
          id: "dynamic_1",
          inputType: "node",
          label: "Dynamic Input",
        } as DynamicInputConfig,
      ];

      rerender({ dynamicInputs: newDynamicInputs });
      const secondResult = result.current;

      expect(firstResult).not.toBe(secondResult);
      expect(secondResult["dynamic_1"]).toBeDefined();
    });
  });

  describe("edge cases", () => {
    it("should handle schema with no inputs", () => {
      const schemaNoInputs: CustomNodeSchema = {
        ...baseSchema,
        ui: {
          ...baseSchema.ui,
          inputs: [],
        },
      };

      const { result } = renderHook(() =>
        useCustomNodeHandleTypes(schemaNoInputs),
      );

      expect(result.current["input"]).toEqual({
        acceptedSources: [],
        acceptedTypes: [],
      });
    });

    it("should handle schema with no outputs", () => {
      const schemaNoOutputs: CustomNodeSchema = {
        ...baseSchema,
        ui: {
          ...baseSchema.ui,
          outputs: [],
        },
      };

      const { result } = renderHook(() =>
        useCustomNodeHandleTypes(schemaNoOutputs),
      );

      expect(result.current["output"]).toEqual({
        outputSource: "*",
        outputType: "*",
      });
    });

    it("should handle unit_id without dot separator", () => {
      const schemaSimpleUnitId: CustomNodeSchema = {
        ...baseSchema,
        unit_id: "agent",
        ui: {
          ...baseSchema.ui,
          handle_layout: {
            additional_handles: [
              {
                id: "link_handle",
                type: "source",
                position: "top",
              },
            ],
          },
        },
      };

      const { result } = renderHook(() =>
        useCustomNodeHandleTypes(schemaSimpleUnitId),
      );

      expect(result.current["link_handle"]).toEqual({
        outputSource: "custom",
        outputType: "link",
      });
    });
  });
});
