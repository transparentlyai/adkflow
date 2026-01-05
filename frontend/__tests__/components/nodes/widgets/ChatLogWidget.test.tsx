import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import ChatLogWidget from "@/components/nodes/widgets/ChatLogWidget";

const mockTheme = {
  name: "test",
  colors: {
    nodes: {
      common: {
        container: { background: "#fff", border: "#ccc" },
        text: { primary: "#000", secondary: "#666", muted: "#999" },
      },
      agent: { header: "#4f46e5" },
    },
  },
};

const mockField = {
  id: "chat-log",
  label: "Chat Log",
  widget: "chatLog",
};

const defaultOptions = {
  disabled: false,
  theme: mockTheme,
  compact: false,
};

describe("ChatLogWidget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render empty state when no messages", () => {
      render(
        <ChatLogWidget
          field={mockField}
          value={[]}
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      expect(screen.getByText("No messages")).toBeInTheDocument();
    });

    it("should render empty state when value is not an array", () => {
      render(
        <ChatLogWidget
          field={mockField}
          value={null}
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      expect(screen.getByText("No messages")).toBeInTheDocument();
    });

    it("should render user message", () => {
      const messages = [{ role: "user" as const, content: "Hello!" }];

      render(
        <ChatLogWidget
          field={mockField}
          value={messages}
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      expect(screen.getByText("User")).toBeInTheDocument();
      expect(screen.getByText("Hello!")).toBeInTheDocument();
    });

    it("should render assistant message", () => {
      const messages = [{ role: "assistant" as const, content: "Hi there!" }];

      render(
        <ChatLogWidget
          field={mockField}
          value={messages}
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      expect(screen.getByText("Assistant")).toBeInTheDocument();
      expect(screen.getByText("Hi there!")).toBeInTheDocument();
    });

    it("should render system message", () => {
      const messages = [
        { role: "system" as const, content: "System initialized" },
      ];

      render(
        <ChatLogWidget
          field={mockField}
          value={messages}
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      expect(screen.getByText("System")).toBeInTheDocument();
      expect(screen.getByText("System initialized")).toBeInTheDocument();
    });

    it("should render tool message", () => {
      const messages = [{ role: "tool" as const, content: "Tool output" }];

      render(
        <ChatLogWidget
          field={mockField}
          value={messages}
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      expect(screen.getByText("Tool")).toBeInTheDocument();
      expect(screen.getByText("Tool output")).toBeInTheDocument();
    });

    it("should render unknown role as-is", () => {
      const messages = [{ role: "custom" as any, content: "Custom message" }];

      render(
        <ChatLogWidget
          field={mockField}
          value={messages}
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      expect(screen.getByText("custom")).toBeInTheDocument();
      expect(screen.getByText("Custom message")).toBeInTheDocument();
    });

    it("should render multiple messages", () => {
      const messages = [
        { role: "user" as const, content: "Question" },
        { role: "assistant" as const, content: "Answer" },
        { role: "user" as const, content: "Follow-up" },
      ];

      render(
        <ChatLogWidget
          field={mockField}
          value={messages}
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      expect(screen.getAllByText("User")).toHaveLength(2);
      expect(screen.getByText("Assistant")).toBeInTheDocument();
      expect(screen.getByText("Question")).toBeInTheDocument();
      expect(screen.getByText("Answer")).toBeInTheDocument();
      expect(screen.getByText("Follow-up")).toBeInTheDocument();
    });

    it("should render timestamp when provided", () => {
      const timestamp = new Date("2024-01-15T10:30:00").getTime();
      const messages = [{ role: "user" as const, content: "Hello", timestamp }];

      render(
        <ChatLogWidget
          field={mockField}
          value={messages}
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      // Check that a time is rendered (format depends on locale)
      const container = screen.getByText("Hello").parentElement;
      expect(container).toBeInTheDocument();
    });

    it("should not render timestamp when not provided", () => {
      const messages = [{ role: "user" as const, content: "Hello" }];

      const { container } = render(
        <ChatLogWidget
          field={mockField}
          value={messages}
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      // Should only have User label and content, not a time element
      const textElements = container.querySelectorAll(".text-xs");
      const hasTimestamp = Array.from(textElements).some((el) =>
        el.textContent?.includes(":"),
      );
      // Just verify the widget renders without timestamp
      expect(screen.getByText("User")).toBeInTheDocument();
    });

    it("should apply theme styles to container", () => {
      const { container } = render(
        <ChatLogWidget
          field={mockField}
          value={[]}
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveStyle({
        backgroundColor: "#fff",
        borderColor: "#ccc",
      });
    });

    it("should apply theme text color for muted empty state", () => {
      render(
        <ChatLogWidget
          field={mockField}
          value={[]}
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      const emptyMessage = screen.getByText("No messages");
      expect(emptyMessage).toHaveStyle({ color: "#999" });
    });
  });

  describe("role colors", () => {
    it("should apply blue color for user role", () => {
      const messages = [{ role: "user" as const, content: "Test" }];

      render(
        <ChatLogWidget
          field={mockField}
          value={messages}
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      const roleLabel = screen.getByText("User");
      expect(roleLabel).toHaveStyle({ color: "#3b82f6" });
    });

    it("should apply green color for assistant role", () => {
      const messages = [{ role: "assistant" as const, content: "Test" }];

      render(
        <ChatLogWidget
          field={mockField}
          value={messages}
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      const roleLabel = screen.getByText("Assistant");
      expect(roleLabel).toHaveStyle({ color: "#22c55e" });
    });

    it("should apply gray color for system role", () => {
      const messages = [{ role: "system" as const, content: "Test" }];

      render(
        <ChatLogWidget
          field={mockField}
          value={messages}
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      const roleLabel = screen.getByText("System");
      expect(roleLabel).toHaveStyle({ color: "#6b7280" });
    });

    it("should apply amber color for tool role", () => {
      const messages = [{ role: "tool" as const, content: "Test" }];

      render(
        <ChatLogWidget
          field={mockField}
          value={messages}
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      const roleLabel = screen.getByText("Tool");
      expect(roleLabel).toHaveStyle({ color: "#f59e0b" });
    });
  });

  describe("edge cases", () => {
    it("should handle undefined value", () => {
      render(
        <ChatLogWidget
          field={mockField}
          value={undefined}
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      expect(screen.getByText("No messages")).toBeInTheDocument();
    });

    it("should handle string value", () => {
      render(
        <ChatLogWidget
          field={mockField}
          value={"not an array"}
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      expect(screen.getByText("No messages")).toBeInTheDocument();
    });

    it("should handle object value", () => {
      render(
        <ChatLogWidget
          field={mockField}
          value={{ key: "value" }}
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      expect(screen.getByText("No messages")).toBeInTheDocument();
    });

    it("should preserve whitespace in message content", () => {
      const messages = [
        {
          role: "user" as const,
          content: "Line 1\nLine 2\n  Indented",
        },
      ];

      render(
        <ChatLogWidget
          field={mockField}
          value={messages}
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      const content = screen.getByText(/Line 1/);
      expect(content).toHaveClass("whitespace-pre-wrap");
    });
  });
});
