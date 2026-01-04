import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

// Mock all dialog components - must be in test file for hoisting
vi.mock("@/components/ConfirmDialog", () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="confirm-dialog" /> : null,
}));

vi.mock("@/components/SaveConfirmDialog", () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="save-confirm-dialog" /> : null,
}));

vi.mock("@/components/RunConfirmDialog", () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="run-confirm-dialog" /> : null,
}));

vi.mock("@/components/PromptNameDialog", () => ({
  default: ({
    isOpen,
    onSubmit,
    onSelectExisting,
    onCancel,
    type,
    projectPath,
  }: {
    isOpen: boolean;
    onSubmit: (name: string) => void;
    onSelectExisting: (path: string) => void;
    onCancel: () => void;
    type?: string;
    projectPath?: string;
  }) =>
    isOpen ? (
      <div data-testid={`prompt-name-dialog-${type || "prompt"}`}>
        <span data-testid="dialog-type">{type || "prompt"}</span>
        <span data-testid="project-path">{projectPath || "none"}</span>
        <button onClick={() => onSubmit("test-name")} data-testid="submit-btn">
          Submit
        </button>
        <button
          onClick={() => onSelectExisting("/path/to/existing")}
          data-testid="select-existing-btn"
        >
          Select Existing
        </button>
        <button onClick={onCancel} data-testid="cancel-btn">
          Cancel
        </button>
      </div>
    ) : null,
}));

vi.mock("@/components/TopologyDialog", () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="topology-dialog" /> : null,
}));

vi.mock("@/components/FilePicker", () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="file-picker" /> : null,
}));

vi.mock("@/components/RunPanel", () => ({
  default: () => <div data-testid="run-panel" />,
}));

vi.mock("@/components/ProjectSettingsDialog", () => ({
  default: ({ open }: { open: boolean }) =>
    open ? <div data-testid="project-settings-dialog" /> : null,
}));

import { HomeDialogs } from "@/components/home/HomeDialogs";
import { createDefaultProps, openDialogState } from "./HomeDialogs.testUtils";

describe("HomeDialogs Node Dialogs", () => {
  let defaultProps: ReturnType<typeof createDefaultProps>;

  beforeEach(() => {
    vi.clearAllMocks();
    defaultProps = createDefaultProps();
  });

  describe("Prompt Name Dialog", () => {
    it("should not render when closed", () => {
      render(<HomeDialogs {...defaultProps} />);
      expect(
        screen.queryByTestId("prompt-name-dialog-prompt"),
      ).not.toBeInTheDocument();
    });

    it("should render when open", () => {
      render(
        <HomeDialogs {...defaultProps} promptDialogState={openDialogState} />,
      );
      expect(
        screen.getByTestId("prompt-name-dialog-prompt"),
      ).toBeInTheDocument();
    });

    it("should call onCreatePrompt when submit clicked", () => {
      const onCreatePrompt = vi.fn();
      render(
        <HomeDialogs
          {...defaultProps}
          promptDialogState={openDialogState}
          onCreatePrompt={onCreatePrompt}
        />,
      );

      screen.getByTestId("submit-btn").click();
      expect(onCreatePrompt).toHaveBeenCalledWith("test-name");
    });
  });

  describe("Context Name Dialog", () => {
    it("should render when open with correct type", () => {
      render(
        <HomeDialogs {...defaultProps} contextDialogState={openDialogState} />,
      );
      expect(
        screen.getByTestId("prompt-name-dialog-context"),
      ).toBeInTheDocument();
      expect(screen.getByTestId("dialog-type")).toHaveTextContent("context");
    });
  });

  describe("Tool Name Dialog", () => {
    it("should render when open with correct type", () => {
      render(
        <HomeDialogs {...defaultProps} toolDialogState={openDialogState} />,
      );
      expect(screen.getByTestId("prompt-name-dialog-tool")).toBeInTheDocument();
      expect(screen.getByTestId("dialog-type")).toHaveTextContent("tool");
    });
  });

  describe("Process Name Dialog", () => {
    it("should render when open with correct type", () => {
      render(
        <HomeDialogs {...defaultProps} processDialogState={openDialogState} />,
      );
      expect(
        screen.getByTestId("prompt-name-dialog-process"),
      ).toBeInTheDocument();
      expect(screen.getByTestId("dialog-type")).toHaveTextContent("process");
    });
  });

  describe("Output File Name Dialog", () => {
    it("should render when open with correct type", () => {
      render(
        <HomeDialogs
          {...defaultProps}
          outputFileDialogState={openDialogState}
        />,
      );
      expect(
        screen.getByTestId("prompt-name-dialog-outputFile"),
      ).toBeInTheDocument();
      expect(screen.getByTestId("dialog-type")).toHaveTextContent("outputFile");
    });
  });
});
