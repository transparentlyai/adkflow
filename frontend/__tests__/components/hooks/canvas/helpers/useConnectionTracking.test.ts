import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useConnectionTracking } from "@/components/hooks/canvas/helpers/useConnectionTracking";
import type { HandleTypeInfo } from "@/lib/types";
import type { OnConnectStartParams } from "@xyflow/react";
import {
  mockStartConnection,
  mockEndConnection,
  mockExpandNodeForConnection,
  handleTypeRegistry,
  clearMocks,
} from "./useConnectionTracking.fixtures";

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

describe("useConnectionTracking", () => {
  beforeEach(() => {
    clearMocks();
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
});
