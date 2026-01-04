import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import React from "react";
import {
  TeleporterProvider,
  useTeleporter,
} from "@/contexts/TeleporterContext";

function TestConsumer() {
  const context = useTeleporter();
  return (
    <div>
      <span data-testid="count">{context.teleporters.length}</span>
      <span data-testid="allInputs">
        {context.getAllInputTeleporters().length}
      </span>
      <span data-testid="allOutputs">
        {context.getAllOutputTeleporters().length}
      </span>
      <button
        data-testid="registerInput"
        onClick={() =>
          context.registerTeleporter({
            id: "input-1",
            name: "Connector1",
            direction: "input",
            tabId: "tab1",
            tabName: "Tab 1",
          })
        }
      >
        Register Input
      </button>
      <button
        data-testid="registerOutput"
        onClick={() =>
          context.registerTeleporter({
            id: "output-1",
            name: "Connector1",
            direction: "output",
            tabId: "tab1",
            tabName: "Tab 1",
          })
        }
      >
        Register Output
      </button>
      <button
        data-testid="unregister"
        onClick={() => context.unregisterTeleporter("input-1")}
      >
        Unregister
      </button>
      <button
        data-testid="updateName"
        onClick={() => context.updateTeleporterName("input-1", "NewName")}
      >
        Update Name
      </button>
      <button data-testid="clear" onClick={() => context.clearTeleporters()}>
        Clear
      </button>
      <button
        data-testid="clearTab"
        onClick={() => context.clearTeleportersForTab("tab1")}
      >
        Clear Tab
      </button>
      <span data-testid="color">{context.getColorForName("Connector1")}</span>
      <span data-testid="byName">
        {context.getTeleportersByName("Connector1").length}
      </span>
      <span data-testid="inputsByName">
        {context.getInputTeleportersByName("Connector1").length}
      </span>
      <span data-testid="outputsByName">
        {context.getOutputTeleportersByName("Connector1").length}
      </span>
    </div>
  );
}

describe("TeleporterContext", () => {
  describe("TeleporterProvider", () => {
    it("should start with empty teleporters", () => {
      render(
        <TeleporterProvider>
          <TestConsumer />
        </TeleporterProvider>,
      );

      expect(screen.getByTestId("count")).toHaveTextContent("0");
    });

    it("should register a teleporter", () => {
      render(
        <TeleporterProvider>
          <TestConsumer />
        </TeleporterProvider>,
      );

      fireEvent.click(screen.getByTestId("registerInput"));

      expect(screen.getByTestId("count")).toHaveTextContent("1");
      expect(screen.getByTestId("allInputs")).toHaveTextContent("1");
    });

    it("should register both input and output teleporters", () => {
      render(
        <TeleporterProvider>
          <TestConsumer />
        </TeleporterProvider>,
      );

      fireEvent.click(screen.getByTestId("registerInput"));
      fireEvent.click(screen.getByTestId("registerOutput"));

      expect(screen.getByTestId("count")).toHaveTextContent("2");
      expect(screen.getByTestId("allInputs")).toHaveTextContent("1");
      expect(screen.getByTestId("allOutputs")).toHaveTextContent("1");
    });

    it("should unregister a teleporter", () => {
      render(
        <TeleporterProvider>
          <TestConsumer />
        </TeleporterProvider>,
      );

      fireEvent.click(screen.getByTestId("registerInput"));
      expect(screen.getByTestId("count")).toHaveTextContent("1");

      fireEvent.click(screen.getByTestId("unregister"));
      expect(screen.getByTestId("count")).toHaveTextContent("0");
    });

    it("should update teleporter name", () => {
      render(
        <TeleporterProvider>
          <TestConsumer />
        </TeleporterProvider>,
      );

      fireEvent.click(screen.getByTestId("registerInput"));
      fireEvent.click(screen.getByTestId("updateName"));

      expect(screen.getByTestId("byName")).toHaveTextContent("0");
    });

    it("should query teleporters by name", () => {
      render(
        <TeleporterProvider>
          <TestConsumer />
        </TeleporterProvider>,
      );

      fireEvent.click(screen.getByTestId("registerInput"));
      fireEvent.click(screen.getByTestId("registerOutput"));

      expect(screen.getByTestId("byName")).toHaveTextContent("2");
      expect(screen.getByTestId("inputsByName")).toHaveTextContent("1");
      expect(screen.getByTestId("outputsByName")).toHaveTextContent("1");
    });

    it("should assign consistent colors to names", () => {
      render(
        <TeleporterProvider>
          <TestConsumer />
        </TeleporterProvider>,
      );

      const color1 = screen.getByTestId("color").textContent;
      expect(color1).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it("should clear all teleporters", () => {
      render(
        <TeleporterProvider>
          <TestConsumer />
        </TeleporterProvider>,
      );

      fireEvent.click(screen.getByTestId("registerInput"));
      fireEvent.click(screen.getByTestId("registerOutput"));
      expect(screen.getByTestId("count")).toHaveTextContent("2");

      fireEvent.click(screen.getByTestId("clear"));
      expect(screen.getByTestId("count")).toHaveTextContent("0");
    });

    it("should clear teleporters for a specific tab", () => {
      render(
        <TeleporterProvider>
          <TestConsumer />
        </TeleporterProvider>,
      );

      fireEvent.click(screen.getByTestId("registerInput"));
      expect(screen.getByTestId("count")).toHaveTextContent("1");

      fireEvent.click(screen.getByTestId("clearTab"));
      expect(screen.getByTestId("count")).toHaveTextContent("0");
    });

    it("should update existing teleporter when registering with same id", () => {
      render(
        <TeleporterProvider>
          <TestConsumer />
        </TeleporterProvider>,
      );

      fireEvent.click(screen.getByTestId("registerInput"));
      fireEvent.click(screen.getByTestId("registerInput"));

      expect(screen.getByTestId("count")).toHaveTextContent("1");
    });
  });

  describe("useTeleporter", () => {
    it("should throw error when used outside provider", () => {
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      expect(() => {
        render(<TestConsumer />);
      }).toThrow("useTeleporter must be used within a TeleporterProvider");

      consoleError.mockRestore();
    });
  });
});
