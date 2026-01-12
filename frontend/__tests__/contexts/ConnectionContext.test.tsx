import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import {
  ConnectionProvider,
  useConnection,
} from "@/contexts/ConnectionContext";

function TestConsumer() {
  const {
    connectionState,
    startConnection,
    endConnection,
    nodeToExpand,
    expandNodeForConnection,
    clearExpansionRequest,
  } = useConnection();
  return (
    <div>
      <span data-testid="isDragging">
        {connectionState.isDragging ? "yes" : "no"}
      </span>
      <span data-testid="sourceNodeId">
        {connectionState.sourceNodeId ?? "null"}
      </span>
      <span data-testid="sourceHandleId">
        {connectionState.sourceHandleId ?? "null"}
      </span>
      <span data-testid="sourceOutputSource">
        {connectionState.sourceOutputSource ?? "null"}
      </span>
      <span data-testid="sourceOutputType">
        {connectionState.sourceOutputType ?? "null"}
      </span>
      <span data-testid="nodeToExpand">{nodeToExpand ?? "null"}</span>
      <button
        data-testid="startBtn"
        onClick={() => startConnection("node1", "handle1", "prompt", "str")}
      >
        Start
      </button>
      <button data-testid="endBtn" onClick={() => endConnection()}>
        End
      </button>
      <button
        data-testid="expandBtn"
        onClick={() => expandNodeForConnection("node2")}
      >
        Expand
      </button>
      <button data-testid="clearBtn" onClick={() => clearExpansionRequest()}>
        Clear
      </button>
    </div>
  );
}

describe("ConnectionContext", () => {
  describe("ConnectionProvider", () => {
    it("should provide initial state with no connection", () => {
      render(
        <ConnectionProvider>
          <TestConsumer />
        </ConnectionProvider>,
      );

      expect(screen.getByTestId("isDragging")).toHaveTextContent("no");
      expect(screen.getByTestId("sourceNodeId")).toHaveTextContent("null");
      expect(screen.getByTestId("sourceHandleId")).toHaveTextContent("null");
      expect(screen.getByTestId("sourceOutputSource")).toHaveTextContent(
        "null",
      );
      expect(screen.getByTestId("sourceOutputType")).toHaveTextContent("null");
    });

    it("should start connection", () => {
      render(
        <ConnectionProvider>
          <TestConsumer />
        </ConnectionProvider>,
      );

      fireEvent.click(screen.getByTestId("startBtn"));

      expect(screen.getByTestId("isDragging")).toHaveTextContent("yes");
      expect(screen.getByTestId("sourceNodeId")).toHaveTextContent("node1");
      expect(screen.getByTestId("sourceHandleId")).toHaveTextContent("handle1");
      expect(screen.getByTestId("sourceOutputSource")).toHaveTextContent(
        "prompt",
      );
      expect(screen.getByTestId("sourceOutputType")).toHaveTextContent("str");
    });

    it("should end connection and reset state", () => {
      render(
        <ConnectionProvider>
          <TestConsumer />
        </ConnectionProvider>,
      );

      fireEvent.click(screen.getByTestId("startBtn"));
      expect(screen.getByTestId("isDragging")).toHaveTextContent("yes");

      fireEvent.click(screen.getByTestId("endBtn"));

      expect(screen.getByTestId("isDragging")).toHaveTextContent("no");
      expect(screen.getByTestId("sourceNodeId")).toHaveTextContent("null");
      expect(screen.getByTestId("sourceHandleId")).toHaveTextContent("null");
      expect(screen.getByTestId("sourceOutputSource")).toHaveTextContent(
        "null",
      );
      expect(screen.getByTestId("sourceOutputType")).toHaveTextContent("null");
    });

    it("should provide initial nodeToExpand as null", () => {
      render(
        <ConnectionProvider>
          <TestConsumer />
        </ConnectionProvider>,
      );

      expect(screen.getByTestId("nodeToExpand")).toHaveTextContent("null");
    });

    it("should expand node when expandNodeForConnection is called", () => {
      render(
        <ConnectionProvider>
          <TestConsumer />
        </ConnectionProvider>,
      );

      expect(screen.getByTestId("nodeToExpand")).toHaveTextContent("null");

      fireEvent.click(screen.getByTestId("expandBtn"));

      expect(screen.getByTestId("nodeToExpand")).toHaveTextContent("node2");
    });

    it("should clear expansion request when clearExpansionRequest is called", () => {
      render(
        <ConnectionProvider>
          <TestConsumer />
        </ConnectionProvider>,
      );

      fireEvent.click(screen.getByTestId("expandBtn"));
      expect(screen.getByTestId("nodeToExpand")).toHaveTextContent("node2");

      fireEvent.click(screen.getByTestId("clearBtn"));

      expect(screen.getByTestId("nodeToExpand")).toHaveTextContent("null");
    });
  });

  describe("useConnection", () => {
    it("should throw error when used outside provider", () => {
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      expect(() => {
        render(<TestConsumer />);
      }).toThrow("useConnection must be used within ConnectionProvider");

      consoleError.mockRestore();
    });
  });
});
