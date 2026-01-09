import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AxiosError, AxiosHeaders } from "axios";

// Mock the apiClient
const mockPost = vi.fn();
const mockGet = vi.fn();
const mockDelete = vi.fn();

vi.mock("@/lib/api/client", () => ({
  apiClient: {
    post: mockPost,
    get: mockGet,
    delete: mockDelete,
  },
  API_BASE_URL: "http://localhost:8000",
}));

// Mock global fetch for SSE testing
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("Chat API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createChatSession", () => {
    it("should create a chat session with config", async () => {
      const mockSession = {
        id: "session-123",
        config: { model: "gemini-2.0-flash" },
        messages: [],
        createdAt: "2026-01-09T00:00:00Z",
        updatedAt: "2026-01-09T00:00:00Z",
      };
      const mockResponse = {
        data: { session: mockSession },
      };
      mockPost.mockResolvedValueOnce(mockResponse);

      const { createChatSession } = await import("@/lib/api/chat");
      const config = { model: "gemini-2.0-flash" };
      const result = await createChatSession("session-123", config);

      expect(mockPost).toHaveBeenCalledWith("/api/chat/sessions", {
        sessionId: "session-123",
        config,
      });
      expect(result).toEqual(mockSession);
    });

    it("should create a chat session without config", async () => {
      const mockSession = {
        id: "session-456",
        config: {},
        messages: [],
        createdAt: "2026-01-09T00:00:00Z",
        updatedAt: "2026-01-09T00:00:00Z",
      };
      const mockResponse = {
        data: { session: mockSession },
      };
      mockPost.mockResolvedValueOnce(mockResponse);

      const { createChatSession } = await import("@/lib/api/chat");
      const result = await createChatSession("session-456");

      expect(mockPost).toHaveBeenCalledWith("/api/chat/sessions", {
        sessionId: "session-456",
        config: {},
      });
      expect(result).toEqual(mockSession);
    });

    it("should handle axios error with detail", async () => {
      const axiosError = new Error("Request failed") as AxiosError;
      axiosError.isAxiosError = true;
      axiosError.response = {
        data: { detail: "Session already exists" },
        status: 409,
        statusText: "Conflict",
        headers: {},
        config: { headers: new AxiosHeaders() },
      };
      mockPost.mockRejectedValueOnce(axiosError);

      const { createChatSession } = await import("@/lib/api/chat");

      await expect(createChatSession("session-123")).rejects.toThrow(
        "Session already exists",
      );
    });

    it("should handle axios error without detail", async () => {
      const axiosError = new Error("Request failed") as AxiosError;
      axiosError.isAxiosError = true;
      axiosError.response = {
        data: {},
        status: 500,
        statusText: "Internal Server Error",
        headers: {},
        config: { headers: new AxiosHeaders() },
      };
      mockPost.mockRejectedValueOnce(axiosError);

      const { createChatSession } = await import("@/lib/api/chat");

      await expect(createChatSession("session-123")).rejects.toThrow(
        "Failed to create chat session",
      );
    });

    it("should handle non-axios error", async () => {
      const genericError = new Error("Network error");
      mockPost.mockRejectedValueOnce(genericError);

      const { createChatSession } = await import("@/lib/api/chat");

      await expect(createChatSession("session-123")).rejects.toThrow(
        "Network error",
      );
    });
  });

  describe("getChatSession", () => {
    it("should get an existing chat session", async () => {
      const mockSession = {
        id: "session-789",
        config: { systemPrompt: "You are a helpful assistant" },
        messages: [
          {
            role: "user" as const,
            content: "Hello",
            timestamp: "2026-01-09T00:00:00Z",
          },
        ],
        createdAt: "2026-01-09T00:00:00Z",
        updatedAt: "2026-01-09T00:00:01Z",
      };
      const mockResponse = {
        data: { session: mockSession },
      };
      mockGet.mockResolvedValueOnce(mockResponse);

      const { getChatSession } = await import("@/lib/api/chat");
      const result = await getChatSession("session-789");

      expect(mockGet).toHaveBeenCalledWith("/api/chat/sessions/session-789");
      expect(result).toEqual(mockSession);
    });

    it("should return null for 404 not found", async () => {
      const axiosError = new Error("Not found") as AxiosError;
      axiosError.isAxiosError = true;
      axiosError.response = {
        data: { detail: "Session not found" },
        status: 404,
        statusText: "Not Found",
        headers: {},
        config: { headers: new AxiosHeaders() },
      };
      mockGet.mockRejectedValueOnce(axiosError);

      const { getChatSession } = await import("@/lib/api/chat");
      const result = await getChatSession("nonexistent");

      expect(result).toBeNull();
    });

    it("should handle axios error with detail", async () => {
      const axiosError = new Error("Request failed") as AxiosError;
      axiosError.isAxiosError = true;
      axiosError.response = {
        data: { detail: "Database connection failed" },
        status: 500,
        statusText: "Internal Server Error",
        headers: {},
        config: { headers: new AxiosHeaders() },
      };
      mockGet.mockRejectedValueOnce(axiosError);

      const { getChatSession } = await import("@/lib/api/chat");

      await expect(getChatSession("session-789")).rejects.toThrow(
        "Database connection failed",
      );
    });

    it("should handle axios error without detail", async () => {
      const axiosError = new Error("Request failed") as AxiosError;
      axiosError.isAxiosError = true;
      axiosError.response = {
        data: {},
        status: 500,
        statusText: "Internal Server Error",
        headers: {},
        config: { headers: new AxiosHeaders() },
      };
      mockGet.mockRejectedValueOnce(axiosError);

      const { getChatSession } = await import("@/lib/api/chat");

      await expect(getChatSession("session-789")).rejects.toThrow(
        "Failed to get chat session",
      );
    });

    it("should handle non-axios error", async () => {
      const genericError = new Error("Timeout");
      mockGet.mockRejectedValueOnce(genericError);

      const { getChatSession } = await import("@/lib/api/chat");

      await expect(getChatSession("session-789")).rejects.toThrow("Timeout");
    });
  });

  describe("deleteChatSession", () => {
    it("should delete an existing session", async () => {
      const mockResponse = {
        data: { success: true, message: "Session deleted" },
      };
      mockDelete.mockResolvedValueOnce(mockResponse);

      const { deleteChatSession } = await import("@/lib/api/chat");
      await deleteChatSession("session-999");

      expect(mockDelete).toHaveBeenCalledWith("/api/chat/sessions/session-999");
    });

    it("should treat 404 as success", async () => {
      const axiosError = new Error("Not found") as AxiosError;
      axiosError.isAxiosError = true;
      axiosError.response = {
        data: { detail: "Session not found" },
        status: 404,
        statusText: "Not Found",
        headers: {},
        config: { headers: new AxiosHeaders() },
      };
      mockDelete.mockRejectedValueOnce(axiosError);

      const { deleteChatSession } = await import("@/lib/api/chat");

      // Should not throw
      await expect(deleteChatSession("nonexistent")).resolves.toBeUndefined();
    });

    it("should handle axios error with detail", async () => {
      const axiosError = new Error("Request failed") as AxiosError;
      axiosError.isAxiosError = true;
      axiosError.response = {
        data: { detail: "Permission denied" },
        status: 403,
        statusText: "Forbidden",
        headers: {},
        config: { headers: new AxiosHeaders() },
      };
      mockDelete.mockRejectedValueOnce(axiosError);

      const { deleteChatSession } = await import("@/lib/api/chat");

      await expect(deleteChatSession("session-999")).rejects.toThrow(
        "Permission denied",
      );
    });

    it("should handle axios error without detail", async () => {
      const axiosError = new Error("Request failed") as AxiosError;
      axiosError.isAxiosError = true;
      axiosError.response = {
        data: {},
        status: 500,
        statusText: "Internal Server Error",
        headers: {},
        config: { headers: new AxiosHeaders() },
      };
      mockDelete.mockRejectedValueOnce(axiosError);

      const { deleteChatSession } = await import("@/lib/api/chat");

      await expect(deleteChatSession("session-999")).rejects.toThrow(
        "Failed to delete chat session",
      );
    });

    it("should handle non-axios error", async () => {
      const genericError = new Error("Connection refused");
      mockDelete.mockRejectedValueOnce(genericError);

      const { deleteChatSession } = await import("@/lib/api/chat");

      await expect(deleteChatSession("session-999")).rejects.toThrow(
        "Connection refused",
      );
    });
  });

  describe("streamChatMessage", () => {
    beforeEach(() => {
      // Reset fetch mock
      mockFetch.mockReset();
    });

    afterEach(() => {
      vi.clearAllTimers();
    });

    it("should stream chat messages successfully", async () => {
      const mockEvents: any[] = [];
      const mockErrors: any[] = [];

      // Mock a successful SSE stream
      const mockReader = {
        read: vi
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(
              'data: {"type":"content","content":"Hello"}\n',
            ),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(
              'data: {"type":"content","content":" world"}\n',
            ),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: {"type":"done"}\n'),
          })
          .mockResolvedValueOnce({
            done: true,
            value: undefined,
          }),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      });

      const { streamChatMessage } = await import("@/lib/api/chat");
      const cleanup = streamChatMessage(
        "session-123",
        "Hello",
        undefined,
        (event) => mockEvents.push(event),
        (error) => mockErrors.push(error),
      );

      // Wait for stream to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/chat/sessions/session-123/messages",
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
          },
          body: JSON.stringify({ content: "Hello" }),
        }),
      );

      expect(mockEvents).toHaveLength(3);
      expect(mockEvents[0]).toEqual({ type: "content", content: "Hello" });
      expect(mockEvents[1]).toEqual({ type: "content", content: " world" });
      expect(mockEvents[2]).toEqual({ type: "done" });
      expect(mockErrors).toHaveLength(0);

      cleanup();
    });

    it("should include project_path in query params when provided", async () => {
      const mockReader = {
        read: vi.fn().mockResolvedValueOnce({
          done: true,
          value: undefined,
        }),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      });

      const { streamChatMessage } = await import("@/lib/api/chat");
      const cleanup = streamChatMessage(
        "session-456",
        "Test message",
        "/path/to/project",
        () => {},
        () => {},
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/chat/sessions/session-456/messages?project_path=%2Fpath%2Fto%2Fproject",
        expect.any(Object),
      );

      cleanup();
    });

    it("should handle malformed JSON in stream", async () => {
      const mockEvents: any[] = [];
      const mockErrors: any[] = [];

      const mockReader = {
        read: vi
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(
              'data: {"type":"content","content":"Valid"}\n',
            ),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode("data: {invalid json}\n"),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: {"type":"done"}\n'),
          })
          .mockResolvedValueOnce({
            done: true,
            value: undefined,
          }),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      });

      const { streamChatMessage } = await import("@/lib/api/chat");
      const cleanup = streamChatMessage(
        "session-789",
        "Test",
        undefined,
        (event) => mockEvents.push(event),
        (error) => mockErrors.push(error),
      );

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should ignore malformed JSON and continue
      expect(mockEvents).toHaveLength(2);
      expect(mockEvents[0]).toEqual({ type: "content", content: "Valid" });
      expect(mockEvents[1]).toEqual({ type: "done" });
      expect(mockErrors).toHaveLength(0);

      cleanup();
    });

    it("should handle HTTP error responses", async () => {
      const mockErrors: any[] = [];

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ detail: "Internal server error" }),
      });

      const { streamChatMessage } = await import("@/lib/api/chat");
      streamChatMessage(
        "session-error",
        "Test",
        undefined,
        () => {},
        (error) => mockErrors.push(error),
      );

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockErrors).toHaveLength(1);
      expect(mockErrors[0].message).toBe("Internal server error");
    });

    it("should handle HTTP error without JSON body", async () => {
      const mockErrors: any[] = [];

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 502,
        json: () => Promise.reject(new Error("Not JSON")),
      });

      const { streamChatMessage } = await import("@/lib/api/chat");
      streamChatMessage(
        "session-error",
        "Test",
        undefined,
        () => {},
        (error) => mockErrors.push(error),
      );

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockErrors).toHaveLength(1);
      expect(mockErrors[0].message).toBe("HTTP 502");
    });

    it("should handle missing response body", async () => {
      const mockErrors: any[] = [];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: null,
      });

      const { streamChatMessage } = await import("@/lib/api/chat");
      streamChatMessage(
        "session-nobody",
        "Test",
        undefined,
        () => {},
        (error) => mockErrors.push(error),
      );

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockErrors).toHaveLength(1);
      expect(mockErrors[0].message).toBe("No response body");
    });

    it("should handle abort signal correctly", async () => {
      const mockEvents: any[] = [];
      const mockErrors: any[] = [];

      // Create a mock that will hang until aborted
      mockFetch.mockImplementation((_url, options) => {
        return new Promise((_resolve, reject) => {
          options.signal?.addEventListener("abort", () => {
            const error = new Error("Aborted");
            error.name = "AbortError";
            reject(error);
          });
        });
      });

      const { streamChatMessage } = await import("@/lib/api/chat");
      const cleanup = streamChatMessage(
        "session-abort",
        "Test",
        undefined,
        (event) => mockEvents.push(event),
        (error) => mockErrors.push(error),
      );

      // Abort immediately
      cleanup();

      await new Promise((resolve) => setTimeout(resolve, 50));

      // AbortError should not trigger onError
      expect(mockEvents).toHaveLength(0);
      expect(mockErrors).toHaveLength(0);
    });

    it("should handle non-abort errors", async () => {
      const mockErrors: any[] = [];

      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const { streamChatMessage } = await import("@/lib/api/chat");
      streamChatMessage(
        "session-net-error",
        "Test",
        undefined,
        () => {},
        (error) => mockErrors.push(error),
      );

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockErrors).toHaveLength(1);
      expect(mockErrors[0].message).toBe("Network error");
    });

    it("should handle non-Error exceptions", async () => {
      const mockErrors: any[] = [];

      mockFetch.mockRejectedValueOnce("String error");

      const { streamChatMessage } = await import("@/lib/api/chat");
      streamChatMessage(
        "session-string-error",
        "Test",
        undefined,
        () => {},
        (error) => mockErrors.push(error),
      );

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockErrors).toHaveLength(1);
      expect(mockErrors[0].message).toBe("String error");
    });

    it("should handle multi-line SSE data correctly", async () => {
      const mockEvents: any[] = [];

      // Simulate data split across multiple chunks
      const mockReader = {
        read: vi
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: {"type":"con'),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('tent","content":"Split"}\n'),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: {"type":"done"}\n'),
          })
          .mockResolvedValueOnce({
            done: true,
            value: undefined,
          }),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      });

      const { streamChatMessage } = await import("@/lib/api/chat");
      const cleanup = streamChatMessage(
        "session-split",
        "Test",
        undefined,
        (event) => mockEvents.push(event),
        () => {},
      );

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockEvents).toHaveLength(2);
      expect(mockEvents[0]).toEqual({ type: "content", content: "Split" });
      expect(mockEvents[1]).toEqual({ type: "done" });

      cleanup();
    });
  });
});
