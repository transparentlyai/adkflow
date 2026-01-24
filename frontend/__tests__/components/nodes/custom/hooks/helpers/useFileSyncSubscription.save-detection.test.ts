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

describe("useFileSyncSubscription - save detection and edge cases", () => {
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

  describe("own save detection", () => {
    it("should skip events within 2s of own save", async () => {
      vi.useFakeTimers();
      const now = 1000000;
      vi.setSystemTime(now);

      const { result } = renderHook(() =>
        useFileSyncSubscription(defaultParams),
      );

      // Mark own save
      act(() => {
        result.current.markSaveTimestamp();
      });

      const subscribeCallback = mockSubscribeToFile.mock.calls[0][1];
      const event: FileChangeEvent = {
        file_path: "/test/file.py",
        change_type: "modified",
        timestamp: (now + 1000) / 1000, // 1 second after save
      };

      await act(async () => {
        await subscribeCallback(event);
      });

      expect(readPrompt as any).not.toHaveBeenCalled();

      vi.useRealTimers();
    });

    it("should process events after 2s window", async () => {
      vi.useFakeTimers();
      const now = 1000000;
      vi.setSystemTime(now);

      (readPrompt as any).mockResolvedValue({ content: "new content" });

      const { result } = renderHook(() =>
        useFileSyncSubscription(defaultParams),
      );

      // Mark own save
      act(() => {
        result.current.markSaveTimestamp();
      });

      const subscribeCallback = mockSubscribeToFile.mock.calls[0][1];
      const event: FileChangeEvent = {
        file_path: "/test/file.py",
        change_type: "modified",
        timestamp: (now + 2500) / 1000, // 2.5 seconds after save
      };

      await act(async () => {
        await subscribeCallback(event);
      });

      expect(readPrompt as any).toHaveBeenCalled();

      vi.useRealTimers();
    });

    it("should process events before own save timestamp", async () => {
      vi.useFakeTimers();
      const now = 1000000;
      vi.setSystemTime(now);

      (readPrompt as any).mockResolvedValue({ content: "new content" });

      const { result } = renderHook(() =>
        useFileSyncSubscription(defaultParams),
      );

      // Mark own save
      act(() => {
        result.current.markSaveTimestamp();
      });

      const subscribeCallback = mockSubscribeToFile.mock.calls[0][1];
      const event: FileChangeEvent = {
        file_path: "/test/file.py",
        change_type: "modified",
        timestamp: (now - 1000) / 1000, // 1 second before save
      };

      await act(async () => {
        await subscribeCallback(event);
      });

      expect(readPrompt as any).toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  describe("return value", () => {
    it("should return markSaveTimestamp function", () => {
      const { result } = renderHook(() =>
        useFileSyncSubscription(defaultParams),
      );

      expect(typeof result.current.markSaveTimestamp).toBe("function");
    });

    it("should mark timestamp when markSaveTimestamp is called", () => {
      vi.useFakeTimers();
      const now = 1000000;
      vi.setSystemTime(now);

      const { result } = renderHook(() =>
        useFileSyncSubscription(defaultParams),
      );

      act(() => {
        result.current.markSaveTimestamp();
      });

      // Verify timestamp was set by checking if recent event is skipped
      const subscribeCallback = mockSubscribeToFile.mock.calls[0][1];
      const event: FileChangeEvent = {
        file_path: "/test/file.py",
        change_type: "modified",
        timestamp: (now + 500) / 1000,
      };

      act(() => {
        subscribeCallback(event);
      });

      expect(readPrompt as any).not.toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  describe("edge cases", () => {
    it("should preserve other node config fields when updating", async () => {
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

      const setNodesCallback = mockSetNodes.mock.calls[0][0];
      const mockNodes = [
        {
          id: "node-1",
          data: {
            label: "Test Node",
            config: {
              code: "old content",
              model: "gpt-4",
              temperature: 0.7,
            },
          },
          position: { x: 100, y: 200 },
        },
      ];

      const result = setNodesCallback(mockNodes);

      expect(result[0].data.label).toBe("Test Node");
      expect(result[0].data.config.model).toBe("gpt-4");
      expect(result[0].data.config.temperature).toBe(0.7);
      expect(result[0].data.config.code).toBe("new content");
      expect(result[0].position).toEqual({ x: 100, y: 200 });
    });

    it("should handle nodes without config", async () => {
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

      const setNodesCallback = mockSetNodes.mock.calls[0][0];
      const mockNodes = [
        {
          id: "node-1",
          data: {},
        },
      ];

      const result = setNodesCallback(mockNodes);

      expect(result[0].data.config.code).toBe("new content");
    });

    it("should update correct codeFieldId", async () => {
      (readPrompt as any).mockResolvedValue({ content: "new content" });

      renderHook(() =>
        useFileSyncSubscription({
          ...defaultParams,
          codeFieldId: "customField",
        }),
      );

      const subscribeCallback = mockSubscribeToFile.mock.calls[0][1];
      const event: FileChangeEvent = {
        file_path: "/test/file.py",
        change_type: "modified",
        timestamp: Date.now() / 1000,
      };

      await act(async () => {
        await subscribeCallback(event);
      });

      const setNodesCallback = mockSetNodes.mock.calls[0][0];
      const mockNodes = [
        {
          id: "node-1",
          data: {
            config: {
              code: "old content",
              customField: "old custom content",
            },
          },
        },
      ];

      const result = setNodesCallback(mockNodes);

      expect(result[0].data.config.code).toBe("old content");
      expect(result[0].data.config.customField).toBe("new content");
    });
  });
});
