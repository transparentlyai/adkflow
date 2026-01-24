import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useFileSyncSubscription } from "@/components/nodes/custom/hooks/helpers/useFileSyncSubscription";

vi.mock("@xyflow/react", () => ({
  useReactFlow: vi.fn(() => ({
    setNodes: vi.fn(),
  })),
}));

vi.mock("@/contexts/ProjectContext", () => ({
  useProject: vi.fn(() => ({
    projectPath: "/test/project",
  })),
}));

vi.mock("@/contexts/FileSyncContext", () => ({
  useFileSync: vi.fn(() => ({
    subscribeToFile: vi.fn(),
    registerNodeFile: vi.fn(),
    unregisterNodeFile: vi.fn(),
  })),
}));

vi.mock("@/lib/api", () => ({
  readPrompt: vi.fn(),
}));

vi.mock("react-dom", () => ({
  flushSync: vi.fn((fn) => fn()),
}));

import { useReactFlow } from "@xyflow/react";
import { useProject } from "@/contexts/ProjectContext";
import { useFileSync } from "@/contexts/FileSyncContext";

describe("useFileSyncSubscription - registration", () => {
  const mockSetSavedContent = vi.fn();
  const mockSetNodes = vi.fn();
  const mockSubscribeToFile = vi.fn();
  const mockRegisterNodeFile = vi.fn();
  const mockUnregisterNodeFile = vi.fn();

  const defaultParams = {
    nodeId: "node-1",
    filePath: "/test/file.py",
    codeFieldId: "code",
    isExpanded: true,
    setSavedContent: mockSetSavedContent,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSubscribeToFile.mockReturnValue(vi.fn());
    (useReactFlow as any).mockReturnValue({
      setNodes: mockSetNodes,
    });
    (useProject as any).mockReturnValue({
      projectPath: "/test/project",
    });
    (useFileSync as any).mockReturnValue({
      subscribeToFile: mockSubscribeToFile,
      registerNodeFile: mockRegisterNodeFile,
      unregisterNodeFile: mockUnregisterNodeFile,
    });
  });

  describe("node registration", () => {
    it("should register node with file on mount", () => {
      renderHook(() => useFileSyncSubscription(defaultParams));

      expect(mockRegisterNodeFile).toHaveBeenCalledWith(
        "node-1",
        "/test/file.py",
      );
    });

    it("should unregister node on unmount", () => {
      const { unmount } = renderHook(() =>
        useFileSyncSubscription(defaultParams),
      );

      unmount();

      expect(mockUnregisterNodeFile).toHaveBeenCalledWith("node-1");
    });

    it("should re-register when filePath changes", () => {
      const { rerender } = renderHook(
        (props) => useFileSyncSubscription(props),
        { initialProps: defaultParams },
      );

      rerender({
        ...defaultParams,
        filePath: "/new/file.py",
      });

      expect(mockRegisterNodeFile).toHaveBeenCalledWith(
        "node-1",
        "/new/file.py",
      );
    });

    it("should not register when filePath is empty", () => {
      renderHook(() =>
        useFileSyncSubscription({
          ...defaultParams,
          filePath: "",
        }),
      );

      expect(mockRegisterNodeFile).not.toHaveBeenCalled();
    });
  });

  describe("file subscription", () => {
    it("should subscribe to file when expanded", () => {
      renderHook(() => useFileSyncSubscription(defaultParams));

      expect(mockSubscribeToFile).toHaveBeenCalledWith(
        "/test/file.py",
        expect.any(Function),
      );
    });

    it("should not subscribe when collapsed", () => {
      renderHook(() =>
        useFileSyncSubscription({
          ...defaultParams,
          isExpanded: false,
        }),
      );

      expect(mockSubscribeToFile).not.toHaveBeenCalled();
    });

    it("should unsubscribe when collapsed", () => {
      const unsubscribe = vi.fn();
      mockSubscribeToFile.mockReturnValue(unsubscribe);

      const { rerender } = renderHook(
        (props) => useFileSyncSubscription(props),
        { initialProps: defaultParams },
      );

      rerender({
        ...defaultParams,
        isExpanded: false,
      });

      expect(unsubscribe).toHaveBeenCalled();
    });

    it("should resubscribe when filePath changes", () => {
      const { rerender } = renderHook(
        (props) => useFileSyncSubscription(props),
        { initialProps: defaultParams },
      );

      rerender({
        ...defaultParams,
        filePath: "/new/file.py",
      });

      expect(mockSubscribeToFile).toHaveBeenCalledWith(
        "/new/file.py",
        expect.any(Function),
      );
    });

    it("should not subscribe when filePath is empty", () => {
      renderHook(() =>
        useFileSyncSubscription({
          ...defaultParams,
          filePath: "",
        }),
      );

      expect(mockSubscribeToFile).not.toHaveBeenCalled();
    });
  });
});
