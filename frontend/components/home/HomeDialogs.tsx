import ConfirmDialog from "@/components/ConfirmDialog";
import SaveConfirmDialog from "@/components/SaveConfirmDialog";
import RunConfirmDialog from "@/components/RunConfirmDialog";
import PromptNameDialog from "@/components/PromptNameDialog";
import TopologyDialog from "@/components/TopologyDialog";
import FilePicker from "@/components/FilePicker";
import RunPanel, { type DisplayEvent } from "@/components/RunPanel";
import ProjectSettingsDialog from "@/components/ProjectSettingsDialog";
import type {
  TabState,
  RunStatus,
  NodeExecutionState,
  TopologyResponse,
} from "@/lib/types";
import type { FilePickerState, NodeCreationDialogState } from "@/hooks/home";

interface HomeDialogsProps {
  currentProjectPath: string | null;
  tabs: TabState[];

  // Save confirm dialog
  isSaveConfirmOpen: boolean;
  onSaveAndContinue: () => void;
  onDontSave: () => void;
  onCancelNewProject: () => void;

  // Run confirm dialog
  isRunConfirmDialogOpen: boolean;
  onRunConfirmSaveAndRun: () => void;
  onRunConfirmCancel: () => void;

  // Topology save dialog
  isTopologySaveDialogOpen: boolean;
  onTopologySaveAndShow: () => void;
  onTopologySaveCancel: () => void;

  // Validation save dialog
  isValidationSaveDialogOpen: boolean;
  onValidationSaveAndValidate: () => void;
  onValidationSaveCancel: () => void;

  // Prompt dialog
  promptDialogState: NodeCreationDialogState;
  onCreatePrompt: (name: string) => void;
  onSelectExistingPrompt: (path: string) => void;
  onCancelPromptCreation: () => void;

  // Context dialog
  contextDialogState: NodeCreationDialogState;
  onCreateContext: (name: string) => void;
  onSelectExistingContext: (path: string) => void;
  onCancelContextCreation: () => void;

  // Tool dialog
  toolDialogState: NodeCreationDialogState;
  onCreateTool: (name: string) => void;
  onSelectExistingTool: (path: string) => void;
  onCancelToolCreation: () => void;

  // Process dialog
  processDialogState: NodeCreationDialogState;
  onCreateProcess: (name: string) => void;
  onSelectExistingProcess: (path: string) => void;
  onCancelProcessCreation: () => void;

  // Output file dialog
  outputFileDialogState: NodeCreationDialogState;
  onCreateOutputFile: (name: string) => void;
  onSelectExistingOutputFile: (path: string) => void;
  onCancelOutputFileCreation: () => void;

  // Clear canvas dialog
  isClearDialogOpen: boolean;
  onClearCanvasConfirm: () => void;
  onClearCanvasCancel: () => void;

  // Tab delete dialog
  isTabDeleteDialogOpen: boolean;
  pendingDeleteTabId: string | null;
  onTabDeleteConfirm: () => void;
  onTabDeleteCancel: () => void;

  // Topology dialog
  topologyResult: TopologyResponse | null;
  onCloseTopology: () => void;

  // File picker
  filePickerState: FilePickerState;
  onFilePickerSelect: (path: string) => void;
  onFilePickerCancel: () => void;

  // Run panel
  isRunPanelOpen: boolean;
  currentRunId: string | null;
  runEvents: DisplayEvent[];
  lastRunStatus: RunStatus;
  onCloseRunPanel: () => void;
  onRunComplete: (status: RunStatus) => void;
  onAgentStateChange: (agentName: string, state: NodeExecutionState) => void;
  onToolStateChange: (toolName: string, state: NodeExecutionState) => void;
  onUserInputStateChange: (nodeId: string, isWaiting: boolean) => void;
  onClearExecutionState: () => void;
  onEventsChange: React.Dispatch<React.SetStateAction<DisplayEvent[]>>;
  onStatusChange: React.Dispatch<React.SetStateAction<RunStatus>>;

  // Project settings dialog
  isProjectSettingsOpen: boolean;
  onProjectSettingsOpenChange: (open: boolean) => void;
}

export function HomeDialogs({
  currentProjectPath,
  tabs,
  isSaveConfirmOpen,
  onSaveAndContinue,
  onDontSave,
  onCancelNewProject,
  isRunConfirmDialogOpen,
  onRunConfirmSaveAndRun,
  onRunConfirmCancel,
  isTopologySaveDialogOpen,
  onTopologySaveAndShow,
  onTopologySaveCancel,
  isValidationSaveDialogOpen,
  onValidationSaveAndValidate,
  onValidationSaveCancel,
  promptDialogState,
  onCreatePrompt,
  onSelectExistingPrompt,
  onCancelPromptCreation,
  contextDialogState,
  onCreateContext,
  onSelectExistingContext,
  onCancelContextCreation,
  toolDialogState,
  onCreateTool,
  onSelectExistingTool,
  onCancelToolCreation,
  processDialogState,
  onCreateProcess,
  onSelectExistingProcess,
  onCancelProcessCreation,
  outputFileDialogState,
  onCreateOutputFile,
  onSelectExistingOutputFile,
  onCancelOutputFileCreation,
  isClearDialogOpen,
  onClearCanvasConfirm,
  onClearCanvasCancel,
  isTabDeleteDialogOpen,
  pendingDeleteTabId,
  onTabDeleteConfirm,
  onTabDeleteCancel,
  topologyResult,
  onCloseTopology,
  filePickerState,
  onFilePickerSelect,
  onFilePickerCancel,
  isRunPanelOpen,
  currentRunId,
  runEvents,
  lastRunStatus,
  onCloseRunPanel,
  onRunComplete,
  onAgentStateChange,
  onToolStateChange,
  onUserInputStateChange,
  onClearExecutionState,
  onEventsChange,
  onStatusChange,
  isProjectSettingsOpen,
  onProjectSettingsOpenChange,
}: HomeDialogsProps) {
  return (
    <>
      {/* Save Confirm Dialog */}
      <SaveConfirmDialog
        isOpen={isSaveConfirmOpen}
        projectPath={currentProjectPath || ""}
        onSaveAndContinue={onSaveAndContinue}
        onDontSave={onDontSave}
        onCancel={onCancelNewProject}
      />

      {/* Run Confirm Dialog */}
      <RunConfirmDialog
        isOpen={isRunConfirmDialogOpen}
        onSaveAndRun={onRunConfirmSaveAndRun}
        onCancel={onRunConfirmCancel}
      />

      {/* Topology Save Dialog */}
      <ConfirmDialog
        isOpen={isTopologySaveDialogOpen}
        title="Save Before Viewing Topology?"
        description="You have unsaved changes. The workflow needs to be saved to generate an accurate topology."
        confirmLabel="Save & Show"
        onConfirm={onTopologySaveAndShow}
        onCancel={onTopologySaveCancel}
      />

      {/* Validation Save Dialog */}
      <ConfirmDialog
        isOpen={isValidationSaveDialogOpen}
        title="Save Before Validating?"
        description="You have unsaved changes. The workflow needs to be saved before it can be validated."
        confirmLabel="Save & Validate"
        onConfirm={onValidationSaveAndValidate}
        onCancel={onValidationSaveCancel}
      />

      {/* Prompt Name Dialog */}
      <PromptNameDialog
        isOpen={promptDialogState.isOpen}
        onSubmit={onCreatePrompt}
        onSelectExisting={onSelectExistingPrompt}
        onCancel={onCancelPromptCreation}
        projectPath={currentProjectPath || undefined}
      />

      {/* Context Name Dialog */}
      <PromptNameDialog
        isOpen={contextDialogState.isOpen}
        onSubmit={onCreateContext}
        onSelectExisting={onSelectExistingContext}
        onCancel={onCancelContextCreation}
        type="context"
        projectPath={currentProjectPath || undefined}
      />

      {/* Tool Name Dialog */}
      <PromptNameDialog
        isOpen={toolDialogState.isOpen}
        onSubmit={onCreateTool}
        onSelectExisting={onSelectExistingTool}
        onCancel={onCancelToolCreation}
        type="tool"
        projectPath={currentProjectPath || undefined}
      />

      {/* Process Name Dialog */}
      <PromptNameDialog
        isOpen={processDialogState.isOpen}
        onSubmit={onCreateProcess}
        onSelectExisting={onSelectExistingProcess}
        onCancel={onCancelProcessCreation}
        type="process"
        projectPath={currentProjectPath || undefined}
      />

      {/* Output File Name Dialog */}
      <PromptNameDialog
        isOpen={outputFileDialogState.isOpen}
        onSubmit={onCreateOutputFile}
        onSelectExisting={onSelectExistingOutputFile}
        onCancel={onCancelOutputFileCreation}
        type="outputFile"
        projectPath={currentProjectPath || undefined}
      />

      {/* Clear Canvas Confirm Dialog */}
      <ConfirmDialog
        isOpen={isClearDialogOpen}
        title="Clear Canvas"
        description="Are you sure you want to clear the canvas? This action cannot be undone."
        confirmLabel="Clear"
        variant="destructive"
        onConfirm={onClearCanvasConfirm}
        onCancel={onClearCanvasCancel}
      />

      {/* Tab Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={isTabDeleteDialogOpen}
        title="Delete Tab"
        description={`Are you sure you want to delete "${tabs.find((t) => t.id === pendingDeleteTabId)?.name || "this tab"}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={onTabDeleteConfirm}
        onCancel={onTabDeleteCancel}
      />

      {/* Topology Dialog */}
      <TopologyDialog
        isOpen={topologyResult !== null}
        result={topologyResult}
        onClose={onCloseTopology}
      />

      {/* File Picker Dialog */}
      <FilePicker
        isOpen={filePickerState.isOpen}
        projectPath={currentProjectPath || ""}
        initialPath={filePickerState.initialPath}
        onSelect={onFilePickerSelect}
        onCancel={onFilePickerCancel}
        title="Select File"
        description="Choose a file to associate with this node"
        defaultExtensions={filePickerState.options?.extensions}
        filterLabel={filePickerState.options?.filterLabel}
        allowCreate={filePickerState.options?.allowCreate}
      />

      {/* Run Panel */}
      {isRunPanelOpen && (
        <RunPanel
          runId={currentRunId}
          projectPath={currentProjectPath || ""}
          onClose={onCloseRunPanel}
          onRunComplete={onRunComplete}
          onAgentStateChange={onAgentStateChange}
          onToolStateChange={onToolStateChange}
          onUserInputStateChange={onUserInputStateChange}
          onClearExecutionState={onClearExecutionState}
          events={runEvents}
          onEventsChange={onEventsChange}
          lastRunStatus={lastRunStatus}
          onStatusChange={onStatusChange}
        />
      )}

      {/* Project Settings Dialog */}
      <ProjectSettingsDialog
        open={isProjectSettingsOpen}
        onOpenChange={onProjectSettingsOpenChange}
        projectPath={currentProjectPath}
      />
    </>
  );
}
