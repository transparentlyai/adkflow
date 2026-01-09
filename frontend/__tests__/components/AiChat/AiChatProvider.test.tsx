import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { ReactNode } from "react";
import { AiChatProvider, useAiChat } from "@/components/AiChat/AiChatProvider";
import { ProjectProvider } from "@/contexts/ProjectContext";
import * as chatApi from "@/lib/api/chat";
import type { ChatSession, ChatStreamEvent } from "@/lib/types";

// Mock the chat API
vi.mock("@/lib/api/chat", () => ({
  createChatSession: vi.fn(),
  getChatSession: vi.fn(),
  streamChatMessage: vi.fn(),
}));

// Mock console.error to avoid noise in tests
const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

describe("AiChatProvider", () => {
  const mockSession: ChatSession = {
    id: "test-session",
    config: {
      systemPrompt: "You are a helpful assistant",
      model: "gpt-4",
    },
    messages: [
      {
        role: "user",
        content: "Hello",
        timestamp: "2024-01-01T00:00:00Z",
      },
      {
        role: "assistant",
        content: "Hi there!",
        timestamp: "2024-01-01T00:00:01Z",
      },
    ],
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:01Z",
  };

  const wrapper = ({ children }: { children: ReactNode }) => (
    <ProjectProvider projectPath="/test/project">
      <AiChatProvider>{children}</AiChatProvider>
    </ProjectProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy.mockClear();
  });

  describe("initialization", () => {
    it("should provide initial state", () => {
      const { result } = renderHook(() => useAiChat(), { wrapper });

      expect(result.current.isOpen).toBe(false);
      expect(result.current.session).toBeNull();
      expect(result.current.messages).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("should throw error when used outside provider", () => {
      expect(() => {
        renderHook(() => useAiChat());
      }).toThrow("useAiChat must be used within an AiChatProvider");
    });
  });

  describe("openChat", () => {
    it("should open chat with existing session", async () => {
      vi.mocked(chatApi.getChatSession).mockResolvedValue(mockSession);

      const { result } = renderHook(() => useAiChat(), { wrapper });

      await result.current.openChat({
        sessionId: "test-session",
      });

      await waitFor(() => {
        expect(result.current.isOpen).toBe(true);
      });

      expect(result.current.session).toEqual(mockSession);
      expect(result.current.messages).toEqual(mockSession.messages);
      expect(chatApi.getChatSession).toHaveBeenCalledWith("test-session");
      expect(chatApi.createChatSession).not.toHaveBeenCalled();
    });

    it("should create new session when none exists", async () => {
      vi.mocked(chatApi.getChatSession).mockResolvedValue(null);
      vi.mocked(chatApi.createChatSession).mockResolvedValue(mockSession);

      const { result } = renderHook(() => useAiChat(), { wrapper });

      await result.current.openChat({
        sessionId: "new-session",
        systemPrompt: "Test prompt",
        context: { key: "value" },
        model: "gpt-4",
      });

      await waitFor(() => {
        expect(result.current.isOpen).toBe(true);
      });

      expect(chatApi.getChatSession).toHaveBeenCalledWith("new-session");
      expect(chatApi.createChatSession).toHaveBeenCalledWith("new-session", {
        systemPrompt: "Test prompt",
        context: { key: "value" },
        model: "gpt-4",
      });
      expect(result.current.session).toEqual(mockSession);
    });

    it("should handle error when opening chat", async () => {
      const error = new Error("Failed to load session");
      vi.mocked(chatApi.getChatSession).mockRejectedValue(error);

      const { result } = renderHook(() => useAiChat(), { wrapper });

      await result.current.openChat({
        sessionId: "error-session",
      });

      await waitFor(() => {
        expect(result.current.error).toBe("Failed to load session");
      });

      expect(result.current.isOpen).toBe(false);
    });

    it("should handle non-Error exceptions", async () => {
      vi.mocked(chatApi.getChatSession).mockRejectedValue("string error");

      const { result } = renderHook(() => useAiChat(), { wrapper });

      await result.current.openChat({
        sessionId: "error-session",
      });

      await waitFor(() => {
        expect(result.current.error).toBe("Failed to open chat");
      });
    });

    it("should clear previous error when opening chat", async () => {
      vi.mocked(chatApi.getChatSession).mockResolvedValue(mockSession);

      const { result } = renderHook(() => useAiChat(), { wrapper });

      // Simulate existing error
      vi.mocked(chatApi.getChatSession).mockRejectedValueOnce(
        new Error("Previous error"),
      );
      await result.current.openChat({ sessionId: "test" });
      await waitFor(() => expect(result.current.error).toBeTruthy());

      // Open chat again successfully
      vi.mocked(chatApi.getChatSession).mockResolvedValue(mockSession);
      await result.current.openChat({ sessionId: "test-session" });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });
    });
  });

  describe("closeChat", () => {
    it("should close chat and reset loading state", async () => {
      vi.mocked(chatApi.getChatSession).mockResolvedValue(mockSession);

      const { result } = renderHook(() => useAiChat(), { wrapper });

      await result.current.openChat({ sessionId: "test-session" });
      await waitFor(() => expect(result.current.isOpen).toBe(true));

      result.current.closeChat();

      await waitFor(() => {
        expect(result.current.isOpen).toBe(false);
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("should abort ongoing stream when closing", async () => {
      const abortFn = vi.fn();
      vi.mocked(chatApi.getChatSession).mockResolvedValue(mockSession);
      vi.mocked(chatApi.streamChatMessage).mockReturnValue(abortFn);

      const { result } = renderHook(() => useAiChat(), { wrapper });

      await result.current.openChat({ sessionId: "test-session" });
      await waitFor(() => expect(result.current.isOpen).toBe(true));

      // Start a message stream
      result.current.sendMessage("test");

      // Close while streaming
      result.current.closeChat();

      expect(abortFn).toHaveBeenCalled();
    });
  });

  describe("sendMessage", () => {
    beforeEach(async () => {
      vi.mocked(chatApi.getChatSession).mockResolvedValue(mockSession);
    });

    it("should return error if no active session", async () => {
      const { result } = renderHook(() => useAiChat(), { wrapper });

      await result.current.sendMessage("Hello");

      await waitFor(() => {
        expect(result.current.error).toBe("No active chat session");
      });
    });

    it("should add user message optimistically", async () => {
      const abortFn = vi.fn();
      vi.mocked(chatApi.streamChatMessage).mockReturnValue(abortFn);

      const { result } = renderHook(() => useAiChat(), { wrapper });

      await result.current.openChat({ sessionId: "test-session" });
      await waitFor(() => expect(result.current.isOpen).toBe(true));

      await result.current.sendMessage("Hello AI");

      await waitFor(() => {
        const messages = result.current.messages;
        const userMessage = messages.find(
          (m) => m.content === "Hello AI" && m.role === "user",
        );
        expect(userMessage).toBeDefined();
        expect(result.current.isLoading).toBe(true);
      });
    });

    it("should stream assistant response with content events", async () => {
      let onEventCallback: ((event: ChatStreamEvent) => void) | null = null;

      vi.mocked(chatApi.streamChatMessage).mockImplementation(
        (sessionId, content, projectPath, onEvent) => {
          onEventCallback = onEvent;
          return vi.fn();
        },
      );

      const { result } = renderHook(() => useAiChat(), { wrapper });

      await result.current.openChat({ sessionId: "test-session" });
      await waitFor(() => expect(result.current.isOpen).toBe(true));

      await result.current.sendMessage("Test message");

      // Simulate streaming content
      onEventCallback?.({ type: "content", content: "Hello" });
      onEventCallback?.({ type: "content", content: " world" });
      onEventCallback?.({ type: "done" });

      await waitFor(() => {
        const assistantMessage = result.current.messages.find(
          (m) => m.role === "assistant" && m.content === "Hello world",
        );
        expect(assistantMessage).toBeDefined();
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("should handle error event during streaming", async () => {
      let onEventCallback: ((event: ChatStreamEvent) => void) | null = null;

      vi.mocked(chatApi.streamChatMessage).mockImplementation(
        (sessionId, content, projectPath, onEvent) => {
          onEventCallback = onEvent;
          return vi.fn();
        },
      );

      const { result } = renderHook(() => useAiChat(), { wrapper });

      await result.current.openChat({ sessionId: "test-session" });
      await waitFor(() => expect(result.current.isOpen).toBe(true));

      const initialMessageCount = result.current.messages.length;
      await result.current.sendMessage("Test message");

      // Simulate error without any content
      onEventCallback?.({ type: "error", error: "Stream error occurred" });

      await waitFor(() => {
        expect(result.current.error).toBe("Stream error occurred");
        expect(result.current.isLoading).toBe(false);
        // Empty assistant message should be removed
        expect(result.current.messages.length).toBe(initialMessageCount + 1); // Only user message
      });
    });

    it("should handle error callback", async () => {
      let onErrorCallback: ((error: Error) => void) | null = null;

      vi.mocked(chatApi.streamChatMessage).mockImplementation(
        (sessionId, content, projectPath, onEvent, onError) => {
          onErrorCallback = onError;
          return vi.fn();
        },
      );

      const { result } = renderHook(() => useAiChat(), { wrapper });

      await result.current.openChat({ sessionId: "test-session" });
      await waitFor(() => expect(result.current.isOpen).toBe(true));

      const initialMessageCount = result.current.messages.length;
      await result.current.sendMessage("Test message");

      // Simulate error callback
      onErrorCallback?.(new Error("Connection failed"));

      await waitFor(() => {
        expect(result.current.error).toBe("Connection failed");
        expect(result.current.isLoading).toBe(false);
        // Empty assistant message should be removed
        expect(result.current.messages.length).toBe(initialMessageCount + 1);
      });
    });

    it("should keep assistant message with partial content on error", async () => {
      let onEventCallback: ((event: ChatStreamEvent) => void) | null = null;

      vi.mocked(chatApi.streamChatMessage).mockImplementation(
        (sessionId, content, projectPath, onEvent) => {
          onEventCallback = onEvent;
          return vi.fn();
        },
      );

      const { result } = renderHook(() => useAiChat(), { wrapper });

      await result.current.openChat({ sessionId: "test-session" });
      await waitFor(() => expect(result.current.isOpen).toBe(true));

      const initialMessageCount = result.current.messages.length;
      await result.current.sendMessage("Test message");

      // Simulate partial content then error
      onEventCallback?.({ type: "content", content: "Partial response" });
      onEventCallback?.({ type: "error", error: "Stream interrupted" });

      await waitFor(() => {
        expect(result.current.error).toBe("Stream interrupted");
        expect(result.current.messages.length).toBe(initialMessageCount + 2); // User + partial assistant
        const assistantMessage = result.current.messages.find(
          (m) => m.role === "assistant" && m.content === "Partial response",
        );
        expect(assistantMessage).toBeDefined();
      });
    });

    it("should clear error before sending new message", async () => {
      let onEventCallback: ((event: ChatStreamEvent) => void) | null = null;

      vi.mocked(chatApi.streamChatMessage).mockImplementation(
        (sessionId, content, projectPath, onEvent) => {
          onEventCallback = onEvent;
          return vi.fn();
        },
      );

      const { result } = renderHook(() => useAiChat(), { wrapper });

      await result.current.openChat({ sessionId: "test-session" });
      await waitFor(() => expect(result.current.isOpen).toBe(true));

      // First message with error
      await result.current.sendMessage("First");
      onEventCallback?.({ type: "error", error: "Error 1" });
      await waitFor(() => expect(result.current.error).toBe("Error 1"));

      // Second message should clear error
      await result.current.sendMessage("Second");

      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });
    });

    it("should pass projectPath to streamChatMessage", async () => {
      vi.mocked(chatApi.streamChatMessage).mockReturnValue(vi.fn());

      const { result } = renderHook(() => useAiChat(), { wrapper });

      await result.current.openChat({ sessionId: "test-session" });
      await waitFor(() => expect(result.current.isOpen).toBe(true));

      await result.current.sendMessage("Test");

      await waitFor(() => {
        expect(chatApi.streamChatMessage).toHaveBeenCalledWith(
          "test-session",
          "Test",
          "/test/project",
          expect.any(Function),
          expect.any(Function),
        );
      });
    });
  });

  describe("clearError", () => {
    it("should clear error state", async () => {
      vi.mocked(chatApi.getChatSession).mockRejectedValue(
        new Error("Test error"),
      );

      const { result } = renderHook(() => useAiChat(), { wrapper });

      await result.current.openChat({ sessionId: "test-session" });
      await waitFor(() => expect(result.current.error).toBeTruthy());

      result.current.clearError();

      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });
    });
  });
});
