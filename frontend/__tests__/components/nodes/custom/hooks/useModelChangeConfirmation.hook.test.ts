import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useModelChangeConfirmation } from "@/components/nodes/custom/hooks/useModelChangeConfirmation";
import type { CustomNodeData } from "@/components/nodes/CustomNode/types";
import * as modelSchemas from "@/lib/constants/modelSchemas";

// Mock React Flow
const mockSetNodes = vi.fn();
vi.mock("@xyflow/react", () => ({
  useReactFlow: vi.fn(() => ({
    setNodes: mockSetNodes,
  })),
}));

// Mock model schemas
vi.mock("@/lib/constants/modelSchemas", async () => {
  const actual = await vi.importActual("@/lib/constants/modelSchemas");
  return {
    ...actual,
    getModelSchema: vi.fn(),
    getModelDefaults: vi.fn(),
  };
});

const mockGetModelSchema = vi.mocked(modelSchemas.getModelSchema);
const mockGetModelDefaults = vi.mocked(modelSchemas.getModelDefaults);

// Test schemas and defaults
const model1Schema = {
  label: "Model 1",
  tabs: [{ id: "main", label: "Main" }],
  fields: [
    { id: "field1", label: "Field 1", widget: "text" as const, default: "value1" },
    { id: "field2", label: "Field 2", widget: "number" as const, default: 10 },
    { id: "model", label: "Model", widget: "select" as const, default: "model1" },
  ],
};

const model2Schema = {
  label: "Model 2",
  tabs: [{ id: "main", label: "Main" }],
  fields: [
    { id: "field1", label: "Field 1", widget: "text" as const, default: "value2" },
    { id: "field3", label: "Field 3", widget: "checkbox" as const, default: true },
    { id: "model", label: "Model", widget: "select" as const, default: "model2" },
  ],
};

const model1Defaults = {
  field1: "value1",
  field2: 10,
  model: "model1",
};

const model2Defaults = {
  field1: "value2",
  field3: true,
  model: "model2",
};

const mockSchema: CustomNodeData["schema"] = {
  unit_id: "builtin.agent",
  label: "Test Agent",
  node_type: "agent",
  ui: {
    inputs: [],
    outputs: [],
    fields: [],
    layout: { type: "default" as const },
  },
};

describe("useModelChangeConfirmation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSetNodes.mockClear();
    mockGetModelSchema.mockImplementation((model) => {
      if (model === "model1") return model1Schema as any;
      if (model === "model2") return model2Schema as any;
      throw new Error(`Unknown model: ${model}`);
    });
    mockGetModelDefaults.mockImplementation((model) => {
      if (model === "model1") return model1Defaults;
      if (model === "model2") return model2Defaults;
      throw new Error(`Unknown model: ${model}`);
    });
  });

  describe("initialization", () => {
    it("should initialize with dialog closed", () => {
      const { result } = renderHook(() =>
        useModelChangeConfirmation({
          nodeId: "node-1",
          config: { model: "model1" },
          schema: mockSchema,
          unitId: "builtin.agent",
        }),
      );

      expect(result.current.isDialogOpen).toBe(false);
      expect(result.current.pendingModel).toBeNull();
      expect(result.current.fieldChanges).toEqual([]);
    });
  });

  describe("requestModelChange", () => {
    it("should return false for non-Agent nodes", () => {
      const { result } = renderHook(() =>
        useModelChangeConfirmation({
          nodeId: "node-1",
          config: { model: "model1" },
          schema: mockSchema,
          unitId: "builtin.prompt", // Not an agent
        }),
      );

      const dialogShown = result.current.requestModelChange("model2");
      expect(dialogShown).toBe(false);
      expect(result.current.isDialogOpen).toBe(false);
    });

    it("should return false when model doesn't change", () => {
      const { result } = renderHook(() =>
        useModelChangeConfirmation({
          nodeId: "node-1",
          config: { model: "model1" },
          schema: mockSchema,
          unitId: "builtin.agent",
        }),
      );

      const dialogShown = result.current.requestModelChange("model1");
      expect(dialogShown).toBe(false);
      expect(result.current.isDialogOpen).toBe(false);
    });

    it("should apply change immediately when no field changes", () => {
      mockGetModelSchema.mockImplementation((model) => {
        // Both models have same fields
        return {
          label: `Model ${model}`,
          tabs: [{ id: "main", label: "Main" }],
          fields: [
            { id: "field1", label: "Field 1", widget: "text" as const, default: "value1" },
          ],
        } as any;
      });
      mockGetModelDefaults.mockReturnValue({ field1: "value1" });

      const { result } = renderHook(() =>
        useModelChangeConfirmation({
          nodeId: "node-1",
          config: { field1: "value1" },
          schema: mockSchema,
          unitId: "builtin.agent",
        }),
      );

      act(() => {
        result.current.requestModelChange("model2");
      });

      expect(mockSetNodes).toHaveBeenCalled();
      expect(result.current.isDialogOpen).toBe(false);
    });

    it("should show dialog when field changes exist", () => {
      const { result } = renderHook(() =>
        useModelChangeConfirmation({
          nodeId: "node-1",
          config: { model: "model1", field1: "customValue", field2: 10 },
          schema: mockSchema,
          unitId: "builtin.agent",
        }),
      );

      let dialogShown: boolean = false;
      act(() => {
        dialogShown = result.current.requestModelChange("model2");
      });

      expect(dialogShown).toBe(true);
      expect(result.current.isDialogOpen).toBe(true);
      expect(result.current.pendingModel).toBe("model2");
      expect(result.current.fieldChanges.length).toBeGreaterThan(0);
    });

    it("should set newModelLabel correctly", () => {
      const { result } = renderHook(() =>
        useModelChangeConfirmation({
          nodeId: "node-1",
          config: { model: "model1", field1: "customValue" },
          schema: mockSchema,
          unitId: "builtin.agent",
        }),
      );

      act(() => {
        result.current.requestModelChange("model2");
      });

      expect(result.current.newModelLabel).toBe("Model 2");
    });
  });

  describe("confirmModelChange", () => {
    it("should apply model change and close dialog", () => {
      const { result } = renderHook(() =>
        useModelChangeConfirmation({
          nodeId: "node-1",
          config: { model: "model1", field1: "customValue", field2: 10, name: "My Node" },
          schema: mockSchema,
          unitId: "builtin.agent",
        }),
      );

      // Request change to open dialog
      act(() => {
        result.current.requestModelChange("model2");
      });

      expect(result.current.isDialogOpen).toBe(true);

      // Confirm the change
      act(() => {
        result.current.confirmModelChange();
      });

      expect(mockSetNodes).toHaveBeenCalledWith(expect.any(Function));
      expect(result.current.isDialogOpen).toBe(false);
      expect(result.current.pendingModel).toBeNull();
      expect(result.current.fieldChanges).toEqual([]);
    });

    it("should reset all fields to new model defaults", () => {
      const { result } = renderHook(() =>
        useModelChangeConfirmation({
          nodeId: "node-1",
          config: { model: "model1", field1: "customValue", field2: 10, name: "My Node" },
          schema: mockSchema,
          unitId: "builtin.agent",
        }),
      );

      act(() => {
        result.current.requestModelChange("model2");
      });

      act(() => {
        result.current.confirmModelChange();
      });

      const updateFn = mockSetNodes.mock.calls[0][0];
      const mockNodes = [
        {
          id: "node-1",
          data: {
            schema: mockSchema,
            config: { model: "model1", field1: "customValue", field2: 10, name: "My Node" },
          },
        },
      ];

      const updatedNodes = updateFn(mockNodes);
      expect(updatedNodes[0].data.config).toEqual({
        ...model2Defaults,
        model: "model2",
        name: "My Node", // Name preserved
      });
    });

    it("should update schema fields and tabs", () => {
      const { result } = renderHook(() =>
        useModelChangeConfirmation({
          nodeId: "node-1",
          config: { model: "model1", field1: "customValue", name: "My Node" },
          schema: mockSchema,
          unitId: "builtin.agent",
        }),
      );

      act(() => {
        result.current.requestModelChange("model2");
      });

      act(() => {
        result.current.confirmModelChange();
      });

      const updateFn = mockSetNodes.mock.calls[0][0];
      const mockNodes = [
        {
          id: "node-1",
          data: {
            schema: mockSchema,
            config: { model: "model1", field1: "customValue", name: "My Node" },
          },
        },
      ];

      const updatedNodes = updateFn(mockNodes);
      expect(updatedNodes[0].data.schema.ui.fields).toEqual(model2Schema.fields);
      expect(updatedNodes[0].data.schema.ui.tabs).toEqual(model2Schema.tabs);
    });

    it("should do nothing if no pending model", () => {
      const { result } = renderHook(() =>
        useModelChangeConfirmation({
          nodeId: "node-1",
          config: { model: "model1" },
          schema: mockSchema,
          unitId: "builtin.agent",
        }),
      );

      act(() => {
        result.current.confirmModelChange();
      });

      expect(mockSetNodes).not.toHaveBeenCalled();
    });
  });

  describe("cancelModelChange", () => {
    it("should close dialog without applying changes", () => {
      const { result } = renderHook(() =>
        useModelChangeConfirmation({
          nodeId: "node-1",
          config: { model: "model1", field1: "customValue" },
          schema: mockSchema,
          unitId: "builtin.agent",
        }),
      );

      act(() => {
        result.current.requestModelChange("model2");
      });

      expect(result.current.isDialogOpen).toBe(true);

      act(() => {
        result.current.cancelModelChange();
      });

      expect(mockSetNodes).not.toHaveBeenCalled();
      expect(result.current.isDialogOpen).toBe(false);
      expect(result.current.pendingModel).toBeNull();
      expect(result.current.fieldChanges).toEqual([]);
    });
  });
});
