import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import {
  RunWorkflowProvider,
  useRunWorkflow,
} from "@/contexts/RunWorkflowContext";

function TestConsumer() {
  const context = useRunWorkflow();
  return (
    <div>
      <span data-testid="isRunning">
        {context?.isRunning ? "running" : "idle"}
      </span>
      <span data-testid="hasPath">
        {context?.hasProjectPath ? "yes" : "no"}
      </span>
      <button data-testid="runBtn" onClick={() => context?.runWorkflow()}>
        Run
      </button>
      <span data-testid="hasContext">{context ? "yes" : "no"}</span>
    </div>
  );
}

describe("RunWorkflowContext", () => {
  describe("RunWorkflowProvider", () => {
    it("should provide isRunning state", () => {
      render(
        <RunWorkflowProvider
          runWorkflow={() => {}}
          isRunning={true}
          hasProjectPath={true}
        >
          <TestConsumer />
        </RunWorkflowProvider>,
      );

      expect(screen.getByTestId("isRunning")).toHaveTextContent("running");
    });

    it("should provide hasProjectPath state", () => {
      render(
        <RunWorkflowProvider
          runWorkflow={() => {}}
          isRunning={false}
          hasProjectPath={true}
        >
          <TestConsumer />
        </RunWorkflowProvider>,
      );

      expect(screen.getByTestId("hasPath")).toHaveTextContent("yes");
    });

    it("should provide runWorkflow function", () => {
      const runWorkflow = vi.fn();

      render(
        <RunWorkflowProvider
          runWorkflow={runWorkflow}
          isRunning={false}
          hasProjectPath={true}
        >
          <TestConsumer />
        </RunWorkflowProvider>,
      );

      fireEvent.click(screen.getByTestId("runBtn"));

      expect(runWorkflow).toHaveBeenCalled();
    });
  });

  describe("useRunWorkflow", () => {
    it("should return null when used outside provider", () => {
      render(<TestConsumer />);

      expect(screen.getByTestId("hasContext")).toHaveTextContent("no");
    });

    it("should return context when used inside provider", () => {
      render(
        <RunWorkflowProvider
          runWorkflow={() => {}}
          isRunning={false}
          hasProjectPath={false}
        >
          <TestConsumer />
        </RunWorkflowProvider>,
      );

      expect(screen.getByTestId("hasContext")).toHaveTextContent("yes");
    });
  });
});
