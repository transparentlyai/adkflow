import { vi } from "vitest";
import type { Node } from "@xyflow/react";

// Re-export Node type for convenience
export type { Node } from "@xyflow/react";

/** Test node data type for file save state tests */
export interface TestNodeData extends Record<string, unknown> {
  label?: string;
  fileSaveState?: {
    isDirty: boolean;
    filePath: string;
    content: string;
  };
}

/** Shared mock functions for project management tests */
export const mockHandleCreateNewProject = vi.fn();
export const mockHandleLoadExistingProject = vi.fn();

/** Creates a mock canvas ref for testing */
export function createMockCanvasRef() {
  return {
    current: {
      saveFlow: vi.fn(() => ({
        nodes: [] as Node[],
        edges: [] as Node[],
        viewport: { x: 0, y: 0, zoom: 1 },
      })),
      clearCanvas: vi.fn(),
      restoreFlow: vi.fn(),
    },
  };
}

/** Creates default test props for useProjectManagement hook */
export function createDefaultProps(overrides: Record<string, unknown> = {}) {
  const mockCanvasRef = createMockCanvasRef();
  const mockLoadedTabIdRef = { current: "tab-1" };
  const mockTabFlowCacheRef = { current: new Map() };
  const mockSaveTabFlow = vi.fn().mockResolvedValue(true);
  const mockSetIsSaving = vi.fn();
  const mockSetIsProjectSaved = vi.fn();
  const mockSetProjectSwitcherMode = vi.fn();
  const mockSetIsSaveConfirmOpen = vi.fn();
  const mockSetIsProjectSwitcherOpen = vi.fn();
  const mockSetRecentProjects = vi.fn();

  return {
    canvasRef: mockCanvasRef as ReturnType<typeof createMockCanvasRef>,
    loadedTabIdRef: mockLoadedTabIdRef,
    tabFlowCacheRef: mockTabFlowCacheRef,
    currentProjectPath: "/path/to/project" as string | null,
    workflowName: "Test Workflow",
    activeTabId: "tab-1" as string | null,
    hasUnsavedChanges: false,
    setCurrentProjectPath: vi.fn(),
    setWorkflowName: vi.fn(),
    setIsProjectSwitcherOpen: mockSetIsProjectSwitcherOpen,
    setShowHomeScreen: vi.fn(),
    setIsProjectSaved: mockSetIsProjectSaved,
    setRecentProjects: mockSetRecentProjects,
    setIsSaving: mockSetIsSaving,
    setIsSaveConfirmOpen: mockSetIsSaveConfirmOpen,
    setProjectSwitcherMode: mockSetProjectSwitcherMode,
    initializeTabs: vi.fn(),
    createNewTab: vi.fn(),
    loadTabFlow: vi.fn(),
    saveTabFlow: mockSaveTabFlow,
    syncTeleportersForTab: vi.fn(),
    ...overrides,
  };
}

/** Creates a dirty node for testing file save functionality */
export function createDirtyNode(
  id: string,
  filePath: string,
  content: string,
  position = { x: 0, y: 0 },
): Node<TestNodeData> {
  return {
    id,
    type: "custom",
    position,
    data: {
      fileSaveState: {
        isDirty: true,
        filePath,
        content,
      },
    },
  };
}

/** Creates a clean node for testing */
export function createCleanNode(
  id: string,
  label: string,
  position = { x: 0, y: 0 },
): Node<TestNodeData> {
  return {
    id,
    type: "custom",
    position,
    data: { label },
  };
}

/** Creates a flow object for testing */
export function createFlow(nodes: Node[] = [], edges: Node[] = []) {
  return { nodes, edges, viewport: { x: 0, y: 0, zoom: 1 } };
}
