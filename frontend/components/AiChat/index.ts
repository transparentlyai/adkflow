/**
 * AI Chat components
 *
 * Provides a flexible AI chat service that can be invoked from anywhere in the app.
 *
 * Usage:
 * ```tsx
 * import { useAiChat, AiChatPanel } from "@/components/AiChat";
 *
 * // In your component
 * const { openChat } = useAiChat();
 *
 * // Open chat with options
 * openChat({
 *   sessionId: "my-unique-session",
 *   systemPrompt: "You are a helpful assistant.",
 *   context: { someData: "value" },
 *   model: "gemini-2.0-flash-exp",
 * });
 * ```
 */

export { AiChatProvider, useAiChat } from "./AiChatProvider";
export { AiChatPanel } from "./AiChatPanel";
