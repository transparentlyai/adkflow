import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useConnectionTracking } from "@/components/hooks/canvas/helpers/useConnectionTracking";
import type { Edge } from "@xyflow/react";
import { handleTypeRegistry } from "./useConnectionTracking.fixtures";

// Local mock functions for memoization tests - these need to be stable
const mockStartConnection = vi.fn();
const mockEndConnection = vi.fn();
const mockExpandNodeForConnection = vi.fn();

// Mock the ConnectionContext
vi.mock("@/contexts/ConnectionContext", () => ({
  useConnection: vi.fn(() => ({
    startConnection: mockStartConnection,
    endConnection: mockEndConnection,
    expandNodeForConnection: mockExpandNodeForConnection,
  })),
}));

// Mock isTypeCompatible
vi.mock("@/lib/types", () => ({
  isTypeCompatible: vi.fn(),
}));

describe("useConnectionTracking - memoization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should memoize onConnectStart", () => {
    const { result, rerender } = renderHook(() =>
      useConnectionTracking({ handleTypeRegistry, edges: [] }),
    );

    const firstHandler = result.current.onConnectStart;
    rerender();

    expect(result.current.onConnectStart).toBe(firstHandler);
  });

  it("should memoize onConnectEnd", () => {
    const { result, rerender } = renderHook(() =>
      useConnectionTracking({ handleTypeRegistry, edges: [] }),
    );

    const firstHandler = result.current.onConnectEnd;
    rerender();

    expect(result.current.onConnectEnd).toBe(firstHandler);
  });

  it("should memoize isValidConnection when dependencies are stable", () => {
    const stableEdges: Edge[] = [];
    const { result, rerender } = renderHook(() =>
      useConnectionTracking({ handleTypeRegistry, edges: stableEdges }),
    );

    const firstHandler = result.current.isValidConnection;
    rerender();

    expect(result.current.isValidConnection).toBe(firstHandler);
  });

  it("should update callbacks when handleTypeRegistry changes", () => {
    const { result, rerender } = renderHook(
      ({ registry }) =>
        useConnectionTracking({ handleTypeRegistry: registry, edges: [] }),
      { initialProps: { registry: handleTypeRegistry } },
    );

    const firstIsValidConnection = result.current.isValidConnection;

    const newRegistry = {
      ...handleTypeRegistry,
      "node3:output": { outputSource: "tool", outputType: "str" },
    };
    rerender({ registry: newRegistry });

    expect(result.current.isValidConnection).not.toBe(firstIsValidConnection);
  });
});
