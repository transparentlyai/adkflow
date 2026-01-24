"use client";

import {
  useRef,
  useEffect,
  useState,
  useCallback,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { useAiChat } from "./AiChatProvider";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Send, X, Loader2, Bot, AlertCircle, GripVertical } from "lucide-react";
import { MessageBubble } from "./MessageBubble";

const MIN_WIDTH = 400;
const MAX_WIDTH = 900;
const DEFAULT_WIDTH = 540;

function WelcomeMessage() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
        <Bot className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">AI Assistant</h3>
      <p className="text-sm text-muted-foreground max-w-[280px]">
        How can I help you today? Ask me anything about your workflow or get
        assistance with prompts.
      </p>
    </div>
  );
}

interface ErrorBannerProps {
  error: string;
  onDismiss: () => void;
}

function ErrorBanner({ error, onDismiss }: ErrorBannerProps) {
  return (
    <div className="flex items-center gap-2 p-3 bg-destructive/10 border-b border-destructive/20 text-destructive text-sm">
      <AlertCircle className="h-4 w-4 shrink-0" />
      <span className="flex-1 truncate">{error}</span>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0"
        onClick={onDismiss}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}

export function AiChatPanel() {
  const {
    isOpen,
    closeChat,
    messages,
    isLoading,
    error,
    sendMessage,
    clearError,
    acceptContent,
  } = useAiChat();

  const [inputValue, setInputValue] = useState("");
  const [panelWidth, setPanelWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Handle resize drag
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX;
      setPanelWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, newWidth)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  // Prevent text selection while resizing
  useEffect(() => {
    if (isResizing) {
      document.body.style.userSelect = "none";
      document.body.style.cursor = "ew-resize";
    } else {
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    }
  }, [isResizing]);

  const handleResizeStart = useCallback((e: ReactMouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus textarea when panel opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  const handleSubmit = useCallback(() => {
    const trimmedValue = inputValue.trim();
    if (!trimmedValue || isLoading) return;

    sendMessage(trimmedValue);
    setInputValue("");

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [inputValue, isLoading, sendMessage]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // Submit on Enter (without Shift for new line)
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  // Auto-resize textarea
  const handleInput = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, []);

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(open) => !open && closeChat()}
      modal={false}
    >
      <SheetContent
        side="right"
        className={cn(
          "p-0 flex flex-col overflow-hidden !w-[var(--panel-width)] !min-w-[var(--panel-width)] !max-w-[var(--panel-width)]",
          isResizing && "!transition-none",
        )}
        style={{ "--panel-width": `${panelWidth}px` } as React.CSSProperties}
        showOverlay={false}
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        {/* Resize handle - wide hit area, thin visual */}
        <div
          className="absolute -left-2 top-0 bottom-0 w-4 cursor-ew-resize group flex items-center justify-center"
          onMouseDown={handleResizeStart}
        >
          <div className="absolute left-2 top-0 bottom-0 w-px bg-border group-hover:bg-primary/50 transition-colors" />
          <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* Header */}
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI Assistant
          </SheetTitle>
        </SheetHeader>

        {/* Error banner */}
        {error && <ErrorBanner error={error} onDismiss={clearError} />}

        {/* Messages area */}
        <div
          ref={scrollAreaRef}
          className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden scrollbar-thin-auto"
        >
          {messages.length === 0 ? (
            <WelcomeMessage />
          ) : (
            <div className="py-4">
              {messages.map((message, index) => (
                <MessageBubble
                  key={`${message.role}-${message.timestamp}-${index}`}
                  message={message}
                  isStreaming={
                    isLoading &&
                    index === messages.length - 1 &&
                    message.role === "assistant"
                  }
                  onAcceptContent={acceptContent}
                />
              ))}
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="border-t p-4 shrink-0">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onInput={handleInput}
                placeholder="Type a message..."
                disabled={isLoading}
                rows={1}
                className={cn(
                  "w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm",
                  "placeholder:text-muted-foreground",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                  "min-h-[40px] max-h-[200px]",
                )}
              />
            </div>
            <Button
              onClick={handleSubmit}
              disabled={!inputValue.trim() || isLoading}
              size="icon"
              className="h-10 w-10 shrink-0"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
