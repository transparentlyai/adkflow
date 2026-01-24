import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import type { TraceSpan } from "@evilmartians/agent-prism-types";
import { useSpanCardEventHandlers } from "@/components/agent-prism/SpanCard/useSpanCardEventHandlers";

const createMockSpan = (id: string): TraceSpan => ({
  id,
  title: `Span ${id}`,
  type: "llm",
  status: "ok",
  startTimestamp: 1000,
  endTimestamp: 2000,
});

describe("useSpanCardEventHandlers", () => {
  let mockOnSpanSelect: ReturnType<typeof vi.fn>;
  let mockSpan: TraceSpan;

  beforeEach(() => {
    mockOnSpanSelect = vi.fn();
    mockSpan = createMockSpan("span-1");
    vi.clearAllMocks();
  });

  describe("handleCardClick", () => {
    it("should call onSpanSelect with span data", () => {
      const { result } = renderHook(() =>
        useSpanCardEventHandlers(mockSpan, mockOnSpanSelect),
      );

      result.current.handleCardClick();

      expect(mockOnSpanSelect).toHaveBeenCalledTimes(1);
      expect(mockOnSpanSelect).toHaveBeenCalledWith(mockSpan);
    });

    it("should not throw when onSpanSelect is undefined", () => {
      const { result } = renderHook(() =>
        useSpanCardEventHandlers(mockSpan, undefined),
      );

      expect(() => result.current.handleCardClick()).not.toThrow();
    });

    it("should work with different span data", () => {
      const span2 = createMockSpan("span-2");
      const { result } = renderHook(() =>
        useSpanCardEventHandlers(span2, mockOnSpanSelect),
      );

      result.current.handleCardClick();

      expect(mockOnSpanSelect).toHaveBeenCalledWith(span2);
    });
  });

  describe("handleKeyDown", () => {
    it("should call handleCardClick on Enter key", () => {
      const { result } = renderHook(() =>
        useSpanCardEventHandlers(mockSpan, mockOnSpanSelect),
      );

      const event = {
        key: "Enter",
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent;

      result.current.handleKeyDown(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(mockOnSpanSelect).toHaveBeenCalledWith(mockSpan);
    });

    it("should call handleCardClick on Space key", () => {
      const { result } = renderHook(() =>
        useSpanCardEventHandlers(mockSpan, mockOnSpanSelect),
      );

      const event = {
        key: " ",
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent;

      result.current.handleKeyDown(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(mockOnSpanSelect).toHaveBeenCalledWith(mockSpan);
    });

    it("should not call handleCardClick on other keys", () => {
      const { result } = renderHook(() =>
        useSpanCardEventHandlers(mockSpan, mockOnSpanSelect),
      );

      const event = {
        key: "Tab",
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent;

      result.current.handleKeyDown(event);

      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(mockOnSpanSelect).not.toHaveBeenCalled();
    });

    it("should not call handleCardClick on Escape key", () => {
      const { result } = renderHook(() =>
        useSpanCardEventHandlers(mockSpan, mockOnSpanSelect),
      );

      const event = {
        key: "Escape",
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent;

      result.current.handleKeyDown(event);

      expect(mockOnSpanSelect).not.toHaveBeenCalled();
    });

    it("should not call handleCardClick on Arrow keys", () => {
      const { result } = renderHook(() =>
        useSpanCardEventHandlers(mockSpan, mockOnSpanSelect),
      );

      const event = {
        key: "ArrowDown",
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent;

      result.current.handleKeyDown(event);

      expect(mockOnSpanSelect).not.toHaveBeenCalled();
    });
  });

  describe("handleToggleClick", () => {
    it("should stop propagation on mouse event", () => {
      const { result } = renderHook(() =>
        useSpanCardEventHandlers(mockSpan, mockOnSpanSelect),
      );

      const event = {
        stopPropagation: vi.fn(),
      } as unknown as React.MouseEvent;

      result.current.handleToggleClick(event);

      expect(event.stopPropagation).toHaveBeenCalled();
      expect(mockOnSpanSelect).not.toHaveBeenCalled();
    });

    it("should stop propagation on keyboard event", () => {
      const { result } = renderHook(() =>
        useSpanCardEventHandlers(mockSpan, mockOnSpanSelect),
      );

      const event = {
        stopPropagation: vi.fn(),
      } as unknown as React.KeyboardEvent;

      result.current.handleToggleClick(event);

      expect(event.stopPropagation).toHaveBeenCalled();
      expect(mockOnSpanSelect).not.toHaveBeenCalled();
    });
  });

  describe("memoization", () => {
    it("should return stable handlers when dependencies do not change", () => {
      const { result, rerender } = renderHook(() =>
        useSpanCardEventHandlers(mockSpan, mockOnSpanSelect),
      );

      const firstHandlers = result.current;

      rerender();

      expect(result.current.handleCardClick).toBe(
        firstHandlers.handleCardClick,
      );
      expect(result.current.handleKeyDown).toBe(firstHandlers.handleKeyDown);
      expect(result.current.handleToggleClick).toBe(
        firstHandlers.handleToggleClick,
      );
    });

    it("should return new handleCardClick when span changes", () => {
      const { result, rerender } = renderHook(
        ({ span, onSelect }) => useSpanCardEventHandlers(span, onSelect),
        {
          initialProps: {
            span: mockSpan,
            onSelect: mockOnSpanSelect,
          },
        },
      );

      const firstHandler = result.current.handleCardClick;

      const newSpan = createMockSpan("span-2");
      rerender({ span: newSpan, onSelect: mockOnSpanSelect });

      expect(result.current.handleCardClick).not.toBe(firstHandler);
    });

    it("should return new handleCardClick when onSpanSelect changes", () => {
      const { result, rerender } = renderHook(
        ({ span, onSelect }) => useSpanCardEventHandlers(span, onSelect),
        {
          initialProps: {
            span: mockSpan,
            onSelect: mockOnSpanSelect,
          },
        },
      );

      const firstHandler = result.current.handleCardClick;

      const newOnSelect = vi.fn();
      rerender({ span: mockSpan, onSelect: newOnSelect });

      expect(result.current.handleCardClick).not.toBe(firstHandler);
    });

    it("should return stable handleToggleClick regardless of props", () => {
      const { result, rerender } = renderHook(
        ({ span, onSelect }) => useSpanCardEventHandlers(span, onSelect),
        {
          initialProps: {
            span: mockSpan,
            onSelect: mockOnSpanSelect,
          },
        },
      );

      const firstToggleHandler = result.current.handleToggleClick;

      const newSpan = createMockSpan("span-2");
      const newOnSelect = vi.fn();
      rerender({ span: newSpan, onSelect: newOnSelect });

      expect(result.current.handleToggleClick).toBe(firstToggleHandler);
    });
  });
});
