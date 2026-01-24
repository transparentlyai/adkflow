import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
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

describe("useModelChangeConfirmation - formatValue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSetNodes.mockClear();
    mockGetModelSchema.mockReturnValue({
      label: "Model",
      tabs: [],
      fields: [],
    } as any);
    mockGetModelDefaults.mockReturnValue({});
  });

  it("should format empty values as '(empty)'", () => {
    const { result } = renderHook(() =>
      useModelChangeConfirmation({
        nodeId: "node-1",
        config: {},
        schema: mockSchema,
        unitId: "builtin.agent",
      }),
    );

    expect(result.current.formatValue(null)).toBe("(empty)");
    expect(result.current.formatValue(undefined)).toBe("(empty)");
    expect(result.current.formatValue("")).toBe("(empty)");
  });

  it("should format boolean values", () => {
    const { result } = renderHook(() =>
      useModelChangeConfirmation({
        nodeId: "node-1",
        config: {},
        schema: mockSchema,
        unitId: "builtin.agent",
      }),
    );

    expect(result.current.formatValue(true)).toBe("Yes");
    expect(result.current.formatValue(false)).toBe("No");
  });

  it("should format number values", () => {
    const { result } = renderHook(() =>
      useModelChangeConfirmation({
        nodeId: "node-1",
        config: {},
        schema: mockSchema,
        unitId: "builtin.agent",
      }),
    );

    expect(result.current.formatValue(42)).toBe("42");
    expect(result.current.formatValue(0)).toBe("0");
  });

  it("should format short strings with quotes", () => {
    const { result } = renderHook(() =>
      useModelChangeConfirmation({
        nodeId: "node-1",
        config: {},
        schema: mockSchema,
        unitId: "builtin.agent",
      }),
    );

    expect(result.current.formatValue("test")).toBe('"test"');
  });

  it("should truncate long strings", () => {
    const { result } = renderHook(() =>
      useModelChangeConfirmation({
        nodeId: "node-1",
        config: {},
        schema: mockSchema,
        unitId: "builtin.agent",
      }),
    );

    const longString = "a".repeat(50);
    const formatted = result.current.formatValue(longString);
    expect(formatted).toMatch(/^"a+\.\.\."/);
    expect(formatted.length).toBeLessThan(longString.length + 2); // +2 for quotes
  });
});
