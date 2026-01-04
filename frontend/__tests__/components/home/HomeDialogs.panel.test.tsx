import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import type { RunStatus, DisplayEvent } from "@/lib/types";

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
  default: ({ isOpen, type }: { isOpen: boolean; type?: string }) =>
    isOpen ? (
      <div data-testid={`prompt-name-dialog-${type || "prompt"}`} />
    ) : null,
}));

vi.mock("@/components/TopologyDialog", () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="topology-dialog" /> : null,
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
import {
  createDefaultProps,
  openFilePickerState,
} from "./HomeDialogs.testUtils";

describe("HomeDialogs Panel Dialogs", () => {
  let defaultProps: ReturnType<typeof createDefaultProps>;

  beforeEach(() => {
    vi.clearAllMocks();
    defaultProps = createDefaultProps();
  });

  describe("File Picker", () => {
    it("should not render when closed", () => {
      render(<HomeDialogs {...defaultProps} />);
      expect(screen.queryByTestId("file-picker")).not.toBeInTheDocument();
    });

    it("should render when open", () => {
      render(
        <HomeDialogs {...defaultProps} filePickerState={openFilePickerState} />,
      );
      expect(screen.getByTestId("file-picker")).toBeInTheDocument();
    });

    it("should display project path and initial path", () => {
      render(
        <HomeDialogs {...defaultProps} filePickerState={openFilePickerState} />,
      );
      expect(screen.getByTestId("project-path")).toHaveTextContent(
        "/path/to/project",
      );
      expect(screen.getByTestId("initial-path")).toHaveTextContent(
        "/initial/path",
      );
    });

    it("should call onFilePickerSelect when select clicked", () => {
      const onFilePickerSelect = vi.fn();
      render(
        <HomeDialogs
          {...defaultProps}
          filePickerState={openFilePickerState}
          onFilePickerSelect={onFilePickerSelect}
        />,
      );

      screen.getByTestId("select-btn").click();
      expect(onFilePickerSelect).toHaveBeenCalledWith("/selected/file.txt");
    });

    it("should call onFilePickerCancel when cancel clicked", () => {
      const onFilePickerCancel = vi.fn();
      render(
        <HomeDialogs
          {...defaultProps}
          filePickerState={openFilePickerState}
          onFilePickerCancel={onFilePickerCancel}
        />,
      );

      screen.getByTestId("cancel-btn").click();
      expect(onFilePickerCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe("Run Panel", () => {
    it("should not render when closed", () => {
      render(<HomeDialogs {...defaultProps} />);
      expect(screen.queryByTestId("run-panel")).not.toBeInTheDocument();
    });

    it("should render when open", () => {
      render(<HomeDialogs {...defaultProps} isRunPanelOpen={true} />);
      expect(screen.getByTestId("run-panel")).toBeInTheDocument();
    });

    it("should display run ID and project path", () => {
      render(
        <HomeDialogs
          {...defaultProps}
          isRunPanelOpen={true}
          currentRunId="run-123"
        />,
      );
      expect(screen.getByTestId("run-id")).toHaveTextContent("run-123");
      expect(screen.getByTestId("project-path")).toHaveTextContent(
        "/path/to/project",
      );
    });

    it("should display status", () => {
      render(
        <HomeDialogs
          {...defaultProps}
          isRunPanelOpen={true}
          lastRunStatus="running"
        />,
      );
      expect(screen.getByTestId("status")).toHaveTextContent("running");
    });

    it("should call onCloseRunPanel when close clicked", () => {
      const onCloseRunPanel = vi.fn();
      render(
        <HomeDialogs
          {...defaultProps}
          isRunPanelOpen={true}
          onCloseRunPanel={onCloseRunPanel}
        />,
      );

      screen.getByTestId("close-btn").click();
      expect(onCloseRunPanel).toHaveBeenCalledTimes(1);
    });

    it("should call onRunComplete when workflow completes", () => {
      const onRunComplete = vi.fn();
      render(
        <HomeDialogs
          {...defaultProps}
          isRunPanelOpen={true}
          onRunComplete={onRunComplete}
        />,
      );

      screen.getByTestId("complete-btn").click();
      expect(onRunComplete).toHaveBeenCalledWith("completed");
    });
  });

  describe("Project Settings Dialog", () => {
    it("should not render when closed", () => {
      render(<HomeDialogs {...defaultProps} />);
      expect(
        screen.queryByTestId("project-settings-dialog"),
      ).not.toBeInTheDocument();
    });

    it("should render when open", () => {
      render(<HomeDialogs {...defaultProps} isProjectSettingsOpen={true} />);
      expect(screen.getByTestId("project-settings-dialog")).toBeInTheDocument();
    });

    it("should display project path", () => {
      render(<HomeDialogs {...defaultProps} isProjectSettingsOpen={true} />);
      expect(screen.getByTestId("project-path")).toHaveTextContent(
        "/path/to/project",
      );
    });

    it("should call onProjectSettingsOpenChange when close clicked", () => {
      const onProjectSettingsOpenChange = vi.fn();
      render(
        <HomeDialogs
          {...defaultProps}
          isProjectSettingsOpen={true}
          onProjectSettingsOpenChange={onProjectSettingsOpenChange}
        />,
      );

      screen.getByTestId("close-btn").click();
      expect(onProjectSettingsOpenChange).toHaveBeenCalledWith(false);
    });

    it("should call onProjectSettingsSaved when save clicked", () => {
      const onProjectSettingsSaved = vi.fn();
      render(
        <HomeDialogs
          {...defaultProps}
          isProjectSettingsOpen={true}
          onProjectSettingsSaved={onProjectSettingsSaved}
        />,
      );

      screen.getByTestId("save-btn").click();
      expect(onProjectSettingsSaved).toHaveBeenCalledTimes(1);
    });
  });
});
