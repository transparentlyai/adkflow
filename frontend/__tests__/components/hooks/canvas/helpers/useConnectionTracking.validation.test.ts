import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useConnectionTracking } from "@/components/hooks/canvas/helpers/useConnectionTracking";
import type { HandleTypeInfo } from "@/lib/types";
import type { Connection, Edge } from "@xyflow/react";
import {
  mockIsTypeCompatible,
  handleTypeRegistry,
  registryWithMultipleFalse,
  registryWithMultipleTrue,
  existingEdgesToCallback,
  existingEdgesToTools,
  clearMocks,
} from "./useConnectionTracking.fixtures";

// Mock the ConnectionContext
vi.mock("@/contexts/ConnectionContext", () => ({
  useConnection: vi.fn(() => ({
    startConnection: vi.fn(),
    endConnection: vi.fn(),
    expandNodeForConnection: vi.fn(),
  })),
}));

// Mock isTypeCompatible
vi.mock("@/lib/types", () => ({
  isTypeCompatible: (...args: unknown[]) => mockIsTypeCompatible(...args),
}));

describe("useConnectionTracking - isValidConnection", () => {
  beforeEach(() => {
    clearMocks();
  });

  describe("self-connection prevention", () => {
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
  });

  describe("type compatibility checks", () => {
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
  });

  describe("missing handle info", () => {
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
  });

  describe("multiple connections constraint", () => {
    it("should return false when target handle has multiple: false and existing connection", () => {
      mockIsTypeCompatible.mockReturnValue(true);

      const { result } = renderHook(() =>
        useConnectionTracking({
          handleTypeRegistry: registryWithMultipleFalse,
          edges: existingEdgesToCallback,
        }),
      );

      const connection: Connection = {
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

      const { result } = renderHook(() =>
        useConnectionTracking({
          handleTypeRegistry: registryWithMultipleFalse,
          edges: [],
        }),
      );

      const connection: Connection = {
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

      const { result } = renderHook(() =>
        useConnectionTracking({
          handleTypeRegistry: registryWithMultipleTrue,
          edges: existingEdgesToTools,
        }),
      );

      const connection: Connection = {
        source: "tool2",
        sourceHandle: "output",
        target: "agent_1",
        targetHandle: "tools-input",
      };

      const isValid = result.current.isValidConnection(connection);

      expect(isValid).toBe(true);
    });
  });
});
