import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import type { RunStatus, DisplayEvent } from "@/lib/types";

// Mock all dialog components - must be in test file for hoisting
vi.mock("@/components/ConfirmDialog", () => ({
  default: ({
    isOpen,
    title,
    description,
    confirmLabel,
    onConfirm,
    onCancel,
    variant,
  }: {
    isOpen: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
    variant?: string;
  }) =>
    isOpen ? (
      <div
        data-testid={`confirm-dialog-${title.toLowerCase().replace(/\s+/g, "-")}`}
      >
        <span data-testid="dialog-title">{title}</span>
        <span data-testid="dialog-description">{description}</span>
        <button onClick={onConfirm} data-testid="confirm-button">
          {confirmLabel || "Confirm"}
        </button>
        <button onClick={onCancel} data-testid="cancel-button">
          Cancel
        </button>
        {variant && <span data-testid="dialog-variant">{variant}</span>}
      </div>
    ) : null,
}));

vi.mock("@/components/SaveConfirmDialog", () => ({
  default: ({
    isOpen,
    projectPath,
    onSaveAndContinue,
    onDontSave,
    onCancel,
  }: {
    isOpen: boolean;
    projectPath: string;
    onSaveAndContinue: () => void;
    onDontSave: () => void;
    onCancel: () => void;
  }) =>
    isOpen ? (
      <div data-testid="save-confirm-dialog">
        <span data-testid="project-path">{projectPath}</span>
        <button onClick={onSaveAndContinue} data-testid="save-continue-btn">
          Save & Continue
        </button>
        <button onClick={onDontSave} data-testid="dont-save-btn">
          Don&apos;t Save
        </button>
        <button onClick={onCancel} data-testid="cancel-btn">
          Cancel
        </button>
      </div>
    ) : null,
}));

vi.mock("@/components/RunConfirmDialog", () => ({
  default: ({
    isOpen,
    onSaveAndRun,
    onCancel,
  }: {
    isOpen: boolean;
    onSaveAndRun: () => void;
    onCancel: () => void;
  }) =>
    isOpen ? (
      <div data-testid="run-confirm-dialog">
        <button onClick={onSaveAndRun} data-testid="save-run-btn">
          Save & Run
        </button>
        <button onClick={onCancel} data-testid="cancel-btn">
          Cancel
        </button>
      </div>
    ) : null,
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
  default: ({
    isOpen,
    result,
    onClose,
  }: {
    isOpen: boolean;
    result: { mermaid: string; ascii: string; agent_count: number } | null;
    onClose: () => void;
  }) =>
    isOpen ? (
      <div data-testid="topology-dialog">
        {result && (
          <>
            <span data-testid="mermaid">{result.mermaid}</span>
            <span data-testid="ascii">{result.ascii}</span>
            <span data-testid="agent-count">{result.agent_count}</span>
          </>
        )}
        <button onClick={onClose} data-testid="close-btn">
          Close
        </button>
      </div>
    ) : null,
}));

vi.mock("@/components/FilePicker", () => ({
  default: ({
    isOpen,
    projectPath,
    initialPath,
    onSelect,
    onCancel,
    title,
    description,
  }: {
    isOpen: boolean;
    projectPath: string;
    initialPath?: string;
    onSelect: (path: string) => void;
    onCancel: () => void;
    title?: string;
    description?: string;
  }) =>
    isOpen ? (
      <div data-testid="file-picker">
        <span data-testid="project-path">{projectPath}</span>
        <span data-testid="initial-path">{initialPath || "none"}</span>
        <span data-testid="title">{title}</span>
        <span data-testid="description">{description}</span>
        <button
          onClick={() => onSelect("/selected/file.txt")}
          data-testid="select-btn"
        >
          Select
        </button>
        <button onClick={onCancel} data-testid="cancel-btn">
          Cancel
        </button>
      </div>
    ) : null,
}));

vi.mock("@/components/RunPanel", () => ({
  default: ({
    runId,
    projectPath,
    onClose,
    onRunComplete,
    events,
    lastRunStatus,
  }: {
    runId: string | null;
    projectPath: string;
    onClose: () => void;
    onRunComplete: (status: RunStatus) => void;
    events: DisplayEvent[];
    lastRunStatus: RunStatus;
  }) => (
    <div data-testid="run-panel">
      <span data-testid="run-id">{runId || "none"}</span>
      <span data-testid="project-path">{projectPath}</span>
      <span data-testid="event-count">{events.length}</span>
      <span data-testid="status">{lastRunStatus}</span>
      <button onClick={onClose} data-testid="close-btn">
        Close
      </button>
      <button
        onClick={() => onRunComplete("completed")}
        data-testid="complete-btn"
      >
        Complete
      </button>
    </div>
  ),
}));

vi.mock("@/components/ProjectSettingsDialog", () => ({
  default: ({
    open,
    onOpenChange,
    projectPath,
    onSaved,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    projectPath: string | null;
    onSaved?: () => void;
  }) =>
    open ? (
      <div data-testid="project-settings-dialog">
        <span data-testid="project-path">{projectPath || "none"}</span>
        <button onClick={() => onOpenChange(false)} data-testid="close-btn">
          Close
        </button>
        {onSaved && (
          <button onClick={onSaved} data-testid="save-btn">
            Save
          </button>
        )}
      </div>
    ) : null,
}));

import { HomeDialogs } from "@/components/home/HomeDialogs";
import { createDefaultProps, openDialogState } from "./HomeDialogs.testUtils";

describe("HomeDialogs Save Dialogs", () => {
  let defaultProps: ReturnType<typeof createDefaultProps>;

  beforeEach(() => {
    vi.clearAllMocks();
    defaultProps = createDefaultProps();
  });

  describe("Save Confirm Dialog", () => {
    it("should not render when closed", () => {
      render(<HomeDialogs {...defaultProps} />);
      expect(
        screen.queryByTestId("save-confirm-dialog"),
      ).not.toBeInTheDocument();
    });

    it("should render when open", () => {
      render(<HomeDialogs {...defaultProps} isSaveConfirmOpen={true} />);
      expect(screen.getByTestId("save-confirm-dialog")).toBeInTheDocument();
    });

    it("should display project path", () => {
      render(<HomeDialogs {...defaultProps} isSaveConfirmOpen={true} />);
      expect(screen.getByTestId("project-path")).toHaveTextContent(
        "/path/to/project",
      );
    });

    it("should call onSaveAndContinue when save button clicked", () => {
      const onSaveAndContinue = vi.fn();
      render(
        <HomeDialogs
          {...defaultProps}
          isSaveConfirmOpen={true}
          onSaveAndContinue={onSaveAndContinue}
        />,
      );

      screen.getByTestId("save-continue-btn").click();
      expect(onSaveAndContinue).toHaveBeenCalledTimes(1);
    });

    it("should call onDontSave when don't save button clicked", () => {
      const onDontSave = vi.fn();
      render(
        <HomeDialogs
          {...defaultProps}
          isSaveConfirmOpen={true}
          onDontSave={onDontSave}
        />,
      );

      screen.getByTestId("dont-save-btn").click();
      expect(onDontSave).toHaveBeenCalledTimes(1);
    });

    it("should call onCancelNewProject when cancel clicked", () => {
      const onCancelNewProject = vi.fn();
      render(
        <HomeDialogs
          {...defaultProps}
          isSaveConfirmOpen={true}
          onCancelNewProject={onCancelNewProject}
        />,
      );

      screen.getByTestId("cancel-btn").click();
      expect(onCancelNewProject).toHaveBeenCalledTimes(1);
    });
  });

  describe("Run Confirm Dialog", () => {
    it("should not render when closed", () => {
      render(<HomeDialogs {...defaultProps} />);
      expect(
        screen.queryByTestId("run-confirm-dialog"),
      ).not.toBeInTheDocument();
    });

    it("should render when open", () => {
      render(<HomeDialogs {...defaultProps} isRunConfirmDialogOpen={true} />);
      expect(screen.getByTestId("run-confirm-dialog")).toBeInTheDocument();
    });

    it("should call onRunConfirmSaveAndRun when save & run clicked", () => {
      const onRunConfirmSaveAndRun = vi.fn();
      render(
        <HomeDialogs
          {...defaultProps}
          isRunConfirmDialogOpen={true}
          onRunConfirmSaveAndRun={onRunConfirmSaveAndRun}
        />,
      );

      screen.getByTestId("save-run-btn").click();
      expect(onRunConfirmSaveAndRun).toHaveBeenCalledTimes(1);
    });

    it("should call onRunConfirmCancel when cancel clicked", () => {
      const onRunConfirmCancel = vi.fn();
      render(
        <HomeDialogs
          {...defaultProps}
          isRunConfirmDialogOpen={true}
          onRunConfirmCancel={onRunConfirmCancel}
        />,
      );

      screen.getByTestId("cancel-btn").click();
      expect(onRunConfirmCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe("Multiple dialogs", () => {
    it("should render multiple dialogs simultaneously", () => {
      render(
        <HomeDialogs
          {...defaultProps}
          isSaveConfirmOpen={true}
          promptDialogState={openDialogState}
        />,
      );

      expect(screen.getByTestId("save-confirm-dialog")).toBeInTheDocument();
      expect(
        screen.getByTestId("prompt-name-dialog-prompt"),
      ).toBeInTheDocument();
    });

    it("should handle empty project path", () => {
      render(
        <HomeDialogs
          {...defaultProps}
          currentProjectPath={null}
          isSaveConfirmOpen={true}
        />,
      );

      // SaveConfirmDialog receives empty string for null project path
      expect(screen.getByTestId("project-path")).toHaveTextContent("");
    });
  });
});
