/**
 * Chat service type definitions
 * Types for AI chat sessions, messages, and API interactions
 */

/**
 * Role of a chat message
 */
export type ChatMessageRole = "user" | "assistant" | "system";

/**
 * Single message in a chat session
 */
export interface ChatMessage {
  role: ChatMessageRole;
  content: string;
  timestamp: string;
}

/**
 * Configuration for a chat session
 */
export interface ChatSessionConfig {
  systemPrompt?: string;
  context?: Record<string, unknown>;
  model?: string;
}

/**
 * A chat session with message history
 */
export interface ChatSession {
  id: string;
  config: ChatSessionConfig;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

/**
 * SSE event types for streaming responses
 */
export type ChatStreamEventType = "content" | "done" | "error";

/**
 * SSE event for streaming chat responses
 */
export interface ChatStreamEvent {
  type: ChatStreamEventType;
  content?: string;
  error?: string;
}

// API Request/Response types

/**
 * Request to create a new chat session
 */
export interface CreateChatSessionRequest {
  sessionId: string;
  config?: ChatSessionConfig;
}

/**
 * Response after creating a chat session
 */
export interface CreateChatSessionResponse {
  session: ChatSession;
}

/**
 * Response for getting a chat session
 */
export interface GetChatSessionResponse {
  session: ChatSession;
}

/**
 * Response after deleting a chat session
 */
export interface DeleteChatSessionResponse {
  success: boolean;
  message: string;
}

/**
 * Request to send a message in a chat session
 */
export interface SendChatMessageRequest {
  content: string;
}

// Hook API types

/**
 * Options for opening a chat session
 */
export interface OpenChatOptions {
  sessionId: string;
  systemPrompt?: string;
  context?: Record<string, unknown>;
  model?: string;
  /**
   * If provided, this message will be sent automatically when the chat opens.
   * This triggers the assistant to respond immediately, starting the conversation.
   */
  initialMessage?: string;
  /**
   * Callback invoked when user accepts returned content from chat.
   * Used for returning suggested/fixed content back to the originating component.
   */
  onContentReturn?: (content: string) => void;
}

/**
 * State of the AI chat context
 */
export interface AiChatState {
  isOpen: boolean;
  session: ChatSession | null;
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Value provided by the AiChat context
 */
export interface AiChatContextValue extends AiChatState {
  openChat: (options: OpenChatOptions) => Promise<void>;
  closeChat: () => void;
  sendMessage: (content: string) => Promise<void>;
  clearError: () => void;
  /** Accept content and trigger the onContentReturn callback, then close chat */
  acceptContent: (content: string) => void;
}
