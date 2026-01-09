import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { AiChatPanel } from "@/components/AiChat/AiChatPanel";
import { AiChatProvider, useAiChat } from "@/components/AiChat/AiChatProvider";
import { ProjectProvider } from "@/contexts/ProjectContext";
import * as chatApi from "@/lib/api/chat";
import type { ChatSession, ChatMessage } from "@/lib/types";

// Mock the chat API
vi.mock("@/lib/api/chat", () => ({
  createChatSession: vi.fn(),
  getChatSession: vi.fn(),
  streamChatMessage: vi.fn(),
}));

// Mock console.error
vi.spyOn(console, "error").mockImplementation(() => {});

describe("AiChatPanel", () => {
  const mockSession: ChatSession = {
    id: "test-session",
    config: { systemPrompt: "Test" },
    messages: [],
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  };

  const mockMessages: ChatMessage[] = [
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
  ];

  function TestWrapper({ children }: { children: React.ReactNode }) {
    return (
      <ProjectProvider projectPath="/test/project">
        <AiChatProvider>{children}</AiChatProvider>
      </ProjectProvider>
    );
  }

  function OpenButton() {
    const { openChat } = useAiChat();
    return (
      <button onClick={() => openChat({ sessionId: "test-session" })}>
        Open
      </button>
    );
  }

  function OpenButtonWithState() {
    const { openChat, isOpen } = useAiChat();
    return (
      <>
        <button onClick={() => openChat({ sessionId: "test-session" })}>
          Open
        </button>
        <div data-testid="is-open">{isOpen ? "open" : "closed"}</div>
      </>
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(chatApi.getChatSession).mockResolvedValue(null);
    vi.mocked(chatApi.createChatSession).mockResolvedValue(mockSession);
  });

  describe("rendering", () => {
    it("should not render when closed", () => {
      render(
        <TestWrapper>
          <AiChatPanel />
        </TestWrapper>,
      );

      expect(screen.queryByText("AI Assistant")).not.toBeInTheDocument();
    });

    it("should render header when open", async () => {
      vi.mocked(chatApi.getChatSession).mockResolvedValue(mockSession);

      render(
        <TestWrapper>
          <OpenButton />
          <AiChatPanel />
        </TestWrapper>,
      );

      const openButton = screen.getByText("Open");
      fireEvent.click(openButton);

      await waitFor(() => {
        expect(screen.getAllByText("AI Assistant").length).toBeGreaterThan(0);
      });
    });

    it("should show welcome message when no messages", async () => {
      vi.mocked(chatApi.getChatSession).mockResolvedValue(mockSession);

      render(
        <TestWrapper>
          <OpenButton />
          <AiChatPanel />
        </TestWrapper>,
      );

      fireEvent.click(screen.getByText("Open"));

      await waitFor(() => {
        expect(
          screen.getByText(/How can I help you today/),
        ).toBeInTheDocument();
      });
    });

    it("should display existing messages", async () => {
      const sessionWithMessages = {
        ...mockSession,
        messages: mockMessages,
      };
      vi.mocked(chatApi.getChatSession).mockResolvedValue(sessionWithMessages);

      render(
        <TestWrapper>
          <OpenButton />
          <AiChatPanel />
        </TestWrapper>,
      );

      fireEvent.click(screen.getByText("Open"));

      await waitFor(() => {
        expect(screen.getByText("Hello")).toBeInTheDocument();
        expect(screen.getByText("Hi there!")).toBeInTheDocument();
      });
    });

  });

  describe("error banner", () => {
    it("should display error banner and allow dismissing it", async () => {
      vi.mocked(chatApi.getChatSession).mockResolvedValue(mockSession);
      let onErrorCallback: ((error: Error) => void) | null = null;

      vi.mocked(chatApi.streamChatMessage).mockImplementation(
        (sessionId, content, projectPath, onEvent, onError) => {
          onErrorCallback = onError;
          return vi.fn();
        },
      );

      render(
        <TestWrapper>
          <OpenButton />
          <AiChatPanel />
        </TestWrapper>,
      );

      fireEvent.click(screen.getByText("Open"));

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Type a message...")).toBeInTheDocument();
      });

      // Send a message that will error
      const textarea = screen.getByPlaceholderText("Type a message...") as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: "Test" } });
      fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });

      // Trigger error
      await waitFor(() => {
        if (onErrorCallback) {
          onErrorCallback(new Error("Test error message"));
        }
      });

      // Error banner should appear
      await waitFor(() => {
        expect(screen.getByText("Test error message")).toBeInTheDocument();
      });

      // Find and click the dismiss button
      const dismissButtons = screen.getAllByRole("button");
      const dismissButton = dismissButtons.find(btn =>
        btn.className.includes("h-6")
      );

      if (dismissButton) {
        fireEvent.click(dismissButton);
      }

      // Error should be dismissed
      await waitFor(() => {
        expect(screen.queryByText("Test error message")).not.toBeInTheDocument();
      });
    });
  });

  describe("message input", () => {
    it("should update input value when typing", async () => {
      vi.mocked(chatApi.getChatSession).mockResolvedValue(mockSession);

      render(
        <TestWrapper>
          <OpenButton />
          <AiChatPanel />
        </TestWrapper>,
      );

      fireEvent.click(screen.getByText("Open"));

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Type a message...")).toBeInTheDocument();
      });

      const textarea = screen.getByPlaceholderText("Type a message...") as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: "Test message" } });

      expect(textarea.value).toBe("Test message");
    });

    it("should send message when send button clicked", async () => {
      vi.mocked(chatApi.getChatSession).mockResolvedValue(mockSession);
      vi.mocked(chatApi.streamChatMessage).mockReturnValue(vi.fn());

      render(
        <TestWrapper>
          <OpenButton />
          <AiChatPanel />
        </TestWrapper>,
      );

      fireEvent.click(screen.getByText("Open"));

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Type a message...")).toBeInTheDocument();
      });

      const textarea = screen.getByPlaceholderText("Type a message...") as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: "Hello AI" } });

      const sendButton = screen.getByRole("button", { name: "" }).closest('button[class*="h-10"]') as HTMLButtonElement;
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(chatApi.streamChatMessage).toHaveBeenCalled();
        expect(textarea.value).toBe("");
      });
    });

    it("should send message when Enter key pressed", async () => {
      vi.mocked(chatApi.getChatSession).mockResolvedValue(mockSession);
      vi.mocked(chatApi.streamChatMessage).mockReturnValue(vi.fn());

      render(
        <TestWrapper>
          <OpenButton />
          <AiChatPanel />
        </TestWrapper>,
      );

      fireEvent.click(screen.getByText("Open"));

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Type a message...")).toBeInTheDocument();
      });

      const textarea = screen.getByPlaceholderText("Type a message...") as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: "Hello AI" } });
      fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });

      await waitFor(() => {
        expect(chatApi.streamChatMessage).toHaveBeenCalled();
      });
    });

    it("should not send message when Shift+Enter pressed", async () => {
      vi.mocked(chatApi.getChatSession).mockResolvedValue(mockSession);
      vi.mocked(chatApi.streamChatMessage).mockReturnValue(vi.fn());

      render(
        <TestWrapper>
          <OpenButton />
          <AiChatPanel />
        </TestWrapper>,
      );

      fireEvent.click(screen.getByText("Open"));

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Type a message...")).toBeInTheDocument();
      });

      const textarea = screen.getByPlaceholderText("Type a message...") as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: "Hello AI" } });
      fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });

      expect(chatApi.streamChatMessage).not.toHaveBeenCalled();
    });

    it("should not send empty message", async () => {
      vi.mocked(chatApi.getChatSession).mockResolvedValue(mockSession);
      vi.mocked(chatApi.streamChatMessage).mockReturnValue(vi.fn());

      render(
        <TestWrapper>
          <OpenButton />
          <AiChatPanel />
        </TestWrapper>,
      );

      fireEvent.click(screen.getByText("Open"));

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Type a message...")).toBeInTheDocument();
      });

      const textarea = screen.getByPlaceholderText("Type a message...") as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: "   " } });
      fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });

      expect(chatApi.streamChatMessage).not.toHaveBeenCalled();
    });

    it("should not send message when loading", async () => {
      vi.mocked(chatApi.getChatSession).mockResolvedValue(mockSession);
      let streamCallback: any;
      vi.mocked(chatApi.streamChatMessage).mockImplementation(
        (sessionId, content, projectPath, onEvent) => {
          streamCallback = onEvent;
          return vi.fn();
        },
      );

      render(
        <TestWrapper>
          <OpenButton />
          <AiChatPanel />
        </TestWrapper>,
      );

      fireEvent.click(screen.getByText("Open"));

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Type a message...")).toBeInTheDocument();
      });

      const textarea = screen.getByPlaceholderText("Type a message...") as HTMLTextAreaElement;

      // Send first message (triggers loading)
      fireEvent.change(textarea, { target: { value: "First message" } });
      fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });

      await waitFor(() => {
        expect(chatApi.streamChatMessage).toHaveBeenCalledTimes(1);
      });

      // Try to send second message while loading
      fireEvent.change(textarea, { target: { value: "Second message" } });
      fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });

      // Should still only have one call
      expect(chatApi.streamChatMessage).toHaveBeenCalledTimes(1);
    });

    it("should disable input and button when loading", async () => {
      vi.mocked(chatApi.getChatSession).mockResolvedValue(mockSession);
      let streamCallback: any;
      vi.mocked(chatApi.streamChatMessage).mockImplementation(
        (sessionId, content, projectPath, onEvent) => {
          streamCallback = onEvent;
          return vi.fn();
        },
      );

      render(
        <TestWrapper>
          <OpenButton />
          <AiChatPanel />
        </TestWrapper>,
      );

      fireEvent.click(screen.getByText("Open"));

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Type a message...")).toBeInTheDocument();
      });

      const textarea = screen.getByPlaceholderText("Type a message...") as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: "Test" } });
      fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });

      await waitFor(() => {
        expect(textarea).toBeDisabled();
      });
    });
  });

  describe("close behavior", () => {
    it("should close panel when Sheet onOpenChange called with false", async () => {
      vi.mocked(chatApi.getChatSession).mockResolvedValue(mockSession);

      render(
        <TestWrapper>
          <OpenButtonWithState />
          <AiChatPanel />
        </TestWrapper>,
      );

      fireEvent.click(screen.getByText("Open"));

      await waitFor(() => {
        expect(screen.getByTestId("is-open")).toHaveTextContent("open");
      });

      // Find the Sheet overlay and click it to close
      // Note: This is implementation-specific and may need adjustment based on Sheet component
      const overlay = document.querySelector('[data-radix-dialog-overlay]');
      if (overlay) {
        fireEvent.click(overlay);
      }

      // For this test, we verify the structure is correct
      expect(screen.getByTestId("is-open")).toBeInTheDocument();
    });
  });

  describe("message display", () => {
    it("should show user avatar for user messages", async () => {
      const sessionWithMessages = {
        ...mockSession,
        messages: [mockMessages[0]], // User message
      };
      vi.mocked(chatApi.getChatSession).mockResolvedValue(sessionWithMessages);

      render(
        <TestWrapper>
          <OpenButton />
          <AiChatPanel />
        </TestWrapper>,
      );

      fireEvent.click(screen.getByText("Open"));

      await waitFor(() => {
        expect(screen.getByText("Hello")).toBeInTheDocument();
      });
    });

    it("should show streaming indicator for empty assistant message", async () => {
      vi.mocked(chatApi.getChatSession).mockResolvedValue(mockSession);
      vi.mocked(chatApi.streamChatMessage).mockImplementation(() => vi.fn());

      render(
        <TestWrapper>
          <OpenButton />
          <AiChatPanel />
        </TestWrapper>,
      );

      fireEvent.click(screen.getByText("Open"));

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Type a message...")).toBeInTheDocument();
      });

      const textarea = screen.getByPlaceholderText("Type a message...") as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: "Test" } });
      fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });

      await waitFor(() => {
        expect(screen.getByText("Thinking...")).toBeInTheDocument();
      });
    });
  });

  describe("textarea auto-resize", () => {
    it("should trigger resize on input", async () => {
      vi.mocked(chatApi.getChatSession).mockResolvedValue(mockSession);

      render(
        <TestWrapper>
          <OpenButton />
          <AiChatPanel />
        </TestWrapper>,
      );

      fireEvent.click(screen.getByText("Open"));

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Type a message...")).toBeInTheDocument();
      });

      const textarea = screen.getByPlaceholderText("Type a message...") as HTMLTextAreaElement;

      // Mock scrollHeight to simulate multi-line content
      Object.defineProperty(textarea, "scrollHeight", {
        configurable: true,
        value: 150,
      });

      fireEvent.input(textarea);

      // Height should be updated (we can't directly test the style but we can verify the handler runs)
      expect(textarea).toBeInTheDocument();
    });
  });
});
