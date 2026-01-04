import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import {
  CanvasActionsProvider,
  useCanvasActions,
} from "@/contexts/CanvasActionsContext";

function TestConsumer() {
  const context = useCanvasActions();
  return (
    <div>
      <span data-testid="hasContext">{context ? "yes" : "no"}</span>
      <span data-testid="hasClipboard">
        {context?.hasClipboard ? "yes" : "no"}
      </span>
      <span data-testid="isLocked">{context?.isLocked ? "yes" : "no"}</span>
      <button
        data-testid="copyBtn"
        onClick={() => context?.copySelectedNodes()}
      >
        Copy
      </button>
      <button data-testid="cutBtn" onClick={() => context?.cutSelectedNodes()}>
        Cut
      </button>
      <button data-testid="pasteBtn" onClick={() => context?.pasteNodes()}>
        Paste
      </button>
    </div>
  );
}

describe("CanvasActionsContext", () => {
  describe("CanvasActionsProvider", () => {
    it("should provide canvas actions to children", () => {
      const mockCopy = vi.fn();
      const mockCut = vi.fn();
      const mockPaste = vi.fn();

      render(
        <CanvasActionsProvider
          value={{
            copySelectedNodes: mockCopy,
            cutSelectedNodes: mockCut,
            pasteNodes: mockPaste,
            hasClipboard: true,
            isLocked: false,
          }}
        >
          <TestConsumer />
        </CanvasActionsProvider>,
      );

      expect(screen.getByTestId("hasContext")).toHaveTextContent("yes");
      expect(screen.getByTestId("hasClipboard")).toHaveTextContent("yes");
      expect(screen.getByTestId("isLocked")).toHaveTextContent("no");
    });

    it("should call copySelectedNodes when copy button clicked", () => {
      const mockCopy = vi.fn();

      render(
        <CanvasActionsProvider
          value={{
            copySelectedNodes: mockCopy,
            cutSelectedNodes: vi.fn(),
            pasteNodes: vi.fn(),
            hasClipboard: false,
            isLocked: false,
          }}
        >
          <TestConsumer />
        </CanvasActionsProvider>,
      );

      fireEvent.click(screen.getByTestId("copyBtn"));
      expect(mockCopy).toHaveBeenCalled();
    });

    it("should call cutSelectedNodes when cut button clicked", () => {
      const mockCut = vi.fn();

      render(
        <CanvasActionsProvider
          value={{
            copySelectedNodes: vi.fn(),
            cutSelectedNodes: mockCut,
            pasteNodes: vi.fn(),
            hasClipboard: false,
            isLocked: false,
          }}
        >
          <TestConsumer />
        </CanvasActionsProvider>,
      );

      fireEvent.click(screen.getByTestId("cutBtn"));
      expect(mockCut).toHaveBeenCalled();
    });

    it("should call pasteNodes when paste button clicked", () => {
      const mockPaste = vi.fn();

      render(
        <CanvasActionsProvider
          value={{
            copySelectedNodes: vi.fn(),
            cutSelectedNodes: vi.fn(),
            pasteNodes: mockPaste,
            hasClipboard: true,
            isLocked: false,
          }}
        >
          <TestConsumer />
        </CanvasActionsProvider>,
      );

      fireEvent.click(screen.getByTestId("pasteBtn"));
      expect(mockPaste).toHaveBeenCalled();
    });

    it("should provide isLocked state", () => {
      render(
        <CanvasActionsProvider
          value={{
            copySelectedNodes: vi.fn(),
            cutSelectedNodes: vi.fn(),
            pasteNodes: vi.fn(),
            hasClipboard: false,
            isLocked: true,
          }}
        >
          <TestConsumer />
        </CanvasActionsProvider>,
      );

      expect(screen.getByTestId("isLocked")).toHaveTextContent("yes");
    });
  });

  describe("useCanvasActions", () => {
    it("should return null when used outside provider", () => {
      render(<TestConsumer />);
      expect(screen.getByTestId("hasContext")).toHaveTextContent("no");
    });
  });
});
