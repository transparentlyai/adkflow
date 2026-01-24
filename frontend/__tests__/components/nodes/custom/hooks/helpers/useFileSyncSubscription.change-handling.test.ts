import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFileSyncSubscription } from "@/components/nodes/custom/hooks/helpers/useFileSyncSubscription";
import type { FileChangeEvent } from "@/contexts/FileSyncContext";

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
import { readPrompt } from "@/lib/api";
import { flushSync } from "react-dom";

describe("useFileSyncSubscription - change handling", () => {
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

  describe("file change handling", () => {
    it("should reload file content on modified event", async () => {
      (readPrompt as any).mockResolvedValue({ content: "new content" });

      renderHook(() => useFileSyncSubscription(defaultParams));

      const subscribeCallback = mockSubscribeToFile.mock.calls[0][1];
      const event: FileChangeEvent = {
        file_path: "/test/file.py",
        change_type: "modified",
        timestamp: Date.now() / 1000,
      };

      await act(async () => {
        await subscribeCallback(event);
      });

      expect(readPrompt as any).toHaveBeenCalledWith(
        "/test/project",
        "/test/file.py",
      );
      expect(mockSetSavedContent).toHaveBeenCalledWith("new content");
    });

    it("should update node config with new content", async () => {
      (readPrompt as any).mockResolvedValue({ content: "new content" });

      renderHook(() => useFileSyncSubscription(defaultParams));

      const subscribeCallback = mockSubscribeToFile.mock.calls[0][1];
      const event: FileChangeEvent = {
        file_path: "/test/file.py",
        change_type: "modified",
        timestamp: Date.now() / 1000,
      };

      await act(async () => {
        await subscribeCallback(event);
      });

      expect(mockSetNodes).toHaveBeenCalled();
      const setNodesCallback = mockSetNodes.mock.calls[0][0];

      const mockNodes = [
        {
          id: "node-1",
          data: {
            config: {
              code: "old content",
            },
          },
        },
        {
          id: "node-2",
          data: {
            config: {
              code: "other content",
            },
          },
        },
      ];

      const result = setNodesCallback(mockNodes);

      expect(result[0].data.config.code).toBe("new content");
      expect(result[1].data.config.code).toBe("other content");
    });

    it("should use flushSync to update savedContent before setNodes", async () => {
      (readPrompt as any).mockResolvedValue({ content: "new content" });

      renderHook(() => useFileSyncSubscription(defaultParams));

      const subscribeCallback = mockSubscribeToFile.mock.calls[0][1];
      const event: FileChangeEvent = {
        file_path: "/test/file.py",
        change_type: "modified",
        timestamp: Date.now() / 1000,
      };

      await act(async () => {
        await subscribeCallback(event);
      });

      expect(flushSync).toHaveBeenCalled();
    });

    it("should handle created event", async () => {
      (readPrompt as any).mockResolvedValue({ content: "created content" });

      renderHook(() => useFileSyncSubscription(defaultParams));

      const subscribeCallback = mockSubscribeToFile.mock.calls[0][1];
      const event: FileChangeEvent = {
        file_path: "/test/file.py",
        change_type: "created",
        timestamp: Date.now() / 1000,
      };

      await act(async () => {
        await subscribeCallback(event);
      });

      expect(readPrompt as any).toHaveBeenCalled();
      expect(mockSetSavedContent).toHaveBeenCalledWith("created content");
    });

    it("should ignore deleted event", async () => {
      renderHook(() => useFileSyncSubscription(defaultParams));

      const subscribeCallback = mockSubscribeToFile.mock.calls[0][1];
      const event: FileChangeEvent = {
        file_path: "/test/file.py",
        change_type: "deleted",
        timestamp: Date.now() / 1000,
      };

      await act(async () => {
        await subscribeCallback(event);
      });

      expect(readPrompt as any).not.toHaveBeenCalled();
      expect(mockSetSavedContent).not.toHaveBeenCalled();
    });

    it("should skip events when not expanded", async () => {
      const { rerender } = renderHook(
        (props) => useFileSyncSubscription(props),
        { initialProps: defaultParams },
      );

      const subscribeCallback = mockSubscribeToFile.mock.calls[0][1];

      // Collapse the node
      rerender({
        ...defaultParams,
        isExpanded: false,
      });

      const event: FileChangeEvent = {
        file_path: "/test/file.py",
        change_type: "modified",
        timestamp: Date.now() / 1000,
      };

      await act(async () => {
        await subscribeCallback(event);
      });

      expect(readPrompt as any).not.toHaveBeenCalled();
    });

    it("should skip events when projectPath is null", async () => {
      (useProject as any).mockReturnValue({
        projectPath: null,
      });

      renderHook(() => useFileSyncSubscription(defaultParams));

      const subscribeCallback = mockSubscribeToFile.mock.calls[0][1];
      const event: FileChangeEvent = {
        file_path: "/test/file.py",
        change_type: "modified",
        timestamp: Date.now() / 1000,
      };

      await act(async () => {
        await subscribeCallback(event);
      });

      expect(readPrompt as any).not.toHaveBeenCalled();
    });

    it("should handle file read errors gracefully", async () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      (readPrompt as any).mockRejectedValue(new Error("Read failed"));

      renderHook(() => useFileSyncSubscription(defaultParams));

      const subscribeCallback = mockSubscribeToFile.mock.calls[0][1];
      const event: FileChangeEvent = {
        file_path: "/test/file.py",
        change_type: "modified",
        timestamp: Date.now() / 1000,
      };

      await act(async () => {
        await subscribeCallback(event);
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to reload file after change:",
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });
  });
});
