import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { ProjectProvider, useProject } from "@/contexts/ProjectContext";

// Test component that uses the context
function TestConsumer() {
  const { projectPath, isLocked, onSaveFile, onRequestFilePicker, defaultModel } =
    useProject();
  return (
    <div>
      <span data-testid="path">{projectPath ?? "null"}</span>
      <span data-testid="locked">{isLocked ? "locked" : "unlocked"}</span>
      <span data-testid="hasSave">{onSaveFile ? "yes" : "no"}</span>
      <span data-testid="hasPicker">{onRequestFilePicker ? "yes" : "no"}</span>
      <span data-testid="defaultModel">{defaultModel ?? "none"}</span>
    </div>
  );
}

describe("ProjectContext", () => {
  describe("ProjectProvider", () => {
    it("should provide project path to children", () => {
      render(
        <ProjectProvider projectPath="/test/project">
          <TestConsumer />
        </ProjectProvider>,
      );

      expect(screen.getByTestId("path")).toHaveTextContent("/test/project");
    });

    it("should provide null project path", () => {
      render(
        <ProjectProvider projectPath={null}>
          <TestConsumer />
        </ProjectProvider>,
      );

      expect(screen.getByTestId("path")).toHaveTextContent("null");
    });

    it("should provide isLocked state", () => {
      render(
        <ProjectProvider projectPath="/project" isLocked={true}>
          <TestConsumer />
        </ProjectProvider>,
      );

      expect(screen.getByTestId("locked")).toHaveTextContent("locked");
    });

    it("should default isLocked to undefined", () => {
      render(
        <ProjectProvider projectPath="/project">
          <TestConsumer />
        </ProjectProvider>,
      );

      expect(screen.getByTestId("locked")).toHaveTextContent("unlocked");
    });

    it("should provide onSaveFile handler", () => {
      const saveFile = vi.fn();

      render(
        <ProjectProvider projectPath="/project" onSaveFile={saveFile}>
          <TestConsumer />
        </ProjectProvider>,
      );

      expect(screen.getByTestId("hasSave")).toHaveTextContent("yes");
    });

    it("should provide onRequestFilePicker handler", () => {
      const requestPicker = vi.fn();

      render(
        <ProjectProvider
          projectPath="/project"
          onRequestFilePicker={requestPicker}
        >
          <TestConsumer />
        </ProjectProvider>,
      );

      expect(screen.getByTestId("hasPicker")).toHaveTextContent("yes");
    });
  });

  describe("useProject", () => {
    it("should return default values when used outside provider", () => {
      render(<TestConsumer />);

      expect(screen.getByTestId("path")).toHaveTextContent("null");
      expect(screen.getByTestId("locked")).toHaveTextContent("unlocked");
      expect(screen.getByTestId("hasSave")).toHaveTextContent("no");
      expect(screen.getByTestId("hasPicker")).toHaveTextContent("no");
      expect(screen.getByTestId("defaultModel")).toHaveTextContent("none");
    });
  });

  describe("defaultModel", () => {
    it("should provide defaultModel when specified", () => {
      render(
        <ProjectProvider projectPath="/project" defaultModel="gemini-2.0-flash">
          <TestConsumer />
        </ProjectProvider>,
      );

      expect(screen.getByTestId("defaultModel")).toHaveTextContent(
        "gemini-2.0-flash",
      );
    });

    it("should default to undefined when not specified", () => {
      render(
        <ProjectProvider projectPath="/project">
          <TestConsumer />
        </ProjectProvider>,
      );

      expect(screen.getByTestId("defaultModel")).toHaveTextContent("none");
    });
  });
});
