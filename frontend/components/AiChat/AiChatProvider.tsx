"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { useProject } from "@/contexts/ProjectContext";
import {
  createChatSession,
  getChatSession,
  streamChatMessage,
} from "@/lib/api/chat";
import type {
  ChatSession,
  ChatMessage,
  OpenChatOptions,
  AiChatContextValue,
} from "@/lib/types";

const AiChatContext = createContext<AiChatContextValue | null>(null);

interface AiChatProviderProps {
  children: ReactNode;
}

export function AiChatProvider({ children }: AiChatProviderProps) {
  const { projectPath } = useProject();

  const [isOpen, setIsOpen] = useState(false);
  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ref to hold abort function for current stream
  const abortRef = useRef<(() => void) | null>(null);

  const openChat = useCallback(async (options: OpenChatOptions) => {
    try {
      setError(null);

      // Try to get existing session first
      let existingSession = await getChatSession(options.sessionId);

      if (!existingSession) {
        // Create new session
        existingSession = await createChatSession(options.sessionId, {
          systemPrompt: options.systemPrompt,
          context: options.context,
          model: options.model,
        });
      }

      setSession(existingSession);
      setMessages(existingSession.messages);
      setIsOpen(true);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to open chat";
      setError(message);
      console.error("Failed to open chat:", err);
    }
  }, []);

  const closeChat = useCallback(() => {
    // Abort any ongoing stream
    if (abortRef.current) {
      abortRef.current();
      abortRef.current = null;
    }
    setIsOpen(false);
    setIsLoading(false);
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!session) {
        setError("No active chat session");
        return;
      }

      // Clear any previous error
      setError(null);

      // Add user message optimistically
      const userMessage: ChatMessage = {
        role: "user",
        content,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      // Prepare assistant message placeholder
      let assistantContent = "";
      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: "",
        timestamp: new Date().toISOString(),
      };

      // Add empty assistant message to show typing indicator
      setMessages((prev) => [...prev, assistantMessage]);

      // Stream the response
      abortRef.current = streamChatMessage(
        session.id,
        content,
        projectPath || undefined,
        (event) => {
          if (event.type === "content" && event.content) {
            assistantContent += event.content;
            // Update the last message (assistant) with new content
            setMessages((prev) => {
              const updated = [...prev];
              const lastIndex = updated.length - 1;
              if (lastIndex >= 0) {
                updated[lastIndex] = {
                  ...updated[lastIndex],
                  content: assistantContent,
                };
              }
              return updated;
            });
          } else if (event.type === "done") {
            setIsLoading(false);
            abortRef.current = null;
          } else if (event.type === "error") {
            setError(event.error || "Unknown error");
            setIsLoading(false);
            abortRef.current = null;
            // Remove the empty assistant message on error
            if (!assistantContent) {
              setMessages((prev) => prev.slice(0, -1));
            }
          }
        },
        (err) => {
          setError(err.message);
          setIsLoading(false);
          abortRef.current = null;
          // Remove the empty assistant message on error
          if (!assistantContent) {
            setMessages((prev) => prev.slice(0, -1));
          }
        },
      );
    },
    [session, projectPath],
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: AiChatContextValue = {
    isOpen,
    session,
    messages,
    isLoading,
    error,
    openChat,
    closeChat,
    sendMessage,
    clearError,
  };

  return (
    <AiChatContext.Provider value={value}>{children}</AiChatContext.Provider>
  );
}

export function useAiChat(): AiChatContextValue {
  const context = useContext(AiChatContext);
  if (!context) {
    throw new Error("useAiChat must be used within an AiChatProvider");
  }
  return context;
}
