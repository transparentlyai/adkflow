"use client";

import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { Loader2, Bot, User } from "lucide-react";
import type { ChatMessage } from "@/lib/types";
import ContentBlock from "./ContentBlock";

/** Segment of a message, either plain text or content block */
interface MessageSegment {
  type: "text" | "content";
  value: string;
}

/**
 * Parse message content for <content>...</content> tags.
 * Returns segments that can be rendered as text or content blocks.
 */
function parseContentBlocks(text: string): MessageSegment[] {
  const regex = /<content>([\s\S]*?)<\/content>/g;
  const segments: MessageSegment[] = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Text before the tag
    if (match.index > lastIndex) {
      const textBefore = text.slice(lastIndex, match.index).trim();
      if (textBefore) {
        segments.push({ type: "text", value: textBefore });
      }
    }
    // Content inside the tag
    segments.push({ type: "content", value: match[1].trim() });
    lastIndex = match.index + match[0].length;
  }

  // Remaining text after last tag
  if (lastIndex < text.length) {
    const textAfter = text.slice(lastIndex).trim();
    if (textAfter) {
      segments.push({ type: "text", value: textAfter });
    }
  }

  // If no segments were created, return the original text
  if (segments.length === 0 && text.trim()) {
    segments.push({ type: "text", value: text });
  }

  return segments;
}

export interface MessageBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
  onAcceptContent?: (content: string) => void;
}

/**
 * Renders a single chat message bubble with avatar.
 * Supports user and assistant messages, streaming indicators,
 * and content blocks with accept functionality.
 */
export const MessageBubble = memo(function MessageBubble({
  message,
  isStreaming,
  onAcceptContent,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";

  // Parse content blocks for assistant messages (only when not streaming)
  const segments =
    isAssistant && !isStreaming && message.content
      ? parseContentBlocks(message.content)
      : [];

  // Render streaming or simple text content
  const renderSimpleContent = () => {
    if (!message.content && isStreaming) {
      return (
        <span className="inline-flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span className="text-muted-foreground">Thinking...</span>
        </span>
      );
    }
    return (
      <>
        {isAssistant ? (
          <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-headings:my-2 prose-headings:text-foreground prose-p:text-foreground prose-li:text-foreground prose-strong:text-foreground prose-code:text-foreground prose-a:text-primary">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
        ) : (
          message.content
        )}
        {isStreaming && message.content && (
          <span className="inline-block w-1 h-4 ml-0.5 bg-current animate-pulse" />
        )}
      </>
    );
  };

  return (
    <div
      className={cn(
        "flex gap-3 p-4 overflow-hidden",
        isUser && "flex-row-reverse",
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser && "bg-primary text-primary-foreground",
          isAssistant && "bg-muted",
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      {/* Message content */}
      <div
        className={cn(
          "flex-1 min-w-0 space-y-2 overflow-hidden",
          isUser && "text-right",
        )}
      >
        {/* User messages or streaming assistant messages */}
        {(isUser || isStreaming || segments.length === 0) && (
          <div
            className={cn(
              "inline-block rounded-lg px-4 py-2 text-sm",
              isUser && "bg-primary text-primary-foreground",
              isAssistant && "bg-muted",
            )}
          >
            {renderSimpleContent()}
          </div>
        )}

        {/* Parsed segments for completed assistant messages */}
        {isAssistant &&
          !isStreaming &&
          segments.length > 0 &&
          segments.map((segment, i) =>
            segment.type === "content" ? (
              <ContentBlock
                key={i}
                content={segment.value}
                onAccept={() => onAcceptContent?.(segment.value)}
              />
            ) : (
              <div
                key={i}
                className="rounded-lg px-4 py-2 text-sm bg-muted prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-headings:my-2 prose-headings:text-foreground prose-p:text-foreground prose-li:text-foreground prose-strong:text-foreground prose-code:text-foreground prose-a:text-primary"
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {segment.value}
                </ReactMarkdown>
              </div>
            ),
          )}
      </div>
    </div>
  );
});
