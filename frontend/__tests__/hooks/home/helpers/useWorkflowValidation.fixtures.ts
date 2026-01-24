import { vi } from "vitest";

export function createMockCanvasRef() {
  return {
    current: {
      clearErrorHighlights: vi.fn(),
      highlightErrorNodes: vi.fn(),
      highlightWarningNodes: vi.fn(),
      saveFlow: vi.fn(),
    },
  };
}

export function createMockSetters() {
  return {
    mockSetRunEvents: vi.fn(),
    mockSetLastRunStatus: vi.fn(),
    mockSetIsRunPanelOpen: vi.fn(),
    mockSetIsValidationSaveDialogOpen: vi.fn(),
    mockSetIsProjectSaved: vi.fn(),
    mockSaveTabFlow: vi.fn(),
  };
}

export function createDefaultProps(
  canvasRef: ReturnType<typeof createMockCanvasRef>,
  setters: ReturnType<typeof createMockSetters>,
) {
  return {
    canvasRef: canvasRef as any,
    currentProjectPath: "/path/to/project",
    activeTabId: "tab1",
    activeTab: { id: "tab1", name: "Tab 1", hasUnsavedChanges: false },
    workflowName: "Test Workflow",
    isProjectSaved: true,
    setRunEvents: setters.mockSetRunEvents,
    setLastRunStatus: setters.mockSetLastRunStatus,
    setIsRunPanelOpen: setters.mockSetIsRunPanelOpen,
    setIsValidationSaveDialogOpen: setters.mockSetIsValidationSaveDialogOpen,
    setIsProjectSaved: setters.mockSetIsProjectSaved,
    saveTabFlow: setters.mockSaveTabFlow,
  };
}

export function createValidationSuccessResponse() {
  return {
    valid: true,
    errors: [],
    warnings: [],
    agent_count: 3,
    tab_count: 1,
    node_errors: {},
    node_warnings: {},
  };
}

export function setupDefaultMocks(
  validateWorkflow: any,
  canvasRef: ReturnType<typeof createMockCanvasRef>,
  setters: ReturnType<typeof createMockSetters>,
) {
  validateWorkflow.mockResolvedValue(createValidationSuccessResponse());
  setters.mockSaveTabFlow.mockResolvedValue(true);
  canvasRef.current.saveFlow.mockReturnValue({
    nodes: [],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
  });
}
