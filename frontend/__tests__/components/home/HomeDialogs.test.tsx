import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { HomeDialogs } from "@/components/home/HomeDialogs";
import type { TabState, RunStatus, TopologyResponse } from "@/lib/types";
import type { FilePickerState, NodeCreationDialogState } from "@/hooks/home";
import type { DisplayEvent } from "@/components/RunPanel";

// Mock all dialog components to simplify testing
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
    result: TopologyResponse | null;
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
    defaultExtensions,
    filterLabel,
    allowCreate,
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

describe("HomeDialogs", () => {
  const mockTabs: TabState[] = [
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

  const closedDialogState: NodeCreationDialogState = { isOpen: false };
  const openDialogState: NodeCreationDialogState = {
    isOpen: true,
    position: { x: 100, y: 200 },
  };

  const closedFilePickerState: FilePickerState = {
    isOpen: false,
    callback: null,
  };
  const openFilePickerState: FilePickerState = {
    isOpen: true,
    initialPath: "/initial/path",
    callback: vi.fn(),
    options: {
      extensions: [".txt", ".md"],
      filterLabel: "Text files",
      allowCreate: true,
    },
  };

  const mockRunEvents: DisplayEvent[] = [];

  const defaultProps = {
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
    onUserInputStateChange: vi.fn(),
    onClearExecutionState: vi.fn(),
    onEventsChange: vi.fn(),
    onStatusChange: vi.fn(),

    // Project settings dialog
    isProjectSettingsOpen: false,
    onProjectSettingsOpenChange: vi.fn(),
    onProjectSettingsSaved: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
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

  describe("Topology Save Dialog", () => {
    it("should not render when closed", () => {
      render(<HomeDialogs {...defaultProps} />);
      expect(
        screen.queryByTestId("confirm-dialog-save-before-viewing-topology?"),
      ).not.toBeInTheDocument();
    });

    it("should render when open", () => {
      render(<HomeDialogs {...defaultProps} isTopologySaveDialogOpen={true} />);
      expect(
        screen.getByTestId("confirm-dialog-save-before-viewing-topology?"),
      ).toBeInTheDocument();
    });

    it("should display correct title and description", () => {
      render(<HomeDialogs {...defaultProps} isTopologySaveDialogOpen={true} />);
      expect(screen.getByTestId("dialog-title")).toHaveTextContent(
        "Save Before Viewing Topology?",
      );
      expect(screen.getByTestId("dialog-description")).toHaveTextContent(
        "You have unsaved changes. The workflow needs to be saved to generate an accurate topology.",
      );
    });
  });

  describe("Validation Save Dialog", () => {
    it("should not render when closed", () => {
      render(<HomeDialogs {...defaultProps} />);
      expect(
        screen.queryByTestId("confirm-dialog-save-before-validating?"),
      ).not.toBeInTheDocument();
    });

    it("should render when open", () => {
      render(
        <HomeDialogs {...defaultProps} isValidationSaveDialogOpen={true} />,
      );
      expect(
        screen.getByTestId("confirm-dialog-save-before-validating?"),
      ).toBeInTheDocument();
    });
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

  describe("Clear Canvas Dialog", () => {
    it("should not render when closed", () => {
      render(<HomeDialogs {...defaultProps} />);
      expect(
        screen.queryByTestId("confirm-dialog-clear-canvas"),
      ).not.toBeInTheDocument();
    });

    it("should render when open", () => {
      render(<HomeDialogs {...defaultProps} isClearDialogOpen={true} />);
      expect(
        screen.getByTestId("confirm-dialog-clear-canvas"),
      ).toBeInTheDocument();
    });

    it("should have destructive variant", () => {
      render(<HomeDialogs {...defaultProps} isClearDialogOpen={true} />);
      expect(screen.getByTestId("dialog-variant")).toHaveTextContent(
        "destructive",
      );
    });

    it("should call onClearCanvasConfirm when confirm clicked", () => {
      const onClearCanvasConfirm = vi.fn();
      render(
        <HomeDialogs
          {...defaultProps}
          isClearDialogOpen={true}
          onClearCanvasConfirm={onClearCanvasConfirm}
        />,
      );

      screen.getByTestId("confirm-button").click();
      expect(onClearCanvasConfirm).toHaveBeenCalledTimes(1);
    });
  });

  describe("Tab Delete Dialog", () => {
    it("should not render when closed", () => {
      render(<HomeDialogs {...defaultProps} />);
      expect(
        screen.queryByTestId("confirm-dialog-delete-tab"),
      ).not.toBeInTheDocument();
    });

    it("should render when open", () => {
      render(<HomeDialogs {...defaultProps} isTabDeleteDialogOpen={true} />);
      expect(
        screen.getByTestId("confirm-dialog-delete-tab"),
      ).toBeInTheDocument();
    });

    it("should display tab name in description when tab exists", () => {
      render(
        <HomeDialogs
          {...defaultProps}
          isTabDeleteDialogOpen={true}
          pendingDeleteTabId="tab1"
        />,
      );
      expect(screen.getByTestId("dialog-description")).toHaveTextContent(
        'Are you sure you want to delete "Main"?',
      );
    });

    it("should display fallback text when tab not found", () => {
      render(
        <HomeDialogs
          {...defaultProps}
          isTabDeleteDialogOpen={true}
          pendingDeleteTabId="unknown-tab"
        />,
      );
      expect(screen.getByTestId("dialog-description")).toHaveTextContent(
        'Are you sure you want to delete "this tab"?',
      );
    });

    it("should have destructive variant", () => {
      render(<HomeDialogs {...defaultProps} isTabDeleteDialogOpen={true} />);
      expect(screen.getByTestId("dialog-variant")).toHaveTextContent(
        "destructive",
      );
    });
  });

  describe("Topology Dialog", () => {
    const mockTopologyResult: TopologyResponse = {
      mermaid: "graph TD; A-->B;",
      ascii: "A --> B",
      agent_count: 2,
    };

    it("should not render when topologyResult is null", () => {
      render(<HomeDialogs {...defaultProps} />);
      expect(screen.queryByTestId("topology-dialog")).not.toBeInTheDocument();
    });

    it("should render when topologyResult is provided", () => {
      render(
        <HomeDialogs {...defaultProps} topologyResult={mockTopologyResult} />,
      );
      expect(screen.getByTestId("topology-dialog")).toBeInTheDocument();
    });

    it("should display topology data", () => {
      render(
        <HomeDialogs {...defaultProps} topologyResult={mockTopologyResult} />,
      );
      expect(screen.getByTestId("mermaid")).toHaveTextContent(
        "graph TD; A-->B;",
      );
      expect(screen.getByTestId("ascii")).toHaveTextContent("A --> B");
      expect(screen.getByTestId("agent-count")).toHaveTextContent("2");
    });

    it("should call onCloseTopology when close clicked", () => {
      const onCloseTopology = vi.fn();
      render(
        <HomeDialogs
          {...defaultProps}
          topologyResult={mockTopologyResult}
          onCloseTopology={onCloseTopology}
        />,
      );

      screen.getByTestId("close-btn").click();
      expect(onCloseTopology).toHaveBeenCalledTimes(1);
    });
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
