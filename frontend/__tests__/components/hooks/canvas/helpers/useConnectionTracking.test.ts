import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useConnectionTracking } from "@/components/hooks/canvas/helpers/useConnectionTracking";
import type { HandleTypeInfo } from "@/lib/types";
import type { OnConnectStartParams, Connection } from "@xyflow/react";

// Mock the ConnectionContext
const mockStartConnection = vi.fn();
const mockEndConnection = vi.fn();
const mockExpandNodeForConnection = vi.fn();

vi.mock("@/contexts/ConnectionContext", () => ({
  useConnection: vi.fn(() => ({
    startConnection: mockStartConnection,
    endConnection: mockEndConnection,
    expandNodeForConnection: mockExpandNodeForConnection,
  })),
}));

// Mock isTypeCompatible
const mockIsTypeCompatible = vi.fn();
vi.mock("@/lib/types", () => ({
  isTypeCompatible: (...args: unknown[]) => mockIsTypeCompatible(...args),
}));

describe("useConnectionTracking", () => {
  const handleTypeRegistry: Record<string, HandleTypeInfo> = {
    "node1:output": {
      outputSource: "agent",
      outputType: "str",
    },
    "node2:input": {
      acceptedSources: ["agent"],
      acceptedTypes: ["str"],
    },
    "prompt1:output": {
      outputSource: "prompt",
      outputType: "str",
    },
    "tool1:output": {
      outputSource: "tool",
      outputType: "dict",
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("onConnectStart", () => {
    it("should call startConnection with correct parameters when type info exists", () => {
      const { result } = renderHook(() =>
        useConnectionTracking({ handleTypeRegistry, edges: [] }),
      );

      const params: OnConnectStartParams = {
        nodeId: "node1",
        handleId: "output",
        handleType: "source",
      };

      act(() => {
        result.current.onConnectStart({} as MouseEvent, params);
      });

      expect(mockStartConnection).toHaveBeenCalledWith(
        "node1",
        "output",
        "agent",
        "str",
      );
    });

    it("should expand node when dragging from universal output handle", () => {
      const { result } = renderHook(() =>
        useConnectionTracking({ handleTypeRegistry, edges: [] }),
      );

      const params: OnConnectStartParams = {
        nodeId: "node1",
        handleId: "output",
        handleType: "source",
      };

      act(() => {
        result.current.onConnectStart({} as MouseEvent, params);
      });

      expect(mockExpandNodeForConnection).toHaveBeenCalledWith("node1");
    });

    it("should not expand node when dragging from non-output handle", () => {
      const registryWithSpecificHandle: Record<string, HandleTypeInfo> = {
        "prompt1:specific-output": {
          outputSource: "prompt",
          outputType: "str",
        },
      };

      const { result } = renderHook(() =>
        useConnectionTracking({
          handleTypeRegistry: registryWithSpecificHandle,
          edges: [],
        }),
      );

      const params: OnConnectStartParams = {
        nodeId: "prompt1",
        handleId: "specific-output",
        handleType: "source",
      };

      act(() => {
        result.current.onConnectStart({} as MouseEvent, params);
      });

      expect(mockExpandNodeForConnection).not.toHaveBeenCalled();
    });

    it("should not call startConnection if outputSource is missing", () => {
      const registryWithoutSource: Record<string, HandleTypeInfo> = {
        "node1:output": {
          outputType: "str",
        },
      };

      const { result } = renderHook(() =>
        useConnectionTracking({ handleTypeRegistry: registryWithoutSource, edges: [] }),
      );

      const params: OnConnectStartParams = {
        nodeId: "node1",
        handleId: "output",
        handleType: "source",
      };

      act(() => {
        result.current.onConnectStart({} as MouseEvent, params);
      });

      expect(mockStartConnection).not.toHaveBeenCalled();
    });

    it("should not call startConnection if outputType is missing", () => {
      const registryWithoutType: Record<string, HandleTypeInfo> = {
        "node1:output": {
          outputSource: "agent",
        },
      };

      const { result } = renderHook(() =>
        useConnectionTracking({ handleTypeRegistry: registryWithoutType, edges: [] }),
      );

      const params: OnConnectStartParams = {
        nodeId: "node1",
        handleId: "output",
        handleType: "source",
      };

      act(() => {
        result.current.onConnectStart({} as MouseEvent, params);
      });

      expect(mockStartConnection).not.toHaveBeenCalled();
    });

    it("should not call startConnection if nodeId is missing", () => {
      const { result } = renderHook(() =>
        useConnectionTracking({ handleTypeRegistry, edges: [] }),
      );

      const params: OnConnectStartParams = {
        nodeId: null,
        handleId: "output",
        handleType: "source",
      };

      act(() => {
        result.current.onConnectStart({} as MouseEvent, params);
      });

      expect(mockStartConnection).not.toHaveBeenCalled();
    });

    it("should not call startConnection if handleId is missing", () => {
      const { result } = renderHook(() =>
        useConnectionTracking({ handleTypeRegistry, edges: [] }),
      );

      const params: OnConnectStartParams = {
        nodeId: "node1",
        handleId: null,
        handleType: "source",
      };

      act(() => {
        result.current.onConnectStart({} as MouseEvent, params);
      });

      expect(mockStartConnection).not.toHaveBeenCalled();
    });
  });

  describe("onConnectEnd", () => {
    it("should call endConnection", () => {
      const { result } = renderHook(() =>
        useConnectionTracking({ handleTypeRegistry, edges: [] }),
      );

      act(() => {
        result.current.onConnectEnd();
      });

      expect(mockEndConnection).toHaveBeenCalled();
    });
  });

  describe("isValidConnection", () => {
    it("should return false for self-connections", () => {
      mockIsTypeCompatible.mockReturnValue(true);

      const { result } = renderHook(() =>
        useConnectionTracking({ handleTypeRegistry, edges: [] }),
      );

      const connection: Connection = {
        source: "node1",
        target: "node1",
        sourceHandle: "output",
        targetHandle: "input",
      };

      const isValid = result.current.isValidConnection(connection);

      expect(isValid).toBe(false);
      expect(mockIsTypeCompatible).not.toHaveBeenCalled();
    });

    it("should call isTypeCompatible with correct parameters", () => {
      mockIsTypeCompatible.mockReturnValue(true);

      const { result } = renderHook(() =>
        useConnectionTracking({ handleTypeRegistry, edges: [] }),
      );

      const connection: Connection = {
        source: "node1",
        target: "node2",
        sourceHandle: "output",
        targetHandle: "input",
      };

      result.current.isValidConnection(connection);

      expect(mockIsTypeCompatible).toHaveBeenCalledWith(
        "agent",
        "str",
        ["agent"],
        ["str"],
      );
    });

    it("should return true when types are compatible", () => {
      mockIsTypeCompatible.mockReturnValue(true);

      const { result } = renderHook(() =>
        useConnectionTracking({ handleTypeRegistry, edges: [] }),
      );

      const connection: Connection = {
        source: "node1",
        target: "node2",
        sourceHandle: "output",
        targetHandle: "input",
      };

      const isValid = result.current.isValidConnection(connection);

      expect(isValid).toBe(true);
    });

    it("should return false when types are incompatible", () => {
      mockIsTypeCompatible.mockReturnValue(false);

      const { result } = renderHook(() =>
        useConnectionTracking({ handleTypeRegistry, edges: [] }),
      );

      const connection: Connection = {
        source: "node1",
        target: "node2",
        sourceHandle: "output",
        targetHandle: "input",
      };

      const isValid = result.current.isValidConnection(connection);

      expect(isValid).toBe(false);
    });

    it("should handle missing sourceHandle by using empty string", () => {
      mockIsTypeCompatible.mockReturnValue(true);

      const { result } = renderHook(() =>
        useConnectionTracking({ handleTypeRegistry, edges: [] }),
      );

      const connection: Connection = {
        source: "node1",
        target: "node2",
        sourceHandle: null,
        targetHandle: "input",
      };

      result.current.isValidConnection(connection);

      expect(mockIsTypeCompatible).toHaveBeenCalledWith(
        undefined,
        undefined,
        ["agent"],
        ["str"],
      );
    });

    it("should handle missing targetHandle by using empty string", () => {
      mockIsTypeCompatible.mockReturnValue(true);

      const { result } = renderHook(() =>
        useConnectionTracking({ handleTypeRegistry, edges: [] }),
      );

      const connection: Connection = {
        source: "node1",
        target: "node2",
        sourceHandle: "output",
        targetHandle: null,
      };

      result.current.isValidConnection(connection);

      expect(mockIsTypeCompatible).toHaveBeenCalledWith(
        "agent",
        "str",
        undefined,
        undefined,
      );
    });

    it("should handle connection with undefined handle info", () => {
      mockIsTypeCompatible.mockReturnValue(false);

      const { result } = renderHook(() =>
        useConnectionTracking({ handleTypeRegistry, edges: [] }),
      );

      const connection: Connection = {
        source: "unknown",
        target: "node2",
        sourceHandle: "output",
        targetHandle: "input",
      };

      result.current.isValidConnection(connection);

      expect(mockIsTypeCompatible).toHaveBeenCalledWith(
        undefined,
        undefined,
        ["agent"],
        ["str"],
      );
    });

    it("should return false when target handle has multiple: false and existing connection", () => {
      mockIsTypeCompatible.mockReturnValue(true);

      const registryWithMultipleFalse: Record<string, HandleTypeInfo> = {
        "callback1:output": {
          outputSource: "callback",
          outputType: "callable",
        },
        "agent_1:before_agent_callback": {
          acceptedSources: ["callback"],
          acceptedTypes: ["callable"],
          multiple: false,
        },
      };

      const existingEdges: import("@xyflow/react").Edge[] = [
        {
          id: "edge1",
          source: "callback1",
          sourceHandle: "output",
          target: "agent_1",
          targetHandle: "before_agent_callback",
        },
      ];

      const { result } = renderHook(() =>
        useConnectionTracking({
          handleTypeRegistry: registryWithMultipleFalse,
          edges: existingEdges,
        }),
      );

      const connection: import("@xyflow/react").Connection = {
        source: "callback2",
        sourceHandle: "output",
        target: "agent_1",
        targetHandle: "before_agent_callback",
      };

      const isValid = result.current.isValidConnection(connection);

      expect(isValid).toBe(false);
    });

    it("should return true when target handle has multiple: false but no existing connection", () => {
      mockIsTypeCompatible.mockReturnValue(true);

      const registryWithMultipleFalse: Record<string, HandleTypeInfo> = {
        "callback1:output": {
          outputSource: "callback",
          outputType: "callable",
        },
        "agent_1:before_agent_callback": {
          acceptedSources: ["callback"],
          acceptedTypes: ["callable"],
          multiple: false,
        },
      };

      const { result } = renderHook(() =>
        useConnectionTracking({
          handleTypeRegistry: registryWithMultipleFalse,
          edges: [],
        }),
      );

      const connection: import("@xyflow/react").Connection = {
        source: "callback1",
        sourceHandle: "output",
        target: "agent_1",
        targetHandle: "before_agent_callback",
      };

      const isValid = result.current.isValidConnection(connection);

      expect(isValid).toBe(true);
    });

    it("should return true when target handle has multiple: true with existing connections", () => {
      mockIsTypeCompatible.mockReturnValue(true);

      const registryWithMultipleTrue: Record<string, HandleTypeInfo> = {
        "tool1:output": {
          outputSource: "tool",
          outputType: "callable",
        },
        "agent_1:tools-input": {
          acceptedSources: ["tool"],
          acceptedTypes: ["callable"],
          multiple: true,
        },
      };

      const existingEdges: import("@xyflow/react").Edge[] = [
        {
          id: "edge1",
          source: "tool1",
          sourceHandle: "output",
          target: "agent_1",
          targetHandle: "tools-input",
        },
      ];

      const { result } = renderHook(() =>
        useConnectionTracking({
          handleTypeRegistry: registryWithMultipleTrue,
          edges: existingEdges,
        }),
      );

      const connection: import("@xyflow/react").Connection = {
        source: "tool2",
        sourceHandle: "output",
        target: "agent_1",
        targetHandle: "tools-input",
      };

      const isValid = result.current.isValidConnection(connection);

      expect(isValid).toBe(true);
    });
  });

  describe("memoization", () => {
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
      const stableEdges: import("@xyflow/react").Edge[] = [];
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
});
