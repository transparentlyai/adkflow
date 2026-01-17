/**
 * Shared test utilities for HomeDialogs tests.
 */

import { vi } from "vitest";
import type { TabState, RunStatus } from "@/lib/types";
import type { FilePickerState, NodeCreationDialogState } from "@/hooks/home";
import type { DisplayEvent } from "@/components/RunPanel";

// Mock all dialog components
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
    defaultExtensions?: string[];
    filterLabel?: string;
    allowCreate?: boolean;
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

// Test data
export const mockTabs: TabState[] = [
  {
    id: "tab1",
    name: "Main",
    order: 0,
    viewport: { x: 0, y: 0, zoom: 1 },
    hasUnsavedChanges: false,
    isLoading: false,
  },
  {
    id: "tab2",
    name: "Secondary",
    order: 1,
    viewport: { x: 0, y: 0, zoom: 1 },
    hasUnsavedChanges: true,
    isLoading: false,
  },
];

export const closedDialogState: NodeCreationDialogState = { isOpen: false };
export const openDialogState: NodeCreationDialogState = {
  isOpen: true,
  position: { x: 100, y: 200 },
};

export const closedFilePickerState: FilePickerState = {
  isOpen: false,
  callback: null,
};
export const openFilePickerState: FilePickerState = {
  isOpen: true,
  initialPath: "/initial/path",
  callback: vi.fn(),
  options: {
    extensions: [".txt", ".md"],
    filterLabel: "Text files",
    allowCreate: true,
  },
};

export const mockRunEvents: DisplayEvent[] = [];

export function createDefaultProps() {
  return {
    currentProjectPath: "/path/to/project",
    tabs: mockTabs,

    // Save confirm dialog
    isSaveConfirmOpen: false,
    onSaveAndContinue: vi.fn(),
    onDontSave: vi.fn(),
    onCancelNewProject: vi.fn(),

    // Run confirm dialog
    isRunConfirmDialogOpen: false,
    onRunConfirmSaveAndRun: vi.fn(),
    onRunConfirmCancel: vi.fn(),

    // Topology save dialog
    isTopologySaveDialogOpen: false,
    onTopologySaveAndShow: vi.fn(),
    onTopologySaveCancel: vi.fn(),

    // Validation save dialog
    isValidationSaveDialogOpen: false,
    onValidationSaveAndValidate: vi.fn(),
    onValidationSaveCancel: vi.fn(),

    // Prompt dialog
    promptDialogState: closedDialogState,
    onCreatePrompt: vi.fn(),
    onSelectExistingPrompt: vi.fn(),
    onCancelPromptCreation: vi.fn(),

    // Context dialog
    contextDialogState: closedDialogState,
    onCreateContext: vi.fn(),
    onSelectExistingContext: vi.fn(),
    onCancelContextCreation: vi.fn(),

    // Tool dialog
    toolDialogState: closedDialogState,
    onCreateTool: vi.fn(),
    onSelectExistingTool: vi.fn(),
    onCancelToolCreation: vi.fn(),

    // Process dialog
    processDialogState: closedDialogState,
    onCreateProcess: vi.fn(),
    onSelectExistingProcess: vi.fn(),
    onCancelProcessCreation: vi.fn(),

    // Output file dialog
    outputFileDialogState: closedDialogState,
    onCreateOutputFile: vi.fn(),
    onSelectExistingOutputFile: vi.fn(),
    onCancelOutputFileCreation: vi.fn(),

    // Clear canvas dialog
    isClearDialogOpen: false,
    onClearCanvasConfirm: vi.fn(),
    onClearCanvasCancel: vi.fn(),

    // Tab delete dialog
    isTabDeleteDialogOpen: false,
    pendingDeleteTabId: null,
    onTabDeleteConfirm: vi.fn(),
    onTabDeleteCancel: vi.fn(),

    // Topology dialog
    topologyResult: null,
    onCloseTopology: vi.fn(),

    // File picker
    filePickerState: closedFilePickerState,
    onFilePickerSelect: vi.fn(),
    onFilePickerCancel: vi.fn(),

    // Run panel
    isRunPanelOpen: false,
    currentRunId: null,
    runEvents: mockRunEvents,
    lastRunStatus: "pending" as RunStatus,
    onCloseRunPanel: vi.fn(),
    onRunComplete: vi.fn(),
    onAgentStateChange: vi.fn(),
    onToolStateChange: vi.fn(),
    onCallbackStateChange: vi.fn(),
    onUserInputStateChange: vi.fn(),
    onClearExecutionState: vi.fn(),
    onEventsChange: vi.fn(),
    onStatusChange: vi.fn(),

    // Project settings dialog
    isProjectSettingsOpen: false,
    onProjectSettingsOpenChange: vi.fn(),
    onProjectSettingsSaved: vi.fn(),
  };
}
