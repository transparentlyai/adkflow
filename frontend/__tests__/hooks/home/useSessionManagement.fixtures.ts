import { vi } from "vitest";

export function createMockCanvasRef() {
  return {
    current: {
      restoreFlow: vi.fn(),
    },
  };
}

export function createMockSetters() {
  return {
    mockSetCurrentProjectPath: vi.fn(),
    mockSetWorkflowName: vi.fn(),
    mockSetIsProjectSaved: vi.fn(),
    mockSetShowHomeScreen: vi.fn(),
    mockSetRecentProjects: vi.fn(),
    mockSetIsSessionLoaded: vi.fn(),
    mockInitializeTabs: vi.fn(),
    mockLoadTabFlow: vi.fn(),
    mockSyncTeleportersForTab: vi.fn(),
  };
}

export function createDefaultProps(
  mockCanvasRef: ReturnType<typeof createMockCanvasRef>,
  mockLoadedTabIdRef: { current: string | null },
  setters: ReturnType<typeof createMockSetters>,
) {
  return {
    canvasRef: mockCanvasRef as any,
    loadedTabIdRef: mockLoadedTabIdRef as any,
    isSessionLoaded: false,
    currentProjectPath: null as string | null,
    workflowName: "Untitled Workflow",
    hasUnsavedChanges: false,
    setCurrentProjectPath: setters.mockSetCurrentProjectPath,
    setWorkflowName: setters.mockSetWorkflowName,
    setIsProjectSaved: setters.mockSetIsProjectSaved,
    setShowHomeScreen: setters.mockSetShowHomeScreen,
    setRecentProjects: setters.mockSetRecentProjects,
    setIsSessionLoaded: setters.mockSetIsSessionLoaded,
    initializeTabs: setters.mockInitializeTabs,
    loadTabFlow: setters.mockLoadTabFlow,
    syncTeleportersForTab: setters.mockSyncTeleportersForTab,
  };
}

export function createMockSession(overrides: Partial<{
  currentProjectPath: string | null;
  workflowName: string;
  workflow: any;
  hasUnsavedChanges: boolean;
}> = {}) {
  return {
    currentProjectPath: "/path/to/project",
    workflowName: "Test Workflow",
    workflow: null,
    hasUnsavedChanges: false,
    ...overrides,
  };
}

export function createMockFlow(overrides: Partial<{
  nodes: any[];
  edges: any[];
  viewport: { x: number; y: number; zoom: number };
}> = {}) {
  return {
    nodes: [],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
    ...overrides,
  };
}

export function createMockTabResult(overrides: Partial<{
  projectName: string;
  firstTab: { id: string; name: string } | null;
}> = {}) {
  return {
    projectName: "Test Workflow",
    firstTab: { id: "tab-1", name: "Flow 1" },
    ...overrides,
  };
}
