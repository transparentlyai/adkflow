import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import React from "react";
import { ClipboardProvider, useClipboard } from "@/contexts/ClipboardContext";

function TestConsumer() {
  const context = useClipboard();
  return (
    <div>
      <span data-testid="hasClipboard">
        {context.hasClipboard ? "yes" : "no"}
      </span>
      <span data-testid="clipboardNodes">
        {context.clipboard?.nodes.length ?? 0}
      </span>
      <span data-testid="clipboardEdges">
        {context.clipboard?.edges.length ?? 0}
      </span>
      <button
        data-testid="copyBtn"
        onClick={() =>
          context.copy(
            [
              {
                id: "node1",
                position: { x: 0, y: 0 },
                data: {},
                selected: true,
              },
              {
                id: "node2",
                position: { x: 100, y: 0 },
                data: {},
                selected: false,
              },
            ],
            [{ id: "edge1", source: "node1", target: "node2" }],
            "tab1",
          )
        }
      >
        Copy
      </button>
      <button
        data-testid="copyWithChildrenBtn"
        onClick={() =>
          context.copy(
            [
              {
                id: "group1",
                position: { x: 0, y: 0 },
                data: {},
                selected: true,
              },
              {
                id: "child1",
                position: { x: 10, y: 10 },
                data: {},
                parentId: "group1",
                selected: false,
              },
              {
                id: "node2",
                position: { x: 100, y: 0 },
                data: {},
                selected: false,
              },
            ],
            [
              { id: "edge1", source: "group1", target: "child1" },
              { id: "edge2", source: "group1", target: "node2" },
            ],
            "tab1",
          )
        }
      >
        Copy with Children
      </button>
      <button
        data-testid="copyNoneBtn"
        onClick={() =>
          context.copy(
            [
              {
                id: "node1",
                position: { x: 0, y: 0 },
                data: {},
                selected: false,
              },
            ],
            [],
            "tab1",
          )
        }
      >
        Copy None Selected
      </button>
      <button data-testid="clearBtn" onClick={() => context.clear()}>
        Clear
      </button>
    </div>
  );
}

describe("ClipboardContext", () => {
  describe("ClipboardProvider", () => {
    it("should provide initial empty clipboard state", () => {
      render(
        <ClipboardProvider>
          <TestConsumer />
        </ClipboardProvider>,
      );

      expect(screen.getByTestId("hasClipboard")).toHaveTextContent("no");
      expect(screen.getByTestId("clipboardNodes")).toHaveTextContent("0");
      expect(screen.getByTestId("clipboardEdges")).toHaveTextContent("0");
    });

    it("should copy selected nodes", () => {
      render(
        <ClipboardProvider>
          <TestConsumer />
        </ClipboardProvider>,
      );

      fireEvent.click(screen.getByTestId("copyBtn"));

      expect(screen.getByTestId("hasClipboard")).toHaveTextContent("yes");
      expect(screen.getByTestId("clipboardNodes")).toHaveTextContent("1");
      expect(screen.getByTestId("clipboardEdges")).toHaveTextContent("0");
    });

    it("should expand selection to include children of selected groups", () => {
      render(
        <ClipboardProvider>
          <TestConsumer />
        </ClipboardProvider>,
      );

      fireEvent.click(screen.getByTestId("copyWithChildrenBtn"));

      expect(screen.getByTestId("hasClipboard")).toHaveTextContent("yes");
      expect(screen.getByTestId("clipboardNodes")).toHaveTextContent("2");
      expect(screen.getByTestId("clipboardEdges")).toHaveTextContent("1");
    });

    it("should not copy when no nodes are selected", () => {
      render(
        <ClipboardProvider>
          <TestConsumer />
        </ClipboardProvider>,
      );

      fireEvent.click(screen.getByTestId("copyNoneBtn"));

      expect(screen.getByTestId("hasClipboard")).toHaveTextContent("no");
    });

    it("should clear clipboard", () => {
      render(
        <ClipboardProvider>
          <TestConsumer />
        </ClipboardProvider>,
      );

      fireEvent.click(screen.getByTestId("copyBtn"));
      expect(screen.getByTestId("hasClipboard")).toHaveTextContent("yes");

      fireEvent.click(screen.getByTestId("clearBtn"));
      expect(screen.getByTestId("hasClipboard")).toHaveTextContent("no");
    });
  });

  describe("useClipboard", () => {
    it("should throw error when used outside provider", () => {
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      expect(() => {
        render(<TestConsumer />);
      }).toThrow("useClipboard must be used within ClipboardProvider");

      consoleError.mockRestore();
    });
  });
});
