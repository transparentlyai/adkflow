/**
 * Chat API functions for AI chat service
 */

import axios from "axios";
import type {
  ChatSession,
  ChatSessionConfig,
  ChatStreamEvent,
  CreateChatSessionResponse,
  GetChatSessionResponse,
  DeleteChatSessionResponse,
} from "@/lib/types";
import { apiClient, API_BASE_URL } from "./client";

/**
 * Create a new chat session
 */
export async function createChatSession(
  sessionId: string,
  config?: ChatSessionConfig,
): Promise<ChatSession> {
  try {
    const response = await apiClient.post<CreateChatSessionResponse>(
      "/api/chat/sessions",
      {
        sessionId,
        config: config || {},
      },
    );
    return response.data.session;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(
        error.response.data.detail || "Failed to create chat session",
      );
    }
    throw error;
  }
}

/**
 * Get a chat session with its message history
 */
export async function getChatSession(
  sessionId: string,
): Promise<ChatSession | null> {
  try {
    const response = await apiClient.get<GetChatSessionResponse>(
      `/api/chat/sessions/${sessionId}`,
    );
    return response.data.session;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null;
    }
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(
        error.response.data.detail || "Failed to get chat session",
      );
    }
    throw error;
  }
}

/**
 * Delete a chat session
 */
export async function deleteChatSession(sessionId: string): Promise<void> {
  try {
    await apiClient.delete<DeleteChatSessionResponse>(
      `/api/chat/sessions/${sessionId}`,
    );
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      // Session already gone, treat as success
      return;
    }
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(
        error.response.data.detail || "Failed to delete chat session",
      );
    }
    throw error;
  }
}

/**
 * Stream a chat message response using SSE
 *
 * @param sessionId - Session identifier
 * @param content - Message content
 * @param projectPath - Optional project path for model config
 * @param onEvent - Callback for each stream event
 * @param onError - Callback for errors
 * @returns Cleanup function to abort the stream
 */
export function streamChatMessage(
  sessionId: string,
  content: string,
  projectPath: string | undefined,
  onEvent: (event: ChatStreamEvent) => void,
  onError: (error: Error) => void,
): () => void {
  const controller = new AbortController();

  // Build URL with optional project_path query param
  const url = new URL(
    `${API_BASE_URL}/api/chat/sessions/${sessionId}/messages`,
  );
  if (projectPath) {
    url.searchParams.set("project_path", projectPath);
  }

  // Use fetch for SSE with POST (EventSource only supports GET)
  fetch(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({ content }),
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE events in buffer
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data) {
              try {
                const event = JSON.parse(data) as ChatStreamEvent;
                onEvent(event);
              } catch {
                // Ignore malformed JSON
              }
            }
          }
        }
      }
    })
    .catch((error) => {
      if (error.name === "AbortError") {
        // Stream was intentionally aborted
        return;
      }
      onError(error instanceof Error ? error : new Error(String(error)));
    });

  // Return cleanup function
  return () => {
    controller.abort();
  };
}
