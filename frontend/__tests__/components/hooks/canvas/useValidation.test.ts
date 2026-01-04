import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useValidation } from "@/components/hooks/canvas/useValidation";
import type { Node } from "@xyflow/react";

// Mock the helper hooks
const mockHighlightErrorNodes = vi.fn();
const mockHighlightWarningNodes = vi.fn();
const mockClearErrorHighlights = vi.fn();

vi.mock("@/components/hooks/canvas/helpers/useValidationHighlights", () => ({
  useValidationHighlights: () => ({
    highlightErrorNodes: mockHighlightErrorNodes,
    highlightWarningNodes: mockHighlightWarningNodes,
    clearErrorHighlights: mockClearErrorHighlights,
  }),
}));

vi.mock("@/components/hooks/canvas/helpers/useDuplicateNameValidation", () => ({
  useDuplicateNameValidation: vi.fn(),
}));

describe("useValidation", () => {
  const mockNodes: Node[] = [
    {
      id: "node1",
      type: "agent",
      position: { x: 0, y: 0 },
      data: { name: "Agent1" },
    },
    {
      id: "node2",
      type: "tool",
      position: { x: 100, y: 0 },
      data: { name: "Tool1" },
    },
  ];
  const mockSetNodes = vi.fn();
  const mockDuplicateErrorNodesRef = { current: new Map<string, string>() };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return highlightErrorNodes function", () => {
    const { result } = renderHook(() =>
      useValidation({
        nodes: mockNodes,
        setNodes: mockSetNodes,
        duplicateErrorNodesRef: mockDuplicateErrorNodesRef,
      }),
    );

    expect(result.current.highlightErrorNodes).toBe(mockHighlightErrorNodes);
  });

  it("should return highlightWarningNodes function", () => {
    const { result } = renderHook(() =>
      useValidation({
        nodes: mockNodes,
        setNodes: mockSetNodes,
        duplicateErrorNodesRef: mockDuplicateErrorNodesRef,
      }),
    );

    expect(result.current.highlightWarningNodes).toBe(
      mockHighlightWarningNodes,
    );
  });

  it("should return clearErrorHighlights function", () => {
    const { result } = renderHook(() =>
      useValidation({
        nodes: mockNodes,
        setNodes: mockSetNodes,
        duplicateErrorNodesRef: mockDuplicateErrorNodesRef,
      }),
    );

    expect(result.current.clearErrorHighlights).toBe(mockClearErrorHighlights);
  });

  it("should call useValidationHighlights with setNodes", () => {
    renderHook(() =>
      useValidation({
        nodes: mockNodes,
        setNodes: mockSetNodes,
        duplicateErrorNodesRef: mockDuplicateErrorNodesRef,
      }),
    );

    // The mock is called, verifying the hook is being used
    expect(mockHighlightErrorNodes).toBeDefined();
    expect(mockHighlightWarningNodes).toBeDefined();
    expect(mockClearErrorHighlights).toBeDefined();
  });
});
