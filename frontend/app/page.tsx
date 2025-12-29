"use client";

import HomeScreen from "@/components/HomeScreen";
import { ClipboardProvider } from "@/contexts/ClipboardContext";
import { TabsProvider } from "@/contexts/TabsContext";
import { TeleporterProvider } from "@/contexts/TeleporterContext";
import { HomeHeader, HomeDialogs, HomeLayout } from "@/components/home";
import {
  useHomeState,
  useProjectManagement,
  useSessionManagement,
  useDialogHandlers,
  useTabHandlers,
  useRunWorkflow,
  useWorkflowChange,
} from "@/hooks/home";

/**
 * HomeContent Component
 *
 * Main content component that orchestrates the workflow editor.
 * Uses extracted hooks for state management and handlers.
 */
function HomeContent() {
  // Core state management
  const state = useHomeState();
  const {
    tabsContext,
    syncTeleportersForTab,
    updateTabName,
    themeId,
    toggleTheme,
    workflowName,
    setWorkflowName,
    canvasRef,
    activeTabRef,
    loadedTabIdRef,
    tabFlowCacheRef,
    isSessionLoaded,
    setIsSessionLoaded,
    currentProjectPath,
    setCurrentProjectPath,
    isProjectSaved,
    setIsProjectSaved,
    isProjectSwitcherOpen,
    setIsProjectSwitcherOpen,
    projectSwitcherMode,
    setProjectSwitcherMode,
    isSaveConfirmOpen,
    setIsSaveConfirmOpen,
    showHomeScreen,
    setShowHomeScreen,
    recentProjects,
    setRecentProjects,
    isSaving,
    setIsSaving,
    hasUnsavedChanges,
    promptDialogState,
    setPromptDialogState,
    contextDialogState,
    setContextDialogState,
    toolDialogState,
    setToolDialogState,
    processDialogState,
    setProcessDialogState,
    outputFileDialogState,
    setOutputFileDialogState,
    isClearDialogOpen,
    setIsClearDialogOpen,
    isCanvasLocked,
    setIsCanvasLocked,
    filePickerState,
    setFilePickerState,
    isRunPanelOpen,
    setIsRunPanelOpen,
    currentRunId,
    setCurrentRunId,
    isRunning,
    setIsRunning,
    runEvents,
    setRunEvents,
    isRunConfirmDialogOpen,
    setIsRunConfirmDialogOpen,
    lastRunStatus,
    setLastRunStatus,
    topologyResult,
    setTopologyResult,
    isTopologySaveDialogOpen,
    setIsTopologySaveDialogOpen,
    isValidationSaveDialogOpen,
    setIsValidationSaveDialogOpen,
    isTabDeleteDialogOpen,
    setIsTabDeleteDialogOpen,
    pendingDeleteTabId,
    setPendingDeleteTabId,
    pendingFocusNodeIdRef,
    hasSyncedAllTabsRef,
  } = state;

  const {
    tabs,
    activeTabId,
    activeTab,
    initializeTabs,
    createNewTab,
    loadTabFlow,
    saveTabFlow,
    deleteTabById,
    renameTabById,
    reorderTabsById,
    duplicateTabById,
    setActiveTabId,
    markTabDirty,
    pendingFocusNodeId,
    setPendingFocusNodeId,
    navigateToNode,
  } = tabsContext;

  // Project management handlers
  const projectManagement = useProjectManagement({
    canvasRef,
    loadedTabIdRef,
    tabFlowCacheRef,
    currentProjectPath,
    workflowName,
    activeTabId,
    hasUnsavedChanges,
    setCurrentProjectPath,
    setWorkflowName,
    setIsProjectSwitcherOpen,
    setShowHomeScreen,
    setIsProjectSaved,
    setRecentProjects,
    setIsSaving,
    setIsSaveConfirmOpen,
    setProjectSwitcherMode,
    initializeTabs,
    createNewTab,
    loadTabFlow,
    saveTabFlow,
    syncTeleportersForTab,
  });

  // Session management effects
  useSessionManagement({
    canvasRef,
    loadedTabIdRef,
    isSessionLoaded,
    currentProjectPath,
    workflowName,
    hasUnsavedChanges,
    setCurrentProjectPath,
    setWorkflowName,
    setIsProjectSaved,
    setShowHomeScreen,
    setRecentProjects,
    setIsSessionLoaded,
    initializeTabs,
    loadTabFlow,
    syncTeleportersForTab,
  });

  // Workflow change handler
  const { handleWorkflowChange } = useWorkflowChange({
    activeTabRef,
    hasSyncedAllTabsRef,
    tabs,
    activeTabId,
    currentProjectPath,
    markTabDirty,
    loadTabFlow,
    syncTeleportersForTab,
  });

  // Dialog handlers
  const dialogHandlers = useDialogHandlers({
    canvasRef,
    currentProjectPath,
    activeTabId,
    markTabDirty,
    promptDialogState,
    setPromptDialogState,
    contextDialogState,
    setContextDialogState,
    toolDialogState,
    setToolDialogState,
    processDialogState,
    setProcessDialogState,
    outputFileDialogState,
    setOutputFileDialogState,
    isClearDialogOpen,
    setIsClearDialogOpen,
    filePickerState,
    setFilePickerState,
  });

  // Tab handlers
  const tabHandlers = useTabHandlers({
    canvasRef,
    loadedTabIdRef,
    tabFlowCacheRef,
    pendingFocusNodeIdRef,
    currentProjectPath,
    tabs,
    activeTabId,
    activeTab,
    pendingFocusNodeId,
    setActiveTabId,
    setPendingFocusNodeId,
    loadTabFlow,
    saveTabFlow,
    createNewTab,
    deleteTabById,
    renameTabById,
    reorderTabsById,
    duplicateTabById,
    syncTeleportersForTab,
    updateTabName,
    isTabDeleteDialogOpen,
    setIsTabDeleteDialogOpen,
    pendingDeleteTabId,
    setPendingDeleteTabId,
  });

  // Run workflow handlers
  const runWorkflowHandlers = useRunWorkflow({
    canvasRef,
    currentProjectPath,
    activeTabId,
    activeTab,
    workflowName,
    isRunning,
    isProjectSaved,
    setIsRunning,
    setCurrentRunId,
    setIsRunPanelOpen,
    setRunEvents,
    setLastRunStatus,
    setIsRunConfirmDialogOpen,
    setIsProjectSaved,
    setTopologyResult,
    setIsTopologySaveDialogOpen,
    setIsValidationSaveDialogOpen,
    saveTabFlow,
  });

  // Show HomeScreen for first-time users
  if (showHomeScreen && !currentProjectPath) {
    return (
      <HomeScreen
        recentProjects={recentProjects}
        onCreateProject={projectManagement.handleCreateNewProject}
        onLoadProject={projectManagement.handleLoadExistingProject}
        onRemoveRecent={projectManagement.handleRemoveRecentProject}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <HomeHeader
        workflowName={workflowName}
        setWorkflowName={setWorkflowName}
        currentProjectPath={currentProjectPath}
        hasUnsavedChanges={hasUnsavedChanges}
        isSaving={isSaving}
        isCanvasLocked={isCanvasLocked}
        isRunning={isRunning}
        isRunPanelOpen={isRunPanelOpen}
        themeId={themeId}
        tabs={tabs}
        activeTabId={activeTabId}
        canvasRef={canvasRef}
        onNewProject={projectManagement.handleNewProject}
        onLoadProject={projectManagement.handleLoadProject}
        onSaveProject={projectManagement.handleSaveCurrentProject}
        onClearCanvas={dialogHandlers.handleClearCanvasClick}
        onZoomIn={dialogHandlers.handleZoomIn}
        onZoomOut={dialogHandlers.handleZoomOut}
        onFitView={dialogHandlers.handleFitView}
        onToggleLock={() => setIsCanvasLocked(!isCanvasLocked)}
        onRunWorkflow={runWorkflowHandlers.handleRunWorkflow}
        onValidateWorkflow={runWorkflowHandlers.handleValidateWorkflow}
        onShowTopology={runWorkflowHandlers.handleShowTopology}
        onToggleRunConsole={() => setIsRunPanelOpen(!isRunPanelOpen)}
        onToggleTheme={toggleTheme}
        loadTabFlow={loadTabFlow}
        navigateToNode={navigateToNode}
      />

      <HomeLayout
        canvasRef={canvasRef}
        currentProjectPath={currentProjectPath}
        tabs={tabs}
        activeTabId={activeTabId}
        isCanvasLocked={isCanvasLocked}
        isRunning={isRunning}
        onTabClick={tabHandlers.handleTabClick}
        onTabDelete={tabHandlers.handleTabDelete}
        onTabRename={tabHandlers.handleTabRename}
        onTabReorder={tabHandlers.handleTabReorder}
        onAddTab={tabHandlers.handleAddTab}
        onDuplicateTab={tabHandlers.handleDuplicateTab}
        onWorkflowChange={handleWorkflowChange}
        onRequestPromptCreation={dialogHandlers.handleRequestPromptCreation}
        onRequestContextCreation={dialogHandlers.handleRequestContextCreation}
        onRequestToolCreation={dialogHandlers.handleRequestToolCreation}
        onRequestProcessCreation={dialogHandlers.handleRequestProcessCreation}
        onRequestOutputFileCreation={
          dialogHandlers.handleRequestOutputFileCreation
        }
        onToggleLock={() => setIsCanvasLocked(!isCanvasLocked)}
        onSave={projectManagement.handleSaveCurrentProject}
        onSaveFile={dialogHandlers.handleSaveFile}
        onRequestFilePicker={dialogHandlers.handleRequestFilePicker}
        onRunWorkflow={runWorkflowHandlers.handleRunWorkflow}
        isProjectSwitcherOpen={isProjectSwitcherOpen}
        projectSwitcherMode={projectSwitcherMode}
        recentProjects={recentProjects}
        onCloseProjectSwitcher={() => setIsProjectSwitcherOpen(false)}
        onCreateProject={projectManagement.handleCreateNewProject}
        onLoadProject={projectManagement.handleLoadExistingProject}
        onRemoveRecent={projectManagement.handleRemoveRecentProject}
      />

      <HomeDialogs
        currentProjectPath={currentProjectPath}
        tabs={tabs}
        isSaveConfirmOpen={isSaveConfirmOpen}
        onSaveAndContinue={projectManagement.handleSaveAndContinue}
        onDontSave={projectManagement.handleDontSave}
        onCancelNewProject={projectManagement.handleCancelNewProject}
        isRunConfirmDialogOpen={isRunConfirmDialogOpen}
        onRunConfirmSaveAndRun={runWorkflowHandlers.handleRunConfirmSaveAndRun}
        onRunConfirmCancel={runWorkflowHandlers.handleRunConfirmCancel}
        isTopologySaveDialogOpen={isTopologySaveDialogOpen}
        onTopologySaveAndShow={runWorkflowHandlers.handleTopologySaveAndShow}
        onTopologySaveCancel={runWorkflowHandlers.handleTopologySaveCancel}
        isValidationSaveDialogOpen={isValidationSaveDialogOpen}
        onValidationSaveAndValidate={
          runWorkflowHandlers.handleValidationSaveAndValidate
        }
        onValidationSaveCancel={runWorkflowHandlers.handleValidationSaveCancel}
        promptDialogState={promptDialogState}
        onCreatePrompt={dialogHandlers.handleCreatePrompt}
        onSelectExistingPrompt={dialogHandlers.handleSelectExistingPrompt}
        onCancelPromptCreation={dialogHandlers.handleCancelPromptCreation}
        contextDialogState={contextDialogState}
        onCreateContext={dialogHandlers.handleCreateContext}
        onSelectExistingContext={dialogHandlers.handleSelectExistingContext}
        onCancelContextCreation={dialogHandlers.handleCancelContextCreation}
        toolDialogState={toolDialogState}
        onCreateTool={dialogHandlers.handleCreateTool}
        onSelectExistingTool={dialogHandlers.handleSelectExistingTool}
        onCancelToolCreation={dialogHandlers.handleCancelToolCreation}
        processDialogState={processDialogState}
        onCreateProcess={dialogHandlers.handleCreateProcess}
        onSelectExistingProcess={dialogHandlers.handleSelectExistingProcess}
        onCancelProcessCreation={dialogHandlers.handleCancelProcessCreation}
        outputFileDialogState={outputFileDialogState}
        onCreateOutputFile={dialogHandlers.handleCreateOutputFile}
        onSelectExistingOutputFile={
          dialogHandlers.handleSelectExistingOutputFile
        }
        onCancelOutputFileCreation={
          dialogHandlers.handleCancelOutputFileCreation
        }
        isClearDialogOpen={isClearDialogOpen}
        onClearCanvasConfirm={dialogHandlers.handleClearCanvasConfirm}
        onClearCanvasCancel={dialogHandlers.handleClearCanvasCancel}
        isTabDeleteDialogOpen={isTabDeleteDialogOpen}
        pendingDeleteTabId={pendingDeleteTabId}
        onTabDeleteConfirm={tabHandlers.handleTabDeleteConfirm}
        onTabDeleteCancel={tabHandlers.handleTabDeleteCancel}
        topologyResult={topologyResult}
        onCloseTopology={() => setTopologyResult(null)}
        filePickerState={filePickerState}
        onFilePickerSelect={dialogHandlers.handleFilePickerSelect}
        onFilePickerCancel={dialogHandlers.handleFilePickerCancel}
        isRunPanelOpen={isRunPanelOpen}
        currentRunId={currentRunId}
        runEvents={runEvents}
        lastRunStatus={lastRunStatus}
        onCloseRunPanel={runWorkflowHandlers.handleCloseRunPanel}
        onRunComplete={runWorkflowHandlers.handleRunComplete}
        onAgentStateChange={runWorkflowHandlers.handleAgentStateChange}
        onToolStateChange={runWorkflowHandlers.handleToolStateChange}
        onUserInputStateChange={runWorkflowHandlers.handleUserInputStateChange}
        onClearExecutionState={runWorkflowHandlers.handleClearExecutionState}
        onEventsChange={setRunEvents}
        onStatusChange={setLastRunStatus}
      />
    </div>
  );
}

// Wrapper with providers
export default function Home() {
  return (
    <ClipboardProvider>
      <TabsProvider>
        <TeleporterProvider>
          <HomeContent />
        </TeleporterProvider>
      </TabsProvider>
    </ClipboardProvider>
  );
}
